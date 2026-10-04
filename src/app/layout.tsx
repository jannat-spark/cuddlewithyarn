import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { BRAND, SITE_URL } from '@/lib/brand';
import { CartProvider } from '@/components/cart/CartProvider';
import SiteChrome from '@/components/layout/SiteChrome';
import './globals.css';

/**
 * Self-hosted at build time, served from our own origin, `display: swap`.
 * No render-blocking request to a third party, no layout shift on load.
 *
 * One weight of the display face plus its italic — the wordmark, the chapter
 * labels and the italic accents are all that use it. Shipping four weights
 * doubled the font payload for no visible gain on a phone.
 */
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-playfair',
  fallback: ['Didot', 'Bodoni MT', 'Georgia', 'serif'],
  // The system Didone stack is already metrically close and lives on the device,
  // so the automatic fallback face would just be bytes we do not need.
  adjustFontFallback: false,
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name} — handmade crochet, rose by rose`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: [
    'handmade crochet',
    'crochet purse',
    'crochet rose bag',
    'crochet hair tie',
    'custom crochet India',
    'Jaipur crochet atelier',
  ],
  authors: [{ name: BRAND.name }],
  creator: BRAND.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: BRAND.name,
    title: `${BRAND.name} — handmade crochet, rose by rose`,
    description: BRAND.description,
    images: [
      { url: '/media/og-hero.jpg', width: 1200, height: 630, alt: BRAND.tagline },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} — handmade crochet, rose by rose`,
    description: BRAND.description,
    images: ['/media/og-hero.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  category: 'shopping',
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2a0710' },
    { media: '(prefers-color-scheme: dark)', color: '#1c040b' },
  ],
};

const organisationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BRAND.name,
  url: SITE_URL,
  description: BRAND.description,
  slogan: BRAND.tagline,
  email: BRAND.email,
  telephone: BRAND.phone,
  foundingDate: BRAND.founded,
  address: {
    '@type': 'PostalAddress',
    streetAddress: `${BRAND.address.line1}, ${BRAND.address.line2}`,
    addressLocality: 'Jaipur',
    addressRegion: BRAND.address.region,
    postalCode: '302001',
    addressCountry: 'IN',
  },
  sameAs: [BRAND.instagram],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={SITE_URL} />
        <link
          rel="preload"
          as="image"
          href="/media/hero-poster-960.webp"
          type="image/webp"
          fetchPriority="high"
        />
      </head>
      <body className="antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <CartProvider>
          <SiteChrome>{children}</SiteChrome>
        </CartProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd) }}
        />
      </body>
    </html>
  );
}