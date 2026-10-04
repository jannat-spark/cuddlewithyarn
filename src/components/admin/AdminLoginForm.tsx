'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowserClient } from '@/lib/supabase-browser';

export default function AdminLoginForm({ supabase }: { supabase: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      if (supabase) {
        const client = supabaseBrowserClient();
        if (!client) {
          setError('Supabase is not configured on this deployment.');
          setBusy(false);
          return;
        }
        const { error: authError } = await client.auth.signInWithPassword({ email, password });
        if (authError) {
          setError(authError.message);
          setBusy(false);
          return;
        }
      } else {
        const response = await fetch('/api/admin/session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ passcode: password }),
        });
        const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!response.ok || !result.ok) {
          setError(result.error ?? 'That passcode is not right.');
          setBusy(false);
          return;
        }
      }
      router.replace('/admin');
      router.refresh();
    } catch {
      setError('We could not sign you in. Try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {supabase ? (
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="login-password">{supabase ? 'Password' : 'Studio passcode'}</label>
        <input
          id="login-password"
          type="password"
          autoComplete={supabase ? 'current-password' : 'current-password'}
          required
          className="input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {error ? (
        <p role="alert" className="border-l-2 border-crimson-500 pl-3 text-sm text-crimson-600">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn--full" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}