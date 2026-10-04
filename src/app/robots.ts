import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/brand';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Order confirmations and the back office stay out of the index.
        disallow: ['/admin', '/admin/', '/api/', '/cart', '/checkout', '/order/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}