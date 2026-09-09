"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { PLANS, type Tier } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Plans, paid through eSewa.
 *
 * eSewa is a form-redirect gateway, so checkout means building a signed form on
 * the server and posting it from the browser. The form is submitted from a
 * hidden element rather than by navigation, because every field has to arrive
 * exactly as it was signed.
 *
 * Plan copy comes from the entitlement module rather than being written here, so
 * what a plan promises and what it actually unlocks cannot drift apart.
 */
const ORDER: Tier[] = ["free", "basic", "pro", "max"];

const PRICE_LABEL: Record<Tier, string> = {
  free: "No cost",
  basic: "Rs 499 a month",
  pro: "Rs 1,499 a month",
  max: "Rs 14,999 a year",
};

export default function PlansPage() {
  const params = useSearchParams();
  const [busy, setBusy] = useState<Tier | null>(null);
  const [currentTier, setCurrentTier] = useState<Tier>("free");
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<{
    gateway: string;
    fields: Record<string, string>;
  } | null>(null);

  // useEffect(() => {
  //   if (params.get("payment") === "failed") {
  //     const reason = params.get("reason");
  //     setError(
  //       reason
  //         ? `The payment did not complete (${reason}). Nothing has been charged.`
  //         : "The payment did not complete. Nothing has been charged.",
  //     );
  //   }
  // }, [params]);

  // Derive URL error directly during render without useEffect
  const urlReason = params.get("reason");
  const urlError =
    params.get("payment") === "failed"
      ? urlReason
        ? `The payment did not complete (${urlReason}). Nothing has been charged.`
        : "The payment did not complete. Nothing has been charged."
      : null;

  // Active error falls back to the URL param error if no runtime state error is set
  const activeError = error ?? urlError;

  /* Submitted the moment the signed fields arrive - eSewa expects a POST from a
     real form, and rebuilding the values in the browser would break the
     signature. */
  useEffect(() => {
    if (form) formRef.current?.submit();
  }, [form]);

  async function subscribe(tier: Tier) {
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
      setForm(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen w-full bg-[rgb(var(--ink))] p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-[20px] text-[rgb(var(--ivory))]">Plans</h1>
          <p className="mt-1 text-[rgb(var(--muted))]">
            Every plan reads the same chart. What changes is how much of it you
            are shown.
          </p>
        </header>

        {error && (
          <p className="mb-4 rounded border border-[rgb(var(--vermilion))] p-3 text-[rgb(var(--vermilion))]">
            {error}
          </p>
        )}
        {activeError && (
          <p className="mb-4 rounded border border-[rgb(var(--vermilion))] p-3 text-[rgb(var(--vermilion))]">
            {activeError}
          </p>
        )}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {ORDER.map((tier) => {
            const plan = PLANS[tier];
            const paid = tier !== "free";
            const isCurrentPlan = tier === currentTier;

            return (
              <section
                key={tier}
                className={` relative flex flex-col rounded p-4 transition ${
                  isCurrentPlan
                    ? "border-2 border-[rgb(var(--brass))] bg-[rgb(var(--brass))]/10  shadow-lg"
                    : "panel"
                }`}
                style={{
                  borderColor: isCurrentPlan ? "rgb(var(--brass))" : undefined,
                }}
              >
                {isCurrentPlan && (
                  <div className="absolute -right-4 -top-4 z-10 rotate-[14deg]">
                    <div className="border-2 h-[85px] w-[85px] rounded-full border-[rgb(var(--brass))] bg-[rgb(var(--ink))] p-1.5 shadow-xl">
                      <div className="border h-[70px] w-[70px] bg-[rgb(var(--brass))] text-white rounded-full border-[rgb(var(--hairline))] px-2 py-2 text-center">
                        <Check className="mx-auto h-3.5 w-3.5 " />

                        <div className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] ">
                          Current
                        </div>

                        <div className="text-[9px] font-black uppercase tracking-[0.18em] ">
                          Plan
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <h2 className="text-[15px] text-[rgb(var(--ivory))]">
                  {plan.label}
                </h2>
                <p className="data mt-0.5 text-[11px] text-[rgb(var(--brass))]">
                  {PRICE_LABEL[tier]}
                </p>
                <p className="data text-[10px] text-[rgb(var(--muted))]">
                  {plan.charts}
                </p>
                <p className="mt-2 text-[rgb(var(--muted))]">{plan.audience}</p>

                <ul className="mt-4 flex-1 space-y-1.5">
                  {plan.adds.map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-1.5 text-[rgb(var(--ivory))]"
                    >
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-[rgb(var(--brass))]" />
                      {line}
                    </li>
                  ))}
                </ul>

                {paid ? (
                  <Button
                    className="mt-3 w-full py-4"
                    disabled={busy !== null}
                    onClick={() => subscribe(tier)}
                  >
                    {busy === tier ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Pay with eSewa"
                    )}
                  </Button>
                ) : (
                  <p className="data mt-3 text-center text-[11px] text-[rgb(var(--muted))]">
                    Where everyone starts
                  </p>
                )}
              </section>
            );
          })}
        </div>

        <p className="mt-6 text-[11px] text-[rgb(var(--muted))]">
          Paid plans run for a fixed period and do not renew automatically. When
          the period ends the account returns to Free and nothing is charged
          again.
        </p>

        <Link
          href="/dashboard"
          className="data mt-4 inline-block text-[11px] text-[rgb(var(--muted))] hover:text-[rgb(var(--brass))]"
        >
          Back to the workstation
        </Link>
      </div>

      {form && (
        <form
          ref={formRef}
          action={form.gateway}
          method="POST"
          className="hidden"
        >
          {Object.entries(form.fields).map(([name, value]) => (
            <input
              key={name}
              type="hidden"
              name={name}
              value={value}
              readOnly
            />
          ))}
        </form>
      )}
    </main>
  );
}
