import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client. Server-side only — never import this from a component.
 * Bypasses RLS, so every call site must already have authorised the caller.
 */
export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'x-application-name': 'cuddle-with-yarn' } },
  });
}

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);