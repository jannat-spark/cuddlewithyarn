import type { Metadata } from 'next';
import BrandMark from '@/components/brand/BrandMark';
import CustomCrochetSection from '@/components/home/CustomCrochetSection';
import { BRAND, SITE_URL } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Custom crochet',
  description:
    'Commission a handmade crochet piece: tell us the idea, the colour and the size, and we will come back with a stitch plan and a price within two working days.',
  alternates: { canonical: '/custom' },
  openGraph: {
    title: `Custom crochet · ${BRAND.name}`,
    description:
      'You bring the idea. We turn it into stitches. Commission a one-off handmade crochet piece.',
    url: `${SITE_URL}/custom`,
  },
};

export default function CustomPage() {
  return (
    <>
      <div className="relative overflow-hidden pb-10 pt-[calc(var(--header-h)+3rem)] md:pb-16 md:pt-[calc(var(--header-h)+5rem)]">
        <BrandMark
          name="seal"
          tone="ink"
          decorative
          className="brand-watermark -right-8 top-14 w-40 opacity-[0.07] md:-right-2 md:w-64"
        />
        <div className="shell relative flex items-start gap-4 md:gap-8">
          <BrandMark name="stamp" tone="ink" decorative className="mt-1 hidden w-24 shrink-0 sm:block" />
          <div className="min-w-0">
            <p className="eyebrow">Commissions</p>
            <h1 className="mt-5 max-w-[18ch] font-display text-[length:var(--text-display)] uppercase leading-[0.98]">
              The piece you
              <span className="block italic text-crimson-600">cannot buy</span>
            </h1>
            <p className="lede mt-6">
              Most of the studio&rsquo;s best work started as a sentence in an inbox. Tell us what
              you have in mind and we will tell you honestly whether crochet is the right answer.
            </p>
          </div>
        </div>
      </div>
      <CustomCrochetSection standalone />
    </>
  );
}