import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductCard from '@/components/shop/ProductCard';
import Reveal from '@/components/layout/Reveal';
import BrandMark from '@/components/brand/BrandMark';
import { getAllProducts } from '@/server/repository';
import { BRAND, COLLECTIONS, SITE_URL, SHOP_CATEGORIES, isShopCategory } from '@/lib/brand';
import { CATEGORY_LABEL } from '@/lib/types';

export const revalidate = 300;

type Params = Promise<{ category: string }>;

const CATEGORY_STORY: Record<string, { intro: string; notes: string[] }> = {
  bags: {
    intro:
      'One continuous spiral from the centre out, blocked flat for two days, then lined and finished with a strand of freshwater pearls. No seams, no glue, and nowhere for a mistake to hide.',
    notes: [
      'Every bag is made after you order it — nothing is warehoused in bulk.',
      'The pearl handle is threaded, so it can be swapped or shortened.',
      'Each one is lined and photographed before it leaves the studio.',
    ],
  },
  accessories: {
    intro:
      'The small things that finish an outfit: a rose on a pearl loop, an ivory bunny sewn onto a coat. Felt-backed and hand-stitched, never glued, so they outlive the thing they are attached to.',
    notes: [
      'Our most-gifted piece is the pearl chain keychain.',
      'Appliqués ship with needle and thread, not with glue.',
      'Gift wrapped in ivory tissue at no extra charge.',
    ],
  },
  flowers: {
    intro:
      'Crochet roses and rosettes worked in cotton, sized for a wrist, a hair tie, a lapel or a gift. They hold their shape because they are blocked flat, not because of the elastic.',
    notes: [
      'In stock pieces ship within three days.',
      'Sold in pairs where it makes sense — ask and we will split them.',
      'Colourways are limited to what we can honestly dye four times a year.',
    ],
  },
};

function storyFor(slug: string) {
  return CATEGORY_STORY[slug] ?? { intro: '', notes: [] };
}

