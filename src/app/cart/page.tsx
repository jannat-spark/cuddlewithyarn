import type { Metadata } from 'next';
import BrandMark from '@/components/brand/BrandMark';
import CartContents from '@/components/cart/CartContents';

export const metadata: Metadata = {
  title: 'Your bag',
  description: 'Review the handmade crochet pieces in your bag before checking out.',
  alternates: { canonical: '/cart' },
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <div className="shell pb-24 pt-[calc(var(--header-h)+2.5rem)] md:pb-32 md:pt-[calc(var(--header-h)+4rem)]">
      <div className="flex items-start gap-4 md:gap-7">
        <BrandMark name="stamp" tone="ink" decorative className="mt-1 hidden w-20 shrink-0 sm:block" />
        <div className="min-w-0">
          <p className="eyebrow">Your bag</p>
          <h1 className="mt-5 font-display text-[length:var(--text-display)] uppercase leading-[0.98]">
            Ready when
            <span className="block italic text-crimson-600">you are</span>
          </h1>
        </div>
      </div>
      <div className="mt-10 md:mt-14">
        <CartContents />
      </div>
    </div>
  );
}