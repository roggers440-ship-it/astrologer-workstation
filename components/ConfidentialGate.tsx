"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useWorkstation } from "@/store/chart-store";
import { Button } from "@/components/ui/button";

/**
 * Gate for material that must not be on screen by default: the longevity band and
 * topic 9.
 *
 * This is screen privacy, not security. The passphrase ships in the bundle and
 * anyone with devtools can read it - which is fine, because the threat is a
 * client glancing at the laptop, not an attacker. Treating it as real access
 * control would be the mistake.
 *
 * The timer matters more than the passphrase. A gate unlocked once in the morning
 * and left open all day protects nothing, so it relocks on a timer, and the store
 * relocks it whenever a different client is loaded.
 */

const AUTO_LOCK_MINUTES = 5;

export function ConfidentialGate({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const { confidentialUnlocked, unlockConfidential, lockConfidential } =
    useWorkstation();
  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);

  /* Configured passphrase. With none set the gate stays a plain reveal, so an
     install that has not configured one is not locked out of its own data. */
  const required = process.env.NEXT_PUBLIC_CONFIDENTIAL_PASSPHRASE;

  useEffect(() => {
    if (!confidentialUnlocked) return;
    const timer = setTimeout(
      () => lockConfidential(),
      AUTO_LOCK_MINUTES * 60_000,
    );
    return () => clearTimeout(timer);
  }, [confidentialUnlocked, lockConfidential]);

  if (confidentialUnlocked) {
    return (
      <div className="space-y-2">
        {children}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={lockConfidential}
        >
          <EyeOff className="h-3.5 w-3.5" /> Hide
        </Button>
        <p className="text-[10px] text-[rgb(var(--muted))]">
          Relocks automatically after {AUTO_LOCK_MINUTES} minutes, and whenever
          you load another client.
        </p>
      </div>
    );
  }

  if (!required) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => unlockConfidential("")}
      >
        <Eye className="h-3.5 w-3.5" /> {label}
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const ok = unlockConfidential(entry);
        setError(!ok);
        setEntry("");
      }}
    >
      <div className="flex items-center gap-1.5">
        <Lock className="h-3 w-3 text-[rgb(var(--vermilion))]" />
        <input
          type="password"
          value={entry}
          onChange={(e) => {
            setEntry(e.target.value);
            setError(false);
          }}
          placeholder="Passphrase"
          aria-label={label}
          autoComplete="off"
          className="data w-32 rounded border border-[rgb(var(--hairline))] bg-transparent px-2 py-1 text-[11px] text-[rgb(var(--ivory))] placeholder:text-[rgb(var(--muted))]"
        />
        <Button type="submit" variant="outline" size="sm" className="gap-1.5">
          <Eye className="h-3.5 w-3.5" /> Unlock
        </Button>
      </div>

      {error && (
        <p className="text-[11px] text-[rgb(var(--vermilion))]">
          Wrong passphrase.
        </p>
      )}
    </form>
  );
}
