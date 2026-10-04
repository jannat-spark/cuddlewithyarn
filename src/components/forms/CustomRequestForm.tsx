'use client';

import { useState } from 'react';
import Link from 'next/link';
import ReferenceImageField from './ReferenceImageField';
import { BRAND } from '@/lib/brand';

type Errors = Record<string, string>;

const COLOR_OPTIONS = [
  'Crimson',
  'Blush',
  'Ivory',
  'Champagne',
  'Deep wine',
  'A colour from a photo',
];

const SIZE_OPTIONS = [
  'Pocket — under 12 cm',
  'Everyday — 14–18 cm',
  'Statement — 20 cm and up',
  'Not sure yet',
];

export default function CustomRequestForm({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'submitting') return; // guards double taps and Enter-key repeats

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get('name') ?? ''),
      phone: String(data.get('phone') ?? ''),
      email: String(data.get('email') ?? ''),
      description: String(data.get('description') ?? ''),
      colorPreference: String(data.get('colorPreference') ?? ''),
      sizePreference: String(data.get('sizePreference') ?? ''),
      notes: String(data.get('notes') ?? ''),
      referenceImageUrl,
    };

    // Cheap client-side pass so people are not told about a typo after a round trip.
    const local: Errors = {};
    if (payload.name.trim().length < 2) local.name = 'Please tell us your name.';
    if (payload.phone.replace(/\D/g, '').length < 10) local.phone = 'Enter a 10-digit mobile number.';
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(payload.email.trim()))
      local.email = 'Enter an email address.';
    if (payload.description.trim().length < 20)
      local.description = 'A little more detail helps — at least 20 characters.';
    if (Object.keys(local).length > 0) {
      setErrors(local);
      setFormError('Please check the highlighted fields.');
      const first = form.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.focus();
      return;
    }

    setErrors({});
    setFormError(null);
    setStatus('submitting');

    try {
      const response = await fetch('/api/custom-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        reference?: string;
        fieldErrors?: Errors;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error ?? 'Something went wrong. Please try again.');
        setStatus('idle');
        return;
      }

      setConfirmation(result.reference ?? null);
      setStatus('success');
      form.reset();
      setReferenceImageUrl('');
    } catch {
      setFormError('We could not reach the studio. Check your connection and try again.');
      setStatus('idle');
    }
  }

  if (status === 'success') {
    return (
      <div
        className={[
          'border p-8 md:p-10',
          dark ? 'border-champagne-200/20 bg-wine-950/40' : 'border-wine-900/12 bg-paper-200',
        ].join(' ')}
        role="status"
      >
        <p className="eyebrow">Request received</p>
        <h3
          className={[
            'mt-4 font-display text-[length:var(--text-title)] uppercase leading-tight',
            dark ? 'text-champagne-100' : '',
          ].join(' ')}
        >
          Thank you — we have it.
        </h3>
        <p className={`mt-4 max-w-[46ch] text-[length:1rem] leading-relaxed ${dark ? 'text-champagne-200/80' : 'text-ink-700'}`}>
          We read every request ourselves before we reply. Expect a note from us at{' '}
          <span className="whitespace-nowrap">{BRAND.email}</span> within two working days, with an
          idea of what it would take and what it would cost.
        </p>
        {confirmation ? (
          <p className={`mt-4 text-sm ${dark ? 'text-champagne-200/60' : 'text-ink-500'}`}>
            Reference <span className="font-display">{confirmation}</span>
          </p>
        ) : null}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/shop" className={dark ? 'btn btn--light' : 'btn'}>
            Browse the collection
          </Link>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className={dark ? 'btn btn--outline-light' : 'btn btn--ghost'}
          >
            Send another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="cr-name">Name</label>
          <input
            id="cr-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="input"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'cr-name-error' : undefined}
          />
          {errors.name ? (
            <p className="error" id="cr-name-error">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="cr-phone">Phone</label>
          <input
            id="cr-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="94013 13167"
            required
            className="input"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'cr-phone-error' : undefined}
          />
          {errors.phone ? (
            <p className="error" id="cr-phone-error">
              {errors.phone}
            </p>
          ) : null}
        </div>
      </div>

      <div className="field">
        <label htmlFor="cr-email">Email</label>
        <input
          id="cr-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className="input"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'cr-email-error' : undefined}
        />
        {errors.email ? (
          <p className="error" id="cr-email-error">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="cr-description">What would you like made?</label>
        <p className="hint" id="cr-description-hint">
          Shape, who it is for, and roughly how big. A sentence or two is plenty.
        </p>
        <textarea
          id="cr-description"
          name="description"
          required
          rows={5}
          className="textarea"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={`cr-description-hint${errors.description ? ' cr-description-error' : ''}`}
        />
        {errors.description ? (
          <p className="error" id="cr-description-error">
            {errors.description}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="cr-color">Colour preference</label>
          <select id="cr-color" name="colorPreference" className="select" defaultValue="">
            <option value="">No preference</option>
            {COLOR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cr-size">Size preference</label>
          <select id="cr-size" name="sizePreference" className="select" defaultValue="">
            <option value="">No preference</option>
            {SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ReferenceImageField
        value={referenceImageUrl}
        onChange={setReferenceImageUrl}
        error={errors.referenceImageUrl}
      />

      <div className="field">
        <label htmlFor="cr-notes">Additional notes</label>
        <p className="hint">Budget, a date, or anything we should avoid.</p>
        <textarea id="cr-notes" name="notes" rows={3} className="textarea" />
      </div>

      {formError ? (
        <p role="alert" className="border-l-2 border-crimson-500 pl-3 text-sm text-crimson-600">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
        <button type="submit" className="btn btn--full sm:w-auto" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : 'Send request'}
        </button>
        <p className="text-xs leading-relaxed text-ink-400">
          We reply within two working days. Nothing you send is shared or resold.
        </p>
      </div>
    </form>
  );
}