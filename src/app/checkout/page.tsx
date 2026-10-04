import type { Metadata } from 'next';
import BrandMark from '@/components/brand/BrandMark';
import CheckoutForm from '@/components/checkout/CheckoutForm';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your order of handmade crochet from Cuddle With Yarn.',
  alternates: { canonical: '/checkout' },
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="shell pb-24 pt-[calc(var(--header-h)+2.5rem)] md:pb-32 md:pt-[calc(var(--header-h)+4rem)]">
      <div className="flex items-start gap-4 md:gap-7">
        <BrandMark name="stamp" tone="ink" decorative className="mt-1 hidden w-20 shrink-0 sm:block" />
        <div className="min-w-0">
          <p className="eyebrow">Checkout</p>
          <h1 className="mt-5 font-display text-[length:var(--text-display)] uppercase leading-[0.98]">
            Almost yours
            <span className="block italic text-crimson-600">one thread at a time</span>
          </h1>
        </div>
      </div>
      <div className="mt-10 md:mt-14">
        <CheckoutForm />
      </div>
    </div>
  );
}