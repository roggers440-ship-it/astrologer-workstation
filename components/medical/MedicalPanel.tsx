'use client';

import { useMemo, useState } from 'react';
import type { PublicRegion } from '@/types/reading';
import type { RegionId, Severity } from '@/lib/medical';
import { BodyMap } from './BodyMap';
import { RegionDetail } from './RegionDetail';

/**
 * Medical astrology, picture first.
 *
 * The regions arrive from the server already trimmed to the plan. A light
 * reading carries the region and the routine screening and nothing else - no
 * severity, no layer reasoning, no dates - because those are computed server
 * side and simply not sent.
 */
export function MedicalPanel({
  regions,
  note,
  depth,
}: {
  regions: PublicRegion[];
  note: string;
  depth: 'plain' | 'technical';
}) {
  const [selected, setSelected] = useState<RegionId | null>(null);

  const intensity = useMemo(() => {
    const max = Math.max(1, ...regions.map((r) => r.convergence ?? 1));
    return Object.fromEntries(regions.map((r) => [r.regionId, (r.convergence ?? 1) / max]));
  }, [regions]);

  const severity = useMemo(
    () =>
      Object.fromEntries(
        regions.map((r) => [r.regionId, (r.severity as Severity) ?? 'Watch']),
      ) as Record<string, Severity>,
    [regions],
  );

  const labels = useMemo(
    () => Object.fromEntries(regions.map((r) => [r.regionId, r.name])),
    [regions],
  );

  const active = regions.find((r) => r.regionId === selected) ?? null;

  return (
    <div className="space-y-3">
      <BodyMap
        intensity={intensity}
        severity={severity}
        clientView={depth !== 'technical'}
        labels={labels}
        selected={selected}
        onSelect={(id) => setSelected(id)}
      />

      {regions.length === 0 ? (
        <p className="text-[rgb(var(--muted))]">Nothing in this chart reaches the threshold worth mentioning.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {regions.map((r) => (
            <button
              key={r.regionId}
              onClick={() => setSelected(r.regionId as RegionId)}
              className="data rounded border px-2 py-0.5 text-[11px]"
              style={{
                borderColor:
                  selected === r.regionId ? 'rgb(var(--brass))' : 'rgb(var(--hairline))',
                color: selected === r.regionId ? 'rgb(var(--ivory))' : 'rgb(var(--muted))',
              }}
            >
              {depth === 'technical' ? r.name : r.plain}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="rounded border border-[rgb(var(--hairline))] p-3">
          <RegionDetail region={active} technical={depth === 'technical'} />
        </div>
      )}

      <p className="border-t border-[rgb(var(--hairline))] pt-2 text-[11px] text-[rgb(var(--muted))]">
        {note}
      </p>
    </div>
  );
}
