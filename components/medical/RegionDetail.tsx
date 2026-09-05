'use client';

import type { PublicRegion } from '@/types/reading';
import { Badge } from '@/components/ui/badge';

const SEVERITY_COLOUR: Record<string, string> = {
  Priority: 'rgb(var(--vermilion))',
  Watch: 'rgb(var(--brass))',
  Background: 'rgb(var(--muted))',
};

/**
 * One region, expanded.
 *
 * The technical half - severity, which layers fired, the dated windows - is
 * absent from the data rather than hidden here, so this component renders
 * whatever it was given without needing to know the plan.
 */
export function RegionDetail({ region, technical }: { region: PublicRegion; technical: boolean }) {
  const colour = region.severity ? SEVERITY_COLOUR[region.severity] : 'rgb(var(--brass))';

  return (
    <article className="space-y-3">
      <header className="flex flex-wrap items-center gap-2">
        <h4 className="text-[15px] text-[rgb(var(--ivory))]">
          {technical ? region.name : region.plain}
        </h4>

        {region.severity && (
          <Badge className="bg-transparent text-[10px]" style={{ borderColor: colour, color: colour }}>
            {region.severity}
          </Badge>
        )}

        {region.convergence !== undefined && (
          <Badge className="border-[rgb(var(--hairline))] bg-transparent text-[10px] text-[rgb(var(--muted))]">
            {region.convergence} layers agree
          </Badge>
        )}

        {region.character && (
          <Badge className="border-[rgb(var(--hairline))] bg-transparent text-[10px] text-[rgb(var(--muted))]">
            {region.character}
          </Badge>
        )}
      </header>

      <div className="border-l-2 border-[rgb(var(--lapis))] pl-2.5">
        <span className="eyebrow block">What to actually do</span>
        <p className="text-[rgb(var(--ivory))]">{region.screening}</p>
      </div>

      {region.windows && region.windows.length > 0 && (
        <div>
          <span className="eyebrow block">Windows</span>
          <ul className="mt-1 space-y-0.5">
            {region.windows.map((w, i) => (
              <li key={i} className="data text-[11px]">
                <span
                  style={{
                    color:
                      w.status === 'now'
                        ? 'rgb(var(--brass))'
                        : w.status === 'future'
                          ? 'rgb(var(--lapis))'
                          : 'rgb(var(--muted))',
                  }}
                >
                  {w.from}&ndash;{w.to}
                </span>{' '}
                <span className="text-[rgb(var(--ivory))]">{w.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {region.hits && region.hits.length > 0 && (
        <div>
          <span className="eyebrow block">Why it fired</span>
          <ul className="mt-1 space-y-1">
            {region.hits.map((h, i) => (
              <li key={i} className="text-[11px] text-[rgb(var(--muted))]">{h}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
