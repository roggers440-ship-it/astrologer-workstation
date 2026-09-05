'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';

/**
 * Sign in.
 *
 * Single practitioner per account. Registration is here rather than hidden
 * because this is a tool someone installs for themselves, and a separate signup
 * flow would be one more screen for no benefit.
 */
export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/dashboard';

  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = supabaseBrowser();

    const { error: authError } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }

    if (mode === 'up') {
      /* Depending on the project's confirmation setting the session may not
         exist yet, so say so rather than redirecting into a wall. */
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setNotice('Account created. Check your email to confirm it, then sign in.');
        setMode('in');
        setBusy(false);
        return;
      }
    }

    router.replace(next);
    router.refresh();
  }

  const inputClass =
    'data w-full rounded border border-[rgb(var(--hairline))] bg-transparent px-2 py-2 text-[rgb(var(--ivory))]';

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-[rgb(var(--ink))] p-4">
      <div className="panel w-full max-w-sm rounded p-5">
        <h1 className="text-[15px] text-[rgb(var(--ivory))]">Diagnostic workstation</h1>
        <p className="mt-1 text-[rgb(var(--muted))]">
          Client birth data and session notes are private to your account.
        </p>

        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <label htmlFor="email" className="eyebrow mb-1 block">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className="eyebrow mb-1 block">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              minLength={8}
              required
              className={inputClass}
            />
          </div>

          {error && <p className="text-[rgb(var(--vermilion))]">{error}</p>}
          {notice && <p className="text-[rgb(var(--brass))]">{notice}</p>}

          <Button type="submit" disabled={busy} className="w-full py-5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'in' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setError(null);
          }}
          className="data mt-4 w-full text-center text-[11px] text-[rgb(var(--muted))] hover:text-[rgb(var(--brass))]"
        >
          {mode === 'in' ? 'No account yet? Create one' : 'Already have an account? Sign in'}
        </button>
      </div>
    </main>
  );
}
