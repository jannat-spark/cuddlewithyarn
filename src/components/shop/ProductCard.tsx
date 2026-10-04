import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/money';
import { AVAILABILITY_SHORT, type Product } from '@/lib/types';

export default function ProductCard({
  product,
  priority = false,
  sizes = '(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw',
}: {
  product: Product;
  priority?: boolean;
  sizes?: string;
}) {
  const image = product.images[0];
  const soldOut = product.availability === 'sold_out';

  return (
    <article className="group relative">
      <Link
        href={`/product/${product.slug}`}
        className="media-frame media-frame--zoom block aspect-4/5 w-full"
      >
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes={sizes}
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            decoding="async"
            className="object-cover"
          />
        ) : null}
        {soldOut ? (
          <span className="absolute left-3 top-3 z-10 bg-wine-900/85 px-2.5 py-1 text-[0.5625rem] uppercase tracking-[0.2em] text-champagne-200">
            Sold out
          </span>
        ) : null}
        {product.featured && !soldOut ? (
          <span className="absolute right-3 top-3 z-10 bg-champagne-200/95 px-2.5 py-1 text-[0.5625rem] uppercase tracking-[0.2em] text-wine-900">
            Signature
          </span>
        ) : null}
      </Link>

      <div className="mt-3.5">
        <h3 className="font-display text-[length:1.15rem] leading-snug">
          <Link href={`/product/${product.slug}`} className="after:absolute after:inset-0 hover:text-crimson-600">
            {product.name}
          </Link>
        </h3>
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <p className="truncate text-[0.625rem] uppercase tracking-[0.14em] text-ink-400">
            {AVAILABILITY_SHORT[product.availability]}
          </p>
          <p className="shrink-0 font-display text-[length:1rem] tabular-nums">
            {formatPrice(product.price)}
          </p>
        </div>
      </div>
    </article>
  );
}