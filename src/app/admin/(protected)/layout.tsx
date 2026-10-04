import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession, hasSupabaseAuth } from '@/server/auth';
import AdminLogoutButton from '@/components/admin/AdminLogoutButton';
import { dataBackend } from '@/server/repository';

export const metadata: Metadata = {
  title: { default: 'Studio', template: '%s · Studio' },
  robots: { index: false, follow: false },
};

/**
 * Gate for everything under /admin except /admin/login, which lives outside this
 * layout so signing in cannot redirect into a loop.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  return (
    <div className="min-h-[100svh] bg-cream-50">
      <header className="sticky top-0 z-20 border-b border-wine-900/10 bg-cream-100">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <p className="shrink-0 font-display text-[length:1.05rem] uppercase tracking-[0.16em]">
              Studio
            </p>
            <span className="hidden truncate text-[0.625rem] uppercase tracking-[0.18em] text-ink-400 sm:inline">
              {session.email}
            </span>
            <span className="hidden shrink-0 text-[0.625rem] uppercase tracking-[0.18em] text-crimson-600 md:inline">
              {dataBackend === 'supabase' ? 'Supabase' : 'Local store'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <a
              href="/admin/requests"
              className="hidden text-[0.625rem] uppercase tracking-[0.2em] text-ink-500 underline underline-offset-4 hover:text-crimson-600 sm:inline"
            >
              Requests
            </a>
            <Link
              href="/"
              className="hidden text-[0.625rem] uppercase tracking-[0.2em] text-ink-500 underline underline-offset-4 hover:text-crimson-600 sm:inline"
            >
              View site
            </Link>
            <AdminLogoutButton supabase={hasSupabaseAuth()} />
          </div>
        </div>
      </header>

      <main className="shell py-8 md:py-12">{children}</main>
    </div>
  );
}