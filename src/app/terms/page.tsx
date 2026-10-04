import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND, ORDER_STATUSES, STATUS_LABELS } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The terms that apply when you order handmade crochet from Cuddle With Yarn.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="shell pb-24 pt-[calc(var(--header-h)+2.5rem)] md:pb-32 md:pt-[calc(var(--header-h)+4rem)]">
      <article className="max-w-[46rem]">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-5 font-display text-[length:var(--text-display)] uppercase leading-[0.98]">
          Terms
        </h1>
        <p className="mt-4 text-[0.95rem] text-ink-400">Last updated {new Date().getFullYear()}</p>

        <div className="prose-brand mt-9 text-[length:1rem] leading-relaxed">
          <p>
            By ordering from {BRAND.name} you agree to the following. They are written in plain
            language because a two-page contract for a rose bag would be silly.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">Orders</h2>
          <p>
            Placing an order reserves your piece and starts the making. We confirm every order by
            email before work begins. We may decline an order — for instance if the requested colour
            is outside what we can honestly source — and we would refund you in full if so.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">Payment</h2>
          <p>
            We do not take a card at checkout. After you order we send a payment link for the exact
            total; work starts once it is settled. Prices are in Indian rupees and include GST where
            applicable.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">Timelines</h2>
          <p>
            Dates we give are honest estimates, not guarantees. If a piece will take longer — a dye
            lot has not landed, say — we tell you before you pay the balance, not after.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">
            Handmade variation
          </h2>
          <p>
            Every piece is made by hand. Tension, petal placement and exact shade will vary slightly
            between pieces, and none of that counts as a fault. Photographs are representative rather
            than exact.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">
            Order status
          </h2>
          <p>Your order moves through these states, and you can ask us where it is at any time:</p>
          <ul className="list-disc pl-5">
            {ORDER_STATUSES.map((status) => (
              <li key={status}>
                <span className="font-display">{STATUS_LABELS[status]}</span>
              </li>
            ))}
          </ul>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">
            Returns and fault
          </h2>
          <p>
            Seven days from delivery, unworn, for anything that was made for the shelf. Made-to-order
            colourways and commissioned pieces are not returnable because they were made for you —
            but anything damaged or materially different from its photographs is remade or refunded
            in full, including postage.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">Liability</h2>
          <p>
            Nothing here limits your statutory rights as a consumer. Beyond that, our liability is
            limited to the value of the piece.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">Governing law</h2>
          <p>These terms are governed by the laws of India, and the courts of Jaipur have jurisdiction.</p>
        </div>

        <div className="mt-12 border border-wine-900/12 bg-paper-200 p-7">
          <h2 className="font-display text-[length:1.35rem] uppercase leading-tight">Questions</h2>
          <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-700">
            Ask before you order — we would far rather answer a question now than remake a bag later.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/contact" className="btn">
              Contact the studio
            </Link>
            <Link href="/shipping" className="btn btn--ghost">
              Shipping &amp; returns
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}