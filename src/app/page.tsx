import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollHero from '@/components/hero/ScrollHero';
import MadeByHand from '@/components/home/MadeByHand';
import ShopTheCollection from '@/components/home/ShopTheCollection';
import SignaturePiece from '@/components/home/SignaturePiece';
import CustomCrochetSection from '@/components/home/CustomCrochetSection';
import AtelierStrip from '@/components/home/AtelierStrip';
import Reveal from '@/components/layout/Reveal';
import { getAllProducts } from '@/server/repository';
import { COLLECTIONS } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Handmade crochet, rose by rose',
  description:
    'Cuddle With Yarn is a small crochet atelier in Jaipur. Rose purses, pearl-handled bags and crochet flowers — every piece stitched by hand and finished with pearls.',
  alternates: { canonical: '/' },
};

export const revalidate = 300;

export default async function HomePage() {
  const products = await getAllProducts();
  const signature =
    products.find((p) => p.slug === 'crimson-rose-purse') ??
    products.find((p) => p.featured) ??
    products[0];

  return (
    <>
      <ScrollHero manifestUrl="/sequences/hero/manifest.json" />

      {signature ? (
        <section className="border-b border-wine-900/10 bg-paper" aria-label="This season">
          <div className="shell flex flex-wrap items-center justify-between gap-4 py-5">
            <p className="text-[0.6875rem] uppercase tracking-[0.24em] text-ink-400">
              This season · {products.length} pieces · made to order
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {COLLECTIONS.map((collection) => (
                <Link
                  key={collection.slug}
                  href={collection.href}
                  className="link-rule text-[0.6875rem] uppercase tracking-[0.24em]"
                >
                  {collection.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <MadeByHand />
      <ShopTheCollection products={products} />

      {signature ? (
        <SignaturePiece product={signature} />
      ) : (
        <section className="bg-wine-900 py-16 text-center text-champagne-200">
          <p className="shell">The collection is being restocked. Please check back shortly.</p>
        </section>
      )}

      <CustomCrochetSection />

      <section className="border-t border-wine-900/10 bg-paper-100 py-16 md:py-20" aria-label="Studio promise">
        <div className="shell">
          <Reveal>
            <div className="grid gap-8 md:grid-cols-3 md:gap-10">
              <div>
                <h2 className="font-display text-[length:1.5rem] uppercase leading-tight">
                  Made to order
                </h2>
                <p className="mt-2.5 max-w-[34ch] text-sm leading-relaxed text-ink-500">
                  Nothing is warehoused in bulk. Your piece is made after you order it, which is why
                  the dates are honest.
                </p>
              </div>
              <div>
                <h2 className="font-display text-[length:1.5rem] uppercase leading-tight">
                  Free shipping over {formatInr(3500)}
                </h2>
                <p className="mt-2.5 max-w-[34ch] text-sm leading-relaxed text-ink-500">
                  Flat {formatInr(149)} within India. International shipping is quoted at checkout.
                </p>
              </div>
              <div>
                <h2 className="font-display text-[length:1.5rem] uppercase leading-tight">
                  Seven-day returns
                </h2>
                <p className="mt-2.5 max-w-[34ch] text-sm leading-relaxed text-ink-500">
                  If it is not right, send it back unworn within seven days and we will remake or
                  refund it.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <AtelierStrip />
    </>
  );
}

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}