import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  hasSupabaseAuth,
  isValidPasscode,
  sessionCookieOptions,
  signedPasscode,
} from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Development passcode session.
 *
 * Only active when Supabase Auth is not configured. With Supabase configured,
 * sign-in and sign-out happen through the Supabase client and this route
 * refuses to do anything.
 */
export async function POST(request: Request) {
  if (hasSupabaseAuth()) {
    return NextResponse.json(
      { ok: false, error: 'Supabase Auth is enabled — sign in through the form.' },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Malformed request.' }, { status: 400 });
  }

  const passcode = String((body as { passcode?: unknown })?.passcode ?? '');
  if (!isValidPasscode(passcode)) {
    return NextResponse.json({ ok: false, error: 'That passcode is not right.' }, { status: 401 });
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, signedPasscode(passcode), sessionCookieOptions());
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, '', { ...sessionCookieOptions(), maxAge: 0 });
  return NextResponse.json({ ok: true });
}