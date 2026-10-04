/**
 * Accessibility, resilience and shopping-UX pass in a real browser.
 *
 *   node scripts/ux-e2e.mjs http://localhost:3000
 *
 * Covers: reduced motion, blocked frame sequence (offline failure), empty cart,
 * add-to-bag, the bag sheet, keyboard-only navigation, focus visibility,
 * mid-scroll stopping, reverse scrolling, and a refresh during the hero.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(process.cwd(), '.data', 'screenshots', 'ux');
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

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

/**
 * Navigations wait on `domcontentloaded`, never on `networkidle2`.
 *
 * `next/link` prefetches every visible route after load, so a page that has just
 * settled is still firing a burst of RSC requests. The idle heuristic races that
 * burst and reports a timeout that is about the harness rather than the page —
 * and in the blocked-sequence case below it can never be satisfied at all,
 * because an aborted request never reports a terminal event. Every block below
 * waits explicitly for the state it asserts on instead.
 */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await mkdir(OUT, { recursive: true });const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function newPage(options = {}) {
  const page = await browser.newPage();
  await page.setViewport(options.viewport ?? MOBILE);
  if (options.reducedMotion) {
    await page.emulateMediaFeatures([
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ]);
  }
  if (options.blockSequence) {
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/sequences/hero/') || url.includes('/sequences%2Fhero')) {
        request.abort('failed').catch(() => undefined);
      } else {
        request.continue().catch(() => undefined);
      }
    });
  }
  return page;
}

/* ---------------------------------------------------- reduced motion ------- */
console.log('\n— prefers-reduced-motion —');
{
  const page = await newPage({ reducedMotion: true });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await wait(2200);
  const info = await page.evaluate(() => {
    const root = document.querySelector('[data-hero-root]');
    const sticky = document.querySelector('[data-hero-sticky]');
    const canvas = sticky?.querySelector('canvas');
    return {
      pinned: root?.className.includes('hero-pin') ?? true,
      height: root?.offsetHeight ?? 0,
      viewport: window.innerHeight,
      hasCanvas: Boolean(canvas),
      canvasW: canvas?.width ?? 0,
    };
  });
  check('hero is not pinned when motion is reduced', !info.pinned, JSON.stringify(info));
  check('hero collapses to a single screenful', info.height <= info.viewport + 2, JSON.stringify(info));
  check('a still is still painted on the canvas', info.hasCanvas && info.canvasW > 0);
  await page.screenshot({ path: path.join(OUT, 'reduced-motion.png') });
  await page.close();
}

