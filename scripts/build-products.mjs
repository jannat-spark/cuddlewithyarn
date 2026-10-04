/**
 * Product + editorial photography pipeline.
 *
 * The only real photography of these pieces that exists is the frame sequence
 * itself, so the catalogue images are cut directly from it. Nothing here is
 * generated or stylised: every crop is a literal frame region, which keeps the
 * "real products are the proof" promise honest.
 *
 * Regions are expressed in source pixels (1920x1080) and snapped to the
 * requested output aspect ratio, centred inside the region.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'frames');
const OUT = path.join(ROOT, 'public', 'media', 'shop');
const EDITORIAL = path.join(ROOT, 'public', 'media', 'editorial');

const frame = (n) => path.join(SRC, `ezgif-frame-${String(n).padStart(3, '0')}.jpg`);

/** Centre `region` inside an `aspect` (w/h) box, clamped to the frame. */
function fitRegion(region, aspect, source = { width: 1920, height: 1080 }) {
  let { left, top, width, height } = region;
  if (width / height > aspect) {
    const w = Math.round(height * aspect);
    left = Math.round(left + (width - w) / 2);
    width = w;
  } else {
    const h = Math.round(width / aspect);
    top = Math.round(top + (height - h) / 2);
    height = h;
  }
  left = Math.max(0, Math.min(left, source.width - width));
  top = Math.max(0, Math.min(top, source.height - height));
  width = Math.min(width, source.width - left);
  height = Math.min(height, source.height - top);
  return { left, top, width, height };
}

const CARD = 4 / 5;

/** Catalogue shots. `alt` is reused as the accessible description. */
const PRODUCT_SHOTS = [
  // Crimson Rose Purse — the signature piece born from the hero animation.
  { out: 'crimson-rose-purse', frame: 271, region: { left: 880, top: 320, width: 650, height: 720 }, alt: 'Crimson rose crochet purse with a pearl handle, resting on a warm ivory surface' },
  { out: 'crimson-rose-purse', frame: 271, region: { left: 960, top: 420, width: 420, height: 470 }, alt: 'Close detail of the spiralled crimson rose worked in tight crochet stitches' },
  { out: 'crimson-rose-purse', frame: 265, region: { left: 900, top: 330, width: 640, height: 720 }, alt: 'The crimson rose purse turning to reveal the pearl strap and side seams' },

  // Blush & Ivory Rose Purse.
  { out: 'blush-pearl-rose-purse', frame: 271, region: { left: 400, top: 110, width: 620, height: 690 }, alt: 'Blush and ivory rose crochet purse finished with a strand of pearls' },
  { out: 'blush-pearl-rose-purse', frame: 190, region: { left: 520, top: 370, width: 760, height: 680 }, alt: 'The blush rose purse lifted by its pearl handle against a cream backdrop' },
  { out: 'blush-pearl-rose-purse', frame: 271, region: { left: 470, top: 200, width: 460, height: 540 }, alt: 'Detail of the blush rose layered over ivory petals with pearl trim' },

  // Pearl Chain Rose Purse (mini).
  { out: 'pearl-chain-rose-purse', frame: 190, region: { left: 560, top: 400, width: 620, height: 620 }, alt: 'Mini rose purse with a long pearl chain handle' },

  // Crochet flowers — hair ties / blooms.
  { out: 'crimson-rose-hair-tie', frame: 271, region: { left: 120, top: 110, width: 300, height: 240 }, alt: 'Crimson rose crochet hair tie on an ivory scrunchie band' },
  { out: 'blush-rose-hair-tie', frame: 271, region: { left: 430, top: 780, width: 270, height: 290 }, alt: 'Blush crochet rose hair tie with a cream centre' },
  { out: 'ivory-pearl-rosette', frame: 271, region: { left: 1348, top: 158, width: 235, height: 195 }, alt: 'Ivory rosette finished with a pearl centre on a champagne band' },
  { out: 'ivory-daisy-scrunchie', frame: 271, region: { left: 1120, top: 60, width: 270, height: 230 }, alt: 'Ivory daisy crochet scrunchie on a champagne band' },
  { out: 'crimson-rose-bloom', frame: 271, region: { left: 1330, top: 830, width: 300, height: 240 }, alt: 'Small crimson crochet rose bloom with a pearl button centre' },

  // Accessories.
  { out: 'pearl-chain-keychain', frame: 230, region: { left: 550, top: 20, width: 760, height: 1000 }, alt: 'Ivory crochet rose keychain with a pearl loop handle' },
  { out: 'bunny-stitch-applique', frame: 271, region: { left: 0, top: 480, width: 360, height: 330 }, alt: 'Hand-finished bunny stitch applique in ivory with a crimson rose' },
];

