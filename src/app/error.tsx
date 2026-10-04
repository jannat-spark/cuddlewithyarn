'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app] unhandled error:', error);
  }, [error]);

  return (
    <div className="on-wine flex min-h-[80svh] items-center bg-wine-900">
      <div className="shell max-w-[46rem] py-24">
        <p className="eyebrow eyebrow--light">Something broke</p>
        <h1 className="mt-5 font-display text-[length:var(--text-display)] uppercase leading-[0.98]">
          A stitch
          <span className="block italic text-blush-200">came loose</span>
        </h1>
        <p className="mt-6 max-w-[44ch] text-[length:1rem] leading-relaxed text-champagne-200/80">
          This page did not load. The shop itself is fine — try again, or head back to the
          collection.
        </p>
        {error.digest ? (
          <p className="mt-4 text-xs text-champagne-200/50">Reference {error.digest}</p>
        ) : null}
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn btn--light">
            Try again
          </button>
          <Link href="/" className="btn btn--outline-light">
            Back to the beginning
          </Link>
        </div>
      </div>
    </div>
  );
}