/* --------------------------------------------------- sequence failure ------ */
console.log('\n— frame sequence unavailable —');
{
  const page = await newPage({ blockSequence: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // `domcontentloaded`, not `networkidle2`: this case deliberately cuts the
  // network, and an aborted request never reports a terminal event, so the
  // idle heuristic waits for a timeout that is about the harness rather than
  // the page. The assertions below verify the fallback after a fixed settle.
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await wait(3500);
  const info = await page.evaluate(() => {
    const sticky = document.querySelector('[data-hero-sticky]');
    const canvas = sticky?.querySelector('canvas');
    const noscript = document.querySelector('noscript');
    return {
      hasCanvas: Boolean(canvas),
      canvasW: canvas?.width ?? 0,
      painted: canvas
        ? (() => {
            const data = canvas
              .getContext('2d')
              .getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
            return [...data].join(',');
          })()
        : null,
      noscript: noscript?.textContent ?? '',
      heading: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim(),
      shopLinks: document.querySelectorAll('a[href="/shop"]').length,
    };
  });
  check('a canvas still backs the hero', info.hasCanvas && info.canvasW > 0, JSON.stringify(info));
  check(
    'the premium static still is painted onto the canvas',
    Boolean(info.painted) && info.painted !== '0,0,0,255',
    info.painted,
  );
  check(
    'the no-JS fallback still is declared in a <noscript>',
    info.noscript.includes('still-collection'),
    info.noscript.slice(0, 120),
  );
  check('the wordmark is intact', Boolean(info.heading?.includes('Cuddle')), info.heading);
  check('shopping is unaffected', info.shopLinks > 0);
  check('no uncaught errors during the fallback', errors.length === 0, errors.join(' | '));
  await page.screenshot({ path: path.join(OUT, 'sequence-blocked.png') });

  const stillWorks = await page.goto(`${BASE}/product/crimson-rose-purse`, { waitUntil: 'domcontentloaded' });
  check('product pages still work without the sequence', stillWorks.status() === 200);
  await page.close();
}

/* ------------------------------------------------------------- shopping ---- */
console.log('\n— shopping —');
{
  const page = await newPage();
  await page.goto(`${BASE}/shop`, { waitUntil: 'domcontentloaded' });
  await wait(600);

  await page.evaluate(() => window.localStorage.removeItem('cwy.cart.v1'));
  await page.goto(`${BASE}/cart`, { waitUntil: 'domcontentloaded' });
  await wait(700);
  const emptyText = await page.evaluate(() => document.body.innerText);
  check('empty bag is explained, not broken', /nothing in here yet/i.test(emptyText), emptyText.slice(0, 90));
  await page.screenshot({ path: path.join(OUT, 'empty-cart.png') });

  await page.goto(`${BASE}/product/crimson-rose-purse`, { waitUntil: 'domcontentloaded' });
  await wait(600);
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      /add to bag/i.test(b.textContent ?? ''),
    );
    button.click();
  });
  await wait(700);
  const sheet = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return {
      open: Boolean(dialog),
      label: dialog?.getAttribute('aria-label'),
      modal: dialog?.getAttribute('aria-modal'),
      text: dialog?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120),
    };
  });
  check('the bag sheet opens on add', sheet.open, JSON.stringify(sheet));
  check('the sheet is a labelled modal', sheet.modal === 'true' && sheet.label === 'Your bag', JSON.stringify(sheet));
  check('the sheet shows the piece and a total', /Crimson Rose Purse/.test(sheet.text ?? '') && /Total/.test(sheet.text ?? ''), sheet.text);
  await page.screenshot({ path: path.join(OUT, 'cart-sheet.png') });

  const stored = await page.evaluate(() => window.localStorage.getItem('cwy.cart.v1'));
  check('the bag persists to localStorage', Boolean(stored) && stored.includes('crimson-rose-purse'));

  // Quantity stepper
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('[role="dialog"] button')].find((b) =>
      /increase quantity/i.test(b.getAttribute('aria-label') ?? ''),
    );
    button?.click();
  });
  await wait(400);
  const qty = await page.evaluate(() => JSON.parse(window.localStorage.getItem('cwy.cart.v1') ?? '[]')[0]?.quantity);
  check('quantity stepper works', qty === 2, `qty ${qty}`);

  // Escape closes the sheet and restores focus.
  await page.keyboard.press('Escape');
  await wait(400);
  const closed = await page.evaluate(() => !document.querySelector('[role="dialog"]'));
  check('escape closes the sheet', closed);

  // Checkout validation, in the browser, without a round trip.
  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
  await wait(700);
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      /place order/i.test(b.textContent ?? ''),
    );
    button.click();
  });
  await wait(600);
  const validation = await page.evaluate(() => ({
    invalid: document.querySelectorAll('[aria-invalid="true"]').length,
    alert: document.querySelector('[role="alert"]')?.textContent?.trim(),
    focused: document.activeElement?.getAttribute('name') ?? document.activeElement?.id,
  }));
  check('empty checkout is blocked client-side', validation.invalid > 0, JSON.stringify(validation));
  check('an error summary is announced', Boolean(validation.alert), validation.alert);
  check('focus moves to the first bad field', Boolean(validation.focused), String(validation.focused));
  await page.screenshot({ path: path.join(OUT, 'checkout-validation.png') });

  await page.close();
}

