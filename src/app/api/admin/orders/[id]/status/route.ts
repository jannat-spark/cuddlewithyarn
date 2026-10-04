import { NextResponse } from 'next/server';
import { getAdminSession } from '@/server/auth';
import { getOrderById, updateOrderStatus } from '@/server/repository';
import { ORDER_STATUSES, STATUS_FLOW, type OrderStatus } from '@/lib/brand';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * PATCH /api/admin/orders/[id]/status
 *
 * Guarded on a real admin session, and transitions are constrained to the
 * documented pipeline so an order cannot jump from `new` straight to `shipped`.
 */
export async function PATCH(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const next = (body as { status?: unknown })?.status;
  if (!isOrderStatus(next)) {
    return NextResponse.json({ error: 'Unknown status.' }, { status: 422 });
  }

  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const current = order.status as OrderStatus;
  if (current === next) {
    return NextResponse.json({ ok: true, status: next });
  }
  if (!STATUS_FLOW[current]?.includes(next)) {
    return NextResponse.json(
      { error: `An order cannot go from “${current}” to “${next}”.` },
      { status: 409 },
    );
  }

  const updated = await updateOrderStatus(id, next);
  if (!updated) {
    return NextResponse.json({ error: 'Could not save the new status.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: updated.status });
}