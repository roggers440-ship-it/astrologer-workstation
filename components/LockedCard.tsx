"use client";

import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Teaser } from "@/types/reading";
import { PLANS } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";

/**
 * What sits behind the wall, described honestly.
 *
 * The counts are real, computed from the reading that was not sent. Nothing here
 * is padding or invented, so someone who subscribes never discovers the tease was
 * inflated - which is the only version of this that survives contact with a
 * customer who compares notes with a friend.
 *
 * Deliberately no verdict. Telling a free account that their marriage house is
 * under strain would convert better and is a cruel thing to put in front of
 * someone who cannot afford to find out why.
 */
export function LockedCard({
  teaser,
  title,
}: {
  teaser: Teaser;
  title?: string;
}) {
  const plan = PLANS[teaser.needs];

  return (
    <section className="rounded border border-dashed border-[rgb(var(--brass))] p-4">
      <header className="mb-2 flex items-center gap-1.5">
        <Lock className="h-3 w-3 text-[rgb(var(--brass))]" />
        <span className="eyebrow text-[rgb(var(--brass))]">
          {title ?? "Locked"}
        </span>
      </header>

      <p className="text-[rgb(var(--ivory))]">Covers {teaser.covers}.</p>

      {teaser.has.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {teaser.has.map((h) => (
            <li
              key={h.label}
              className="data text-[11px] text-[rgb(var(--muted))]"
            >
              <span className="text-[rgb(var(--brass))]">{h.count}</span>{" "}
              {h.label}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[rgb(var(--muted))]">{teaser.line}</p>

      <Link href="/plans" className="mt-3 inline-block">
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-3.5 w-3.5" /> Upgrade to {plan.label} Plan
        </Button>
      </Link>
    </section>
  );
}

/** Compact form, for rows in a list rather than a panel of its own. */
export function LockedRow({ teaser }: { teaser: Teaser }) {
  const total = teaser.has.reduce((s, h) => s + h.count, 0);

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="flex items-center gap-1.5 text-[rgb(var(--muted))]">
        <Lock className="h-3 w-3 shrink-0 text-[rgb(var(--brass))]" />
        {total > 0 ? `${total} findings waiting` : "Quiet in this chart"}
      </span>
      <Link href="/plans">
        <Button variant="outline" size="xs">
          Unlock
        </Button>
      </Link>
    </div>
  );
}
