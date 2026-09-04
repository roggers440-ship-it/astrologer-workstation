'use client';

import { useMemo, useState } from 'react';
import { Stethoscope, UserRound } from 'lucide-react';
import type { NatalChart } from '@/types/astrology';
import { analyseBody, intensityMap, severityMap, type RegionId, type Severity } from '@/lib/medical';
import { BodyMap } from './BodyMap';
import { RegionDetail } from './RegionDetail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Medical astrology, picture first.
 *
 * A region flagged by one layer is noise; a region flagged by four is signal. The
 * map shows convergence and nothing else until a region is clicked, because the
 * whole value of the module is that it declines to say most of what it could.
 *
 * Two views. Practitioner sees the layers and the dasha windows. Client sees the
 * region in plain words and the routine test to book - which is the design
 * decision that makes this route someone toward care instead of toward worry.
 */
export function MedicalPanel({ natal }: { natal: NatalChart }) {
  const [showWeak, setShowWeak] = useState(false);
  const [clientView, setClientView] = useState(false);
  const [selected, setSelected] = useState<RegionId | null>(null);

    /*
   * Everything with any hit is computed. Hiding the weak findings looked evasive;
   * ranking them says the same thing honestly. The toggle only decides whether
   * the Background band is listed.
   */
  const all = useMemo(() => analyseBody(natal, { threshold: 1 }), [natal]);
  const findings = useMemo(
    () => (showWeak ? all : all.filter((f) => f.severity !== 'Background')),
    [all, showWeak],
  );
  const intensity = useMemo(() => intensityMap(findings), [findings]);
  const severity = useMemo(() => severityMap(findings), [findings]);
  const labels = useMemo(
    () => Object.fromEntries(findings.map((f) => [f.regionId, f.name])),
    [findings],
  );

  const active = findings.find((f) => f.regionId === selected) ?? null;
  const systemic = findings.filter((f) => f.view === 'systemic');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {[false, true].map((weak) => (
            <button
              key={String(weak)}
              onClick={() => setShowWeak(weak)}
              className="data rounded border px-2 py-0.5 text-[11px]"
              style={{
                borderColor: showWeak === weak ? 'rgb(var(--brass))' : 'rgb(var(--hairline))',
                color: showWeak === weak ? 'rgb(var(--brass))' : 'rgb(var(--muted))',
              }}
            >
              {weak ? 'Everything' : 'Significant only'}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setClientView((v) => !v)}>
          {clientView ? <UserRound className="h-3.5 w-3.5" /> : <Stethoscope className="h-3.5 w-3.5" />}
          {clientView ? 'Client view' : 'Practitioner view'}
        </Button>
      </div>

      <BodyMap intensity={intensity} severity={severity} clientView={clientView} labels={labels} selected={selected} onSelect={setSelected} />

      {findings.length === 0 ? (
        <p className="text-[rgb(var(--muted))]">
          No significant affliction in this chart. Switch to Everything to see the weak signals.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {findings.map((f) => (
            <button
              key={f.regionId}
              onClick={() => setSelected(f.regionId)}
              className="data rounded border px-2 py-0.5 text-[11px]"
              style={{
                borderColor: clientView
                  ? 'rgb(var(--hairline))'
                  : f.severity === 'Priority' ? 'rgb(var(--vermilion))'
                  : f.severity === 'Watch' ? 'rgb(var(--brass))'
                  : 'rgb(var(--hairline))',
                color: selected === f.regionId ? 'rgb(var(--ivory))' : 'rgb(var(--muted))',
                background: selected === f.regionId ? 'rgb(var(--hairline))' : 'transparent',
              }}
            >
              {clientView ? f.plain : f.name}
              <span className="ml-1.5 text-[rgb(var(--muted))]">{f.convergence}</span>
            </button>
          ))}
        </div>
      )}

      {systemic.length > 0 && !selected && (
        <p className="text-[11px] text-[rgb(var(--muted))]">
          {systemic.map((s) => s.name).join(', ')} {systemic.length > 1 ? 'are' : 'is'} flagged but body-wide, so
          not drawn on the figures.
        </p>
      )}

      {active && (
        <div className="rounded border border-[rgb(var(--hairline))] p-3">
          <RegionDetail finding={active} clientView={clientView} />
        </div>
      )}

      <p className="border-t border-[rgb(var(--hairline))] pt-2 text-[11px] text-[rgb(var(--muted))]">
        Regions and screenings only. Severity grades the affliction in the chart, not medical risk.
      </p>
    </div>
  );
}
