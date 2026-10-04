/**
 * Browser-driven admin check: sign in, view orders, walk the status pipeline,
 * confirm illegal transitions are refused, and confirm the request inbox shows
 * the reference image.
 *
 *   node scripts/admin-e2e.mjs http://localhost:3000 [passcode]
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const PASSCODE = process.argv[3] ?? 'stitch';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(process.cwd(), '.data', 'screenshots', 'admin');

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

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
await mkdir(OUT, { recursive: true });

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

console.log('\n— sign in —');
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle2' });
check('anonymous visitor lands on the sign-in page', page.url().includes('/admin/login'), page.url());

await page.type('#login-password', 'definitely-wrong');
await page.click('button[type="submit"]');
await new Promise((r) => setTimeout(r, 1200));
const errorShown = await page.evaluate(() =>
  Boolean(document.querySelector('[role="alert"]')),
);
check('wrong passcode shows an error', errorShown);

await page.evaluate(() => {
  const input = document.querySelector('#login-password');
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  ).set;
  setter.call(input, '');
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.type('#login-password', PASSCODE);
await page.click('button[type="submit"]');
await new Promise((r) => setTimeout(r, 2500));
check('correct passcode reaches the orders list', page.url().endsWith('/admin'), page.url());
await page.screenshot({ path: path.join(OUT, '01-orders.png') });

console.log('\n— orders —');
const orderCount = await page.evaluate(() => document.querySelectorAll('ul > li a[href^="/admin/orders/"]').length);
check('orders are listed', orderCount > 0, `${orderCount} orders`);

// Create a dedicated order so the pipeline walk always starts from `new`.
function seedId(slug) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < slug.length; i += 1) {
    h1 = Math.imul(h1 ^ slug.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + slug.charCodeAt(i) * (i + 7), 2654435761) >>> 0;
  }
  const hex = (n, len) => n.toString(16).padStart(len, '0').slice(-len);
  return [hex(h1, 8), hex(h2, 4), `4${hex(h1 ^ h2, 4).slice(1)}`, ((h2 & 0x3fff) | 0x8000).toString(16).padStart(4, '0'), `${hex(h1, 8)}${hex(h2, 4)}`].join('-');
}

const created = await fetch(`${BASE}/api/orders`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    customerName: 'Pipeline Test',
    phone: '9829044120',
    email: 'pipeline@example.com',
    addressLine: '1 Test Lane',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302001',
    idempotencyKey: `pipeline-${Date.now()}`,
    items: [{ productId: seedId('crimson-rose-purse'), quantity: 1 }],
  }),
});
const createdBody = await created.json();
check('a fresh order was created for the pipeline walk', created.ok && Boolean(createdBody.orderNumber), JSON.stringify(createdBody).slice(0, 120));

await page.reload({ waitUntil: 'networkidle2' });
const firstOrderHref = await page.evaluate(
  (number) =>
    [...document.querySelectorAll('a[href^="/admin/orders/"]')]
      .map((a) => a.textContent?.trim())
      .findIndex((t) => t === number) >= 0
      ? [...document.querySelectorAll('a[href^="/admin/orders/"]')].find(
          (a) => a.textContent?.trim() === number,
        )?.getAttribute('href')
      : null,
  createdBody.orderNumber,
);
check('the new order appears in the list', Boolean(firstOrderHref), String(createdBody.orderNumber));

if (firstOrderHref) {
  await page.goto(`${BASE}${firstOrderHref}`, { waitUntil: 'networkidle2' });
  const text = await page.evaluate(() => document.body.innerText);
  check('order detail shows the snapshot items', /Made from|Items/i.test(text) && /Total/i.test(text));
  check(
    'order detail explains prices are a snapshot',
    text.includes('snapshot'),
  );
  await page.screenshot({ path: path.join(OUT, '02-order-detail.png'), fullPage: true });

  // Walk the legal pipeline (button labels mirror STATUS_LABELS).
  const sequence = [
    ['confirmed', 'confirmed', 'Confirmed'],
    ['in the making', 'in the making', 'In the making'],
    ['shipped', 'shipped', 'Shipped'],
    ['completed', 'completed', 'Completed'],
  ];
  for (const [buttonLabel, , expected] of sequence) {
    const clicked = await page.evaluate((label) => {
      const button = [...document.querySelectorAll('button')].find((b) =>
        b.textContent?.toLowerCase().includes(`mark ${label}`),
      );
      if (!button) return false;
      button.click();
      return true;
    }, buttonLabel);
    if (!clicked) {
      const available = await page.evaluate(() =>
        [...document.querySelectorAll('button')].map((b) => b.textContent?.trim()),
      );
      check(`status → ${expected} available`, false, `buttons: ${available.join(', ')}`);
      continue;
    }
    let status = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((r) => setTimeout(r, 400));
      status = await page.evaluate(() => {
        const node = [...document.querySelectorAll('p')].find((p) =>
          /^status:/i.test(p.textContent?.trim() ?? ''),
        );
        return node?.textContent?.replace(/^status:\s*/i, '').trim() ?? null;
      });
      if (status === expected) break;
    }
    check(`status → ${expected}`, status === expected, `saw "${status}"`);
  }
  await page.screenshot({ path: path.join(OUT, '03-order-completed.png'), fullPage: true });

  const orderId = firstOrderHref.split('/').pop();

  // An illegal jump must be refused by the API, not just hidden in the UI.
  const illegal = await page.evaluate(async (id) => {
    const response = await fetch(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'new' }),
    });
    return { status: response.status, body: await response.json().catch(() => ({})) };
  }, orderId);
  check(
    'illegal transition refused server-side',
    illegal.status === 409 || illegal.status === 422,
    `status ${illegal.status}`,
  );

  const nonsense = await page.evaluate(async (id) => {
    const response = await fetch(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'teleported' }),
    });
    return response.status;
  }, orderId);
  check('unknown status refused', nonsense === 422, `status ${nonsense}`);
}

console.log('\n— custom requests —');
await page.goto(`${BASE}/admin/requests`, { waitUntil: 'networkidle2' });
const requestsText = await page.evaluate(() => document.body.innerText);
check('requests are listed', /\d+ requests?/i.test(requestsText), requestsText.slice(0, 120));
check('request shows the colour and size preferences', /Colour/i.test(requestsText) && /Size/i.test(requestsText));
const hasReferenceImage = await page.evaluate(() => Boolean(document.querySelector('img')));
check('reference image is rendered', hasReferenceImage);
await page.screenshot({ path: path.join(OUT, '04-requests.png'), fullPage: true });

console.log('\n— sign out —');
await page.evaluate(() => {
  const button = [...document.querySelectorAll('button')].find((b) =>
    /sign out/i.test(b.textContent ?? ''),
  );
  button?.click();
});
await new Promise((r) => setTimeout(r, 2000));
check('sign out returns to the sign-in page', page.url().includes('/admin/login'), page.url());
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle2' });
check('orders are protected again after sign out', page.url().includes('/admin/login'), page.url());

const realErrors = errors.filter(
  (e) =>
    !e.includes('favicon') &&
    // Deliberate negative-path requests above log their own refusals.
    !/(401|409|422)/.test(e),
);
check('no console errors in the admin', realErrors.length === 0, realErrors.join(' | '));

await browser.close();
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);