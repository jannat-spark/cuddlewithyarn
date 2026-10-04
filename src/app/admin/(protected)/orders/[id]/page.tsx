import Link from 'next/link';
import { notFound } from 'next/navigation';
import OrderStatusControl from '@/components/admin/OrderStatusControl';
import { getOrderById } from '@/server/repository';
import { STATUS_LABELS, STATUS_FLOW, type OrderStatus } from '@/lib/brand';
import { formatPrice } from '@/lib/money';

export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const status = order.status as OrderStatus;

  return (
    <div>
      <nav className="text-[0.625rem] uppercase tracking-[0.2em] text-ink-400">
        <Link href="/admin" className="link-rule">
          Orders
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink-700">{order.orderNumber}</span>
      </nav>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-[length:2.2rem] uppercase leading-none">
            {order.orderNumber}
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Placed {formatDate(order.createdAt)} · last updated {formatDate(order.updatedAt)}
          </p>
        </div>
        <div className="w-full max-w-sm">
          <p className="mb-2 text-[0.625rem] uppercase tracking-[0.2em] text-ink-400">
            Status: {STATUS_LABELS[status] ?? status}
          </p>
          <OrderStatusControl
            orderId={order.id}
            status={status}
            allowed={STATUS_FLOW[status] ?? []}
          />
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section aria-label="Items">
          <h2 className="border-b border-wine-900/10 pb-3 text-[0.625rem] uppercase tracking-[0.24em] text-ink-400">
            Items
          </h2>
          <ul className="divide-y divide-wine-900/10">
            {order.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="font-display text-[length:1.1rem]">{item.productName}</p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {item.productSlug ? (
                      <Link
                        href={`/product/${item.productSlug}`}
                        className="link-rule"
                      >
                        {item.productSlug}
                      </Link>
                    ) : (
                      'product removed'
                    )}
                    {item.productId ? null : ' · snapshot only'}
                  </p>
                </div>
                <div className="text-sm tabular-nums">
                  {formatPrice(item.unitPrice)} × {item.quantity} ={' '}
                  <span className="font-display text-[length:1.05rem]">
                    {formatPrice(item.lineTotal)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-2 border-t border-wine-900/10 pt-5 text-[0.95rem]">
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
            <div className="flex justify-between border-t border-wine-900/10 pt-3 font-display text-[length:1.2rem]">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(order.total)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-ink-400">
            Prices above are the snapshot taken when the order was placed. They do not change if the
            catalogue is re-priced later.
          </p>
        </section>

        <section aria-label="Customer" className="space-y-6">
          <div className="border border-wine-900/12 bg-cream-100 p-6">
            <h2 className="text-[0.625rem] uppercase tracking-[0.24em] text-ink-400">Customer</h2>
            <p className="mt-3 font-display text-[length:1.2rem]">{order.customerName}</p>
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                <a href={`tel:${order.phone}`} className="link-rule">
                  {order.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${order.email}`} className="link-rule">
                  {order.email}
                </a>
              </li>
            </ul>
          </div>

          <div className="border border-wine-900/12 bg-cream-100 p-6">
            <h2 className="text-[0.625rem] uppercase tracking-[0.24em] text-ink-400">Delivery</h2>
            <address className="mt-3 not-italic text-sm leading-relaxed">
              {order.addressLine}
              <br />
              {order.city}, {order.state} {order.pincode}
            </address>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={`https://wa.me/91${order.phone}?text=${encodeURIComponent(`Hello ${order.customerName}, about order ${order.orderNumber}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--ghost btn--sm"
              >
                WhatsApp
              </a>
              <a
                href={`mailto:${order.email}?subject=${encodeURIComponent(`Your Cuddle With Yarn order ${order.orderNumber}`)}`}
                className="btn btn--ghost btn--sm"
              >
                Email
              </a>
            </div>
          </div>

          {order.notes ? (
            <div className="border border-wine-900/12 p-6">
              <h2 className="text-[0.625rem] uppercase tracking-[0.24em] text-ink-400">
                Customer note
              </h2>
              <p className="mt-3 text-sm leading-relaxed">{order.notes}</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}