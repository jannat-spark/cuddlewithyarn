import type { MetadataRoute } from 'next';
import { SITE_URL, SHOP_CATEGORIES } from '@/lib/brand';
import { getAllProducts } from '@/server/repository';

export const revalidate = 3600;

/** Every crawlable URL, with the catalogue generated from live product rows. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getAllProducts();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/atelier`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/custom`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/shipping`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/product/${product.slug}`,
    lastModified: new Date(product.createdAt),
    changeFrequency: 'weekly',
    priority: product.featured ? 0.8 : 0.7,
  }));

  // Categories are real pages, not query strings. The legacy `?category=` form
  // redirects here, so listing the canonical path keeps one URL per collection.
  const categoryRoutes: MetadataRoute.Sitemap = SHOP_CATEGORIES.map((slug) => ({
    url: `${SITE_URL}/shop/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}