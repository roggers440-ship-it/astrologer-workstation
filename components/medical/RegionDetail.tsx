'use client';

import { LAYER_LABEL, type RegionFinding, type Severity } from '@/lib/medical';
import { Badge } from '@/components/ui/badge';

const SEVERITY_COLOUR: Record<Severity, string> = {
  Priority: 'rgb(var(--vermilion))',
  Watch: 'rgb(var(--brass))',
  Background: 'rgb(var(--muted))',
};

const SEVERITY_LINE: Record<Severity, string> = {
  Priority: 'Heaviest affliction in this chart. Raise it, and make sure the screening actually gets booked.',
  Watch: 'Real signal, moderate weight. Mention it; no urgency attached.',
  Background: 'Weak. Present in the chart, not worth spending session time on unless the client raises it.',
};

/**
 * One region, expanded. Shared by the inline panel and the full-screen dialog so
 * the two cannot drift apart.
 *
 * Practitioner copy is deliberately blunt - a reading hedged into vagueness gets
 * ignored, which helps nobody. What stays constrained is the claim itself: this
 * names a region and a routine test, never a condition.
 */
export function RegionDetail({
  finding,
  clientView,
}: {
  finding: RegionFinding;
  clientView: boolean;
}) {
  const colour = clientView ? 'rgb(var(--brass))' : SEVERITY_COLOUR[finding.severity];

  return (
    <article className="space-y-3">
      <header className="flex flex-wrap items-center gap-2">
        <h4 className="text-[15px] text-[rgb(var(--ivory))]">
          {clientView ? finding.plain : finding.name}
        </h4>

        {!clientView && (
          <Badge className="bg-transparent text-[10px]" style={{ borderColor: colour, color: colour }}>
            {finding.severity}
          </Badge>
        )}

        <Badge className="border-[rgb(var(--hairline))] bg-transparent text-[10px] text-[rgb(var(--muted))]">
          {finding.convergence} layers agree
        </Badge>

        {finding.character && !clientView && (
          <Badge className="border-[rgb(var(--hairline))] bg-transparent text-[10px] text-[rgb(var(--muted))]">
            {finding.character.label}
          </Badge>
        )}
      </header>

      {!clientView && (
        <p style={{ color: colour }}>{SEVERITY_LINE[finding.severity]}</p>
      )}

      {finding.character && <p className="text-[rgb(var(--ivory))]">{finding.character.meaning}</p>}

      <div className="border-l-2 border-[rgb(var(--lapis))] pl-2.5">
        <span className="eyebrow block">What to actually do</span>
        <p className="text-[rgb(var(--ivory))]">{finding.screening}</p>
      </div>

      {!clientView && finding.severityReasons.length > 0 && (
        <div>
          <span className="eyebrow block">What makes it heavy</span>
          <ul className="mt-1 space-y-0.5">
            {finding.severityReasons.map((r) => (
              <li key={r} className="text-[11px] text-[rgb(var(--ivory))]">{r}</li>
            ))}
          </ul>
        </div>
      )}

      {finding.windows.length > 0 && (
        <div>
          <span className="eyebrow block">{clientView ? 'When to book it' : 'Windows'}</span>
          <ul className="mt-1 space-y-0.5">
            {finding.windows.map((w, i) => (
              <li key={i} className="data text-[11px]">
                <span
                  style={{
                    color: w.isCurrent ? 'rgb(var(--brass))'
                      : w.isFuture ? 'rgb(var(--lapis))'
                      : 'rgb(var(--muted))',
                  }}
                >
                  {w.year}&ndash;{String(w.endYear).slice(2)}
                </span>{' '}
                <span className="text-[rgb(var(--ivory))]">{clientView ? 'worth a check' : w.label}</span>
                {w.isCurrent && <span className="text-[rgb(var(--brass))]"> &middot; now</span>}
              </li>
            ))}
          </ul>
          {!clientView && (
            <p className="mt-1 text-[11px] text-[rgb(var(--muted))]">
              This is when to book the check, not when something happens.
            </p>
          )}
        </div>
      )}

      {!clientView && (
        <div>
          <span className="eyebrow block">Why it fired</span>
          <ul className="mt-1 space-y-1">
            {finding.hits.map((h, i) => (
              <li key={i} className="text-[11px] text-[rgb(var(--muted))]">
                <span className="data text-[rgb(var(--lapis))]">{LAYER_LABEL[h.layer]}</span> &middot; {h.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