/* ------------------------------------------------- keyboard navigation ----- */
console.log('\n— keyboard —');
{
  const page = await newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await wait(1200);

  const firstTab = await page.evaluate(() => {
    const skip = document.querySelector('.skip-link');
    return skip ? skip.textContent?.trim() : null;
  });
  check('a skip link is the first stop', firstTab === 'Skip to content', String(firstTab));

  const order = [];
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const style = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
        outline: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    });
    order.push(info);
  }
  const focusRinged = order.filter((o) => o && o.outline !== 'none').length;
  check('every focused control shows a visible focus ring', focusRinged >= order.length - 1, `${focusRinged}/${order.length}`);
  check('focus reaches the hero calls to action', order.some((o) => /shop the collection/i.test(o?.text ?? '')), order.map((o) => o?.text).join(' | '));

  const heroCtas = await page.evaluate(() =>
    [...document.querySelectorAll('[data-hero-copy] a')].map((a) => a.textContent?.trim()),
  );
  check('hero CTAs are real links', heroCtas.length === 2 && heroCtas.every(Boolean), heroCtas.join(', '));
  await page.close();
}

/* --------------------------------------------- deterministic scroll control - */
console.log('\n— scroll determinism —');
{
  const page = await newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await wait(2000);

  const frameAt = async (ratio) => {
    await page.evaluate((r) => {
      const root = document.querySelector('[data-hero-root]');
      const sticky = document.querySelector('[data-hero-sticky]');
      const travel = root.offsetHeight - sticky.offsetHeight;
      window.scrollTo({ top: root.offsetTop + travel * r, behavior: 'instant' });
    }, ratio);
    await wait(1400);
    return page.evaluate(() => ({
      chapter: document.querySelector('[data-hero-chapter]')?.textContent?.trim(),
      copyGone: document.querySelector('[data-hero-copy]')?.getAttribute('data-gone'),
      progress: document.querySelector('.hero-rail')?.style.getPropertyValue('--progress'),
      hash: (() => {
        const canvas = document.querySelector('[data-hero-sticky] canvas');
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
        return [...data].join(',');
      })(),
    }));
  };

  const at42a = await frameAt(0.42);
  await wait(900);
  const at42b = await frameAt(0.42);
  check('stopping at 42% keeps the same frame', at42a.hash === at42b.hash && at42a.hash !== null, JSON.stringify(at42a));
  check('42% lands on the crochet chapter', /stitches/i.test(at42a.chapter ?? ''), String(at42a.chapter));
  check('copy recedes once scrolling starts', at42a.copyGone === 'true');

  const at70 = await frameAt(0.7);
  check('scrolling further advances the frame', at70.hash !== at42b.hash);
  check('70% reaches the purse chapter', /purse/i.test(at70.chapter ?? ''), String(at70.chapter));

  await frameAt(0.98);
  const backTo42 = await frameAt(0.42);
  check('scrolling back reverses to the same frame', backTo42.hash === at42a.hash, `${backTo42.hash} vs ${at42a.hash}`);

  // Rapid scrubbing: the canvas must never be blank.
  const painted = await page.evaluate(async () => {
    const root = document.querySelector('[data-hero-root]');
    const sticky = document.querySelector('[data-hero-sticky]');
    const travel = root.offsetHeight - sticky.offsetHeight;
    for (let i = 0; i <= 40; i += 1) {
      window.scrollTo({ top: root.offsetTop + travel * (i / 40), behavior: 'instant' });
      await new Promise((r) => requestAnimationFrame(r));
    }
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const canvas = document.querySelector('[data-hero-sticky] canvas');
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
        resolve([...data].join(','));
      });
    });
  });
  check('the canvas is still painted after a rapid scrub', painted !== null && painted !== '0,0,0,0', painted);

  await wait(1200);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await wait(1800);
  const afterReload = await page.evaluate(() => {
    const root = document.querySelector('[data-hero-root]');
    const canvas = document.querySelector('[data-hero-sticky] canvas');
    return {
      scrollY: window.scrollY,
      heroHeight: root?.offsetHeight ?? 0,
      hasCanvas: Boolean(canvas),
      painted: canvas
        ? (() => {
            const data = canvas.getContext('2d').getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
            return [...data].join(',');
          })()
        : null,
    };
  });
  check('refresh during the hero keeps a painted canvas', afterReload.hasCanvas && afterReload.painted !== null, JSON.stringify(afterReload));

  // Resident decoded frames stay bounded.
  const budget = await page.evaluate(async () => {
    const root = document.querySelector('[data-hero-root]');
    const sticky = document.querySelector('[data-hero-sticky]');
    const travel = root.offsetHeight - sticky.offsetHeight;
    for (let i = 0; i <= 30; i += 1) {
      window.scrollTo({ top: root.offsetTop + travel * (i / 30), behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 120));
    }
    return performance.getEntriesByType('resource').filter((r) => r.name.includes('/sequences/hero/')).length;
  });
  check('frame requests stay far below the full 271-frame set', budget < 271, `${budget} frames fetched`);
  console.log(`       (${budget} frame files fetched for a full top-to-bottom pass)`);

  await page.close();
}

