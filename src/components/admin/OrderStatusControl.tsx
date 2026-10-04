'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { STATUS_LABELS, type OrderStatus } from '@/lib/brand';

export default function OrderStatusControl({
  orderId,
  status,
  allowed,
}: {
  orderId: string;
  status: OrderStatus;
  allowed: OrderStatus[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<OrderStatus | null>(null);

  async function change(next: OrderStatus) {
    setBusy(next);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? 'Could not change the status.');
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError('Network problem. Try again.');
    } finally {
      setBusy(null);
    }
  }

  if (allowed.length === 0) {
    return (
      <p className="text-[0.625rem] uppercase tracking-[0.18em] text-ink-400">
        {STATUS_LABELS[status]} · closed
      </p>
    );
  }

  return (
    <div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Change order status"
      >
        {allowed.map((next) => (
          <button
            key={next}
            type="button"
            onClick={() => change(next)}
            disabled={busy !== null || pending}
            className={`btn btn--sm ${
              next === 'cancelled' ? 'btn--ghost text-crimson-600' : ''
            }`}
          >
            {busy === next ? 'Saving…' : `Mark ${STATUS_LABELS[next].toLowerCase()}`}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-crimson-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}