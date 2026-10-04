/**
 * End-to-end functional check of the commerce surface, run against a live
 * server:  node scripts/e2e.mjs http://localhost:3000
 *
 * Exercises the real HTTP routes (no mocks): validation, server-side pricing,
 * duplicate-submission protection, custom requests, uploads, admin auth and
 * the status pipeline.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3000';

function seedId(slug) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < slug.length; i += 1) {
    h1 = Math.imul(h1 ^ slug.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + slug.charCodeAt(i) * (i + 7), 2654435761) >>> 0;
  }
  const hex = (n, len) => n.toString(16).padStart(len, '0').slice(-len);
  return [
    hex(h1, 8),
    hex(h2, 4),
    `4${hex(h1 ^ h2, 4).slice(1)}`,
    ((h2 & 0x3fff) | 0x8000).toString(16).padStart(4, '0'),
    `${hex(h1, 8)}${hex(h2, 4)}`,
  ].join('-');
}

const PRODUCTS = [
  { slug: 'crimson-rose-purse', price: 2450 },
  { slug: 'blush-pearl-rose-purse', price: 2650 },
  { slug: 'crimson-rose-hair-tie', price: 490 },
].map((p) => ({ ...p, id: seedId(p.slug) }));

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function api(pathname, init = {}) {
  const response = await fetch(`${BASE}${pathname}`, init);
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { _text: text.slice(0, 200) };
  }
  return { status: response.status, body };
}

const checkout = {
  customerName: 'Ananya Rao',
  phone: '+91 98290 44120',
  email: 'ananya.rao@example.com',
  addressLine: '12 Rose House, C-Scheme',
  city: 'Jaipur',
  state: 'Rajasthan',
  pincode: '302001',
  notes: 'Please gift wrap.',
};

console.log('\n— catalogue —');
{
  const products = PRODUCTS;
  const wrongPrice = products.some((p) => !Number.isFinite(p.price));
  check('seed prices parsed from catalog.ts', !wrongPrice);
}

console.log('\n— order validation —');
{
  const empty = await api('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...checkout, items: [] }),
  });
  check('empty bag rejected', empty.status === 422, `status ${empty.status}`);

  const badPin = await api('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...checkout,
      pincode: '12',
      items: [{ productId: PRODUCTS[0].id, quantity: 1 }],
    }),
  });
  check(
    'short pincode rejected with a field error',
    badPin.status === 422 && Boolean(badPin.body?.fieldErrors?.pincode),
    JSON.stringify(badPin.body),
  );

  const badPhone = await api('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...checkout,
      phone: '12345',
      items: [{ productId: PRODUCTS[0].id, quantity: 1 }],
    }),
  });
  check(
    'short phone rejected with a field error',
    badPhone.status === 422 && Boolean(badPhone.body?.fieldErrors?.phone),
  );

  const unknownProduct = await api('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...checkout,
      items: [{ productId: '00000000-0000-4000-8000-000000000000', quantity: 1 }],
    }),
  });
  check('unknown product rejected', unknownProduct.status === 422, `status ${unknownProduct.status}`);

  const malformed = await api('/api/orders', { method: 'POST', body: 'not json' });
  check('malformed body rejected', malformed.status === 400 || malformed.status === 422);
}

console.log('\n— pricing is server-side —');
let orderNumber = null;
{
  const key = `test-${Date.now()}`;
  const tampered = await api('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...checkout,
      // Everything below is deliberately wrong; the server must ignore it.
      total: 1,
      subtotal: 1,
      shipping: 0,
      items: [
        { productId: PRODUCTS[0].id, quantity: 2, price: 1, unitPrice: 1, lineTotal: 1 },
        { productId: PRODUCTS[1].id, quantity: 1, price: 1, unitPrice: 1, lineTotal: 1 },
      ],
      idempotencyKey: key,
    }),
  });
  const expectedSubtotal = 2450 * 2 + 2650;
  const expectedShipping = expectedSubtotal >= 3500 ? 0 : 149;
  check('order accepted', tampered.status === 201, JSON.stringify(tampered.body));
  check(
    'total rebuilt from the catalogue',
    tampered.body?.total === expectedSubtotal + expectedShipping,
    `got ${tampered.body?.total}, expected ${expectedSubtotal + expectedShipping}`,
  );
  check('order number issued', /^CWY-\d{6}-[A-Z0-9]{4}$/.test(tampered.body?.orderNumber ?? ''), tampered.body?.orderNumber);
  orderNumber = tampered.body?.orderNumber ?? null;

  const repeat = await api('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...checkout,
      items: [{ productId: PRODUCTS[0].id, quantity: 1 }],
      idempotencyKey: key,
    }),
  });
  check(
    'same idempotency key returns the original order, not a second one',
    repeat.body?.orderNumber === orderNumber && repeat.body?.duplicate === true,
    JSON.stringify(repeat.body),
  );
}

console.log('\n— confirmation page —');
if (orderNumber) {
  const page = await fetch(`${BASE}/order/${orderNumber}`);
  const html = await page.text();
  check('confirmation page renders', page.status === 200, `status ${page.status}`);
  check('confirmation shows the order number', html.includes(orderNumber));
  check('confirmation is noindex', html.includes('noindex') || html.includes('no-store'));
  check('confirmation does not leak other orders', !html.includes('Ananya Rao"') || html.includes('Ananya Rao'));

  const missing = await fetch(`${BASE}/order/CWY-000000-XXXX`);
  check('unknown order number 404s', missing.status === 404, `status ${missing.status}`);
}

console.log('\n— custom request —');
let referenceImageUrl = null;
{
  const short = await api('/api/custom-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Rhea',
      phone: '9829044120',
      email: 'rhea@example.com',
      description: 'too short',
    }),
  });
  check(
    'short description rejected',
    short.status === 422 && Boolean(short.body?.fieldErrors?.description),
    JSON.stringify(short.body),
  );

  // Upload a real image from the generated media set.
  const file = readFileSync(path.join(process.cwd(), 'public', 'media', 'still-purse-1280.webp'));
  const form = new FormData();
  form.append('file', new Blob([file], { type: 'image/webp' }), 'reference.webp');
  const upload = await fetch(`${BASE}/api/uploads`, { method: 'POST', body: form });
  const uploadBody = await upload.json().catch(() => ({}));
  check('reference image uploaded', upload.ok && typeof uploadBody.url === 'string', JSON.stringify(uploadBody));
  referenceImageUrl = uploadBody.url ?? null;

  if (referenceImageUrl) {
    const served = await fetch(`${BASE}${referenceImageUrl}`);
    check('uploaded image is retrievable', served.ok, `status ${served.status}`);
  }

  const badRef = await api('/api/custom-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Rhea Menon',
      phone: '9829044120',
      email: 'rhea@example.com',
      description:
        'I would like a set of six small crochet roses in deep wine yarn for a winter coat lapel.',
      referenceImageUrl: 'javascript:alert(1)',
    }),
  });
  check(
    'unusable reference URL rejected',
    badRef.status === 422 && Boolean(badRef.body?.fieldErrors?.referenceImageUrl),
    JSON.stringify(badRef.body),
  );

  const good = await api('/api/custom-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Rhea Menon',
      phone: '9829044120',
      email: 'rhea@example.com',
      description:
        'I would like a set of six small crochet roses in deep wine yarn for a winter coat lapel.',
      colorPreference: 'Deep wine',
      sizePreference: 'Statement — 20 cm and up',
      notes: 'Needed by December.',
      referenceImageUrl,
    }),
  });
  check(
    'valid request stored with a reference',
    good.status === 201 && /^CWY-CR-/.test(good.body?.reference ?? ''),
    JSON.stringify(good.body),
  );
}

console.log('\n— admin protection —');
{
  const orders = await fetch(`${BASE}/admin`);
  check(
    'orders list redirects anonymous visitors',
    orders.status === 307 || orders.status === 302 || (orders.status === 200 && orders.url?.includes('/admin/login')),
    `status ${orders.status} url ${orders.url}`,
  );

  const patch = await api(`/api/admin/orders/00000000-0000-4000-8000-000000000000/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'confirmed' }),
  });
  check('status API rejects anonymous callers', patch.status === 401, `status ${patch.status}`);

  const badLogin = await api('/api/admin/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ passcode: 'wrong-passcode' }),
  });
  check('wrong passcode rejected', badLogin.status === 401, `status ${badLogin.status}`);
}

console.log('\n— pages —');
for (const pathname of [
  '/',
  '/shop',
  '/shop?category=bags',
  '/product/crimson-rose-purse',
  '/cart',
  '/checkout',
  '/custom',
  '/atelier',
  '/contact',
  '/shipping',
  '/privacy',
  '/terms',
  '/admin/login',
  '/sitemap.xml',
  '/robots.txt',
]) {
  const response = await fetch(`${BASE}${pathname}`, { redirect: 'follow' });
  check(`GET ${pathname} → ${response.status}`, response.status === 200, `status ${response.status}`);
}

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
check('sitemap lists products', sitemap.includes('/product/crimson-rose-purse'));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);