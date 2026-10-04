/**
 * Single source of truth for brand facts, navigation and contact details.
 * Everything user-visible that a human might need to change lives here.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cuddlewithyarn.com'
).replace(/\/$/, '');

export const BRAND = {
  name: 'Cuddle With Yarn',
  shortName: 'CWY',
  tagline: 'One thread. Endless little wonders.',
  description:
    'Handmade crochet atelier. Every rose, purse and bloom is crocheted by hand, one stitch at a time, and finished with pearls.',
  founded: '2019',
  location: 'Jaipur, Rajasthan',
  currency: 'INR',
  currencySymbol: '₹',
  email: 'hello@cuddlewithyarn.com',
  phone: '+91 94013 13167',
  whatsapp: '+91 94013 13167',
  instagram: 'https://instagram.com/cuddlewithyarn',
  instagramHandle: '@cuddlewithyarn',
  address: {
    line1: 'Studio 4, Rose House',
    line2: 'C-Scheme, Jaipur 302001',
    region: 'Rajasthan',
    country: 'India',
  },
  social: {
    instagram: 'https://instagram.com/cuddlewithyarn',
  },
} as const;

/** Digits only, for wa.me and tel: hrefs. */
export const PHONE_E164 = BRAND.phone.replace(/\D/g, '');

/* --------------------------------------------------------------- brand marks */

/**
 * The three identity artworks, emitted by `npm run assets:brand` from the 2K
 * sources in `images!!/`.
 *
 * `tone` picks the colourway rather than the component: `ink` is the brand brown
 * with a transparent background (safe on any light surface), `champagne` is the
 * same artwork for deep-wine panels, and `paper` is the original flattened onto
 * the exact brand off-white — two to five kilobytes, but only correct where the
 * surface really is `--color-paper`.
 *
 * Intrinsic sizes are declared so callers can reserve the box and let the header
 * cross-fade between colourways without a reflow.
 */
export type BrandMarkName = 'wordmark' | 'stamp' | 'seal';
export type BrandTone = 'ink' | 'champagne' | 'paper';

const MARKS: Record<BrandMarkName, { large: number; small: number; width: number; height: number }> = {
  wordmark: { large: 720, small: 360, width: 720, height: 169 },
  stamp: { large: 400, small: 200, width: 400, height: 257 },
  seal: { large: 400, small: 200, width: 400, height: 401 },
};

export function brandMark(name: BrandMarkName, tone: BrandTone = 'ink') {
  const mark = MARKS[name];
  return {
    src: `/brand/${name}-${tone}-${mark.large}.webp`,
    srcSet: `/brand/${name}-${tone}-${mark.small}.webp ${mark.small}w, /brand/${name}-${tone}-${mark.large}.webp ${mark.large}w`,
    width: mark.width,
    height: mark.height,
  };
}

export type NavItem = { href: string; label: string };

export const PRIMARY_NAV: NavItem[] = [
  { href: '/shop', label: 'Shop' },
  { href: '/shop/bags', label: 'Bags' },
  { href: '/shop/flowers', label: 'Flowers' },
  { href: '/atelier', label: 'Atelier' },
  { href: '/custom', label: 'Custom' },
];

export const COLLECTIONS = [
  {
    slug: 'bags',
    label: 'Bags',
    title: 'Bags',
    blurb: 'Rose purses and pearl-handled bags, worked in one continuous spiral.',
    image: '/media/shop/crimson-rose-purse-1-800.webp',
    imageAlt: 'Crimson rose crochet purse',
    href: '/shop/bags',
  },
  {
    slug: 'accessories',
    label: 'Accessories',
    title: 'Accessories',
    blurb: 'Keychains and appliqués that finish a look without shouting.',
    image: '/media/shop/pearl-chain-keychain-800.webp',
    imageAlt: 'Ivory crochet rose keychain with a pearl loop handle',
    href: '/shop/accessories',
  },
  {
    slug: 'flowers',
    label: 'Flowers',
    title: 'Flowers',
    blurb: 'Crochet roses and rosettes for hair, gifts and quiet wrists.',
    image: '/media/shop/blush-rose-hair-tie-800.webp',
    imageAlt: 'Blush crochet rose hair tie',
    href: '/shop/flowers',
  },
  {
    slug: 'custom',
    label: 'Custom',
    title: 'Custom',
    blurb: 'Send us an idea, a colour and a size. We will send back a stitch plan.',
    image: '/media/editorial/atelier-stitch-1200.webp',
    imageAlt: 'Ivory yarn being worked into a blush rose',
    href: '/custom',
  },
] as const;

export type CollectionSlug = (typeof COLLECTIONS)[number]['slug'];

/** Categories that are real pages under /shop/[category]. */
export const SHOP_CATEGORIES = ['bags', 'accessories', 'flowers'] as const;
export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

export function isShopCategory(value: string | undefined): value is ShopCategory {
  return SHOP_CATEGORIES.includes(value as ShopCategory);
}

export const CATEGORIES: CollectionSlug[] = ['bags', 'accessories', 'flowers', 'custom'];

/**
 * What the studio puts in the shop window.
 *
 * The homepage is a window, not the catalogue: it shows these four pieces and
 * links onward. Everything else is browsable on /shop and its category pages.
 * Order is the display order — the first entry leads the row.
 *
 * A slug that no longer exists is skipped rather than breaking the page, so
 * retiring a piece is a one-line edit here.
 */
export const HOT_PRODUCT_SLUGS = [
  'crimson-rose-purse',
  'blush-pearl-rose-purse',
  'pearl-chain-keychain',
  'blush-rose-hair-tie',
] as const;

/** Free shipping threshold and flat rate, in paise-free whole rupees. */
export const SHIPPING = {
  flat: 149,
  freeOver: 3500,
  internationalFlat: 2400,
} as const;

/** Turnaround for anything made to order. */
export const DEFAULT_LEAD_TIME_DAYS = 12;

export const ORDER_STATUSES = [
  'new',
  'confirmed',
  'processing',
  'shipped',
  'completed',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  processing: 'In the making',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** Ordered pipeline; used to constrain admin status transitions. */
export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['completed', 'cancelled'],
  completed: [],
  cancelled: ['new'],
};