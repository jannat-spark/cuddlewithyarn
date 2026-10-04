import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import { getAdminSession, hasSupabaseAuth, localPasscode } from '@/server/auth';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Studio sign in',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect('/admin');

  const supabase = hasSupabaseAuth();

  return (
    <div className="on-wine grain relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-wine-900 px-[var(--gutter)] py-16">
      <div className="relative z-[3] w-full max-w-[26rem]">
        <p className="font-display text-[length:1.6rem] leading-tight text-champagne-100">
          {BRAND.name}
        </p>
        <h1 className="mt-1 font-display text-[length:2.4rem] uppercase leading-none">Studio</h1>
        <p className="mt-3 text-sm text-champagne-200/70">
          Orders, custom requests and status changes.
        </p>

        <div className="mt-8 border border-champagne-200/18 bg-wine-950/40 p-6">
          <AdminLoginForm supabase={supabase} />
        </div>

        {!supabase ? (
          <p className="mt-5 text-xs leading-relaxed text-champagne-200/60">
            Supabase Auth is not configured, so this build uses a local passcode. Default:{' '}
            <span className="font-mono text-champagne-100">{localPasscode()}</span>. Set{' '}
            <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to switch to real
            accounts.
          </p>
        ) : null}

        <Link
          href="/"
          className="link-rule mt-8 inline-block text-[0.625rem] uppercase tracking-[0.2em] text-champagne-200/70"
        >
          Back to the shop
        </Link>
      </div>
    </div>
  );
}