"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Summary {
  tier: string;
  role: string;
  chartLimit: number | null;
  chartsUsed: number;
}

const LABEL: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
  max: "Max",
};

export function PlanBadge() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setSummary(data))
      .catch(() => {
        /* The panel works without this; a failed lookup should not be an error
           the practitioner has to dismiss. */
      });
  }, []);

  if (!summary) {
    return (
      <span className="data rounded-full border border-[rgb(var(--hairline))] px-2 py-0.5 text-[10px] uppercase tracking-widest text-[rgb(var(--muted))]">
        Loading...
      </span>
    );
  }

  const isAdmin = summary.role === "admin";
  const canUpgrade = !isAdmin && summary.tier !== "max";
  const paid = isAdmin || summary.tier !== "free";
  const accent = isAdmin ? "var(--lapis)" : "var(--brass)";

  return (
    <span className="flex min-w-0 items-center gap-2">
      <Link
        href="/settings"
        className="data shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest transition-opacity hover:opacity-80"
        style={
          paid
            ? {
                background: `rgb(${accent})`,
                color: "rgb(var(--ivory))",
                border: `1px solid rgb(${accent})`,
              }
            : {
                border: "1px solid rgb(var(--hairline))",
                color: "rgb(var(--muted))",
              }
        }
      >
        {isAdmin ? "Admin" : (LABEL[summary.tier] ?? summary.tier)} Plan
      </Link>
    </span>
  );
}
