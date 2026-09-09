'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Check,
  Infinity as InfinityIcon,
  Loader2,
  LogOut,
  UserRound,
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { ThemeCards } from '@/components/ThemeCards';
import { PLANS, type Tier } from '@/lib/entitlements';
import { Button } from '@/components/ui/button';

interface Option {
  tier: Tier;
  label: string;
  kind: string;
  charge: number;
  credit: number;
  listPrice: number;
  explanation: string;
  allowed: boolean;
  months: number;
}

interface Account {
  email: string | null;
  displayName: string | null;
  theme: 'dark' | 'light';
  role: string;
  tier: Tier;
  periodEnd: string | null;
  chartLimit: number | null;
  chartsUsed: number;
  options: Option[];
  payments: {
    transaction_id: string;
    tier: string;
    amount: number;
    status: string;
    created_at: string;
  }[];
}

const RANK: Record<Tier, number> = { free: 0, basic: 1, pro: 2, max: 3 };
const ORDER: Tier[] = ['free', 'basic', 'pro', 'max'];

const rupees = (n: number) => `Rs ${Math.round(n).toLocaleString('en-IN')}`;
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/**
 * Account.
 *
 * Two columns: who you are on the left, what you are paying for on the right.
 * They answer different questions, and reading one should not mean scrolling
 * past the other.
 *
 * The plan ladder shows every tier with the current one marked, rather than only
 * the moves available - that version told a Max subscriber "there is nothing
 * above this", which answers a question nobody asked and shows them an empty
 * screen.
 */
