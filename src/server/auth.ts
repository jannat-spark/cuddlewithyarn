import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export type AdminSession = {
  email: string;
  via: 'supabase' | 'passcode';
};

const PASSCODE_COOKIE = 'cwy_admin_session';
const DAY = 60 * 60 * 24 * 30;

export function hasSupabaseAuth(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function adminEmails(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Supabase server client bound to the request cookies (SSR-safe). */
export async function supabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items) {
        try {
          for (const item of items) cookieStore.set(item.name, item.value, item.options);
        } catch {
          // Called from a Server Component: cookie writes are not allowed there.
          // The login route refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

function sign(value: string): string {
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    'cuddle-with-yarn-development-secret';
  return createHmac('sha256', secret).update(value).digest('hex');
}

/** Only used when Supabase Auth is not configured (local demo mode). */
export function localPasscode(): string {
  return process.env.ADMIN_PASSCODE ?? 'stitch';
}

export function passcodeCookieValue(passcode: string): string {
  return sign(`passcode:${passcode}`);
}

/** Value stored in the session cookie for a given passcode. */
export function signedPasscode(passcode: string): string {
  return passcodeCookieValue(passcode);
}

export function isValidPasscode(passcode: string): boolean {
  const expected = Buffer.from(passcodeCookieValue(localPasscode()));
  const provided = Buffer.from(passcodeCookieValue(passcode));
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DAY,
  };
}

/**
 * Resolves the current admin identity, or null.
 * With Supabase Auth: a real signed-in user whose email is on the allow list.
 * Without it: a passcode cookie (development only).
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const allowed = adminEmails();

  if (hasSupabaseAuth()) {
    const client = await supabaseServerClient();
    if (!client) return null;
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user?.email) return null;
    const email = user.email.toLowerCase();
    if (allowed.length === 0 || !allowed.includes(email)) return null;
    return { email, via: 'supabase' };
  }

  const store = await cookies();
  const raw = store.get(PASSCODE_COOKIE)?.value;
  if (!raw) return null;
  const expected = Buffer.from(passcodeCookieValue(localPasscode()));
  const provided = Buffer.from(raw);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
  return { email: allowed[0] ?? 'atelier@cuddlewithyarn.com', via: 'passcode' };
}

export const ADMIN_COOKIE_NAME = PASSCODE_COOKIE;