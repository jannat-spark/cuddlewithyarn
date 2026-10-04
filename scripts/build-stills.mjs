/**
 * Stills pipeline.
 *
 * Produces the fixed imagery the site needs regardless of whether the frame
 * sequence can load:
 *   public/media/hero-poster-1280.webp   first-paint poster for the canvas hero
 *   public/media/still-*-1280.webp        chapter stills (reduced motion, editorial)
 *   public/media/still-*-720.webp         small-screen variants
 *   public/media/og-hero.jpg              1200x630 Open Graph card
 *   public/media/atelier-*.webp           "real work" section photography
 */
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'frames');
const OUT = path.join(ROOT, 'public', 'media');

const frame = (n) => path.join(SRC, `ezgif-frame-${String(n).padStart(3, '0')}.jpg`);

const WINE = '#2E0A14';
const CRIMSON = '#8E0E22';
const CREAM = '#F7EDE4';

/** Named stills, keyed by output basename. Prefixed `still-` to keep the
 *  directory readable next to the product and editorial crops. */
const STILLS = [
  { name: 'still-stitch', frame: 1, alt: 'Two hands holding a crochet hook above the first crimson stitch' },
  { name: 'still-stitch-mid', frame: 30, alt: 'Hands crocheting a small crimson disc with three balls of yarn' },
  { name: 'still-flower', frame: 85, alt: 'A blush and ivory rose in progress, worked by hand' },
  { name: 'still-flower-tight', frame: 130, alt: 'Close view of the ivory and blush rose taking shape' },
  { name: 'still-purse', frame: 190, alt: 'Blush and ivory rose crochet purse lifted by a pearl handle' },
  { name: 'still-purse-keychain', frame: 230, alt: 'Ivory rose keychain with a pearl loop handle' },
  { name: 'still-collection', frame: 271, alt: 'The full collection: red rose purse, blush rose purse and crochet flowers' },
];

const TIER_WIDTHS = [720, 1280];

async function emit(input, name, { width, quality = 72 }) {
  const out = path.join(OUT, `${name}-${width}.webp`);
  const buf = await sharp(input, { failOn: 'none' })
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 5 })
    .toBuffer();
  await writeFile(out, buf);
  return buf.length;
}

/** Frame 271 is the collection reveal and the most brand-expressive image. */
async function buildOgCard() {
  const W = 1200;
  const H = 630;
  const base = await sharp(frame(271), { failOn: 'none' })
    .resize({ width: W, height: H, fit: 'cover', position: 'centre' })
    .toBuffer();

  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
       <defs>
         <linearGradient id="l" x1="0" y1="0" x2="1" y2="0.35">
           <stop offset="0" stop-color="${WINE}" stop-opacity="0.92"/>
           <stop offset="0.55" stop-color="${WINE}" stop-opacity="0.55"/>
           <stop offset="1" stop-color="${WINE}" stop-opacity="0.12"/>
         </linearGradient>
         <linearGradient id="b" x1="0" y1="1" x2="0" y2="0">
           <stop offset="0" stop-color="${WINE}" stop-opacity="0.55"/>
           <stop offset="0.5" stop-color="${WINE}" stop-opacity="0"/>
         </linearGradient>
       </defs>
       <rect width="${W}" height="${H}" fill="url(#l)"/>
       <rect width="${W}" height="${H}" fill="url(#b)"/>
       <g fill="${CREAM}" font-family="Georgia, 'Times New Roman', serif">
         <text x="72" y="286" font-size="17" letter-spacing="9" opacity="0.72">CUDDLE WITH YARN</text>
         <text x="72" y="366" font-size="60">One thread.</text>
         <text x="72" y="432" font-size="60" font-style="italic">Endless little wonders.</text>
       </g>
       <g fill="${CREAM}" font-family="Georgia, 'Times New Roman', serif" opacity="0.8">
         <text x="72" y="500" font-size="19" letter-spacing="4.5">HANDMADE CROCHET · MADE TO ORDER</text>
       </g>
       <rect x="72" y="528" width="86" height="2" fill="${CRIMSON}"/>
     </svg>`,
  );

  await sharp(base)
    .composite([{ input: overlay }])
    .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(path.join(OUT, 'og-hero.jpg'));

  await sharp(base)
    .resize({ width: 1024 })
    .webp({ quality: 74 })
    .toFile(path.join(OUT, 'og-hero-1024.webp'));
}

async function main() {
  if (!existsSync(SRC)) throw new Error(`Missing source frames at ${SRC}`);
  await mkdir(OUT, { recursive: true });
  // Only this script's own outputs are cleared — `shop/` and `editorial/` are
  // produced by build-products.mjs and must survive.
  for (const entry of await readdir(OUT)) {
    if (/^(still-|hero-poster-|og-hero|stills\.json)/.test(entry)) {
      await rm(path.join(OUT, entry), { force: true, recursive: true });
    }
  }

  for (const still of STILLS) {
    for (const width of TIER_WIDTHS) {
      const bytes = await emit(frame(still.frame), still.name, { width });
      if (width === TIER_WIDTHS[TIER_WIDTHS.length - 1]) {
        console.log(`[stills] ${still.name.padEnd(16)} frame ${still.frame} → ${Math.round(bytes / 1024)} KB`);
      }
    }
  }

  // The poster is the very first thing the hero paints, so it is the lightest
  // representation of frame 001.
  await emit(frame(1), 'hero-poster', { width: 960, quality: 68 });

  await buildOgCard();
  console.log('[stills] og-hero.jpg (1200x630) written');

  await writeFile(
    path.join(OUT, 'stills.json'),
    JSON.stringify(
      Object.fromEntries(STILLS.map((s) => [s.name, { src: `/media/${s.name}-1280.webp`, alt: s.alt }])),
      null,
      2,
    ),
  );
  console.log('[stills] stills.json written');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});