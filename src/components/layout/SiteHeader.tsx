'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BrandMark from '@/components/brand/BrandMark';
import { BRAND, PRIMARY_NAV, PHONE_E164 } from '@/lib/brand';
import { useCart } from '@/components/cart/CartProvider';

export default function SiteHeader() {
  const pathname = usePathname();
  const { count, ready, openSheet } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // The hero is pinned for several screens, so the header has to know when it
    // is actually over the hero rather than simply "scrolled".
    //
    // Two things that are easy to get wrong:
    //
    //  • A page with no hero is never over one. Defaulting to `scrollY <= 24`
    //    instead would leave the champagne-on-wine treatment active at the top of
    //    every other page — a champagne wordmark on the paper background, which is
    //    all but invisible.
    //  • The hero only becomes tall once its own effect applies the pin, which is
    //    after this one runs. Evaluating before that sees a single-screenful hero,
    //    decides the header is below it, and shows a solid paper bar over the dark
    //    hero until the visitor happens to scroll. Observing the hero's height
    //    closes that window.
    const onScroll = () => {
      const hero = document.querySelector('[data-hero-root]');
      const overHero = hero ? hero.getBoundingClientRect().bottom > window.innerHeight - 40 : false;
      const next = !overHero;
      setScrolled((current) => (current === next ? current : next));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    const hero = document.querySelector('[data-hero-root]');
    const heroObserver = hero ? new ResizeObserver(onScroll) : null;
    if (hero && heroObserver) heroObserver.observe(hero);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      heroObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        ref={headerRef}
        data-scrolled={scrolled || menuOpen ? 'true' : 'false'}
        className="fixed inset-x-0 top-0 z-[100] transition-[background-color,border-color] duration-300"
      >
        <div className="shell flex h-[var(--header-h)] items-center justify-between gap-4">
          <Link
            href="/"
            className="flex min-w-0 items-center no-underline"
            aria-label={`${BRAND.name} — home`}
          >
            {/* Both colourways are in the DOM and cross-faded by CSS, so moving
                between the over-hero and solid header states costs no request
                and no layout shift. The link carries the accessible name, so
                the marks themselves are decorative. */}
            <span className="brand-swap shrink-0">
              <BrandMark name="wordmark" tone="ink" decorative priority />
              <BrandMark name="wordmark" tone="champagne" decorative priority className="absolute inset-0" />
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex xl:gap-9">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className="link-rule whitespace-nowrap text-[0.6875rem] uppercase tracking-[0.24em]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <a
              href={`tel:${PHONE_E164}`}
              className="link-rule hidden h-11 items-center px-2 text-[0.6875rem] uppercase tracking-[0.18em] xl:flex"
            >
              {BRAND.phone}
            </a>

            <button
              type="button"
              onClick={openSheet}
              className="relative flex h-11 w-11 items-center justify-center"
              aria-label={ready && count > 0 ? `Bag, ${count} item${count === 1 ? '' : 's'}` : 'Bag, empty'}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                <path
                  d="M5.5 8.5h13l-1.1 11a1.5 1.5 0 0 1-1.5 1.4H8.1a1.5 1.5 0 0 1-1.5-1.4L5.5 8.5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M9 9.5V7a3 3 0 0 1 6 0v2.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              {ready && count > 0 ? (
                <span className="absolute right-1 top-1 min-w-[1.15rem] rounded-full bg-crimson-600 px-1 text-center text-[0.625rem] leading-[1.15rem] text-ivory tabular-nums">
                  {count}
                </span>
              ) : null}
            </button>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="flex h-11 w-11 items-center justify-center lg:hidden"
            >
              <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                ) : (
                  <path d="M3.5 7.5h17M3.5 12h17M3.5 16.5h17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div id="mobile-menu" className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-wine-900" />
          <nav
            aria-label="Primary"
            className="on-wine relative flex h-full flex-col overflow-y-auto overscroll-contain bg-wine-900 px-[var(--gutter)]"
          >
            {/* `m-auto` rather than `justify-center`: auto margins centre the
                menu when it fits and fall back to the top when it does not, so a
                long list on a short phone never gets its first item hidden under
                the fixed header. */}
            <div className="m-auto w-full py-[calc(var(--header-h)+1.5rem)]">
              <BrandMark
                name="stamp"
                tone="champagne"
                decorative
                className="mb-7 w-24 shrink-0 opacity-90"
              />
              {[{ href: '/', label: 'Home' }, ...PRIMARY_NAV, { href: '/contact', label: 'Contact' }].map(
                (item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className="flex items-center justify-between gap-4 border-b border-champagne-200/12 py-3.5 font-display text-[length:1.85rem] leading-tight"
                    style={{ animation: `menu-in 420ms var(--ease-out-soft) ${index * 55}ms both` }}
                  >
                    {item.label}
                    <span aria-hidden="true" className="text-champagne-200/30">
                      ↗
                    </span>
                  </Link>
                ),
              )}

              <div className="mt-8 flex flex-col gap-2 text-[0.6875rem] uppercase tracking-[0.2em] text-champagne-200/60">
                <a href={`tel:${PHONE_E164}`} className="link-rule w-fit">
                  {BRAND.phone}
                </a>
                <a
                  href={`mailto:${BRAND.email}`}
                  className="link-rule w-fit normal-case tracking-normal"
                >
                  {BRAND.email}
                </a>
                <p className="mt-2">
                  {BRAND.instagramHandle} · {BRAND.location}
                </p>
              </div>
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}