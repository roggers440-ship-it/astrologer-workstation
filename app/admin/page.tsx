'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { PLANS, type Tier } from '@/lib/entitlements';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  paidTotal: number;
}

const TIERS: Tier[] = ['free', 'basic', 'pro', 'max'];
const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'comp', label: 'Comped' },
] as const;

const rupees = (n: number) => `Rs ${Math.round(n).toLocaleString('en-IN')}`;
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Every account, and granting a plan by hand.
 *
 * Access is decided by the API, not by this page - a client component cannot
 * gate itself, and rendering nothing to a non-admin would still have fetched the
 * data first.
 */
export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [granting, setGranting] = useState<AdminUser | null>(null);

  async function load() {
    const res = await fetch('/api/admin/users');
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? 'Could not load accounts.');
    }
    setUsers(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  if (error && !users) {
    return (
      <main className="flex h-screen items-center justify-center bg-[rgb(var(--ink))] p-6">
        <p className="text-[rgb(var(--vermilion))]">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[rgb(var(--ink))] p-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-[20px] text-[rgb(var(--ivory))]">
              <ShieldCheck className="h-4 w-4 text-[rgb(var(--brass))]" /> Accounts
            </h1>
            <p className="mt-1 text-[rgb(var(--muted))]">
              {users
                ? `${users.length} accounts \u00b7 ${users.reduce((s, u) => s + u.charts, 0)} charts \u00b7 ${rupees(
                    users.reduce((s, u) => s + u.paidTotal, 0),
                  )} taken`
                : 'Loading'}
            </p>
          </div>
          <a href="/settings" className="data text-[11px] text-[rgb(var(--muted))] hover:text-[rgb(var(--brass))]">
            Back
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
                  <th className="eyebrow px-3 py-2">Plan</th>
                  <th className="eyebrow px-3 py-2">Until</th>
                  <th className="eyebrow px-3 py-2">Charts</th>
                  <th className="eyebrow px-3 py-2">Paid</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[rgb(var(--hairline))]">
                    <td className="px-3 py-2">
                      <span className="text-[rgb(var(--ivory))]">{u.email ?? u.displayName ?? u.id}</span>
                      {u.role === 'admin' && (
                        <Badge className="ml-2 border-[rgb(var(--lapis))] bg-transparent text-[10px] text-[rgb(var(--lapis))]">
                          admin
                        </Badge>
                      )}
                    </td>
                    <td className="data px-3 py-2 text-[rgb(var(--brass))]">{PLANS[u.tier].label}</td>
                    <td className="data px-3 py-2 text-[11px] text-[rgb(var(--muted))]">
                      {u.periodEnd ? day(u.periodEnd) : 'no expiry'}
                    </td>
                    <td className="data px-3 py-2 text-[rgb(var(--muted))]">{u.charts}</td>
                    <td className="data px-3 py-2 text-[rgb(var(--muted))]">{rupees(u.paidTotal)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="xs" onClick={() => setGranting(u)}>
                        Change
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {granting && (
        <GrantDialog
          user={granting}
          onClose={() => setGranting(null)}
          onDone={async () => {
            setGranting(null);
            await load();
          }}
        />
      )}
    </main>
  );
}

/**
 * Recording a payment taken outside the gateway.
 *
 * The amount defaults to the list price but is editable, because what was
 * actually handed over is what belongs in the ledger - a discount recorded as
 * full price makes the revenue figure a lie and credits too much on a later
 * upgrade.
 */
function GrantDialog({
  user,
  onClose,
  onDone,
}: {
  user: AdminUser;
  onClose: () => void;
  onDone: () => void;
}) {
  const [tier, setTier] = useState<Tier>(user.tier);
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'bank' | 'comp'>('cash');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revoking = tier === 'free';

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tier,
          months,
          amount: amount === '' ? undefined : Number(amount),
          method,
          note: note || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not record that.');
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  const inputClass =
    'data w-full rounded border border-[rgb(var(--hairline))] bg-transparent px-2 py-1.5 text-[rgb(var(--ivory))]';

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="panel sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[rgb(var(--ivory))]">
            {user.email ?? user.displayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <span className="eyebrow mb-1.5 block">Plan</span>
            <div className="flex gap-1">
              {TIERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className="data flex-1 rounded border px-2 py-1.5 text-[11px]"
                  style={{
                    borderColor: tier === t ? 'rgb(var(--brass))' : 'rgb(var(--hairline))',
                    color: tier === t ? 'rgb(var(--brass))' : 'rgb(var(--muted))',
                  }}
                >
                  {PLANS[t].label}
                </button>
              ))}
            </div>
          </div>

          {revoking ? (
            <p className="border-l-2 border-[rgb(var(--vermilion))] pl-2 text-[rgb(var(--muted))]">
              Drops the account to Free immediately and clears any remaining period. No ledger entry is written,
              because this is a revocation rather than a payment.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="eyebrow mb-1 block">How long</label>
                  <select
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className={inputClass}
                  >
                    {[1, 3, 6, 12, 24].map((m) => (
                      <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="eyebrow mb-1 block">Received</label>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={method === 'comp' ? '0' : 'list price'}
                    inputMode="numeric"
                    disabled={method === 'comp'}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <span className="eyebrow mb-1.5 block">How it was paid</span>
                <div className="flex gap-1">
                  {METHODS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMethod(m.value)}
                      className="data flex-1 rounded border px-2 py-1.5 text-[11px]"
                      style={{
                        borderColor: method === m.value ? 'rgb(var(--brass))' : 'rgb(var(--hairline))',
                        color: method === m.value ? 'rgb(var(--brass))' : 'rgb(var(--muted))',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="note" className="eyebrow mb-1 block">Note</label>
                <input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Receipt number, who took it, why"
                  className={inputClass}
                />
              </div>

              <p className="text-[11px] text-[rgb(var(--muted))]">
                Recorded in the same ledger as gateway payments, so it appears in their own payment history and is
                credited if they upgrade part way through.
                {user.periodEnd && user.tier === tier && ' Days remaining on the current period are added to this one.'}
              </p>
            </>
          )}

          {error && <p className="text-[rgb(var(--vermilion))]">{error}</p>}

          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy} onClick={submit}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : revoking ? 'Drop to Free' : 'Record it'}
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
