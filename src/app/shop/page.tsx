import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import ProductCard from '@/components/shop/ProductCard';
import Reveal from '@/components/layout/Reveal';
import BrandMark from '@/components/brand/BrandMark';
import { getAllProducts } from '@/server/repository';
import { BRAND, COLLECTIONS, SITE_URL, isShopCategory } from '@/lib/brand';

export const revalidate = 300;

type SearchParams = Promise<{ category?: string }>;

export const metadata: Metadata = {
  title: 'The collection',
  description: `Every piece ${BRAND.name} makes: rose purses, pearl-handled bags, crochet flowers, keychains and appliqués. Handmade in ${BRAND.location}, made to order.`,
  alternates: { canonical: '/shop' },
  openGraph: {
    title: `The collection · ${BRAND.name}`,
    description: `Rose purses, pearl-handled bags, crochet flowers and keychains — stitched and finished by hand in ${BRAND.location}.`,
    url: `${SITE_URL}/shop`,
    images: [{ url: '/media/og-hero.jpg', width: 1200, height: 630, alt: 'The collection' }],
  },
};

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const { category } = await searchParams;

  // Categories are real pages now. Legacy `?category=` links — the ones already
  // shared, indexed and printed on old packaging — land on the page that
  // replaced them rather than on a filtered duplicate.
  if (isShopCategory(category)) redirect(`/shop/${category}`);

  const all = await getAllProducts();
  const products = all;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/shop` },
    ],
  };

  return (
    <div className="pb-24 md:pb-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <header className="relative overflow-hidden border-b border-wine-900/10 bg-paper-200 pt-[calc(var(--header-h)+2rem)] md:pt-[calc(var(--header-h)+3rem)]">
        <BrandMark
          name="stamp"
          tone="ink"
          decorative
          className="brand-watermark -right-6 top-8 w-32 opacity-[0.08] md:-right-2 md:top-10 md:w-44"
        />
        <div className="shell relative pb-10 md:pb-14">
          <nav aria-label="Breadcrumb" className="text-[0.6875rem] uppercase tracking-[0.2em] text-ink-400">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="link-rule">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-ink-700" aria-current="page">
                Shop
              </li>
            </ol>
          </nav>

          <p className="eyebrow mt-6 md:mt-8">
            {products.length} pieces · made to order
          </p>
          <h1 className="mt-4 max-w-[16ch] font-display text-[length:var(--text-display)] uppercase leading-[0.98]">
            Everything the
            <span className="block italic text-crimson-600">studio finished</span>
          </h1>
          <p className="lede mt-5">
            Ten pieces, all made to order. Nothing here is mass-produced, and nothing is restocked
            once a colourway is gone.
          </p>
        </div>
      </header>

      {/* The category pages are the primary way in, so they are listed as a
          proper index rather than a row of filter chips. */}
      <nav aria-label="Collections" className="border-b border-wine-900/10 bg-paper">
        <ul className="shell grid grid-cols-2 gap-px bg-wine-900/10 sm:grid-cols-4">
          {COLLECTIONS.map((collection) => {
            const count = products.filter((p) => p.category === collection.slug).length;
            return (
              <li key={collection.slug} className="bg-paper">
                <Link
                  href={collection.href}
                  className="group flex h-full flex-col px-1 py-5 transition-colors hover:bg-paper-200 md:px-2 md:py-7"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-[length:1.15rem] group-hover:text-crimson-600">
                      {collection.title}
                    </span>
                    {count > 0 ? (
                      <span className="text-[0.6875rem] uppercase tracking-[0.14em] text-ink-400">
                        {String(count).padStart(2, '0')}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-2 block max-w-[30ch] text-sm leading-relaxed text-ink-500">
                    {collection.blurb}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shell">
        <div className="mt-12 flex flex-wrap items-end justify-between gap-4 md:mt-16">
          <h2 className="font-display text-[length:var(--text-title)] uppercase leading-tight">
            Everything, in one list
          </h2>
          <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-ink-400">
            Or pick a collection above
          </p>
        </div>

        <Reveal>
          <ul className="mt-9 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-14 lg:grid-cols-4">
            {products.map((product, index) => (
              <li key={product.id}>
                <ProductCard product={product} priority={index < 4} />
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal>
          <section className="mt-20 border border-wine-900/12 bg-paper-200 p-7 md:mt-28 md:p-10">
            <div className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-12">
              <div>
                <h2 className="font-display text-[length:var(--text-title)] uppercase leading-tight">
                  Looking for something we have not made yet?
                </h2>
                <p className="mt-3 max-w-[46ch] text-[length:1rem] leading-relaxed text-ink-700">
                  Send a colour, a size and a photograph. We will tell you honestly whether crochet
                  is the right answer, and what it would cost.
                </p>
              </div>
              <div className="md:justify-self-end">
                <Link href="/custom" className="btn btn--full md:w-auto">
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