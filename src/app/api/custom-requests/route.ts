import { NextResponse } from 'next/server';
import { createCustomRequest } from '@/server/repository';
import { ValidationError, parseCustomRequest } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 6;
}

/** `CWY-CR-XXXXXX` reference the customer can quote. */
function reference(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `CWY-CR-${suffix}`;
}

/**
 * POST /api/custom-requests
 *
 * The reference image has already been uploaded by /api/uploads by the time
 * this runs, so this endpoint only has to validate and store the record.
 */
export async function POST(request: Request) {
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (rateLimited(key)) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please wait a minute and try again.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Malformed request.' }, { status: 400 });
  }

  try {
    const input = parseCustomRequest(body);
    const created = await createCustomRequest(input);

    // Keep the response body free of anything private beyond what the sender
    // already knows.
    return NextResponse.json(
      {
        ok: true,
        reference: reference(),
        status: created.status,
        referenceImageReceived: Boolean(created.referenceImageUrl),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { ok: false, error: error.message, fieldErrors: error.fieldErrors },
        { status: 422 },
      );
    }
    console.error('[custom-requests] failed:', error);
    return NextResponse.json(
      { ok: false, error: 'We could not save that. Please try again or email the studio.' },
      { status: 500 },
    );
  }
}