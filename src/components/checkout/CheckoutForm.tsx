'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { formatPrice } from '@/lib/money';
import { BRAND, PHONE_E164 } from '@/lib/brand';
import { parseCheckout } from '@/lib/validation';

type Errors = Record<string, string>;

/** Stable key so a double-tap or a retried request cannot create two orders. */
function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function CheckoutForm() {
  const router = useRouter();
  const { lines, ready, subtotal, shipping, clear } = useCart();

  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [international, setInternational] = useState(false);
  const idempotencyKey = useRef(newIdempotencyKey());
  const formRef = useRef<HTMLFormElement | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  // A different bag means a different order, so the key must be renewed.
  useEffect(() => {
    idempotencyKey.current = newIdempotencyKey();
  }, [lines.length]);

  const internationalShippinb = useMemo(() => (international ? 2400 : shipping), [international, shipping]);
  const orderTotal = subtotal + internationalShippinb;

  const focusFirstError = useCallback((fieldErrors: Errors) => {
    const first = Object.keys(fieldErrors)[0];
    if (!first) return;
    const field = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
    (field ?? errorSummaryRef.current)?.focus();
  }, []);

  if (!ready) {
    return (
      <p className="py-16 text-center text-ink-400" role="status">
        Loading your bag…
      </p>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="border border-wine-900/12 bg-paper-200 px-6 py-16 text-center">
        <h2 className="font-display text-[length:var(--text-title)] uppercase leading-tight">
          There is nothing to check out
        </h2>
        <p className="mx-auto mt-4 max-w-[42ch] text-[length:1rem] leading-relaxed text-ink-700">
          Your bag is empty. Pick a piece and we will hold it while you finish.
        </p>
        <Link href="/shop" className="btn mt-8">
          Shop the collection
        </Link>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'submitting') return; // hard guard against double submission

    const form = event.currentTarget;
    const data = new FormData(form);

    const payload = {
      ...Object.fromEntries(data.entries()),
      international,
      items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      idempotencyKey: idempotencyKey.current,
    };

    try {
      // Runs the same validators the server runs; its only jog is to avoid a
      // round trip for an obvious typo. The server never trusts this result.
      parseCheckout(payload);
    } catch (error) {
      const fieldErrors = (error as { fieldErrors?: Errors }).fieldErrors ?? {};
      setErrors(fieldErrors);
      setFormError('Please check the highlighted fields.');
      focusFirstError(fieldErrors);
      return;
    }

    setErrors({});
    setFormError(null);
    setStatus('submitting');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        orderNumber?: string;
        fieldErrors?: Errors;
        error?: string;
      };

      if (!response.ok || !result.ok || !result.orderNumber) {
        const fieldErrors = result.fieldErrors ?? {};
        setErrors(fieldErrors);
        setFormError(result.error ?? 'We could not place the order. Please try again.');
        setStatus('idle');
        focusFirstError(fieldErrors);
        return;
      }

      clear();
      setStatus('done');
      router.replace(`/order/${encodeURIComponent(result.orderNumber)}?placed=1`);
    } catch {
      setFormError('We could not reach the studio. Check your connection and try again.');
      setStatus('idle');
    }
  }

  const field = (
    name: string,
    label: string,
    options: {
      type?: string;
      autoComplete?: string;
      inputMode?: 'text' | 'tel' | 'email' | 'numeric';
      placeholder?: string;
      hint?: string;
      maxLength?: number;
    } = {},
  ) => {
    const id = `co-${name}`;
    const error = errors[name];
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        {options.hint ? (
          <p className="hint" id={`${id}-hint`}>
            {options.hint}
          </p>
        ) : null}
        <input
          id={id}
          name={name}
          type={options.type ?? 'text'}
          autoComplete={options.autoComplete}
          inputMode={options.inputMode}
          placeholder={options.placeholder}
          maxLength={options.maxLength}
          className="input"
          aria-invalid={Boolean(error)}
          aria-describedby={`${error ? `${id}-error` : options.hint ? `${id}-hint` : undefined}`}
        />
        {error ? (
          <p className="error" id={`${id}-error`}>
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
      <form ref={formRef} onSubmit={onSubmit} noValidate className="order-2 lg:order-1">
        <fieldset>
          <legend className="fieldset-legend border-g border-wine-900/10 pb-3 text-[0.6875rem] uppercase tracking-[0.24em]">
            <span className="font-display text-[length:1.25rem] normal-case tracking-normal text-ink-900">
              Where should it go?
            </span>
          </legend>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {field('customerName', 'Full name', { autoComplete: 'name' })}
            {field('phone', 'Phone', {
              type: 'tel',
              autoComplete: 'tel',
              inputMode: 'tel',
              placeholder: '94013 13167',
              hint: 'We confirm by WhatsApp too.',
            })}
          </div>

          <div className="mt-5">{field('email', 'Email', { type: 'email', autoComplete: 'email', inputMode: 'email' })}</div>

          <div className="mt-5">
            {field('addressLine', 'Address', {
              autoComplete: 'street-address',
              placeholder: 'Flat, street, landmark',
              maxLength: 400,
            })}
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            {field('city', 'City', { autoComplete: 'address-level2' })}
            {field('state', 'State', { autoComplete: 'address-level1' })}
            {field('pincode', 'PIN code', {
              autoComplete: 'postal-code',
              inputMode: 'numeric',
              maxLength: 6,
              placeholder: '302001',
            })}
          </div>

          <div className="mt-6">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={international}
                onChange={(event) => setInternational(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[#9c1028]"
              />
              <span>
                Shipping outside India
                <span className="block text-ink-400">
                  Adds {formatPrice(2400)} and 7–12 working days.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset className="mt-10">
          <legend className="fieldset-legend border-g border-wine-900/10 pb-3 text-[0.6875rem] uppercase tracking-[0.24em]">
            <span className="font-display text-[length:1.25rem] normal-case tracking-normal text-ink-900">
              Anything we should know?
            </span>
          </legend>
          <div className="field mt-6">
            <label htmlFor="co-notes" className="sr-only">
              Notes for the studio
            </label>
            <textarea
              id="co-notes"
              name="notes"
              rows={4}
              maxLength={600}
              className="textarea"
              placeholder="Gift wrapping, a delivery date, a colour you would rather avoid…"
            />
          </div>
        </fieldset>

        {formError ? (
          <div
            ref={errorSummaryRef}
            tabIndex={-1}
            role="alert"
            className="mt-8 border-l-2 border-crimson-500 bg-blush-100/60 px-4 py-3 text-sm text-crimson-700"
          >
            {formError}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <button type="submit" className="btn btn--full sm:w-auto" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Placing your order…' : `Place order · ${formatPrice(orderTotal)}`}
          </button>
          <Link href="/cart" className="text-[0.6875rem] uppercase tracking-[0.2em] text-ink-400 underline underline-offset-4 hover:text-crimson-600">
            Back to bag
          </Link>
        </div>

        <p className="mt-5 max-w-[52ch] text-xs leading-relaxed text-ink-400">
          Placing the order does not charge a card. We email a confirmation with the exact price, we
          make the piece, and then we send a payment link for the amount above. Prefer to pay
          another way? Say so in the notes and we will arrange it.
        </p>
      </form>

      <aside
        aria-label="Order summary"
        className="order-1 lg:order-2 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start"
      >
        <div className="border border-wine-900/12 bg-paper-200 p-6">
          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">Your order</h2>
          <ul className="mt-5 space-y-4">
            {lines.map((line) => (
              <li key={line.productId} className="flex gap-3">
                <div className="media-frame relative h-16 w-14 shrink-0">
                  {line.image?.src ? (
                    <Image
                      src={line.image.src}
                      alt=""
                      fill
                      sizes="56px"
                      loading="lazy"
                      decoding="async"
                      className="object-cover"
                    />
                  ) : null}
                  <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-wine-900 px-1 text-center text-[0.625rem] leading-5 text-ivory">
                    {line.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{line.name}</p>
                  <p className="text-xs text-ink-400">{formatPrice(line.price)} each</p>
                </div>
                <p className="text-sm tabular-nums">{formatPrice(line.price * line.quantity)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-2.5 border-t border-wine-900/10 pt-5 text-[length:0.95rem]">
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Shipping</dt>
              <dd className="tabular-nums">
                {internationalShippinb === 0 ? 'Free' : formatPrice(internationalShippinb)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-wine-900/10 pt-3 font-display text-[length:1.25rem]">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(orderTotal)}</dd>
            </div>
          </dl>

          <p className="mt-5 border-t border-wine-900/10 pt-4 text-xs leading-relaxed text-ink-400">
            Questions about this order? Write to{' '}
            <a href={`mailto:${BRAND.email}`} className="link-rule">
              {BRAND.email}
            </a>{' '}
            or WhatsApp{' '}
            <a href={`https://wa.me/${PHONE_E164}`} className="link-rule">
              {BRAND.phone}
            </a>
            .
          </p>
        </div>
      </aside>
    </div>
  );
}