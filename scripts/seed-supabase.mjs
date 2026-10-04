/**
 * Seeds the Supabase `products` table from the canonical catalogue.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=…  SUPABASE_SERVICE_ROLE_KEY=…  npm run db:seed
 *
 * Node 24 strips the types from src/lib/catalog.ts directly, so the seed can
 * never drift from the catalogue the application ships.
 */
import { SEED_PRODUCTS } from '../src/lib/catalog.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.\n' +
      'Find both under Supabase → Project Settings → API.',
  );
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const rows = SEED_PRODUCTS.map((product) => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  tagline: product.tagline,
  description: product.description,
  price: product.price,
  compare_at: product.compareAt,
  images: product.images,
  category: product.category,
  availability: product.availability,
  featured: product.featured,
  lead_time_days: product.leadTimeDays,
  materials: product.materials,
  details: product.details,
  created_at: product.createdAt,
}));

console.log(`[seed] upserting ${rows.length} products…`);

const { data, error } = await supabase
  .from('products')
  .upsert(rows, { onConflict: 'slug' })
  .select('slug');

if (error) {
  console.error('[seed] failed:', error.message);
  process.exit(1);
}

console.log(`[seed] ${data?.length ?? rows.length} products are live.`);
console.log('[seed] products are publicly readable; orders and custom requests are service-role only.');