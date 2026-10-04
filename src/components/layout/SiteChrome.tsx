'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

/**
 * The studio back office has its own chrome, so the storefront header and
 * footer are withheld from /admin. Children are still server components —
 * passing them through this client boundary costs nothing at render time.
 */
export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}