"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import DivineLoader from "@/components/DivineLoader";

interface Option {
  tier: string;
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
  theme: "dark" | "light";
  role: string;
  tier: string;
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

const rupees = (n: number) => `Rs ${Math.round(n).toLocaleString("en-IN")}`;
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Account.
 *
 * The plan section quotes upgrades against what the person is already on, so
 * nobody is ever offered the plan they already have at full price, and an
 * upgrade shows what it credits rather than quietly discarding it.
 */
export default function SettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<{
    gateway: string;
    fields: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return setError("Could not load your account.");
        setAccount(data);
        setName(data.displayName ?? "");
      });
  }, []);

  useEffect(() => {
    if (form) formRef.current?.submit();
  }, [form]);

  async function saveName() {
    setBusy("name");
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name }),
    });
    setBusy(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function choose(tier: string) {
    setBusy(tier);
    setError(null);
    try {
      const res = await fetch("/api/payments/esewa/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? "The payment could not be started.");

      /* A fully credited upgrade never reaches the gateway. */
      if (data.applied) {
        router.refresh();
        window.location.reload();
        return;
      }
      setForm(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(null);
    }
  }

  if (!account) {
    return (
      <main className="flex h-screen items-center justify-center bg-[rgb(var(--ink))]">
        {error ? (
          <p className="text-[rgb(var(--vermilion))]">{error}</p>
        ) : (
          <DivineLoader />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[rgb(var(--ink))] p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-[20px] text-[rgb(var(--ivory))]">Account</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle initial={account.theme} />
            <Link
              href="/dashboard"
              className="data text-[11px] text-[rgb(var(--muted))] hover:text-[rgb(var(--brass))]"
            >
              Back to the workstation
            </Link>
          </div>
        </header>

        {error && <p className="text-[rgb(var(--vermilion))]">{error}</p>}

        <section className="panel rounded p-4">
          <h2 className="eyebrow mb-3">You</h2>

          <label htmlFor="name" className="eyebrow mb-1 block">
            Name
          </label>
          <div className="flex gap-2">
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="data flex-1 rounded border border-[rgb(var(--hairline))] bg-transparent px-2 py-1.5 text-[rgb(var(--ivory))]"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={busy === "name"}
              onClick={saveName}
            >
              {saved ? <Check className="h-3.5 w-3.5" /> : "Save"}
            </Button>
          </div>

          <p className="data mt-3 text-[11px] text-[rgb(var(--muted))]">
            {account.email}
          </p>
        </section>

        <section className="panel rounded p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="eyebrow">Your plan</h2>
            <Badge className="border-[rgb(var(--brass))] bg-transparent text-[10px] text-[rgb(var(--brass))]">
              {account.tier}
            </Badge>
          </div>

          <p className="text-[rgb(var(--ivory))]">
            {account.chartsUsed} of {account.chartLimit ?? "unlimited"} charts
            used.
            {account.periodEnd && ` Runs until ${day(account.periodEnd)}.`}
          </p>

          {account.periodEnd &&
            Date.parse(account.periodEnd) - Date.now() < 7 * 86_400_000 && (
              <p className="mt-2 border-l-2 border-[rgb(var(--vermilion))] pl-2 text-[rgb(var(--muted))]">
                This ends within a week. Nothing renews automatically, so the
                account returns to Free unless you extend it.
              </p>
            )}

          <div className="mt-4 space-y-2">
            {account.options.map((o) => (
              <div
                key={o.tier}
                className="flex items-center justify-between gap-3 rounded border border-[rgb(var(--hairline))] p-3"
              >
                <div className="min-w-0">
                  <span className="text-[rgb(var(--ivory))]">{o.label}</span>
                  <p className="mt-0.5 text-[11px] text-[rgb(var(--muted))]">
                    {o.explanation}
                  </p>
                </div>

                {o.allowed ? (
                  <Button
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => choose(o.tier)}
                  >
                    {busy === o.tier ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : o.kind === "extend" ? (
                      "Extend"
                    ) : o.charge < 1 ? (
                      "Switch"
                    ) : (
                      rupees(o.charge)
                    )}
                  </Button>
                ) : (
                  <span className="data shrink-0 text-[10px] text-[rgb(var(--muted))]">
                    unavailable
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {account.payments.length > 0 && (
          <section className="panel rounded p-4">
            <h2 className="eyebrow mb-3">Payments</h2>
            <ul className="space-y-1.5">
              {account.payments.map((p) => (
                <li
                  key={p.transaction_id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="data text-[11px] text-[rgb(var(--muted))]">
                    {day(p.created_at)} &middot; {p.tier}
                  </span>
                  <span
                    className="data text-[11px]"
                    style={{
                      color:
                        p.status === "paid"
                          ? "rgb(var(--ivory))"
                          : "rgb(var(--muted))",
                    }}
                  >
                    {rupees(p.amount)} &middot; {p.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="panel rounded p-4">
          <h2 className="eyebrow mb-3">Session</h2>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={async () => {
              await supabaseBrowser().auth.signOut();
              router.replace("/login");
            }}
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Button>
        </section>

        <a
          href="/accuracy"
          className="data block text-[11px] text-[rgb(var(--brass))]"
        >
          Was it right? The calibration record
        </a>

        {account.role === "admin" && (
          <a
            href="/admin"
            className="data block text-[11px] text-[rgb(var(--brass))]"
          >
            Admin: all accounts
          </a>
        )}
      </div>

      {form && (
        <form
          ref={formRef}
          action={form.gateway}
          method="POST"
          className="hidden"
        >
          {Object.entries(form.fields).map(([n, v]) => (
            <input key={n} type="hidden" name={n} value={v} readOnly />
          ))}
        </form>
      )}
    </main>
  );
}
