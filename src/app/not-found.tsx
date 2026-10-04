import Link from 'next/link';
import BrandMark from '@/components/brand/BrandMark';

export default function NotFound() {
  return (
    <div className="on-wine grain relative flex min-h-[80svh] items-center overflow-hidden bg-wine-900">
      <BrandMark
        name="seal"
        tone="champagne"
        decorative
        className="brand-watermark brand-watermark--light -right-8 -top-8 w-48 opacity-[0.08] md:-right-2 md:-top-12 md:w-72"
      />
      <div className="shell relative z-[3] max-w-[46rem] py-24">
        <BrandMark name="stamp" tone="champagne" decorative className="mb-8 w-24" />
        <p className="eyebrow eyebrow--light">404</p>
        <h1 className="mt-5 font-display text-[length:var(--text-display)] uppercase leading-[0.98]">
          This one is
          <span className="block italic text-blush-200">not in the basket</span>
        </h1>
        <p className="mt-6 max-w-[44ch] text-[length:1rem] leading-relaxed text-champagne-200/80">
          The page you were looking for has been unravelled. It may have sold out, or the link may
          have been mistyped.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link href="/shop" className="btn btn--light">
            Shop the collection
          </Link>
          <Link href="/" className="btn btn--outline-light">
            Back to the beginning
          </Link>
        </div>
      </div>
    </div>
  );
}