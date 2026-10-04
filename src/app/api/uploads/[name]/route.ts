import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

/**
 * Serves reference images uploaded while running without Supabase storage.
 * With Supabase configured, files live in the public bucket instead and this
 * route is inert.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  if (isSupabaseConfigured) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { name } = await context.params;
  if (!/^[a-f0-9-]{8,64}\.(jpg|jpeg|png|webp|avif)$/.test(name)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const file = await readFile(path.join(process.cwd(), '.data', 'uploads', name));
    const extension = name.split('.').pop() ?? 'png';
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'content-type': TYPES[extension] ?? 'application/octet-stream',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}