'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, TriangleAlert } from 'lucide-react';
type PublicYoga = {
  name: string;
  strength: string;
  provenance: string;
  reading: string;
  caveat?: string;
  participants: string[];
  classicalClaim?: string;
  literalMeaning?: string;
  source?: string;
};
import { Badge } from '@/components/ui/badge';

/**
 * One yoga, three registers.
 *
 * The modern reading leads because that is what gets delivered. The classical
 * claim sits underneath, unsanitised, with its source and the historical context
 * that makes "lord of horses and elephants" mean something - a practitioner needs
 * the original phrasing available, but asserting it in the software's own voice
 * would be a claim the tradition does not actually support today.
 */

const PROVENANCE_STYLE: Record<string, { label: string; colour: string; note: string }> = {
  classical: {
    label: 'Classical',
    colour: 'rgb(var(--lapis))',
    note: 'Attested in the primary texts.',
  },
  medieval: {
    label: 'Later',
    colour: 'rgb(var(--brass))',
    note: 'Post-classical or regional. Applied inconsistently between schools.',
  },
  modern: {
    label: 'Modern',
    colour: 'rgb(var(--vermilion))',
    note: 'No classical source. Popular rather than textual.',
  },
};

export function YogaCard({ yoga }: { yoga: PublicYoga }) {
  const [showClassical, setShowClassical] = useState(false);
  const prov = PROVENANCE_STYLE[yoga.provenance] ?? PROVENANCE_STYLE.classical;

  const strengthColour =
    yoga.strength === 'Strong' ? 'rgb(var(--brass))'
    : yoga.strength === 'Moderate' ? 'rgb(var(--ivory))'
    : 'rgb(var(--muted))';

  return (
    <article className="border-l-2 pl-3" style={{ borderColor: strengthColour }}>
      <header className="mb-1 flex flex-wrap items-center gap-1.5">
        <h5 className="font-medium text-[rgb(var(--ivory))]">{yoga.name}</h5>
        <Badge className="bg-transparent text-[10px]" style={{ borderColor: prov.colour, color: prov.colour }}>
          {prov.label}
        </Badge>
        <span className="data text-[10px] text-[rgb(var(--muted))]">{yoga.strength}</span>
      </header>

      <p className="data mb-1 text-[10px] text-[rgb(var(--muted))]">
        {yoga.participants.join(' \u00b7 ')}
      </p>

      <p className="text-[rgb(var(--ivory))]">{yoga.reading}</p>

      {yoga.caveat && (
        <p className="mt-1 flex items-start gap-1.5 text-[11px] text-[rgb(var(--vermilion))]">
          <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
          {yoga.caveat}
        </p>
      )}

      {yoga.classicalClaim && (
      <button
        onClick={() => setShowClassical((v) => !v)}
        aria-expanded={showClassical}
        className="data mt-1.5 flex items-center gap-1 text-[10px] uppercase tracking-widest text-[rgb(var(--muted))] hover:text-[rgb(var(--brass))]"
      >
        {showClassical ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Classical text
      </button>
      )}

      {showClassical && yoga.classicalClaim && (
        <div className="mt-1.5 space-y-2 border-l border-[rgb(var(--hairline))] pl-2.5">
          <div>
            <span className="eyebrow block">What the texts claim</span>
            <p className="text-[rgb(var(--ivory))]">{yoga.classicalClaim}</p>
            <p className="data mt-1 text-[10px] text-[rgb(var(--muted))]">{yoga.source}</p>
          </div>

          <div>
            <span className="eyebrow block">What it meant then</span>
            <p className="text-[rgb(var(--muted))]">{yoga.literalMeaning}</p>
          </div>

          <p className="text-[10px]" style={{ color: prov.colour }}>{prov.note}</p>
        </div>
      )}
    </article>
  );
}
