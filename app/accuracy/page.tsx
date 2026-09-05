'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface SourceRow {
  source: string;
  landed: number;
  partly: number;
  missed: number;
  total: number;
  score: number | null;
}

interface Accuracy {
  sources: SourceRow[];
  totals: { landed: number; partly: number; missed: number; total: number; score: number | null };
  misses: { source: string; claim: string; created_at: string }[];
}

const LABEL: Record<string, string> = {
  opening: 'Opening lines',
  year: 'Years',
  house: 'House readings',
  topic: 'Topic answers',
  medical: 'Body map',
  yoga: 'Named combinations',
};

/**
 * The calibration record.
 *
 * Nothing here flatters. The misses are listed in full underneath the
 * percentages, because they are the only entries that can teach anything and a
 * score with the failures hidden is just a nicer way of not knowing.
 *
 * The number needs volume before it means anything, which the page says outright
 * rather than showing a confident figure drawn from four votes.
 */
export default function AccuracyPage() {
  const [data, setData] = useState<Accuracy | null>(null);

  useEffect(() => {
    fetch('/api/accuracy')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }, []);

  if (!data) {
    return (
      <main className="flex h-screen items-center justify-center bg-[rgb(var(--ink))]">
        <Loader2 className="h-4 w-4 animate-spin text-[rgb(var(--muted))]" />
      </main>
    );
  }

  const thin = data.totals.total < 30;

  return (
    <main className="min-h-screen w-full bg-[rgb(var(--ink))] p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-baseline justify-between">
          <div>
            <h1 className="text-[20px] text-[rgb(var(--ivory))]">Was it right?</h1>
            <p className="mt-1 text-[rgb(var(--muted))]">
              {data.totals.total} verdicts recorded across {data.sources.length} parts of the reading.
            </p>
          </div>
          <a href="/dashboard" className="data text-[11px] text-[rgb(var(--muted))] hover:text-[rgb(var(--brass))]">
            Back
          </a>
        </header>

        {data.totals.total === 0 ? (
          <p className="panel rounded p-4 text-[rgb(var(--muted))]">
            Nothing recorded yet. Mark whether a reading landed as you go, and this fills in. After fifty or so
            verdicts it starts telling you which parts of the software to trust.
          </p>
        ) : (
          <>
            <section className="panel rounded p-4">
              <div className="flex items-baseline gap-3">
                <span className="data text-[32px] text-[rgb(var(--brass))]">{data.totals.score}%</span>
                <span className="text-[rgb(var(--muted))]">
                  {data.totals.landed} landed, {data.totals.partly} partly, {data.totals.missed} missed
                </span>
              </div>

              {thin && (
                <p className="mt-2 border-l-2 border-[rgb(var(--vermilion))] pl-2 text-[rgb(var(--muted))]">
                  Too few verdicts for this to mean anything yet. Under about thirty it moves several points on a
                  single answer, so treat it as a counter rather than a result.
                </p>
              )}
            </section>

            <section className="panel rounded p-4">
              <h2 className="eyebrow mb-3">By part of the reading</h2>
              <ul className="space-y-3">
                {data.sources.map((s) => (
                  <li key={s.source}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-[rgb(var(--ivory))]">{LABEL[s.source] ?? s.source}</span>
                      <span className="data text-[11px] text-[rgb(var(--muted))]">
                        {s.score}% of {s.total}
                      </span>
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-[rgb(var(--hairline))]">
                      <span style={{ width: `${(s.landed / s.total) * 100}%`, background: 'rgb(var(--lapis))' }} />
                      <span style={{ width: `${(s.partly / s.total) * 100}%`, background: 'rgb(var(--brass))' }} />
                      <span style={{ width: `${(s.missed / s.total) * 100}%`, background: 'rgb(var(--vermilion))' }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {data.misses.length > 0 && (
              <section className="panel rounded p-4">
                <h2 className="eyebrow mb-1">What it got wrong</h2>
                <p className="mb-3 text-[rgb(var(--muted))]">
                  The only entries worth reading. A pattern here says which module needs work.
                </p>
                <ul className="space-y-3">
                  {data.misses.map((m, i) => (
                    <li key={i} className="border-l-2 border-[rgb(var(--vermilion))] pl-3">
                      <span className="data text-[10px] text-[rgb(var(--muted))]">
                        {LABEL[m.source] ?? m.source} &middot; {new Date(m.created_at).toLocaleDateString()}
                      </span>
                      <p className="text-[rgb(var(--ivory))]">{m.claim}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
