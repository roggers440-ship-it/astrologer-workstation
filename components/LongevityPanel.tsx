'use client';

import type { NatalChart } from '@/types/astrology';
import { ayurdaya, bhagyodaya } from '@/lib/native-profile';
import { ordinal } from '@/lib/rule-engine';
import { lordOfHouse } from '@/lib/vedic-constants';

/**
 * Topic 9, behind the passphrase.
 *
 * Deliberately not an answer module and deliberately not a written analysis.
 * Longevity is the one topic where fluent prose is the wrong output: bands and
 * their reasoning, stated flatly, are harder to misread and harder to repeat to
 * a client by accident.
 *
 * This replaces the generic topic reading that used to serve this slot, which was
 * the last caller of a parallel analysis engine that disagreed with the rest of
 * the application.
 */
export function LongevityPanel({ natal }: { natal: NatalChart }) {
  const chart = natal.charts.D1;
  const reading = ayurdaya(chart);
  const bhagya = bhagyodaya(chart);

  const eighthLord = lordOfHouse(8, chart.ascendantSign);
  const eighthPlace = chart.placements.find((p) => p.planet === eighthLord);

  return (
    <div className="space-y-4">
      <div className="rounded border border-[rgb(var(--vermilion))] p-3">
        <div className="data text-[13px] text-[rgb(var(--ivory))]">
          {reading.band} &middot; {reading.approximateRange}
        </div>

        <ul className="mt-2 space-y-0.5 text-[11px] text-[rgb(var(--muted))]">
          {reading.pairs.map((p) => (
            <li key={p.pair}>
              {p.pair}: {p.verdict}
            </li>
          ))}
        </ul>

        <p className="mt-2 border-t border-[rgb(var(--hairline))] pt-2 text-[11px] text-[rgb(var(--muted))]">
          {reading.caution}
        </p>
      </div>

      <div>
        <span className="eyebrow block">The house itself</span>
        <p className="text-[rgb(var(--ivory))]">
          The 8th is run by {eighthLord}, sitting in the {ordinal(eighthPlace?.house ?? 8)}. That placement
          describes the character of upheaval in this life, which is the part of the 8th worth discussing.
          Duration is not.
        </p>
      </div>

      <div>
        <span className="eyebrow block">Bhagyodaya</span>
        <p className="text-[rgb(var(--ivory))]">{bhagya.note}</p>
      </div>
    </div>
  );
}