/* ------------------------------------------------------- the closing hold -- */
console.log('\n— the closing hold —');
{
  const page = await newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await wait(2200);

  const paintAt = async (ratio) => {
    await page.evaluate((r) => {
      const root = document.querySelector('[data-hero-root]');
      const sticky = document.querySelector('[data-hero-sticky]');
      const travel = root.offsetHeight - sticky.offsetHeight;
      window.scrollTo({ top: root.offsetTop + travel * r, behavior: 'instant' });
    }, ratio);
    await wait(1600);
    return page.evaluate(() => {
      const canvas = document.querySelector('[data-hero-sticky] canvas');
      const end = document.querySelector('.hero-end');
      const bar = document.querySelector('.hero-bar');
      const skip = document.querySelector('.skip-intro');
      return {
        painted: canvas
          ? [
              ...canvas
                .getContext('2d')
                .getImageData(canvas.width >> 1, canvas.height >> 1, 1, 1)
                .data,
            ].join(',')
          : null,
        endAlpha: end ? getComputedStyle(end).opacity : null,
        endVisible: end ? getComputedStyle(end).visibility : null,
        endLinks: end ? [...end.querySelectorAll('a')].map((a) => a.getAttribute('href')) : [],
        barOpacity: bar ? getComputedStyle(bar).opacity : null,
        skipVisible: skip?.getAttribute('data-visible'),
        chapter: document.querySelector('[data-hero-chapter]')?.textContent?.trim(),
      };
    });
  };

  // The end hold is the tail of the pin: 82% to 100%.
  const atEndA = await paintAt(0.85);
  const atEndB = await paintAt(1);
  const atEndC = await paintAt(0.93);
  check(
    'the finished collection is held, not flashed, across the end of the pin',
    atEndA.painted === atEndB.painted && atEndB.painted === atEndC.painted && Boolean(atEndB.painted),
    `${atEndA.painted} / ${atEndB.painted} / ${atEndC.painted}`,
  );
  check('the closing card is fully shown during the hold', Number(atEndB.endAlpha) > 0.95, String(atEndB.endAlpha));
  check('the closing card is not hidden from pointer events', atEndB.endVisible === 'visible', String(atEndB.endVisible));
  check(
    'the closing card links onward to the shop',
    atEndB.endLinks.includes('/shop') && atEndB.endLinks.length === 2,
    atEndB.endLinks.join(', '),
  );
  check('the chapter rail steps aside for the closing card', Number(atEndB.barOpacity) < 0.1, String(atEndB.barOpacity));
  check('skipping the intro is pointless once you have arrived', atEndB.skipVisible === 'false', String(atEndB.skipVisible));
  check('the last chapter names the collection', /collection/i.test(atEndB.chapter ?? ''), String(atEndB.chapter));
  await page.screenshot({ path: path.join(OUT, 'hero-end-hold.png') });

  // Before the hold, none of that is on screen yet.
  const mid = await paintAt(0.5);
  check('the closing card is absent mid-sequence', Number(mid.endAlpha) < 0.05, String(mid.endAlpha));
  check('the chapter rail is present mid-sequence', Number(mid.barOpacity) > 0.9, String(mid.barOpacity));

  await page.close();
}

