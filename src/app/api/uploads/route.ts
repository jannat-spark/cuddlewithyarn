import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { isSupabaseConfigured, serviceClient } from '@/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'custom-references';
const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/**
 * POST /api/uploads — optional reference image for a custom request.
 *
 * With Supabase configured the file goes to the `custom-references` bucket.
 * Without it (local development) it is written to `.data/uploads/` and served
 * from `/api/uploads/<name>`, so the whole custom-request flow stays testable
 * with no project set up. The reference image is genuinely optional: the form
 * reports an upload failure and still lets the request through.
 */
export async function POST(request: Request) {
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const now = Date.now();
  const hits = ((globalThis as { __uploadHits?: Map<string, { count: number; resetAt: number }> })
    .__uploadHits ??= new Map());
  const entry = hits.get(key);
  if (entry && entry.resetAt > now && entry.count >= 10) {
    return NextResponse.json({ error: 'Too many uploads. Please try again shortly.' }, { status: 429 });
  }
  if (entry && entry.resetAt > now) entry.count += 1;
  else hits.set(key, { count: 1, resetAt: now + 60_000 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Malformed upload.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'That file is empty.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Images must be under 6 MB.' }, { status: 413 });
  }
  const extension = ALLOWED[file.type];
  if (!extension) {
    return NextResponse.json({ error: 'Please upload a JPG, PNG or WebP image.' }, { status: 415 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const name = `${randomUUID()}.${extension}`;

  if (isSupabaseConfigured) {
    const supabase = serviceClient()!;
    const { error } = await supabase.storage.from(BUCKET).upload(name, bytes, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) {
      console.error('[uploads] storage upload failed:', error.message);
      return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 502 });
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
    return NextResponse.json({ url: data.publicUrl });
  }

  const dir = path.join(process.cwd(), '.data', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return NextResponse.json({ url: `/api/uploads/${name}` });
}