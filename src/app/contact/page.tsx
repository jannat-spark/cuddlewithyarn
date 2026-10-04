import type { Metadata } from 'next';
import Link from 'next/link';
import BrandMark from '@/components/brand/BrandMark';
import { BRAND, PHONE_E164, SITE_URL } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Reach the Cuddle With Yarn studio: ${BRAND.email}, ${BRAND.phone}, ${BRAND.location}.`,
  alternates: { canonical: '/contact' },
  openGraph: { title: `Contact · ${BRAND.name}`, url: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <div className="shell pb-24 pt-[calc(var(--header-h)+2.5rem)] md:pb-32 md:pt-[calc(var(--header-h)+4rem)]">
      <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <div className="relative">
          <BrandMark
            name="seal"
            tone="ink"
            decorative
            className="brand-watermark -right-10 -top-8 w-40 opacity-[0.06] md:-right-6 md:-top-12 md:w-64"
          />
          <div className="relative flex items-start gap-4">
            <BrandMark name="stamp" tone="ink" decorative className="mt-1 hidden w-20 shrink-0 sm:block" />
            <div className="min-w-0">
              <p className="eyebrow">Contact</p>
              <h1 className="mt-5 max-w-[16ch] font-display text-[length:var(--text-display)] uppercase leading-[0.98]">
                Talk to a
                <span className="block italic text-crimson-600">real person</span>
              </h1>
              <p className="lede mt-6">
                No ticket numbers, no chatbots. Messages are read by whoever is at the hook table,
                which usually means a reply within one working day.
              </p>
            </div>
          </div>

          <dl className="mt-10 space-y-7 border-t border-wine-900/10 pt-8">
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.24em] text-ink-400">Email</dt>
              <dd className="mt-1.5 font-display text-[length:1.25rem]">
                <a href={`mailto:${BRAND.email}`} className="link-rule">
                  {BRAND.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.24em] text-ink-400">
                Phone &amp; WhatsApp
              </dt>
              <dd className="mt-1.5 font-display text-[length:1.25rem]">
                <a href={`tel:${PHONE_E164}`} className="link-rule">
                  {BRAND.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.24em] text-ink-400">Instagram</dt>
              <dd className="mt-1.5 font-display text-[length:1.25rem]">
                <a
                  href={BRAND.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-rule"
                >
                  {BRAND.instagramHandle}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.24em] text-ink-400">Studio</dt>
              <dd className="mt-1.5 not-italic leading-relaxed">
                {BRAND.address.line1}
                <br />
                {BRAND.address.line2}
                <br />
                <span className="text-ink-500">Open Thursday &amp; Friday, by appointment</span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6">
          <div className="border border-wine-900/12 bg-paper-200 p-7">
            <h2 className="font-display text-[length:1.5rem] uppercase leading-tight">
              Commission a piece
            </h2>
            <p className="mt-3 text-[length:0.98rem] leading-relaxed text-ink-700">
              The request form asks for the useful things — colour, size, who it is for — and lets
              you attach a photograph if you have one. It takes about two minutes.
            </p>
            <Link href="/custom" className="btn btn--full mt-6">
              Start a custom request
            </Link>
          </div>

          <div className="border border-wine-900/12 p-7">
            <h2 className="font-display text-[length:1.5rem] uppercase leading-tight">
              Order or delivery question
            </h2>
            <p className="mt-3 text-[length:0.98rem] leading-relaxed text-ink-700">
              Include your order number if you have one — it starts with{' '}
              <span className="font-display">CWY-</span> — and we can answer in one message.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <a
                href={`mailto:${BRAND.email}`}
                className="btn btn--ghost btn--full"
              >
                Email the studio
              </a>
              <a
                href={`https://wa.me/${PHONE_E164}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--ghost btn--full"
              >
                WhatsApp us
              </a>
            </div>
          </div>

          <div className="border border-wine-900/12 p-7">
            <h2 className="font-display text-[length:1.5rem] uppercase leading-tight">
              Returns &amp; exchanges
            </h2>
            <p className="mt-3 text-[length:0.98rem] leading-relaxed text-ink-700">
              Seven days from delivery, unworn. Made-to-order colourways cannot be returned, but if
              something arrives damaged we will remake it immediately and cover the shipping.
            </p>
            <Link href="/shipping" className="link-rule mt-5 inline-block text-[0.6875rem] uppercase tracking-[0.2em]">
              Read the shipping policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}