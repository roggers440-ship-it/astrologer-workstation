'use client';

import { useState } from 'react';
import { CalendarRange, ChevronDown, ChevronRight } from 'lucide-react';
import type { PublicAnswer } from '@/types/reading';
import { Badge } from '@/components/ui/badge';

/**
 * One question, one answer.
 *
 * The question is set small and quiet; the answer carries the weight. That
 * inversion is deliberate - the astrologer already knows what was asked, and the
 * thing they need to read at a glance mid-session is the verdict.
 *
 * Support is shown out of 100 and labelled as chart support, never as a
 * percentage chance. Nothing in a chart yields odds.
 */

const CONFIDENCE_COLOUR: Record<string, string> = {
  Clear: 'rgb(var(--lapis))',
  Likely: 'rgb(var(--brass))',
  Mixed: 'rgb(var(--muted))',
  Weak: 'rgb(var(--vermilion))',
};

export function AnswerCard({ answer }: { answer: PublicAnswer }) {
  const [showClassical, setShowClassical] = useState(false);
  const colour = CONFIDENCE_COLOUR[answer.confidence] ?? 'rgb(var(--muted))';

  return (
    <article className="border-l-2 pl-3" style={{ borderColor: colour }}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="eyebrow">{answer.question}</span>
        <Badge className="bg-transparent text-[10px]" style={{ borderColor: colour, color: colour }}>
          {answer.confidence}
        </Badge>
      </div>

      <p className="text-[14px] leading-relaxed text-[rgb(var(--ivory))]">{answer.verdict}</p>

      {answer.window && (
        <div className="mt-2 flex items-center gap-1.5 rounded border border-[rgb(var(--brass))] px-2 py-1">
          <CalendarRange className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--brass))]" />
          <span className="data text-[12px] text-[rgb(var(--brass))]">
            {answer.window.from} &rarr; {answer.window.to}
          </span>
          <span className="data text-[10px] text-[rgb(var(--muted))]">{answer.window.label}</span>
        </div>
      )}

      {answer.support !== undefined && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-[rgb(var(--hairline))]">
            <div
              className="h-full rounded-full"
              style={{ width: `${answer.support}%`, background: colour }}
            />
          </div>
          <span className="data w-24 text-right text-[10px] text-[rgb(var(--muted))]">
            {answer.support}/100 support
          </span>
        </div>
      )}

      {answer.because && (
        <p className="mt-1.5 text-[11px] text-[rgb(var(--muted))]">{answer.because}</p>
      )}

      {answer.classical && (
        <>
          <button
            onClick={() => setShowClassical((v) => !v)}
            aria-expanded={showClassical}
            className="data mt-1.5 flex items-center gap-1 text-[10px] uppercase tracking-widest text-[rgb(var(--muted))] hover:text-[rgb(var(--brass))]"
          >
            {showClassical ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Classical text
          </button>

          {showClassical && (
            <div className="mt-1.5 border-l border-[rgb(var(--hairline))] pl-2.5">
              <p className="text-[rgb(var(--ivory))]">{answer.classical.claim}</p>
              <p className="data mt-1 text-[10px] text-[rgb(var(--muted))]">{answer.classical.source}</p>
            </div>
          )}
        </>
      )}
    </article>
  );
}
