"use client";

import { useMemo } from "react";
import type { HookCategory } from "@/types/astrology";
import { useWorkstation } from "@/store/chart-store";
import { CheatSheetTooltip, GLOSSARY } from "@/components/CheatSheetTooltip";
import { yearImpacts, type YearReading } from "@/lib/year-impact";
import { NativeProfileCards } from "@/components/NativeProfileCards";
import { AnalysisSection } from "@/components/AnalysisSection";
import { YogaCard } from "@/components/YogaCard";
import { signatureWithCombinations } from "@/lib/chart-signature";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const STRENGTH_COLOUR = {
  Strong: "rgb(var(--brass))",
  Moderate: "rgb(var(--lapis))",
  Supporting: "rgb(var(--muted))",
} as const;

function IndicatorCard({
  title,
  guideline,
  note,
  evidence,
  strength,
}: {
  title: string;
  guideline: string;
  note: string;
  evidence?: string[];
  strength: keyof typeof STRENGTH_COLOUR;
}) {
  return (
    <article
      className="border-l-2 pl-3"
      style={{ borderColor: STRENGTH_COLOUR[strength] }}
    >
      <h4 className="font-medium text-[rgb(var(--ivory))]">
        <CheatSheetTooltip definition={note} plainEnglish={guideline}>
          {title}
        </CheatSheetTooltip>
      </h4>
      <p className="mt-1 text-[rgb(var(--ivory))]">{guideline}</p>
      {evidence && evidence.length > 0 && (
        <p className="data mt-1.5 text-[10px] text-[rgb(var(--muted))]">
          {evidence.join("  \u00b7  ")}
        </p>
      )}
    </article>
  );
}

const BAND_COLOUR = {
  Peak: "rgb(var(--vermilion))",
  High: "rgb(var(--brass))",
  Notable: "rgb(var(--muted))",
} as const;

/**
 * One paragraph per significant year, not one line per factor.
 *
 * Quiet years are dropped entirely. A year appears because several things run at
 * once, and the paragraph says which domains they agree on - which is the only
 * form of this that is worth reading aloud.
 */