export function generateStaticParams() {
  return SHOP_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category } = await params;
  if (!isShopCategory(category)) return { title: 'Collection not found' };

  const collection = COLLECTIONS.find((c) => c.slug === category);
  const label = CATEGORY_LABEL[category] ?? category;
  const canonical = `/shop/${category}`;
  const description = `${label} from ${BRAND.name}: ${collection?.blurb ?? ''} Handmade crochet in ${BRAND.location}, made to order.`;

  return {
    title: `${label} — handmade crochet`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${label} · ${BRAND.name}`,
      description,
      url: `${SITE_URL}${canonical}`,
      images: [
        collection
          ? { url: collection.image, width: 800, height: 1000, alt: collection.imageAlt }
          : { url: '/media/og-hero.jpg', width: 1200, height: 630, alt: label },
      ],
    },
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { category } = await params;
  if (!isShopCategory(category)) notFound();

  const collection = COLLECTIONS.find((c) => c.slug === category)!;
  const label = CATEGORY_LABEL[category] ?? category;
  const all = await getAllProducts();
  const products = all.filter((product) => product.category === category);

  // Deliberately from *other* categories: this is the "you will also want"
  // rail, not a second grid of the same thing.
  const others = all
    .filter((product) => product.category !== category && product.availability !== 'sold_out')
    .slice(0, 3);

  // Sibling collections. Custom is a page too, but it is a different kind of
  // thing — a conversation rather than a shelf — so it gets its own slot below.
  const siblings = COLLECTIONS.filter((c) => c.slug !== category && c.slug !== 'custom');

  const { intro, notes } = storyFor(category);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/shop` },
      {
        '@type': 'ListItem',
        position: 3,
        name: label,
        item: `${SITE_URL}/shop/${category}`,
      },
    ],
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${label} — ${BRAND.name}`,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/product/${product.slug}`,
      name: product.name,
    })),
  };

  return (
    <div className="pb-24 md:pb-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      {/* Category header. One visual, one paragraph, one count — enough to know
          where you are and what this page is, without burying the products. */}
      <header className="relative overflow-hidden border-b border-wine-900/10 bg-paper-200 pt-[calc(var(--header-h)+2rem)] md:pt-[calc(var(--header-h)+3rem)]">
        <BrandMark
          name="seal"
          tone="ink"
          decorative
          className="brand-watermark -right-10 top-4 w-40 opacity-[0.06] md:-right-4 md:top-6 md:w-64"
        />
        <div className="shell relative pb-10 md:pb-14">
          <nav
            aria-label="Breadcrumb"
            className="text-[0.6875rem] uppercase tracking-[0.2em] text-ink-400"
          >
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="link-rule">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/shop" className="link-rule">
                  Shop
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-ink-700" aria-current="page">
                {label}
              </li>
            </ol>
          </nav>

          <div className="mt-6 flex items-end gap-4 md:mt-8 md:gap-6">
            <div className="min-w-0 flex-1">
              <p className="eyebrow">
                {label} · {products.length} piece{products.length === 1 ? '' : 's'}
              </p>
              <h1 className="mt-4 font-display text-[length:var(--text-display)] uppercase leading-[0.98]">
                {label}
                <span className="block italic text-crimson-600">made by hand</span>
              </h1>
              <p className="lede mt-5">{intro}</p>
            </div>
            <div className="media-frame media-frame--zoom hidden aspect-4/5 w-40 shrink-0 overflow-hidden rounded-none md:block lg:w-52">
              <Image
                src={collection.image}
                alt={collection.imageAlt}
                fill
                priority
                sizes="13rem"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Sibling collections, so the shop is browsable one hop from anywhere. */}
      <nav aria-label="Other collections" className="border-b border-wine-900/10 bg-paper">
        <ul className="shell -mx-1 flex snap-x items-center gap-1 overflow-x-auto py-3">
          {siblings.map((sibling) => (
            <li key={sibling.slug} className="snap-start">
              <Link
                href={sibling.href}
                className="inline-block whitespace-nowrap px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.2em] text-ink-500 transition-colors hover:bg-blush-100 hover:text-crimson-600"
              >
                {sibling.title}
              </Link>
            </li>
          ))}
          <li className="snap-start">
            <Link
              href="/custom"
              className="inline-block whitespace-nowrap px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.2em] text-ink-500 transition-colors hover:bg-blush-100 hover:text-crimson-600"
            >
              Custom
            </Link>
          </li>
        </ul>
      </nav>

      <div className="shell">
        {products.length === 0 ? (
          <p className="py-20 text-center text-ink-500">
            Nothing in this collection right now.{' '}
            <Link href="/custom" className="link-rule text-crimson-600">
              Ask for a custom colour
            </Link>
            .
          </p>
        ) : (
          <Reveal>
            <ul className="mt-12 grid grid-cols-2 gap-x-3 gap-y-10 md:mt-16 md:grid-cols-3 md:gap-x-6 md:gap-y-14 lg:grid-cols-4">
              {products.map((product, index) => (
                <li key={product.id}>
                  <ProductCard product={product} priority={index < 4} />
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {notes.length > 0 ? (
          <Reveal>
            <section
              className="mt-16 border border-wine-900/12 bg-paper-200 p-6 md:mt-24 md:p-10"
              aria-labelledby="care-title"
            >
              <div className="grid gap-6 md:grid-cols-[1fr_1.3fr] md:gap-12">
                <div>
                  <p className="eyebrow">Good to know</p>
                  <h2
                    id="care-title"
                    className="mt-4 font-display text-[length:var(--text-title)] uppercase leading-tight"
                  >
                    About these {label.toLowerCase()}
                  </h2>
                </div>
                <ul className="space-y-4">
                  {notes.map((note) => (
                    <li key={note} className="flex gap-3 text-[length:0.98rem] leading-relaxed text-ink-700">
                      <span aria-hidden="true" className="mt-2.5 h-px w-4 shrink-0 bg-crimson-500" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </Reveal>
        ) : null}

        {others.length > 0 ? (
          <section className="mt-20 md:mt-28" aria-labelledby="also-title">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4 border-t border-wine-900/10 pt-8">
                <h2
                  id="also-title"
                  className="font-display text-[length:var(--text-title)] uppercase leading-tight"
                >
                  You will probably also want
                </h2>
                <Link href="/shop" className="btn btn--ghost btn--sm">
                  All pieces
                </Link>
              </div>
            </Reveal>
            <Reveal delay={70}>
              <ul className="mt-9 grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-3 md:gap-x-6">
                {others.map((product) => (
                  <li key={product.id}>
                    <ProductCard product={product} sizes="(min-width: 768px) 30vw, 46vw" />
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>
        ) : null}

        <Reveal>
          <section className="on-wine grain relative mt-20 overflow-hidden bg-wine-900 p-7 md:mt-28 md:p-12">
            <BrandMark
              name="stamp"
              tone="champagne"
              decorative
              className="brand-watermark brand-watermark--light -right-6 -top-8 w-40 opacity-[0.08] md:-right-2 md:w-56"
            />
            <div className="relative z-[3] grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-12">
              <div>
                <h2 className="font-display text-[length:var(--text-title)] uppercase leading-tight text-champagne-100">
                  Want one of these in a colour we have not dyed?
                </h2>
                <p className="mt-3 max-w-[46ch] text-[length:1rem] leading-relaxed text-champagne-200/75">
                  Send a colour, a size and a photograph. We will tell you honestly whether crochet
                  is the right answer, and what it would cost, before you pay anything.
                </p>
              </div>
              <div className="md:justify-self-end">
                <Link href="/custom" className="btn btn--light btn--full md:w-auto">
                  Start a custom request
                </Link>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}