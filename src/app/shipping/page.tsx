import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND, PHONE_E164, SHIPPING, SITE_URL } from '@/lib/brand';
import { formatPrice } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Shipping & returns',
  description:
    'Handmade crochet is made to order. How long it takes, what shipping costs inside and outside India, and how returns work at Cuddle With Yarn.',
  alternates: { canonical: '/shipping' },
};

export default function ShippingPage() {
  return (
    <div className="shell pb-24 pt-[calc(var(--header-h)+2.5rem)] md:pb-32 md:pt-[calc(var(--header-h)+4rem)]">
      <div className="max-w-[46rem]">
        <p className="eyebrow">Shipping &amp; returns</p>
        <h1 className="mt-5 font-display text-[length:var(--text-display)] uppercase leading-[0.98]">
          Made slowly,
          <span className="block italic text-crimson-600">shipped carefully</span>
        </h1>

        <div className="prose-brand mt-9 text-[length:1rem] leading-relaxed">
          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">Making time</h2>
          <p>
            Nothing is held in stock. Once your order is confirmed we start the rose, block it for two
            days, and finish it by hand. In-stock small pieces ship within three working days;
            purses and commissioned work take about twelve to fourteen days.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">Postage</h2>
          <p>
            Within India, {formatPrice(SHIPPING.flat)} flat, and free on orders over{' '}
            {formatPrice(SHIPPING.freeOver)}. We ship with Delhivery and share tracking the moment
            the parcel is collected. International orders are {formatPrice(SHIPPING.internationalFlat)}{' '}
            and take 7–12 working days after dispatch; import duty, where it applies, is the
            recipient&rsquo;s responsibility.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">Packaging</h2>
          <p>
            Wrapped in ivory tissue with a hand-written note, inside a recycled kraft box. No plastic
            fill. Gift wrapping is free — mention it in your order notes.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">
            Returns &amp; exchanges
          </h2>
          <p>
            Seven days from delivery, unworn and in the original packaging. Made-to-order colourways
            and commissioned pieces cannot be returned — they were made for you specifically — but
            anything that arrives damaged or not as photographed we will remake or refund in full,
            including the postage.
          </p>
          <p>
            Colour is the one thing a photograph cannot promise. If a shade is wrong for your
            project, message us within seven days and we will find a way to make it right.
          </p>

          <h2 className="font-display text-[length:1.4rem] uppercase leading-tight">
            Made by hand, so no two are identical
          </h2>
          <p>
            Slight differences in tension and petal placement are not defects; they are the point.
            Your piece will not be identical to the one in the photograph, and that is intentional.
          </p>
        </div>

        <div className="mt-12 border border-wine-900/12 bg-paper-200 p-7">
          <h2 className="font-display text-[length:1.35rem] uppercase leading-tight">Still stuck?</h2>
          <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-700">
            Write to{' '}
            <a href={`mailto:${BRAND.email}`} className="link-rule">
              {BRAND.email}
            </a>{' '}
            with your order number, or call{' '}
            <a href={`tel:${PHONE_E164}`} className="link-rule">
              {BRAND.phone}
            </a>
            .
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/shop" className="btn">
              Shop the collection
            </Link>
            <Link href="/contact" className="btn btn--ghost">
              Contact the studio
            </Link>
          </div>
          <p className="mt-6 text-xs text-ink-400">
            Last updated {new Date().getFullYear()} · {SITE_URL.replace(/^https?:\/\//, '')}
          </p>
        </div>
      </div>
    </div>
  );
}