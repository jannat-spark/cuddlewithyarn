import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What Cuddle With Yarn collects, why, how long it is kept, and how to have it deleted.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="shell pb-24 pt-[calc(var(--header-h)+2.5rem)] md:pb-32 md:pt-[calc(var(--header-h)+4rem)]">
      <article className="max-w-[46rem]">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-5 font-display text-[length:var(--text-display)] uppercase leading-[0.98]">
          Privacy
        </h1>
        <p className="mt-4 text-[0.95rem] text-ink-400">Last updated {new Date().getFullYear()}</p>

        <div className="prose-brand mt-9 text-[length:1rem] leading-relaxed">
          <p>
            This is a small studio, not a data business. The short version: we collect what we need
            to make and post your order, we do not sell it, and we do not run advertising trackers.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">
            What we collect
          </h2>
          <ul className="list-disc pl-5">
            <li>Order details: name, email, phone and delivery address.</li>
            <li>
              Anything you send in a custom request, including a reference image if you attach one.
            </li>
            <li>
              Anonymous, aggregate traffic figures — which pages are read, not who read them.
            </li>
          </ul>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">Why we hold it</h2>
          <p>
            To make your piece, to post it, to answer you about it, and to keep a record that satisfies
            our tax obligations. Your bag lives in your own browser&rsquo;s storage and is never sent
            to us until you place an order.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">Cookies</h2>
          <p>
            One functional cookie keeps you signed in to the studio back office. Nothing else is set,
            and there is no third-party advertising or analytics script on this site.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">How long</h2>
          <p>
            Order records are kept for eight years because tax law requires it. Custom request
            photographs are deleted twelve months after the project closes. Nothing is kept for
            marketing without you asking for it.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">Your choices</h2>
          <p>
            Write to us and we will send you a copy of what we hold about you, correct anything
            wrong, or delete it entirely apart from the records we are legally required to keep.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">Processors</h2>
          <p>
            Orders are stored in Supabase. Payments, when you settle one, run through a payment link we
            send you — we never see or store card numbers. Reference images you upload are kept in
            Supabase object storage.
          </p>
        </div>

        <p className="mt-12 border-t border-wine-900/10 pt-6 text-[0.95rem] text-ink-700">
          Questions:{' '}
          <a href={`mailto:${BRAND.email}`} className="link-rule">
            {BRAND.email}
          </a>
        </p>
      </article>
    </div>
  );
}