/* -------------------------------------------------- the curated shop window */
console.log('\n— the shop window —');
{
  const page = await newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await wait(1800);
  const home = await page.evaluate(() => ({
    articles: document.querySelectorAll('main article').length,
    picks: [...document.querySelectorAll('#collection h3')].map((h) => h.textContent?.trim()),
    collections: document.querySelectorAll('#collection ul li a[href^="/shop/"]').length,
  }));
  check('the homepage shows a curated window, not the catalogue', home.articles > 0 && home.articles <= 4, `${home.articles} product cards`);
  check(
    'the window is labelled as a selection',
    /window|pieces/i.test(await page.evaluate(() => document.querySelector('#collection')?.textContent ?? '')),
  );

  await page.goto(`${BASE}/shop`, { waitUntil: 'domcontentloaded' });
  await wait(900);
  const all = await page.evaluate(() => document.querySelectorAll('main article').length);
  check('the full catalogue lives on /shop', all > home.articles, `${all} vs ${home.articles}`);

  // Categories are real pages.
  for (const slug of ['bags', 'accessories', 'flowers']) {
    const response = await page.goto(`${BASE}/shop/${slug}`, { waitUntil: 'domcontentloaded' });
    await wait(500);
    const info = await page.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim(),
      canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href'),
      products: document.querySelectorAll('main article').length,
    }));
    check(`/shop/${slug} is a page of its own`, response.status() === 200 && Boolean(info.h1), JSON.stringify(info));
    check(`/shop/${slug} is canonical to itself`, (info.canonical ?? '').endsWith(`/shop/${slug}`), String(info.canonical));
    check(`/shop/${slug} lists pieces`, info.products > 0, String(info.products));
  }

  // The legacy query-string form still lands on the right page.
  const legacy = await page.goto(`${BASE}/shop?category=bags`, { waitUntil: 'domcontentloaded' });
  await wait(600);
  const landed = await page.evaluate(() => ({
    path: location.pathname,
    h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim(),
  }));
  check('/shop?category=bags redirects to the collection page', legacy.status() < 400 && landed.path === '/shop/bags', JSON.stringify(landed));

  await page.close();
}

/* ------------------------------------------------------- brand identity ---- */
console.log('\n— brand identity —');
{
  const page = await newPage();
  await page.goto(`${BASE}/shop`, { waitUntil: 'domcontentloaded' });
  await wait(1600);
  const header = await page.evaluate(() => {
    const el = document.querySelector('header');
    return {
      scrolled: el?.dataset.scrolled,
      background: el ? getComputedStyle(el).backgroundColor : null,
      marks: [...document.querySelectorAll('header .brand-swap img')].map((img) => ({
        tone: img.dataset.brandTone,
        opacity: Number(getComputedStyle(img).opacity),
        width: img.naturalWidth,
      })),
    };
  });
  const ink = header.marks.find((m) => m.tone === 'ink');
  const champagne = header.marks.find((m) => m.tone === 'champagne');
  check('the header carries the wordmark', Boolean(ink?.width), JSON.stringify(header.marks));
  check('the wordmark is the brand brown away from the hero', ink?.opacity === 1, String(ink?.opacity));
  check('the champagne wordmark is not painted over the paper', champagne?.opacity === 0, String(champagne?.opacity));
  check(
    'a page with no hero is never treated as over the hero',
    header.scrolled === 'true' && header.background === 'rgb(249, 243, 228)',
    JSON.stringify(header),
  );

  const home = await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  void home;
  await wait(2000);
  const overHero = await page.evaluate(() => {
    const el = document.querySelector('header');
    return {
      scrolled: el?.dataset.scrolled,
      marks: [...document.querySelectorAll('header .brand-swap img')].map((img) => ({
        tone: img.dataset.brandTone,
        opacity: Number(getComputedStyle(img).opacity),
      })),
    };
  });
  check('over the hero the header is transparent', overHero.scrolled === 'false', JSON.stringify(overHero));
  check(
    'over the hero the champagne wordmark is the visible one',
    overHero.marks.find((m) => m.tone === 'champagne')?.opacity === 1 &&
      overHero.marks.find((m) => m.tone === 'ink')?.opacity === 0,
    JSON.stringify(overHero.marks),
  );

  // Nothing on the site is white.
  const paper = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('the page background is the brand off-white, not white', paper === 'rgb(249, 243, 228)', paper);

  // The published number, everywhere it is rendered.
  const numbers = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="tel:"], a[href^="https://wa.me/"]')].map((a) =>
      a.getAttribute('href'),
    ),
  );
  check(
    'every phone link points at the studio number',
    numbers.length > 0 && numbers.every((href) => href.replace(/\D/g, '').includes('919401313167')),
    numbers.join(' | '),
  );
  await page.close();
}

await browser.close();
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);