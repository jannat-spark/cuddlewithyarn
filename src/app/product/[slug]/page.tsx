import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductDetail from '@/components/shop/ProductDetail';
import ProductCard from '@/components/shop/ProductCard';
import { getAllProducts, getProductBySlug } from '@/server/repository';
import { BRAND, SITE_URL } from '@/lib/brand';

export const revalidate = 300;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Piece not found' };

  const image = product.images[0];
  return {
    title: product.name,
    description: product.tagline
      ? `${product.tagline} ${product.description}`.slice(0, 300)
      : product.description.slice(0, 300),
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: 'website',
      title: `${product.name} — ${BRAND.name}`,
      description: product.tagline || product.description.slice(0, 160),
      url: `${SITE_URL}/product/${product.slug}`,
      images: image
        ? [{ url: image.src, width: image.width ?? 800, height: image.height ?? 1000, alt: image.alt }]
        : [{ url: '/media/og-hero.jpg', width: 1200, height: 630, alt: product.name }],
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const all = await getAllProducts();
  const related = all
    .filter((p) => p.slug !== product.slug && p.category === product.category)
    .slice(0, 4);
  const fallbackRelated = related.length >= 3
    ? related
    : all.filter((p) => p.slug !== product.slug).slice(0, 4);

  const availabilitySchema =
    product.availability === 'sold_out'
      ? 'https://schema.org/OutOfStock'
      : product.availability === 'made_to_order'
        ? 'https://schema.org/PreOrder'
        : 'https://schema.org/InStock';

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.slug,
    image: product.images.map((image) => `${SITE_URL}${image.src}`),
    brand: { '@type': 'Brand', name: BRAND.name },
    category: product.category,
    material: product.materials,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: 'INR',
      price: product.price,
      availability: availabilitySchema,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: BRAND.name },
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/shop` },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: `${SITE_URL}/product/${product.slug}`,
      },
    ],
  };

  return (
    <div className="shell pb-24 pt-[calc(var(--header-h)+2rem)] md:pb-32 md:pt-[calc(var(--header-h)+3.5rem)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-8 text-[0.6875rem] uppercase tracking-[0.2em] text-ink-400">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="link-rule">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/shop?category=${product.category}`} className="link-rule">
              {product.category}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink-700" aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      <ProductDetail product={product} />

      {fallbackRelated.length > 0 ? (
        <section className="mt-24 border-t border-wine-900/10 pt-14 md:mt-32" aria-labelledby="related-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="related-title" className="font-display text-[length:var(--text-title)] uppercase leading-tight">
              Goes well with
            </h2>
            <Link href="/shop" className="btn btn--ghost btn--sm">
              All pieces
            </Link>
          </div>
          <ul className="mt-9 grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-4 md:gap-x-6">
            {fallbackRelated.map((item) => (
              <li key={item.id}>
                <ProductCard product={item} sizes="(min-width: 768px) 22vw, 46vw" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}