/**
 * Visual QA harness. Boots a headless Chrome against the running dev/production
 * server, drives the scroll-controlled hero at several progress points and
 * writes screenshots plus a console/network error report to
 * .data/screenshots/.
 *
 *   node scripts/shoot.mjs http://localhost:3000
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = path.join(process.cwd(), '.data', 'screenshots');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const VIEWPORTS = [
  { name: 'iphone-390x844', width: 390, height: 844, dpr: 2, mobile: true },
  { name: 'pixel-412x915', width: 412, height: 915, dpr: 2, mobile: true },
  { name: 'small-360x640', width: 360, height: 640, dpr: 2, mobile: true },
  { name: 'desktop-1440x900', width: 1440, height: 900, dpr: 1, mobile: false },
];

const STOPS = [0, 0.15, 0.42, 0.7, 0.98];

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
  });

  const report = [];

  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.dpr,
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
    });

    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    page.on('requestfailed', (request) => {
      // Next cancels speculative RSC prefetches on navigation; that is expected.
      if (request.url().includes('_rsc=')) return;
      errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`);
    });

    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 90_000 });
    await new Promise((r) => setTimeout(r, 1200));

    for (const stop of STOPS) {
      await page.evaluate((ratio) => {
        const root = document.querySelector('[data-hero-root]');
        const sticky = document.querySelector('[data-hero-sticky]');
        if (!root || !sticky) return;
        const travel = root.offsetHeight - sticky.offsetHeight;
        const top = root.offsetTop + travel * ratio;
        window.scrollTo({ top, behavior: 'instant' });
      }, stop);
      // Give the loader time to fetch the frames for this position.
      await new Promise((r) => setTimeout(r, stop === 0 ? 900 : 1600));
      const label = String(Math.round(stop * 100)).padStart(3, '0');
      await page.screenshot({
        path: path.join(OUT, `${viewport.name}-hero-${label}.png`),
      });
    }

    const heroInfo = await page.evaluate(() => {
      const root = document.querySelector('[data-hero-root]');
      const sticky = document.querySelector('[data-hero-sticky]');
      const canvas = document.querySelector('[data-hero-sticky] canvas');
      return {
        rootHeight: root?.offsetHeight ?? 0,
        stickyHeight: sticky?.offsetHeight ?? 0,
        canvas: canvas ? { w: canvas.width, h: canvas.height } : null,
        mode: document.querySelector('[data-hero-wash]')?.getAttribute('data-mode') ?? null,
        chapter: document.querySelector('[data-hero-chapter]')?.textContent ?? null,
      };
    });

    report.push({ viewport: viewport.name, heroInfo, errors: [...new Set(errors)] });

    // Walk the page below the hero in viewport-sized steps for layout review.
    const total = await page.evaluate(() => document.body.scrollHeight);
    const step = Math.round(viewport.height * 0.92);
    const start = await page.evaluate(() => {
      const root = document.querySelector('[data-hero-root]');
      return root ? root.offsetTop + root.offsetHeight - 8 : 0;
    });
    let index = 0;
    for (let y = start; y < Math.min(total, start + step * 9); y += step, index += 1) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
      await new Promise((r) => setTimeout(r, 900));
      await page.screenshot({
        path: path.join(OUT, `${viewport.name}-page-${String(index).padStart(2, '0')}.png`),
      });
    }

    await page.close();
  }

  await browser.close();
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});