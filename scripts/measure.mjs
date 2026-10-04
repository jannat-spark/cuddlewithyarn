/**
 * Payload measurement against a production build. Reports what a first-time
 * mobile visitor actually downloads before the hero is interactive.
 *
 *   node scripts/measure.mjs http://localhost:3100
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function measure(label, url, scrollTo = 0) {
  const page = await browser.newPage();
  await page.setViewport(MOBILE);
  // Throttled to a mid-range Android on a decent connection, to be realistic.
  const client = await page.createCDPSession();
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (10 * 1024 * 1024) / 8,
    uploadThroughput: (3 * 1024 * 1024) / 8,
    latency: 60,
  });
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 });
  await new Promise((r) => setTimeout(r, 2500));

  const before = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => ({
      name: entry.name,
      bytes: entry.transferSize || entry.encodedBodySize || 0,
      type: entry.initiatorType,
    })),
  );

  if (scrollTo > 0) {
    await page.evaluate((ratio) => {
      const root = document.querySelector('[data-hero-root]');
      const sticky = document.querySelector('[data-hero-sticky]');
      if (!root || !sticky) return;
      const travel = root.offsetHeight - sticky.offsetHeight;
      window.scrollTo({ top: root.offsetTop + travel * ratio, behavior: 'instant' });
    }, scrollTo);
    await new Promise((r) => setTimeout(r, 3000));
  }

  const after = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => ({
      name: entry.name,
      bytes: entry.transferSize || entry.encodedBodySize || 0,
      type: entry.initiatorType,
    })),
  );

  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByName('first-contentful-paint')[0];
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    return {
      ttfb: nav ? Math.round(nav.responseStart) : null,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      fcp: paint ? Math.round(paint.startTime) : null,
      lcp: lcpEntries.length ? Math.round(lcpEntries.at(-1).startTime) : null,
      longTasks: performance.getEntriesByType('longtask')?.length ?? 0,
    };
  });

  const summarise = (entries) => {
    const byType = {};
    let frameCount = 0;
    for (const entry of entries) {
      const isFrame = entry.name.includes('/sequences/hero/') && entry.name.includes('/f_');
      if (isFrame) frameCount += 1;
      const key = isFrame
        ? 'hero frames'
        : entry.name.includes('/_next/image')
          ? 'optimised images'
          : entry.name.endsWith('.js')
            ? 'javascript'
            : entry.name.endsWith('.css')
              ? 'css'
              : entry.name.includes('/_next/static/media')
                ? 'fonts'
                : entry.name.includes('/media/')
                  ? 'media'
                  : 'other';
      byType[key] = (byType[key] ?? 0) + entry.bytes;
    }
    const total = Object.values(byType).reduce((a, b) => a + b, 0);
    return { total, byType, count: entries.length, frameCount };
  };

  const initial = summarise(before);
  const all = summarise(after);
  const afterScroll = all.total - initial.total;

  console.log(`\n${label}  (${url})`);
  console.log(`  requests        ${initial.count}  (${initial.frameCount} hero frames)`);
  console.log(`  transferred     ${(initial.total / 1024).toFixed(0)} KB  (${(all.total / 1024).toFixed(0)} KB after scrolling, ${all.frameCount} frames total)`);
  for (const [key, value] of Object.entries(initial.byType).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${key.padEnd(18)} ${(value / 1024).toFixed(1)} KB`);
  }
  if (scrollTo > 0) console.log(`  fetched by scroll  ${(afterScroll / 1024).toFixed(0)} KB`);
  console.log(
    `  ttfb ${timing.ttfb}ms · fcp ${timing.fcp}ms · lcp ${timing.lcp}ms · dcl ${timing.domContentLoaded}ms · longtasks ${timing.longTasks}`,
  );

  await page.close();
  return { initial, all, timing };
}

await measure('Home — first paint', `${BASE}/`);
await measure('Home — after scrolling the hero', `${BASE}/`, 0.45);
await measure('Shop', `${BASE}/shop`);
await measure('Product', `${BASE}/product/crimson-rose-purse`);
await measure('Checkout', `${BASE}/checkout`);

await browser.close();