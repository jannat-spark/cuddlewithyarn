/**
 * Canonical catalogue.
 *
 * This is the seed used by `npm run db:seed` (Supabase), the development
 * fallback store when Supabase credentials are absent, and the safety net if a
 * production database is reachable but empty. Prices are whole rupees.
 */
import type { Product } from './types';

type SeedProduct = Omit<Product, 'id' | 'createdAt'> & { createdAt?: string };

const img = (src: string, alt: string, width: number, height: number) => ({
  src,
  srcSet: `${src.replace('-800.webp', '-400.webp')} 400w, ${src} 800w`,
  alt,
  width,
  height,
});

const SEED: SeedProduct[] = [
  {
    slug: 'crimson-rose-purse',
    name: 'Crimson Rose Purse',
    tagline: 'The one that started it all.',
    description:
      'A single rose worked in one continuous spiral from the centre out, in deep crimson cotton yarn. Shaped over two evenings, blocked by hand, and finished with a strand of freshwater pearls on a gold-filled clasp. The interior is lined in blush satin and closes with a spring hook, so it holds a phone, keys and a lipstick without stretching.',
    price: 2450,
    compareAt: null,
    category: 'bags',
    availability: 'made_to_order',
    featured: true,
    leadTimeDays: 12,
    materials: 'Cotton yarn, gold-filled hardware, freshwater pearls, satin lining',
    details: [
      'One continuous spiral rose, 9 cm across',
      'Freshwater pearl handle, 34 cm drop',
      'Lined interior with a spring-close clasp',
      'Fits a phone, cardholder and keys',
      'Each rose is blocked and pressed by hand',
    ],
    images: [
      img(
        '/media/shop/crimson-rose-purse-1-800.webp',
        'Crimson rose crochet purse with a pearl handle on a warm ivory surface',
        576,
        720,
      ),
      img(
        '/media/shop/crimson-rose-purse-2-800.webp',
        'Close detail of the spiralled crimson rose worked in tight crochet stitches',
        376,
        470,
      ),
      img(
        '/media/shop/crimson-rose-purse-3-800.webp',
        'The crimson rose purse turning to reveal the pearl strap and side seams',
        576,
        720,
      ),
    ],
  },
  {
    slug: 'blush-pearl-rose-purse',
    name: 'Blush Pearl Rose Purse',
    tagline: 'Ivory, blush and a lot of pearls.',
    description:
      'The same rose, softened: a blush centre spiralling out through three shades of pink into ivory petals, with pearls sewn along the outer edge one stitch at a time. Lighter to carry and slightly larger than the crimson, it is the piece most people reach for first.',
    price: 2650,
    compareAt: null,
    category: 'bags',
    availability: 'made_to_order',
    featured: true,
    leadTimeDays: 14,
    materials: 'Cotton yarn, freshwater pearls, gold-filled hardware, satin lining',
    details: [
      'Four-tone spiral, 11 cm across',
      'Pearl trim stitched along the petal edge',
      'Lined interior with a spring-close clasp',
      'Slightly larger than the Crimson Rose Purse',
    ],
    images: [
      img(
        '/media/shop/blush-pearl-rose-purse-1-800.webp',
        'Blush and ivory rose crochet purse finished with a strand of pearls',
        552,
        690,
      ),
      img(
        '/media/shop/blush-pearl-rose-purse-2-800.webp',
        'The blush rose purse lifted by its pearl handle against a cream backdrop',
        544,
        680,
      ),
      img(
        '/media/shop/blush-pearl-rose-purse-3-800.webp',
        'Detail of the blush rose layered over ivory petals with pearl trim',
        432,
        540,
      ),
    ],
  },
  {
    slug: 'pearl-chain-rose-purse',
    name: 'Pearl Chain Rose Purse',
    tagline: 'The evening one.',
    description:
      'A smaller rose on a long pearl chain, so it sits at the hip under a coat or hangs from the wrist at a wedding. The chain is threaded, not glued, and comes apart in a minute if you would rather carry it as a clutch.',
    price: 1950,
    compareAt: null,
    category: 'bags',
    availability: 'made_to_order',
    featured: false,
    leadTimeDays: 10,
    materials: 'Cotton yarn, pearl chain, gold-filled hardware',
    details: [
      '7 cm rose on a 52 cm pearl chain',
      'Detachable chain — clutch or shoulder',
      'Deep wine lining with a card slot',
    ],
    images: [
      img('/media/shop/pearl-chain-rose-purse-800.webp', 'Mini rose purse with a long pearl chain handle', 496, 620),
    ],
  },
  {
    slug: 'crimson-rose-hair-tie',
    name: 'Crimson Rose Hair Tie',
    tagline: 'A whole rose, not a print.',
    description:
      'A fully crocheted rose on an elastic band wrapped in ivory cotton. It holds hair without the crease a scrunchie leaves, and it never comes apart in a bag.',
    price: 490,
    compareAt: null,
    category: 'flowers',
    availability: 'in_stock',
    featured: false,
    leadTimeDays: 3,
    materials: 'Cotton yarn, elastic core',
    details: ['4.5 cm rose', 'Hand-crocheted cotton band', 'Gentle elastic, no metal'],
    images: [
      img(
        '/media/shop/crimson-rose-hair-tie-800.webp',
        'Crimson rose crochet hair tie on an ivory scrunchie band',
        192,
        240,
      ),
    ],
  },
  {
    slug: 'blush-rose-hair-tie',
    name: 'Blush Rose Hair Tie',
    tagline: 'Soft, with a cream centre.',
    description:
      'The same band in a dusty blush rose with an ivory centre. The one we wear most in the studio — it goes with everything and nothing in particular.',
    price: 490,
    compareAt: null,
    category: 'flowers',
    availability: 'in_stock',
    featured: false,
    leadTimeDays: 3,
    materials: 'Cotton yarn, elastic core',
    details: ['4 cm rose', 'Hand-crocheted cotton band', 'Gentle elastic, no metal'],
    images: [
      img('/media/shop/blush-rose-hair-tie-800.webp', 'Blush crochet rose hair tie with a cream centre', 232, 290),
    ],
  },
  {
    slug: 'ivory-pearl-rosette',
    name: 'Ivory Pearl Rosette',
    tagline: 'Formal, quietly.',
    description:
      'Five crocheted ivory petals, cupped and pinned at the centre with a single freshwater pearl. Made for weddings, and for the day you suddenly need to look finished.',
    price: 590,
    compareAt: null,
    category: 'flowers',
    availability: 'in_stock',
    featured: false,
    leadTimeDays: 3,
    materials: 'Cotton yarn, freshwater pearl, brass pin',
    details: ['5 cm rosette', 'Sewn pearl centre', 'Also available as a brooch on request'],
    images: [
      img(
        '/media/shop/ivory-pearl-rosette-800.webp',
        'Ivory rosette finished with a pearl centre on a champagne band',
        156,
        195,
      ),
    ],
  },
  {
    slug: 'ivory-daisy-scrunchie',
    name: 'Ivory Daisy Scrunchie',
    tagline: 'Champagne band, cream petals.',
    description:
      'A flat six-petal daisy in ivory cotton on a champagne elastic band. Reads as a flower from a distance and as a neat little object up close.',
    price: 450,
    compareAt: null,
    category: 'flowers',
    availability: 'in_stock',
    featured: false,
    leadTimeDays: 3,
    materials: 'Cotton yarn, elastic core',
    details: ['5 cm bloom', 'Flat six-petal construction', 'Champagne elastic band'],
    images: [
      img(
        '/media/shop/ivory-daisy-scrunchie-800.webp',
        'Ivory daisy crochet scrunchie on a champagne band',
        184,
        230,
      ),
    ],
  },
  {
    slug: 'crimson-rose-bloom',
    name: 'Crimson Rose Bloom',
    tagline: 'A small rose, deep wine centre.',
    description:
      'The smallest rose we make — two and a half centimetres across, finished with a pearl button. Sold as a pair; pinned to a bag, a lapel or a gift.',
    price: 550,
    compareAt: null,
    category: 'flowers',
    availability: 'in_stock',
    featured: false,
    leadTimeDays: 3,
    materials: 'Cotton yarn, pearl button, brass pin',
    details: ['2.5 cm bloom', 'Sold as a pair', 'Pinned or magnet-backed'],
    images: [
      img(
        '/media/shop/crimson-rose-bloom-800.webp',
        'Small crimson crochet rose bloom with a pearl button centre',
        192,
        240,
      ),
    ],
  },
  {
    slug: 'pearl-chain-keychain',
    name: 'Pearl Chain Keychain',
    tagline: 'Keys, but make it an occasion.',
    description:
      'An ivory rose on a pearl loop with gold-filled hardware and a lobster clasp. Our most-gifted piece, usually to someone who has just moved house.',
    price: 1450,
    compareAt: null,
    category: 'accessories',
    availability: 'made_to_order',
    featured: true,
    leadTimeDays: 8,
    materials: 'Cotton yarn, freshwater pearls, gold-filled hardware',
    details: ['9 cm rose', '14 cm pearl loop', 'Gold-filled lobster clasp', 'Gift wrapped in ivory tissue'],
    images: [
      img(
        '/media/shop/pearl-chain-keychain-800.webp',
        'Ivory crochet rose keychain with a pearl loop handle',
        760,
        950,
      ),
    ],
  },
  {
    slug: 'bunny-stitch-applique',
    name: 'Bunny Stitch Appliqué',
    tagline: 'For coats, bags and cardigans.',
    description:
      'An ivory bunny worked in tiny even stitches with a crimson rose at the ear, backed with a felt patch and hand-stitched on. Sewn on, not glued — it will outlive the coat.',
    price: 850,
    compareAt: null,
    category: 'accessories',
    availability: 'made_to_order',
    featured: false,
    leadTimeDays: 10,
    materials: 'Cotton yarn, felt backing, linen thread',
    details: ['9 cm tall', 'Felt-backed and hand-stitched', 'Sewn, never glued'],
    images: [
      img(
        '/media/shop/bunny-stitch-applique-800.webp',
        'Hand-finished bunny stitch applique in ivory with a crimson rose',
        264,
        330,
      ),
    ],
  },
];

const CREATED = '2026-01-08T09:00:00.000Z';

/** Deterministic v4-shaped UUID so seed rows are stable across re-seeds. */
function seedId(slug: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < slug.length; i += 1) {
    h1 = Math.imul(h1 ^ slug.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + slug.charCodeAt(i) * (i + 7), 2654435761) >>> 0;
  }
  const hex = (n: number, len: number) => n.toString(16).padStart(len, '0').slice(-len);
  return [
    hex(h1, 8),
    hex(h2, 4),
    `4${hex(h1 ^ h2, 4).slice(1)}`,
    ((h2 & 0x3fff) | 0x8000).toString(16).padStart(4, '0'),
    `${hex(h1, 8)}${hex(h2, 4)}`,
  ].join('-');
}

export const SEED_PRODUCTS: Product[] = SEED.map((p) => ({
  ...p,
  createdAt: p.createdAt ?? CREATED,
  id: seedId(p.slug),
}));

export const SEED_PRODUCTS_BY_SLUG = new Map(SEED_PRODUCTS.map((p) => [p.slug, p]));