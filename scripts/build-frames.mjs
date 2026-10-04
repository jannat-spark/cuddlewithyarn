/**
 * Frame sequence build step.
 *
 * Source : frames/ezgif-frame-001.jpg … ezgif-frame-271.jpg   (1920x1080, 24fps)
 * Output : public/sequences/hero/<width>/f_<index>.webp        (responsive tiers)
 *          public/sequences/hero/manifest.json                (runtime contract)
 *
 * The manifest is deliberately set-shaped: a landscape (16:9) sequence ships
 * today, and a dedicated portrait (9:16) sequence can be added later by simply
 * emitting a second entry — the canvas component resolves sets by viewport and
 * nothing else changes.
 */
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'frames');
const OUT_ROOT = path.join(ROOT, 'public', 'sequences', 'hero');

/** Output tiers, smallest first. Mobile lands on 720. */
const TIERS = [
  { width: 720, quality: 66 },
  { width: 1280, quality: 70 },
  { width: 1920, quality: 72 },
];

const SOURCE_WIDTH = 1920;
const SOURCE_HEIGHT = 1080;
const FPS = 24;
const ID = 'hero-cuddle-with-yarn';
/** Focal point of the subject across the whole sequence (hands + work). */
const FOCAL = { x: 0.5, y: 0.47 };

const pad = (n, len = 4) => String(n).padStart(len, '0');

async function listSourceFrames() {
  const entries = await readdir(SRC_DIR);
  const files = entries
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  if (files.length === 0) {
    throw new Error(`No JPEG frames found in ${SRC_DIR}`);
  }

  const meta = await sharp(path.join(SRC_DIR, files[0])).metadata();
  if (meta.width !== SOURCE_WIDTH || meta.height !== SOURCE_HEIGHT) {
    throw new Error(
      `Unexpected source geometry ${meta.width}x${meta.height}. ` +
        `Update SOURCE_WIDTH/SOURCE_HEIGHT in scripts/build-frames.mjs.`,
    );
  }
  return files;
}

/** Frame set that should ship for a given tier list. */
function buildSetEntry(tierWidth, count) {
  return {
    width: SOURCE_WIDTH,
    height: SOURCE_HEIGHT,
    count,
    startIndex: 1,
    fps: FPS,
    path: '/sequences/hero/{w}/f_{index}.webp',
    widths: TIERS.map((t) => t.width),
    focal: FOCAL,
    poster: '/media/hero-poster-960.webp',
  };
}

async function encodeTier(files, tier) {
  const dir = path.join(OUT_ROOT, String(tier.width));
  await mkdir(dir, { recursive: true });

  let bytes = 0;
  const CONCURRENCY = 4;
  let cursor = 0;

  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= files.length) return;
      const index = i + 1;
      const input = path.join(SRC_DIR, files[i]);
      const output = path.join(dir, `f_${pad(index)}.webp`);
      const buffer = await sharp(input, { failOn: 'none' })
        .resize({ width: tier.width, withoutEnlargement: true, fit: 'inside' })
        .webp({ quality: tier.quality, effort: 5, smartSubsample: true })
        .toBuffer();
      bytes += buffer.length;
      await writeFile(output, buffer);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return bytes;
}

async function main() {
  const files = await listSourceFrames();
  console.log(`[frames] source frames: ${files.length}`);

  if (existsSync(OUT_ROOT)) {
    await rm(OUT_ROOT, { recursive: true, force: true });
  }
  await mkdir(OUT_ROOT, { recursive: true });

  sharp.cache({ files: 0, items: 40, memory: 48 });

  const report = [];
  for (const tier of TIERS) {
    const started = Date.now();
    const bytes = await encodeTier(files, tier);
    report.push({
      width: tier.width,
      totalKB: Math.round(bytes / 1024),
      avgKB: Math.round(bytes / 1024 / files.length),
      seconds: ((Date.now() - started) / 1000).toFixed(1),
    });
    console.log(
      `[frames] ${tier.width}w -> ${(bytes / 1024 / 1024).toFixed(2)} MB ` +
        `(${Math.round(bytes / 1024 / files.length)} KB/frame) in ${report.at(-1).seconds}s`,
    );
  }

  const manifest = {
    version: 1,
    id: ID,
    fps: FPS,
    generatedAt: new Date().toISOString(),
    poster: '/media/hero-poster-960.webp',
    stills: {
      stitch: '/media/still-stitch-1280.webp',
      stitchMid: '/media/still-stitch-mid-1280.webp',
      flower: '/media/still-flower-1280.webp',
      flowerTight: '/media/still-flower-tight-1280.webp',
      purse: '/media/still-purse-1280.webp',
      keychain: '/media/still-purse-keychain-1280.webp',
      collection: '/media/still-collection-1280.webp',
    },
    sets: {
      landscape: buildSetEntry(TIERS[0].width, files.length),
    },
  };

  await writeFile(path.join(OUT_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`[frames] manifest written with set "landscape" (${files.length} frames).`);
  console.log(
    '[frames] To ship a native 9:16 hero later, add a "portrait" entry here — ' +
      'the canvas component already prefers it on portrait viewports.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});