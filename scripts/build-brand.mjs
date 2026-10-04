/**
 * Brand asset pipeline.
 *
 * Turns the three supplied 2K identity artworks in `images!!/` into the small,
 * correctly-sized files the site actually loads:
 *
 *   public/brand/wordmark-*.webp   the horizontal "Cuddle with Yarn" lockup
 *   public/brand/stamp-*.webp      the framed stacked lockup
 *   public/brand/seal-*.webp       the circular yarn badge (avatar, watermark)
 *   src/app/icon.png               favicon, ink on brand paper
 *   src/app/apple-icon.png         home-screen icon
 *
 * Each mark ships in three colourways, because the same artwork has to sit on
 * the brand paper *and* on the deep-wine panels without a second design:
 *
 *   paper      brown artwork flattened onto the exact brand off-white. Two or
 *              three kilobytes, because it is a flat colour field — used where
 *              the surface behind it is the paper token.
 *   ink        transparent alpha, filled with the brand brown. For tinted
 *              panels and anything the paper flatten would show a seam on.
 *   champagne  the same alpha, filled with champagne, for wine panels.
 *
 * The knockouts are built from a luminance mask rather than a colour key: the
 * artwork is monochrome (one brown on one cream), so a percentile-fitted
 * transfer recovers a clean alpha ramp — and the fill colour is then free,
 * which is what keeps `ink` and `champagne` identical in shape.
 *
 * The alpha is measured *per output size* rather than downscaled from a master.
 * The supplied artwork carries hairline flourishes barely a pixel wide at 2K;
 * scaled into a 28px-tall header they are sub-pixel noise that costs ~80 KB in
 * WebP alpha and reads as dirt. Measuring at each size and applying a soft floor
 * drops the faintest of them, which is both cheaper and cleaner.
 */
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'images!!');
const OUT = path.join(ROOT, 'public', 'brand');
const APP = path.join(ROOT, 'src', 'app');

/** Sampled from the supplied artwork. The site's paper token matches this. */
const PAPER = '#f9f3e4';
/** Deepest brown in the lockups; the badge is a touch darker still. */
const INK = '#4a2a21';
/** The champagne already used for type on wine. */
const CHAMPAGNE = '#e7d4b6';

/** Reference size for measuring the artwork bounds, as 0..1 fractions. */
const REF_WIDTH = 1600;
/** Alpha measured at twice the output width, so the browser never upscales. */
const SUPERSAMPLE = 2;
/** Faintest alpha discarded. See the note above about hairline flourishes. */
const SOFT_FLOOR = 0.22;
/** Breathing room kept around the artwork, as a fraction of the trimmed box. */
const BOX_PAD = 0.014;

const MARKS = [
  {
    id: 'wordmark',
    file: 'Cuddle_with_Yarn_logo_design_2K_20261003212306.jpg',
    widths: [720, 360],
    label: 'horizontal lockup',
  },
  {
    id: 'stamp',
    file: 'Crochet_brand_logo_design_2K_20261003212303.jpg',
    widths: [400, 200],
    label: 'framed stamp',
  },
  {
    id: 'seal',
    file: 'Circular_yarn_profile_badge_design_2K_20261003212231.jpg',
    widths: [400, 200],
    label: 'circular yarn badge',
    square: true,
  },
];

const VARIANTS = [
  { name: 'ink', colour: INK },
  { name: 'champagne', colour: CHAMPAGNE },
];

function readMark(file) {
  const input = path.join(SRC, file);
  if (!existsSync(input)) throw new Error(`Missing brand artwork: ${input}`);
  return input;
}

/**
 * Percentile-fitted luminance transfer at a given width, returned as a
 * single-channel alpha buffer. One channel is the whole identity, so any fill
 * colour is a byte-for-byte clean recolour of it.
 */
