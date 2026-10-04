'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/cart/CartProvider';
import { formatPrice } from '@/lib/money';
import { SHIPPING } from '@/lib/brand';

export default function CartContents() {
  const { lines, ready, subtotal, shipping, total, setQuantity, remove, clear } = useCart();

  if (!ready) {
    return (
      <div className="py-16 text-center text-ink-400" role="status">
        Loading your bag…
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="border border-wine-900/12 bg-paper-200 px-6 py-16 text-center md:py-20">
        <p className="eyebrow justify-center">Your bag</p>
        <h2 className="mt-5 font-display text-[length:var(--text-title)] uppercase leading-tight">
          Nothing in here yet
        </h2>
        <p className="mx-auto mt-4 max-w-[42ch] text-[length:1rem] leading-relaxed text-ink-700">
          Everything is crocheted to order, so pieces appear here the moment you choose one. Start
          with the crimson rose purse — it is the one we make most.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/shop" className="btn">
            Shop the collection
          </Link>
          <Link href="/custom" className="btn btn--ghost">
            Custom crochet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
      <section aria-label="Bag contents">
        <div className="flex items-center justify-between border-b border-wine-900/10 pb-3">
          <h2 className="text-[0.625rem] uppercase tracking-[0.24em] text-ink-400">
            {lines.length} {lines.length === 1 ? 'piece' : 'pieces'}
          </h2>
          <button
            type="button"
            onClick={clear}
            className="text-[0.625rem] uppercase tracking-[0.2em] text-ink-400 underline underline-offset-4 hover:text-crimson-600"
          >
            Empty bag
          </button>
        </div>

        <ul className="divide-y divide-wine-900/10">
          {lines.map((line) => (
            <li key={line.productId} className="flex gap-4 py-5 sm:gap-6">
              <Link
                href={`/product/${line.slug}`}
                className="media-frame h-28 w-24 shrink-0 sm:h-36 sm:w-28"
              >
                {line.image?.src ? (
                  <Image
                    src={line.image.src}
                    alt={line.image.alt}
                    fill
                    sizes="112px"
                    loading="lazy"
                    decoding="async"
                    className="object-cover"
                  />
                ) : null}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-[length:1.2rem] leading-snug">
                      <Link href={`/product/${line.slug}`} className="hover:text-crimson-600">
                        {line.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-ink-500">{formatPrice(line.price)} each</p>
                  </div>
                  <p className="shrink-0 font-display text-[length:1.1rem] tabular-nums">
                    {formatPrice(line.price * line.quantity)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center border border-wine-900/15">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${line.name}`}
                      onClick={() => setQuantity(line.productId, line.quantity - 1)}
                      className="px-3.5 py-2 text-ink-500 hover:text-crimson-600"
                    >
                      −
                    </button>
                    <span className="min-w-9 text-center text-sm tabular-nums" aria-live="polite">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${line.name}`}
                      onClick={() => setQuantity(line.productId, line.quantity + 1)}
                      className="px-3.5 py-2 text-ink-500 hover:text-crimson-600"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(line.productId)}
                    className="text-[0.625rem] uppercase tracking-[0.16em] text-ink-400 underline underline-offset-4 hover:text-crimson-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <Link href="/shop" className="btn btn--ghost btn--sm">
            Continue shopping
          </Link>
        </div>
      </section>

      <aside aria-label="Order summary" className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
        <div className="border border-wine-900/12 bg-paper-200 p-6">
          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">Summary</h2>
          <dl className="mt-5 space-y-2.5 text-[length:0.95rem]">
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Shipping</dt>
              <dd className="tabular-nums">{shipping === 0 ? 'Free' : formatPrice(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-wine-900/10 pt-3 font-display text-[length:1.2rem]">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(total)}</dd>
            </div>
          </dl>

          {subtotal < SHIPPING.freeOver ? (
            <p className="mt-3 text-xs text-ink-400">
              {formatPrice(SHIPPING.freeOver - subtotal)} more for free shipping within India.
            </p>
          ) : null}

          <Link href="/checkout" className="btn btn--full mt-6">
            Checkout
          </Link>
          <p className="mt-3 text-center text-xs leading-relaxed text-ink-400">
            No account needed. We confirm by email and WhatsApp.
          </p>
        </div>
      </aside>
    </div>
  );
}