/** Editorial photography for the "made by hand" / atelier sections. */
const EDITORIAL_SHOTS = [
  { out: 'atelier-hands', frame: 30, region: { left: 30, top: 110, width: 1450, height: 880 }, aspect: 3 / 2, alt: 'Two hands crocheting with a hook, three balls of yarn resting on the table' },
  { out: 'atelier-stitch', frame: 85, region: { left: 470, top: 200, width: 1000, height: 860 }, aspect: 1, alt: 'Ivory yarn being worked into a blush rose, close up' },
  { out: 'atelier-thread', frame: 1, region: { left: 0, top: 0, width: 1920, height: 1080 }, aspect: 3 / 2, alt: 'Crimson, pink and ivory yarn balls on a blush table' },
  { out: 'atelier-collection', frame: 271, region: { left: 0, top: 0, width: 1920, height: 1080 }, aspect: 16 / 9, alt: 'The finished collection arranged on a deep wine backdrop' },
  { out: 'atelier-pearl', frame: 190, region: { left: 380, top: 40, width: 1100, height: 1000 }, aspect: 3 / 2, alt: 'A hand lifting the blush rose purse by its pearl handle' },
  { out: 'atelier-finish', frame: 265, region: { left: 180, top: 60, width: 1560, height: 960 }, aspect: 16 / 9, alt: 'Crimson and blush rose purses with crochet blooms laid out for the final reveal' },
];

const CARD_WIDTHS = [400, 800];

async function emit(input, outDir, name, region, aspect, width, quality = 74) {
  const out = path.join(outDir, `${name}-${width}.webp`);
  const buf = await sharp(input, { failOn: 'none' })
    .extract(region)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 5 })
    .toBuffer();
  await writeFile(out, buf);
  return buf.length;
}

async function main() {
  if (!existsSync(SRC)) throw new Error(`Missing source frames at ${SRC}`);
  if (existsSync(OUT)) await rm(OUT, { recursive: true, force: true });
  if (existsSync(EDITORIAL)) await rm(EDITORIAL, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await mkdir(EDITORIAL, { recursive: true });

  const perProduct = new Map();
  for (const shot of PRODUCT_SHOTS) {
    perProduct.set(shot.out, (perProduct.get(shot.out) ?? 0) + 1);
  }

  const shotsByProduct = new Map();
  const counters = new Map();
  for (const shot of PRODUCT_SHOTS) {
    const n = (counters.get(shot.out) ?? 0) + 1;
    counters.set(shot.out, n);
    const total = perProduct.get(shot.out);
    const stem = total > 1 ? `${shot.out}-${n}` : shot.out;
    const region = fitRegion(shot.region, CARD);
    for (const width of CARD_WIDTHS) {
      await emit(frame(shot.frame), OUT, stem, region, CARD, width);
    }
    const list = shotsByProduct.get(shot.out) ?? [];
    list.push({
      src: `/media/shop/${stem}-800.webp`,
      srcSet: CARD_WIDTHS.map((w) => `/media/shop/${stem}-${w}.webp ${w}w`).join(', '),
      alt: shot.alt,
      width: region.width,
      height: region.height,
    });
    shotsByProduct.set(shot.out, list);
    console.log(`[shop] ${stem.padEnd(28)} frame ${shot.frame} → ${region.width}x${region.height}`);
  }

  for (const shot of EDITORIAL_SHOTS) {
    const region = fitRegion(shot.region, shot.aspect);
    await emit(frame(shot.frame), EDITORIAL, shot.out, region, shot.aspect, 1200, 76);
    await emit(frame(shot.frame), EDITORIAL, `${shot.out}-sm`, region, shot.aspect, 640, 72);
    console.log(`[editorial] ${shot.out.padEnd(20)} → ${region.width}x${region.height}`);
  }

  await writeFile(path.join(OUT, 'index.json'), JSON.stringify(Object.fromEntries(shotsByProduct), null, 2));
  console.log(`[shop] ${shotsByProduct.size} product galleries written`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});