function YearList({ years }: { years: YearReading[] }) {
  if (years.length === 0) {
    return (
      <p className="text-[rgb(var(--muted))]">
        Nothing in this window clears the threshold. Quiet stretch.
      </p>
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-[rgb(var(--hairline))] pl-4">
      {years.map((y) => (
        <li key={y.year} className="relative">
          <span
            className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full"
            style={{ background: BAND_COLOUR[y.band] }}
            aria-hidden
          />

          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className="data text-[13px]"
              style={{ color: BAND_COLOUR[y.band] }}
            >
              {y.year}
            </span>
            <Badge
              className="bg-transparent text-[10px]"
              style={{
                borderColor: BAND_COLOUR[y.band],
                color: BAND_COLOUR[y.band],
              }}
            >
              {y.band}
            </Badge>
            {y.isCurrent && (
              <Badge className="border-[rgb(var(--brass))] bg-transparent text-[10px] text-[rgb(var(--brass))]">
                running now
              </Badge>
            )}
            <span className="data text-[10px] text-[rgb(var(--muted))]">
              {y.tone}
            </span>
          </div>

          <p className="text-[rgb(var(--ivory))]">{y.headline}</p>

          <p className="data mt-1 text-[10px] text-[rgb(var(--muted))]">
            {y.factors.map((f) => f.kind).join(" \u00b7 ")}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function PatternsPanel() {
  const { hooks, natal, yogas, client } = useWorkstation();

  /* Computed from the chart's own numbers, so it is never empty and never generic.
     The rule corpus is layered on top rather than being the only source. */
  const signature = useMemo(
    () => (natal ? signatureWithCombinations(natal) : []),
    [natal],
  );

  const indicators = useMemo(() => {
    const wanted: HookCategory[] = ["PhysicalIndicator", "Psychological"];
    const seen = new Set<string>();
    return hooks
      .filter((h) => wanted.includes(h.category))
      .filter((h) => (seen.has(h.title) ? false : (seen.add(h.title), true)));
  }, [hooks]);

  const thisYear = new Date().getUTCFullYear();
  const years = useMemo(() => (natal ? yearImpacts(natal) : []), [natal]);
  const past = useMemo(
    () => years.filter((y) => y.year <= thisYear),
    [years, thisYear],
  );
  const future = useMemo(
    () => years.filter((y) => y.year > thisYear),
    [years, thisYear],
  );

  if (!natal) {
    return (
      <section className="panel flex h-full w-full items-center justify-center p-3 text-[rgb(var(--muted))]">
        <p className="max-w-[22ch] text-center">
          Physical markers and the ten-year timeline appear once a chart is
          loaded.
        </p>
      </section>
    );
  }

  return (
    <section className="panel flex h-full w-full flex-col overflow-hidden">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4">
          {client && (
            <AnalysisSection
              clientId={client.id}
              mode="overview"
              label="Read the whole chart"
            />
          )}

          <NativeProfileCards
            chart={natal.charts.D1}
            panchanga={natal.panchanga}
          />

          <div className="border-t border-[rgb(var(--hairline))] pt-4">
            <h3 className="eyebrow mb-1">
              What is distinctive about this chart
            </h3>
            <p className="mb-3 text-[rgb(var(--muted))]">
              Ordered by how unusual each one is, not by how important. The top
              items are the things this chart has that most charts do not -
              which is what makes an opening observation land.
            </p>

            <div className="space-y-4">
              {signature.map((o) => (
                <article
                  key={o.id}
                  className="border-l-2 border-[rgb(var(--brass))] pl-3"
                >
                  <h4 className="font-medium text-[rgb(var(--ivory))]">
                    {o.title}
                  </h4>
                  <p className="data mt-0.5 text-[11px] text-[rgb(var(--muted))]">
                    {o.statement}
                  </p>
                  <p className="mt-1 text-[rgb(var(--ivory))]">
                    {o.consequence}
                  </p>
                </article>
              ))}
            </div>
          </div>

          {yogas.length > 0 && (
            <div className="border-t border-[rgb(var(--hairline))] pt-4">
              <h3 className="eyebrow mb-1">Named combinations</h3>
              <p className="mb-3 text-[rgb(var(--muted))]">
                Every yoga in the chart, strongest first. Provenance is marked -
                not everything the tradition names is equally well attested.
              </p>
              <div className="space-y-4">
                {yogas.map((y) => (
                  <YogaCard key={y.id} yoga={y} />
                ))}
              </div>
            </div>
          )}

          {indicators.length > 0 && (
            <div className="border-t border-[rgb(var(--hairline))] pt-4">
              <h3 className="eyebrow mb-1">Rule corpus matches</h3>
              <p className="mb-3 text-[rgb(var(--muted))]">
                Hand-written combinations that fired on this chart. Ask each as
                a question rather than stating it.
              </p>
              <div className="space-y-4">
                {indicators.map((h) => (
                  <IndicatorCard
                    key={h.id}
                    title={h.title}
                    guideline={h.interpretiveGuideline}
                    note={h.cheatSheetNote}
                    evidence={h.evidence}
                    strength={h.strength ?? "Moderate"}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[rgb(var(--hairline))] pt-4">
            <h3 className="eyebrow mb-1">Ten years back</h3>
            <p className="mb-3 text-[rgb(var(--muted))]">
              Only the years where several things ran at once. Read one back,
              ask what happened, and note the answer - this is how you find out
              whether the chart is calibrated for this person before saying
              anything about their future.
            </p>
            <YearList years={past} />
          </div>

          <div className="border-t border-[rgb(var(--hairline))] pt-4">
            <h3 className="eyebrow mb-1">Ten years forward</h3>
            <p className="mb-3 text-[rgb(var(--muted))]">
              The same machinery pointed the other way. Only worth raising for
              the years the client confirmed above - a timeline they did not
              recognise going back is not one to lean on going forward.
            </p>
            <YearList years={future} />
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}
