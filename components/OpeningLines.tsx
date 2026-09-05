'use client';

import { MessageSquareQuote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ConfirmStrip } from '@/components/ConfirmStrip';

const KIND_LABEL: Record<string, string> = {
  behaviour: 'about them',
  current: 'happening now',
  timing: 'timing',
  structure: 'about the chart',
};

/**
 * The first thing to say.
 *
 * Chosen on the server, because the ranking depends on which houses this reader
 * is entitled to - an opener drawn from a locked house would hand over the
 * content the lock exists to protect, in the most prominent position on screen.
 */
export function OpeningLines({
  opening,
}: {
  opening: { line: string; basis: string; kind: string };
}) {
  return (
    <section className="rounded border border-[rgb(var(--brass))] p-3">
      <header className="mb-2 flex items-center justify-between gap-2">
        <span className="eyebrow flex items-center gap-1.5 text-[rgb(var(--brass))]">
          <MessageSquareQuote className="h-3 w-3" /> Open with this
        </span>
        <Badge className="border-[rgb(var(--hairline))] bg-transparent text-[10px] text-[rgb(var(--muted))]">
          {KIND_LABEL[opening.kind] ?? opening.kind}
        </Badge>
      </header>

      <p className="text-[15px] leading-relaxed text-[rgb(var(--ivory))]">{opening.line}</p>
      <p className="data mt-2 text-[10px] text-[rgb(var(--muted))]">{opening.basis}</p>

      {/* The opener is a statement about the person that they can confirm or
          deny on the spot, which makes it the single most checkable thing this
          application produces. */}
      <ConfirmStrip source="opening" claim={opening.line} />
    </section>
  );
}