function SettingsContent() {
  const router = useRouter();
  const params = useSearchParams();

  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<{
    gateway: string;
    fields: Record<string, string>;
  } | null>(null);

  /*
   * The clock, captured once after mount.
   *
   * Reading Date.now() during render is impure - two renders can disagree - and
   * React 19 rejects it outright. Taking the time in an effect makes render a
   * function of state again, and a banner about a date a week away does not need
   * the clock to tick.
   */
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  useEffect(() => {
    fetch('/api/account')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return setError('Could not load your account.');
        setAccount(data);
        setName(data.displayName ?? '');
      });
  }, []);

  /* Submitted the moment the signed fields arrive - eSewa expects a POST from a
     real form, and rebuilding the values here would break the signature. */
  useEffect(() => {
    if (form) formRef.current?.submit();
  }, [form]);

  async function saveName() {
    setBusy('name');
    await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: name }),
    });
    setBusy(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function choose(tier: Tier) {
    setBusy(tier);
    setError(null);
    try {
      const res = await fetch('/api/payments/esewa/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'The payment could not be started.');

      /* A fully credited upgrade never reaches the gateway. */
      if (data.applied) return window.location.reload();
      setForm(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(null);
    }
  }

  /*
   * Derived during render rather than pushed into state by an effect. An effect
   * renders once without the message and again with it, which flashes.
   *
   * Declared above the loading return, because a failed payment redirects here
   * and the account request is still in flight - the message has to survive that
   * moment or the user watches a spinner and never learns what went wrong.
   */
  const urlReason = params.get('reason');
  const urlError =
    params.get('payment') === 'failed'
      ? urlReason
        ? `The payment did not complete (${urlReason}). Nothing has been charged.`
        : 'The payment did not complete. Nothing has been charged.'
      : null;

  /* A runtime failure is more recent than whatever the URL still says. */
  const activeError = error ?? urlError;

  if (!account) {
    return (
      <main className="flex h-screen items-center justify-center bg-[rgb(var(--ink))] p-6">
        {activeError ? (
          <p className="text-[rgb(var(--vermilion))]">{activeError}</p>
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-[rgb(var(--muted))]" />
        )}
      </main>
    );
  }

  const isAdmin = account.role === 'admin';
  const current = PLANS[account.tier];
  const endsSoon =
    now !== null &&
    account.periodEnd !== null &&
    Date.parse(account.periodEnd) - now < 7 * 86_400_000;
  const anyCredit = account.options.some((o) => o.allowed && o.credit > 0);

  const field =
    'data w-full rounded border border-[rgb(var(--hairline))] bg-transparent px-2 py-1.5 text-[rgb(var(--ivory))] placeholder:text-[rgb(var(--muted))]';

  return (
    <main className="min-h-screen w-full bg-[rgb(var(--ink))] p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-center justify-between">
          <h1 className="text-[20px] text-[rgb(var(--ivory))]">Account</h1>
          <a
            href="/dashboard"
            className="data text-[11px] text-[rgb(var(--muted))] hover:text-[rgb(var(--brass))]"
          >
            Back to the workstation
          </a>
        </header>

        {activeError && (
          <p className="mb-4 text-[rgb(var(--vermilion))]">{activeError}</p>
        )}

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* ------------------------------ profile --------------------------- */}
          <div className="space-y-5">
            <section className="panel rounded p-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgb(var(--hairline))' }}
                  aria-hidden
                >
                  <UserRound className="h-5 w-5 text-[rgb(var(--brass))]" />
                </span>

                <div className="min-w-0">
                  <p className="truncate text-[15px] text-[rgb(var(--ivory))]">
                    {account.displayName || 'Unnamed'}
                  </p>
                  <p className="data truncate text-[11px] text-[rgb(var(--muted))]">
                    {account.email}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="name" className="eyebrow mb-1 block">
                  Name
                </label>
                <div className="flex gap-2">
                  <input
                    id="name"
                    value={name}
                    placeholder="What clients should see"
                    onChange={(e) => setName(e.target.value)}
                    className={field}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy === 'name'}
                    onClick={saveName}
                  >
                    {saved ? <Check className="h-3.5 w-3.5" /> : 'Save'}
                  </Button>
                </div>
              </div>

              <dl className="mt-4 space-y-1.5 border-t border-[rgb(var(--hairline))] pt-3">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="eyebrow">Plan</dt>
                  <dd
                    className="data rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest"
                    style={{
                      background: 'rgb(var(--brass))',
                      color: 'rgb(var(--ink))',
                    }}
                  >
                    {isAdmin ? 'Admin' : current.label}
                  </dd>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <dt className="eyebrow">Charts</dt>
                  <dd className="data flex items-center gap-1 text-[11px] text-[rgb(var(--ivory))]">
                    {account.chartLimit === null ? (
                      <>
                        <InfinityIcon className="h-3 w-3" /> {account.chartsUsed}
                      </>
                    ) : (
                      `${account.chartsUsed} of ${account.chartLimit}`
                    )}
                  </dd>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <dt className="eyebrow">Renews</dt>
                  <dd className="data text-[11px] text-[rgb(var(--ivory))]">
                    {account.tier === 'free'
                      ? 'never'
                      : account.periodEnd
                        ? day(account.periodEnd)
                        : 'no expiry'}
                  </dd>
                </div>
              </dl>

              {endsSoon && (
                <p className="mt-3 border-l-2 border-[rgb(var(--vermilion))] pl-2 text-[11px] text-[rgb(var(--muted))]">
                  Nothing renews automatically. Unless you extend it, the account
                  returns to Free on that date.
                </p>
              )}
            </section>

            {account.payments.length > 0 && (
              <section className="panel rounded p-4">
                <span className="eyebrow block">Payments</span>
                <ul className="mt-3 space-y-1.5">
                  {account.payments.map((p) => (
                    <li
                      key={p.transaction_id}
                      className="flex items-baseline justify-between gap-2"
                    >
                      <span className="data text-[11px] text-[rgb(var(--muted))]">
                        {day(p.created_at)}
                      </span>
                      <span
                        className="data text-[11px]"
                        style={{
                          color:
                            p.status === 'paid'
                              ? 'rgb(var(--ivory))'
                              : 'rgb(var(--muted))',
                        }}
                      >
                        {rupees(p.amount)} &middot; {p.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="panel flex flex-col gap-3 rounded p-4">
              <a
                href="/accuracy"
                className="data text-[11px] text-[rgb(var(--brass))]"
              >
                Was it right? The calibration record
              </a>
              {isAdmin && (
                <a
                  href="/admin"
                  className="data text-[11px] text-[rgb(var(--brass))]"
                >
                  All accounts
                </a>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 justify-start gap-2"
                onClick={async () => {
                  await supabaseBrowser().auth.signOut();
                  router.replace('/login');
                }}
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </Button>
            </section>
          </div>

          {/* --------------------------- plans and theme ---------------------- */}
          <div className="space-y-5">
            <section className="panel rounded p-4">
              <span className="eyebrow block">All plans</span>
              <p className="mb-3 mt-1 text-[rgb(var(--muted))]">
                Every plan reads the same chart. What changes is how much of it you
                are shown.
              </p>

              <div className="space-y-2">
                {ORDER.map((t) => {
                  const plan = PLANS[t];
                  const option = account.options.find((o) => o.tier === t);
                  const isCurrent = t === account.tier;
                  const higher = RANK[t] > RANK[account.tier];
                  const actionable = Boolean(option?.allowed) && (higher || isCurrent);

                  return (
                    <div
                      key={t}
                      className="flex items-center gap-3 rounded border p-3"
                      style={{
                        borderColor: isCurrent
                          ? 'rgb(var(--brass))'
                          : 'rgb(var(--hairline))',
                        background: isCurrent ? 'rgb(var(--brass) / 0.06)' : undefined,
                        opacity: !isCurrent && !higher ? 0.55 : 1,
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-[rgb(var(--ivory))]">{plan.label}</span>
                          <span className="data text-[10px] text-[rgb(var(--muted))]">
                            {plan.charts}
                          </span>
                          {isCurrent && (
                            <span
                              className="data rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-widest"
                              style={{
                                background: 'rgb(var(--brass))',
                                color: 'rgb(var(--ink))',
                              }}
                            >
                              your plan
                            </span>
                          )}
                        </div>

                        <ul className="mt-1.5 space-y-0.5">
                          {plan.adds.slice(0, 3).map((line) => (
                            <li
                              key={line}
                              className="flex items-start gap-1.5 text-[11px] text-[rgb(var(--muted))]"
                            >
                              <Check className="mt-0.5 h-2.5 w-2.5 shrink-0 text-[rgb(var(--brass))]" />
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="shrink-0 text-right">
                        {t === 'free' ? (
                          <span className="data text-[11px] text-[rgb(var(--muted))]">
                            No cost
                          </span>
                        ) : (
                          <>
                            <span className="data block text-[rgb(var(--brass))]">
                              {rupees(
                                actionable && option
                                  ? option.charge
                                  : (option?.listPrice ?? 0),
                              )}
                            </span>
                            {actionable && option && option.credit > 0 && (
                              <span className="data block text-[10px] text-[rgb(var(--muted))] line-through">
                                {rupees(option.listPrice)}
                              </span>
                            )}
                            <span className="data block text-[10px] text-[rgb(var(--muted))]">
                              {option?.months === 12 ? 'a year' : 'a month'}
                            </span>
                          </>
                        )}

                        {actionable && option && (
                          <Button
                            size="xs"
                            className="mt-1.5"
                            disabled={busy !== null}
                            onClick={() => choose(t)}
                          >
                            {busy === t ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isCurrent ? (
                              'Extend'
                            ) : (
                              <>
                                Choose <ArrowRight className="ml-1 h-3 w-3" />
                              </>
                            )}
                          </Button>
                        )}

                        {!isCurrent && !higher && (
                          <span className="data mt-1.5 block text-[10px] text-[rgb(var(--muted))]">
                            {account.periodEnd
                              ? 'when this period ends'
                              : 'below your plan'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {anyCredit && (
                <p className="mt-3 text-[11px] text-[rgb(var(--muted))]">
                  The lower price is what you pay today. Days already paid for on
                  your current plan are credited against it, so upgrading part way
                  through a period costs less than starting fresh.
                </p>
              )}
            </section>

            <section className="panel rounded p-4">
              <span className="eyebrow block">Appearance</span>
              <p className="mb-3 mt-1 text-[rgb(var(--muted))]">
                Follows your account, not this device.
              </p>
              <ThemeCards initial={account.theme} />
            </section>
          </div>
        </div>
      </div>

      {form && (
        <form ref={formRef} action={form.gateway} method="POST" className="hidden">
          {Object.entries(form.fields).map(([n, v]) => (
            <input key={n} type="hidden" name={n} value={v} readOnly />
          ))}
        </form>
      )}
    </main>
  );
}

/**
 * useSearchParams needs a Suspense boundary, or Next opts the whole route into
 * client rendering and warns at build time.
 */
export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
