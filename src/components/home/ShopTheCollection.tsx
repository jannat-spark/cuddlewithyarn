import Image from 'next/image';
import Link from 'next/link';
import Reveal from '@/components/layout/Reveal';
import BrandMark from '@/components/brand/BrandMark';
import ProductCard from '@/components/shop/ProductCard';
import { COLLECTIONS, HOT_PRODUCT_SLUGS } from '@/lib/brand';
import type { Product } from '@/lib/types';

/**
 * The shop window, not the catalogue.
 *
 * Two things only: where to go next, and the handful of pieces the studio has
 * put in the window. The list is curated in `src/lib/brand.ts` so merchandising
 * is a one-line edit and never a layout change; anything missing from the
 * catalogue is simply skipped.
 */
export default function ShopTheCollection({ products }: { products: Product[] }) {
  const byslug = new Map(products.map((product) => [product.slug, product]));
  const hot = HOT_PRODUCT_SLUGS.map((slug) => byslug.get(slug)).filter(
    (product): product is Product => Boolean(product),
  );

  return (
    <section
      id="collection"
      className="border-t border-wine-900/10 bg-paper-200 py-20 md:py-28"
      aria-labelledby="collection-title"
    >
      <div className="shell">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="relative">
              <BrandMark
                name="seal"
                tone="ink"
                decorative
                className="brand-watermark -right-10 -top-12 w-36 opacity-[0.06] md:-right-6 md:-top-16 md:w-52"
              />
              <p className="eyebrow">03 — Shop the collection</p>
              <h2
                id="collection-title"
                className="relative mt-5 font-display text-[length:var(--text-display)] uppercase leading-[0.98]"
              >
                Shop the
                <br />
                <span className="italic">collection</span>
              </h2>
            </div>
            <Link href="/shop" className="btn btn--ghost btn--sm">
              Browse all {products.length} pieces
            </Link>
          </div>
        </Reveal>

        <Reveal delay={70}>
          <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 md:mt-14 md:grid-cols-4 md:gap-x-6">
            {COLLECTIONS.map((collection) => {
              const count = products.filter((p) => p.category === collection.slug).length;
              return (
                <li key={collection.slug}>
                  <Link href={collection.href} className="group block">
                    <span className="media-frame media-frame--zoom block aspect-square w-full">
                      <Image
                        src={collection.image}
                        alt={collection.imageAlt}
                        fill
                        sizes="(min-width: 768px) 22vw, 46vw"
                        loading="lazy"
                        decoding="async"
                        className="object-cover"
                      />
                    </span>
                    <span className="mt-3 flex items-baseline justify-between gap-2">
                      <span className="font-display text-[length:1.15rem] group-hover:text-crimson-600">
                        {collection.title}
                      </span>
                      {count > 0 ? (
                        <span className="text-[0.6875rem] uppercase tracking-[0.14em] text-ink-400">
                          {String(count).padStart(2, '0')}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1.5 block max-w-[34ch] text-sm leading-relaxed text-ink-500">
                      {collection.blurb}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Reveal>

        {hot.length > 0 ? (
          <Reveal delay={90}>
            <div className="mt-14 border-t border-wine-900/10 pt-8 md:mt-20">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-ink-500">
                  In the window this week
                </h3>
                <Link href="/shop" className="link-rule text-[0.6875rem] uppercase tracking-[0.24em]">
                  See everything
                </Link>
              </div>
              <ul className="mt-7 grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-4 md:gap-x-6">
                {hot.map((product, index) => (
                  <li key={product.id}>
                    <ProductCard
                      product={product}
                      priority={index < 2}
                      sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
                    />
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}