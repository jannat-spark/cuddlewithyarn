'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminLogoutButton({ supabase }: { supabase: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch('/api/admin/session', { method: 'DELETE' });
      router.replace('/admin/login');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="text-[0.625rem] uppercase tracking-[0.2em] text-ink-500 underline underline-offset-4 transition-colors hover:text-crimson-600 disabled:opacity-50"
      data-mode={supabase ? 'supabase' : 'passcode'}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}