async function buildAlpha(input, width) {
  const { data, info } = await sharp(input, { failOn: 'none' })
    .resize({ width, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels;
  const count = info.width * info.height;

  const luma = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    luma[i] = 0.2126 * data[i * ch] + 0.7152 * data[i * ch + 1] + 0.0722 * data[i * ch + 2];
  }

  // The artwork occupies a small part of a large pale field, so the mid and low
  // percentiles of luminance describe the paper and the stroke exactly.
  const sorted = Float32Array.from(luma).sort();
  const paper = sorted[Math.floor(count * 0.6)];
  const ink = sorted[Math.floor(count * 0.005)];
  const span = Math.max(24, paper - ink);

  const alpha = Buffer.alloc(count);
  for (let i = 0; i < count; i += 1) {
    const a = (paper - luma[i]) / span;
    // Gamma lift keeps the strokes from thinning; the floor discards the
    // faintest flourishes once they are near or below one device pixel.
    const lifted = Math.pow(Math.min(1, Math.max(0, a)), 0.82);
    alpha[i] = Math.round(Math.min(1, Math.max(0, (lifted - SOFT_FLOOR) / (1 - SOFT_FLOOR))) * 255);
  }

  return { alpha, width: info.width, height: info.height };
}

/** Artwork bounds as 0..1 fractions, so every output size crops identically. */
async function measureBox(input) {
  const { alpha, width, height } = await buildAlpha(input, REF_WIDTH);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (alpha[y * width + x] < 24) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error('Brand artwork measured empty — mask threshold too high');
  const padX = (maxX - minX + 1) * BOX_PAD;
  const padY = (maxY - minY + 1) * BOX_PAD;
  return {
    left: Math.max(0, (minX - padX) / width),
    top: Math.max(0, (minY - padY) / height),
    width: Math.min(1, (maxX - minX + 1 + padX * 2) / width),
    height: Math.min(1, (maxY - minY + 1 + padY * 2) / height),
  };
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/** Integer extract box for a given output width, from the fractional bounds. */
function boxAt(box, width, height) {
  const left = Math.round(box.left * width);
  const top = Math.round(box.top * height);
  return {
    left,
    top,
    width: Math.max(1, Math.min(width - left, Math.round(box.width * width))),
    height: Math.max(1, Math.min(height - top, Math.round(box.height * height))),
  };
}

async function writeWebp(source, width, name) {
  const file = path.join(OUT, name);
  const info = await sharp(source)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(file);
  return info.size;
}

/**
 * Solid fill of `colour`, shaped by a fresh alpha measurement and cropped.
 *
 * The crop is done here rather than with sharp's `extract` because extract runs
 * late in sharp's pipeline and is silently dropped when it follows
 * `joinChannel` — which would ship the whole square canvas with the mark
 * floating in the middle of it. Slicing the buffer keeps the output exactly the
 * measured artwork bounds at every size.
 */
async function knockout(input, box, outWidth, colour) {
  const measure = Math.min(outWidth * SUPERSAMPLE, REF_WIDTH * 2);
  const meta = await buildAlpha(input, measure);
  const region = boxAt(box, meta.width, meta.height);
  const { r, g, b } = hexToRgb(colour);

  const data = Buffer.alloc(region.width * region.height * 4);
  for (let y = 0; y < region.height; y += 1) {
    const row = (region.top + y) * meta.width + region.left;
    for (let x = 0; x < region.width; x += 1) {
      const at = (y * region.width + x) * 4;
      data[at] = r;
      data[at + 1] = g;
      data[at + 2] = b;
      data[at + 3] = meta.alpha[row + x];
    }
  }

  return sharp(data, { raw: { width: region.width, height: region.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** The original artwork, flattened onto the exact brand paper. */
async function onPaper(input, box, outWidth) {
  const measure = Math.min(outWidth * SUPERSAMPLE, REF_WIDTH * 2);
  const source = await sharp(input, { failOn: 'none' }).metadata();
  const sourceWidth = source.width ?? measure;
  const scale = Math.min(1, measure / sourceWidth);
  const width = Math.round(sourceWidth * scale);
  const height = Math.round((source.height ?? sourceWidth) * scale);
  // Buffered before the extract: sharp applies extract after resize, so the two
  // have to be separate operations.
  const resized = await sharp(input, { failOn: 'none' })
    .resize({ width, height })
    .flatten({ background: PAPER })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const region = boxAt(box, width, height);
  return sharp(resized).extract(region).png({ compressionLevel: 9 }).toBuffer();
}

/** Pad onto an opaque square so the favicon never shows a transparent corner. */
async function squarePng(png, size, background) {
  const fitted = await sharp(png)
    .resize({
      width: size,
      height: size,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: fitted, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  if (!existsSync(SRC)) throw new Error(`Missing source artwork at ${SRC}`);
  await mkdir(OUT, { recursive: true });
  for (const entry of await readdir(OUT)) {
    if (entry.endsWith('.webp')) await rm(path.join(OUT, entry), { force: true });
  }

  for (const mark of MARKS) {
    const input = readMark(mark.file);
    const box = await measureBox(input);
    const widest = mark.widths[0];

    for (const width of mark.widths) {
      for (const variant of VARIANTS) {
        const bytes = await writeWebp(
          await knockout(input, box, width, variant.colour),
          width,
          `${mark.id}-${variant.name}-${width}.webp`,
        );
        if (width === widest && variant.name === 'ink') {
          console.log(
            `[brand] ${mark.id.padEnd(9)} ${mark.label.padEnd(20)} ` +
              `ink@${width} ${(bytes / 1024).toFixed(1)} KB`,
          );
        }
      }
      const paperBytes = await writeWebp(
        await onPaper(input, box, width),
        width,
        `${mark.id}-paper-${width}.webp`,
      );
      if (width === widest) {
        console.log(
          `[brand] ${mark.id.padEnd(9)} ${''.padEnd(20)} paper@${width} ${(paperBytes / 1024).toFixed(1)} KB`,
        );
      }
    }

    if (mark.square) {
      await writeFile(
        path.join(APP, 'icon.png'),
        await squarePng(await knockout(input, box, 512, INK), 512, PAPER),
      );
      await writeFile(
        path.join(APP, 'apple-icon.png'),
        await squarePng(await knockout(input, box, 180, INK), 180, PAPER),
      );
      console.log('[brand] icon.png + apple-icon.png written');
    }
  }

  console.log(`[brand] done → ${path.relative(ROOT, OUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});