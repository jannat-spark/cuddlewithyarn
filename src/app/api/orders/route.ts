import { NextResponse } from 'next/server';
import { createOrder } from '@/server/repository';
import {
  ValidationError,
  parseCheckout,
  parseRequestedLines,
  asString,
} from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT = { windowMs: 60_000, max: 8 };
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT.max;
}

/**
 * POST /api/orders
 *
 * The browser sends product ids and quantities only. Every price and total is
 * rebuilt from the catalogue on the server, and `idempotencyKey` makes a double
 * tap (or an impatient retry) return the original order instead of a second one.
 */
export async function POST(request: Request) {
  const key =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (rateLimited(key)) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Please wait a minute and try again.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Malformed request.' }, { status: 400 });
  }

  const payload = (body ?? {}) as Record<string, unknown>;

  try {
    const items = parseRequestedLines(payload);
    const checkout = parseCheckout(payload);
    const idempotencyKey = asString(payload.idempotencyKey, 80) || null;

    const { order, duplicate } = await createOrder({ items, checkout, idempotencyKey });

    return NextResponse.json(
      {
        ok: true,
        orderNumber: order.orderNumber,
        duplicate,
        total: order.total,
      },
      { status: duplicate ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { ok: false, error: error.message, fieldErrors: error.fieldErrors },
        { status: 422 },
      );
    }
    console.error('[orders] failed to place order:', error);
    return NextResponse.json(
      { ok: false, error: 'Something went wrong placing your order. Please try again.' },
      { status: 500 },
    );
  }
}