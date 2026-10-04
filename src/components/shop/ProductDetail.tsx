'use client';

import Image from 'next/image';
import { useState } from 'react';
import AddToBagButton from '@/components/shop/AddToBagButton';
import { AVAILABILITY_LABEL, CATEGORY_LABEL, type Product } from '@/lib/types';
import { formatPrice } from '@/lib/money';
import { SHIPPING } from '@/lib/brand';

export default function ProductDetail({ product }: { product: Product }) {
  const [index, setIndex] = useState(0);
  const image = product.images[index] ?? product.images[0];
  const soldOut = product.availability === 'sold_out';

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-14">
      <div>
        <div className="media-frame relative aspect-4/5 w-full">
          {image ? (
            <Image
              key={image.src}
              src={image.src}
              alt={image.alt}
              fill
              priority
              sizes="(min-width: 768px) 46vw, 92vw"
              className="object-cover"
            />
          ) : null}
        </div>

        {product.images.length > 1 ? (
          <>
            <p className="sr-only" id="gallery-label">
              Product images
            </p>
            <ul
              aria-labelledby="gallery-label"
              className="mt-3 grid grid-cols-4 gap-2.5"
            >
              {product.images.map((thumb, i) => (
                <li key={thumb.src}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Show image ${i + 1} of ${product.images.length}`}
                    aria-current={i === index ? 'true' : undefined}
                    className={`media-frame block aspect-square w-full transition-opacity ${
                      i === index ? 'ring-1 ring-crimson-600' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={thumb.src}
                      alt=""
                      fill
                      sizes="12vw"
                      loading="lazy"
                      decoding="async"
                      className="object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <div className="md:py-4">
        <p className="eyebrow">{CATEGORY_LABEL[product.category] ?? product.category}</p>
        <h1 className="mt-4 font-display text-[length:var(--text-title)] uppercase leading-[1.02]">
          {product.name}
        </h1>
        {product.tagline ? (
          <p className="mt-2 font-display text-[length:1.15rem] italic text-crimson-600">
            {product.tagline}
          </p>
        ) : null}

        <p className="mt-5 font-display text-[length:1.75rem] tabular-nums">
          {formatPrice(product.price)}
        </p>
        <p className="mt-1.5 text-sm text-ink-500">
          {AVAILABILITY_LABEL[product.availability]} · Free shipping over{' '}
          {formatPrice(SHIPPING.freeOver)}
        </p>

        <div className="prose-brand mt-7 max-w-[52ch] text-[length:1rem] leading-relaxed">
          <p>{product.description}</p>
        </div>

        {product.details.length > 0 ? (
          <div className="mt-8 border-t border-wine-900/10 pt-6">
            <h2 className="text-[0.625rem] uppercase tracking-[0.24em] text-ink-400">
              The details
            </h2>
            <ul className="mt-4 space-y-2.5">
              {product.details.map((detail) => (
                <li key={detail} className="flex gap-3 text-[length:0.95rem] leading-relaxed">
                  <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-crimson-500" />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {product.materials ? (
          <p className="mt-7 border-t border-wine-900/10 pt-6 text-sm text-ink-500">
            <span className="text-[0.625rem] uppercase tracking-[0.24em] text-ink-400">
              Made from
            </span>
            <span className="mt-1.5 block">{product.materials}</span>
          </p>
        ) : null}

        <div className="mt-8 border-t border-wine-900/10 pt-6">
          <AddToBagButton product={product} className="btn btn--full" />
          <p className="mt-3 text-center text-xs leading-relaxed text-ink-400">
            {soldOut
              ? 'This colourway has sold out. Send us a custom request and we will dye to order.'
              : `Made to order in about ${product.leadTimeDays} days. We photograph it before it ships.`}
          </p>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-wine-900/10 pt-6 text-sm">
          <div>
            <dt className="text-[0.625rem] uppercase tracking-[0.2em] text-ink-400">Shipping</dt>
            <dd className="mt-1">{formatPrice(SHIPPING.flat)} India · free over {formatPrice(SHIPPING.freeOver)}</dd>
          </div>
          <div>
            <dt className="text-[0.625rem] uppercase tracking-[0.2em] text-ink-400">Returns</dt>
            <dd className="mt-1">7 days, unworn</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}