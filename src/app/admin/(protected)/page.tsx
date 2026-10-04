import Link from 'next/link';
import OrderStatusControl from '@/components/admin/OrderStatusControl';
import { listCustomRequests, listOrders } from '@/server/repository';
import { STATUS_LABELS, STATUS_FLOW, type OrderStatus } from '@/lib/brand';
import { formatPrice } from '@/lib/money';

export const dynamic = 'force-dynamic';

const FILTERS = ['all', 'new', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled'] as const;
type Filter = (typeof FILTERS)[number];

const badgeTone: Record<string, string> = {
  new: 'bg-crimson-600 text-ivory',
  confirmed: 'bg-wine-700 text-champagne-100',
  processing: 'bg-champagne-300 text-wine-900',
  shipped: 'bg-blush-300 text-wine-900',
  completed: 'bg-ink-500 text-ivory',
  cancelled: 'bg-transparent text-ink-400 border border-wine-900/20',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(status ?? '')
    ? (status as Filter)
    : 'all';

  const orders = await listOrders();
  const counts = orders.reduce<Record<string, number>>((accumulator, order) => {
    accumulator[order.status] = (accumulator[order.status] ?? 0) + 1;
    return accumulator;
  }, {});
  const visible = filter === 'all' ? orders : orders.filter((order) => order.status === filter);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Orders</p>
          <h1 className="mt-3 font-display text-[length:2.4rem] uppercase leading-none">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </h1>
        </div>
        <Link href="/admin/requests" className="btn btn--ghost btn--sm">
          Custom requests <CustomRequestCount />
        </Link>
      </div>

      <nav aria-label="Filter orders" className="mt-8 border-y border-wine-900/10 py-3">
        <ul className="flex flex-wrap items-center gap-1">
          {FILTERS.map((value) => (
            <li key={value}>
              <Link
                href={value === 'all' ? '/admin' : `/admin?status=${value}`}
                aria-current={filter === value ? 'true' : undefined}
                className={`inline-block px-3 py-1.5 text-[0.625rem] uppercase tracking-[0.18em] transition-colors ${
                  filter === value ? 'bg-wine-900 text-ivory' : 'text-ink-500 hover:bg-blush-100'
                }`}
              >
                {value === 'all' ? 'All' : STATUS_LABELS[value as OrderStatus]}
                {value !== 'all' && counts[value] ? ` (${counts[value]})` : ''}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {visible.length === 0 ? (
        <p className="py-20 text-center text-ink-400">
          {orders.length === 0
            ? 'No orders yet. Place one from the shop to see it appear here.'
            : `Nothing is ${STATUS_LABELS[filter as OrderStatus]?.toLowerCase() ?? filter} right now.`}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-wine-900/10 border-b border-wine-900/10">
          {visible.map((order) => (
            <li key={order.id} className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-display text-[length:1.25rem] hover:text-crimson-600"
                    >
                      {order.orderNumber}
                    </Link>
                    <span
                      className={`px-2 py-0.5 text-[0.5625rem] uppercase tracking-[0.16em] ${badgeTone[order.status] ?? ''}`}
                    >
                      {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">
                    {order.customerName} · {order.city}, {order.state} · {order.items.length}{' '}
                    {order.items.length === 1 ? 'piece' : 'pieces'} · {formatPrice(order.total)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {order.phone} · {order.email} · {formatDate(order.createdAt)}
                  </p>
                </div>

                <div className="w-full max-w-sm">
                  <OrderStatusControl
                    orderId={order.id}
                    status={order.status as OrderStatus}
                    allowed={STATUS_FLOW[order.status as OrderStatus] ?? []}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function CustomRequestCount() {
  const requests = await listCustomRequests();
  if (requests.length === 0) return null;
  return <span className="ml-1">{requests.length}</span>;
}