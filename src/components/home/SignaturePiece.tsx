import Image from 'next/image';
import Link from 'next/link';
import Reveal from '@/components/layout/Reveal';
import BrandMark from '@/components/brand/BrandMark';
import AddToBagButton from '@/components/shop/AddToBagButton';
import { formatPrice } from '@/lib/money';
import type { Product } from '@/lib/types';

/**
 * The red rose purse, presented as the physical object the hero animation has
 * just made. The copy deliberately refers back to the sequence above it.
 */
export default function SignaturePiece({ product }: { product: Product }) {
  const image = product.images[0];
  const detail = product.images[1] ?? image;

  return (
    <section
      id="signature"
      className="on-wine grain relative overflow-hidden bg-wine-900 py-20 md:py-28"
      aria-labelledby="signature-title"
    >
      <BrandMark
        name="seal"
        tone="champagne"
        decorative
        className="brand-watermark brand-watermark--light -right-10 top-8 w-52 opacity-[0.06] md:-right-4 md:top-12 md:w-80"
      />
      <div className="shell relative z-[3]">
        <div className="grid items-center gap-10 md:grid-cols-[1.05fr_1fr] md:gap-16">
          <Reveal className="relative">
            <div className="media-frame media-frame--zoom relative aspect-4/5 w-full max-w-[34rem]">
              {image ? (
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(min-width: 768px) 44vw, 88vw"
                  loading="lazy"
                  decoding="async"
                  className="object-cover"
                />
              ) : null}
            </div>
            {detail ? (
              <div className="media-frame absolute -bottom-8 -right-2 hidden aspect-square w-40 border-4 border-wine-900 md:block lg:-right-10 lg:w-52">
                <Image
                  src={detail.src}
                  alt={detail.alt}
                  fill
                  sizes="13rem"
                  loading="lazy"
                  decoding="async"
                  className="object-cover"
                />
              </div>
            ) : null}
          </Reveal>

          <Reveal delay={90}>
            <p className="eyebrow eyebrow--light">04 — The signature piece</p>
            <h2
              id="signature-title"
              className="mt-5 font-display text-[length:var(--text-display)] uppercase leading-[0.96] text-champagne-100"
            >
              The rose you
              <br />
              <span className="italic text-blush-200">just watched</span>
            </h2>
            <div className="prose-brand mt-6 max-w-[46ch]">
              <p>
                You scrolled through three yarns, two hands and one continuous spiral. This is where
                it lands — one crimson rose, blocked flat, finished with freshwater pearls and lined in
                blush satin.
              </p>
              <p>
                It is the piece the studio is known for, and the one we would make first if we could
                only keep one.
              </p>
            </div>

            <dl className="mt-8 grid max-w-md grid-cols-2 gap-x-6 gap-y-5 border-t border-champagne-200/15 pt-6 text-sm">
              <div>
                <dt className="text-[0.625rem] uppercase tracking-[0.2em] text-champagne-200/50">
                  Made in
                </dt>
                <dd className="mt-1">{product.materials.split(',')[0]}</dd>
              </div>
              <div>
                <dt className="text-[0.625rem] uppercase tracking-[0.2em] text-champagne-200/50">
                  Time to make
                </dt>
                <dd className="mt-1">{product.leadTimeDays} days</dd>
              </div>
              <div>
                <dt className="text-[0.625rem] uppercase tracking-[0.2em] text-champagne-200/50">
                  Inside
                </dt>
                <dd className="mt-1">Phone, cards, keys</dd>
              </div>
              <div>
                <dt className="text-[0.625rem] uppercase tracking-[0.2em] text-champagne-200/50">
                  Price
                </dt>
                <dd className="mt-1 font-display text-[length:1.1rem]">{formatPrice(product.price)}</dd>
              </div>
            </dl>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="sm:w-56">
                <AddToBagButton product={product} className="btn btn--light" />
              </div>
              <Link href={`/product/${product.slug}`} className="btn btn--outline-light">
                See the details
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}