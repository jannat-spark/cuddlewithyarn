import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrderByNumber } from '@/server/repository';
import { formatPrice } from '@/lib/money';
import { BRAND, PHONE_E164, STATUS_LABELS, type OrderStatus } from '@/lib/brand';

export const dynamic = 'force-dynamic';

type Params = Promise<{ orderNumber: string }>;
type Search = Promise<{ placed?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${orderNumber}`,
    description: `Order confirmation for ${BRAND.name}.`,
    // Confirmation pages carry a customer reference number — keep them out of
    // the index.
    robots: { index: false, follow: false },
  };
}

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { orderNumber } = await params;
  const { placed } = await searchParams;
  const order = await getOrderByNumber(decodeURIComponent(orderNumber));
  if (!order) notFound();

  const status = order.status as OrderStatus;
  const placedNow = placed === '1';
  const eta = new Date(order.createdAt);
  eta.setDate(eta.getDate() + 14);

  return (
    <div className="shell pb-24 pt-[calc(var(--header-h)+2.5rem)] md:pb-32 md:pt-[calc(var(--header-h)+4rem)]">
      <div className="mx-auto max-w-[52rem]">
        <p className="eyebrow">Order {order.orderNumber}</p>
        <h1 className="mt-5 font-display text-[length:var(--text-display)] uppercase leading-[0.98]">
          {placedNow ? (
            <>
              Thank you —
              <span className="block italic text-crimson-600">it is in the diary</span>
            </>
          ) : (
            <>
              Your order
              <span className="block italic text-crimson-600">{order.orderNumber}</span>
            </>
          )}
        </h1>

        <div
          role="status"
          className="mt-8 border-l-2 border-crimson-500 bg-paper-200 px-5 py-4"
        >
          <p className="text-[length:1rem] leading-relaxed text-ink-700">
            We have your order and a confirmation is on its way to{' '}
            <span className="font-medium">{order.email}</span>. Someone from the studio will
            message {order.phone} before we start, usually within a working day.
          </p>
        </div>

        <div className="mt-10 grid gap-10 md:grid-cols-[1.3fr_1fr]">
          <section aria-label="Items ordered">
            <h2 className="border-g border-wine-900/10 pb-3 text-[0.625rem] uppercase tracking-[0.24em] text-ink-400">
              {order.items.length} {order.items.length === 1 ? 'piece' : 'pieces'}
            </h2>
            <ul className="divide-y divide-wine-900/10">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="font-display text-[length:1.1rem] leading-snug">{item.productName}</p>
                    <p className="mt-0.5 text-sm text-ink-400">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums">{formatPrice(item.lineTotal)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-2.5 border-t border-wine-900/10 pt-5 text-[length:0.95rem]">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Shipping</dt>
                <dd className="tabular-nums">
                  {order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-wine-900/10 pt-3 font-display text-[length:1.25rem]">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section aria-label="Delivery details" className="text-[length:0.95rem]">
            <h2 className="border-g border-wine-900/10 pb-3 text-[0.625rem] uppercase tracking-[0.24em] text-ink-400">
              Delivery
            </h2>
            <address className="mt-5 not-italic leading-relaxed text-ink-700">
              {order.customerName}
              <br />
              {order.addressLine}
              <br />
              {order.city}, {order.state} {order.pincode}
              <br />
              <span className="text-ink-500">{order.phone}</span>
            </address>

            {order.notes ? (
              <p className="mt-5 border-t border-wine-900/10 pt-4 text-sm text-ink-500">
                <span className="block text-[0.625rem] uppercase tracking-[0.2em] text-ink-400">
                  Your note
                </span>
                {order.notes}
              </p>
            ) : null}

            <p className="mt-5 border-t border-wine-900/10 pt-4 text-sm leading-relaxed text-ink-500">
              Expected to ship around{' '}
              <span className="text-ink-900">
                {eta.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
              </span>
              . Status right now:{' '}
              <span className="text-ink-900">{STATUS_LABELS[status] ?? status}</span>.
            </p>
          </section>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-wine-900/10 pt-8 sm:flex-row">
          <Link href="/shop" className="btn">
            Keep browsing
          </Link>
          <a
            href={`https://wa.me/${PHONE_E164}?text=${encodeURIComponent(`Hello, about order ${order.orderNumber}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--ghost"
          >
            Message the studio
          </a>
        </div>
      </div>
    </div>
  );
}