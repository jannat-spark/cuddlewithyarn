import Link from 'next/link';
import BrandMark from '@/components/brand/BrandMark';
import { BRAND, PHONE_E164, PRIMARY_NAV } from '@/lib/brand';

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Shop',
    links: [
      { href: '/shop', label: 'All pieces' },
      { href: '/shop/bags', label: 'Bags' },
      { href: '/shop/flowers', label: 'Flowers' },
      { href: '/shop/accessories', label: 'Accessories' },
      { href: '/custom', label: 'Custom crochet' },
    ],
  },
  {
    title: 'Studio',
    links: [
      { href: '/atelier', label: 'The atelier' },
      { href: '/custom', label: 'Commission a piece' },
      { href: '/shipping', label: 'Shipping & returns' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: '/admin', label: 'Studio login' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="on-wine grain relative mt-24 overflow-hidden bg-wine-900 md:mt-32">
      {/* Decorative identity mark, bled off the top-right corner so the wordmark
          and the columns stay the loudest things in the panel. */}
      <BrandMark
        name="seal"
        tone="champagne"
        decorative
        className="brand-watermark brand-watermark--light -right-10 -top-10 w-56 opacity-[0.07] md:-right-4 md:-top-16 md:w-80"
      />

      <div className="shell relative z-[3] py-14 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-8">
          <div>
            <Link
              href="/"
              className="inline-block w-fit"
              aria-label={`${BRAND.name} — home`}
            >
              <BrandMark name="wordmark" tone="champagne" decorative className="w-48 max-w-full md:w-56" />
            </Link>
            <p className="mt-5 max-w-[30ch] text-sm leading-relaxed text-champagne-200/70">
              {BRAND.tagline} A small studio in {BRAND.location} making crochet that is finished
              by hand, one stitch at a time.
            </p>
            <a
              href={BRAND.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="link-rule mt-5 inline-block text-[0.6875rem] uppercase tracking-[0.24em]"
            >
              Instagram · {BRAND.instagramHandle}
            </a>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-[0.625rem] uppercase tracking-[0.28em] text-champagne-200/50">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.href}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-champagne-200/85 transition-colors hover:text-champagne-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <hr className="my-10 border-champagne-200/15" />

        <div className="flex flex-col gap-6 text-[0.6875rem] uppercase tracking-[0.18em] text-champagne-200/55 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.name}
          </p>
          <address className="not-italic normal-case tracking-normal text-champagne-200/70">
            <a href={`mailto:${BRAND.email}`} className="link-rule">
              {BRAND.email}
            </a>
            <span className="mx-3 text-champagne-200/30">·</span>
            <a href={`tel:${PHONE_E164}`} className="link-rule">
              {BRAND.phone}
            </a>
          </address>
          <p>
            {BRAND.address.line1}, {BRAND.address.line2}
          </p>
        </div>

        {/* Full navigation for crawlers and for anyone reading the footer as a
            map of the shop. Visually redundant with the columns above. */}
        <nav aria-label="Footer" className="sr-only">
          <ul>
            {PRIMARY_NAV.map((item) => (
              <li key={`footer-${item.href}`}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}