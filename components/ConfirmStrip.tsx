'use client';

import { useEffect, useState } from 'react';
import { Check, Circle, X } from 'lucide-react';
import { useWorkstation } from '@/store/chart-store';

/**
 * Did this land?
 *
 * Three taps, no dialog, no required note. Feedback that costs effort does not
 * get given, and a calibration record with three entries is worth nothing.
 *
 * The claim is sent verbatim, so a later rewording of the generator cannot
 * quietly rewrite what the verdict was about.
 */

type Verdict = 'yes' | 'partly' | 'no';

const OPTIONS: { verdict: Verdict; label: string; colour: string; icon: typeof Check }[] = [
  { verdict: 'yes', label: 'Landed', colour: 'rgb(var(--lapis))', icon: Check },
  { verdict: 'partly', label: 'Partly', colour: 'rgb(var(--brass))', icon: Circle },
  { verdict: 'no', label: 'No', colour: 'rgb(var(--vermilion))', icon: X },
];

export function ConfirmStrip({
  source,
  scope = '',
  claim,
}: {
  source: 'opening' | 'year' | 'house' | 'topic' | 'medical' | 'yoga';
  scope?: string | number;
  claim: string;
}) {
  const client = useWorkstation((s) => s.client);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [saving, setSaving] = useState(false);

  const key = String(scope);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;

    fetch(`/api/feedback?clientId=${client.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { source: string; scope: string; verdict: Verdict }[]) => {
        if (cancelled) return;
        const found = rows.find((r) => r.source === source && r.scope === key);
        if (found) setVerdict(found.verdict);
      })
      .catch(() => {
        /* Absence of a previous verdict is the normal case, not an error. */
      });

    return () => {
      cancelled = true;
    };
  }, [client, source, key]);

  if (!client) return null;

  async function record(next: Verdict) {
    setVerdict(next);
    setSaving(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client!.id, source, scope: key, claim, verdict: next }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 flex items-center gap-1.5" aria-label="Did this land?">
      <span className="data text-[10px] text-[rgb(var(--muted))]">
        {verdict ? 'noted' : 'did this land?'}
      </span>

      {OPTIONS.map(({ verdict: v, label, colour, icon: Icon }) => {
        const chosen = verdict === v;
        return (
          <button
            key={v}
            disabled={saving}
            onClick={() => record(v)}
            aria-pressed={chosen}
            title={label}
            className="data flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] transition-opacity"
            style={{
              borderColor: chosen ? colour : 'rgb(var(--hairline))',
              color: chosen ? colour : 'rgb(var(--muted))',
              /* Unchosen options fade once a verdict exists, so the answer reads
                 at a glance without removing the ability to change it. */
              opacity: verdict && !chosen ? 0.4 : 1,
            }}
          >
            <Icon className="h-2.5 w-2.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
