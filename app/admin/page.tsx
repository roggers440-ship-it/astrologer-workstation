'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { PLANS, type Tier } from '@/lib/entitlements';
import { Badge } from '@/components/ui/badge';

interface AdminUser {
  id: string;
  email: string | null;
  displayName: string | null;
  tier: Tier;
  role: string;
  periodEnd: string | null;
  createdAt: string;
  charts: number;
}

const TIERS: Tier[] = ['free', 'basic', 'pro', 'max'];

/**
 * Every account, and a control to change a plan.
 *
 * Route access is decided by the API, not by this page - a client component
 * cannot be trusted to gate itself, and rendering nothing to a non-admin would
 * still have fetched the data.
 */
export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/users');
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Could not load accounts.');
      return;
    }
    setUsers(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function setTier(userId: string, tier: Tier) {
    setSaving(userId);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tier }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not change the plan.');
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSaving(null);
    }
  }

  if (error && !users) {
    return (
      <main className="flex h-screen items-center justify-center bg-[rgb(var(--ink))] p-6">
        <p className="text-[rgb(var(--vermilion))]">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[rgb(var(--ink))] p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-[20px] text-[rgb(var(--ivory))]">
              <ShieldCheck className="h-4 w-4 text-[rgb(var(--brass))]" /> Accounts
            </h1>
            <p className="mt-1 text-[rgb(var(--muted))]">
              {users ? `${users.length} accounts, ${users.reduce((s, u) => s + u.charts, 0)} charts` : 'Loading'}
            </p>
          </div>
          <a href="/dashboard" className="data text-[11px] text-[rgb(var(--muted))] hover:text-[rgb(var(--brass))]">
            Back to the workstation
          </a>
        </header>

        {error && <p className="mb-3 text-[rgb(var(--vermilion))]">{error}</p>}

        {!users ? (
          <Loader2 className="h-4 w-4 animate-spin text-[rgb(var(--muted))]" />
        ) : (
          <div className="panel rounded">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[rgb(var(--hairline))]">
                  <th className="eyebrow px-3 py-2">Account</th>
                  <th className="eyebrow px-3 py-2">Charts</th>
                  <th className="eyebrow px-3 py-2">Renews</th>
                  <th className="eyebrow px-3 py-2">Plan</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[rgb(var(--hairline))]">
                    <td className="px-3 py-2">
                      <span className="text-[rgb(var(--ivory))]">{u.email ?? u.displayName ?? u.id}</span>
                      {u.role === 'admin' && (
                        <Badge className="ml-2 border-[rgb(var(--brass))] bg-transparent text-[10px] text-[rgb(var(--brass))]">
                          admin
                        </Badge>
                      )}
                    </td>
                    <td className="data px-3 py-2 text-[rgb(var(--muted))]">{u.charts}</td>
                    <td className="data px-3 py-2 text-[11px] text-[rgb(var(--muted))]">
                      {u.periodEnd ? new Date(u.periodEnd).toLocaleDateString() : '\u2014'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {TIERS.map((t) => (
                          <button
                            key={t}
                            disabled={saving === u.id}
                            onClick={() => setTier(u.id, t)}
                            className="data rounded border px-1.5 py-0.5 text-[10px]"
                            style={{
                              borderColor: u.tier === t ? 'rgb(var(--brass))' : 'rgb(var(--hairline))',
                              color: u.tier === t ? 'rgb(var(--brass))' : 'rgb(var(--muted))',
                            }}
                          >
                            {PLANS[t].label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
