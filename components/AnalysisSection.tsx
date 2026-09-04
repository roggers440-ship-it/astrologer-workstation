'use client';

import { useState } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Written analysis, generated from the computed facts.
 *
 * Deliberately placed above the evidence rather than replacing it. The model
 * weighs and phrases; it does not calculate. Keeping the computed material
 * visible underneath is what makes that checkable - if the prose says something
 * the numbers do not support, it should be obvious in the same screen.
 */
export function AnalysisSection({
  clientId,
  mode,
  scope,
  label = 'Written analysis',
}: {
  clientId: string;
  mode: 'overview' | 'house' | 'topic';
  scope?: number;
  label?: string;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(force = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, mode, scope, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'The analysis could not be generated.');
      setContent(data.content);
      setModel(data.model);
      setCached(Boolean(data.cached));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (!content && !loading && !error) {
    return (
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => generate()}>
        <Sparkles className="h-3.5 w-3.5" /> {label}
      </Button>
    );
  }

  return (
    <section className="rounded border border-[rgb(var(--hairline))] p-3">
      <header className="mb-2 flex items-center justify-between gap-2">
        <span className="eyebrow flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> {label}
        </span>

        <div className="flex items-center gap-2">
          {cached && (
            <Badge className="border-[rgb(var(--hairline))] bg-transparent text-[10px] text-[rgb(var(--muted))]">
              saved
            </Badge>
          )}
          {content && (
            <Button variant="ghost" size="icon-xs" onClick={() => generate(true)} aria-label="Rewrite, ignoring the saved copy">
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </header>

      {loading && (
        <p className="flex items-center gap-2 text-[rgb(var(--muted))]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the chart.
        </p>
      )}

      {error && <p className="text-[rgb(var(--vermilion))]">{error}</p>}

      {content && (
        <>
          <div className="space-y-3 text-[14px] leading-relaxed text-[rgb(var(--ivory))]">
            {content.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para.trim()}</p>
            ))}
          </div>

          <p className="data mt-3 border-t border-[rgb(var(--hairline))] pt-2 text-[10px] text-[rgb(var(--muted))]">
            Written by {model} from the computed chart below. It weighs and phrases; it does not calculate.
            Check anything that matters against the figures.
          </p>
        </>
      )}
    </section>
  );
}
