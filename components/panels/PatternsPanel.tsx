"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkstation } from "@/store/chart-store";
import { NativeProfileCards } from "@/components/NativeProfileCards";
import { AnalysisSection } from "@/components/AnalysisSection";
import { OpeningLines } from "@/components/OpeningLines";
import { YogaCard } from "@/components/YogaCard";
import { LockedCard } from "@/components/LockedCard";
import { PanelLoading } from "@/components/PanelLoading";
import { ConfirmStrip } from "@/components/ConfirmStrip";
import type { PublicYear, Teaser } from "@/types/reading";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PanelEmpty } from "../PanelEmpty";

const BAND_COLOUR: Record<string, string> = {
  Peak: "rgb(var(--vermilion))",
  High: "rgb(var(--brass))",
  Notable: "rgb(var(--muted))",
};

/**
 * One paragraph per significant year, not one line per factor. Quiet years are
 * dropped entirely; a year appears because several things run at once.
 */
function YearList({
  years,
  thisYear,
}: {
  years: PublicYear[];
  thisYear: number | null;
}) {
  if (years.length === 0) {
    return (
      <p className="text-[rgb(var(--muted))]">
        Nothing in this window clears the threshold.
      </p>
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-[rgb(var(--hairline))] pl-4">
      {years.map((y) => (
        <li key={y.year} className="relative">
          <span
            className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full"
            style={{ background: BAND_COLOUR[y.band] ?? "rgb(var(--muted))" }}
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
            <span className="data text-[10px] text-[rgb(var(--muted))]">
              {y.tone}
            </span>
          </div>
          <p className="text-[rgb(var(--ivory))]">{y.headline}</p>

          {/* Past years only. Asking whether next year landed is nonsense, and
              offering the control invites a meaningless answer. */}
          {thisYear !== null && y.year <= thisYear && (
            <ConfirmStrip source="year" scope={y.year} claim={y.headline} />
          )}
        </li>
      ))}
    </ol>
  );
}

export function PatternsPanel() {
  const { natal, client, reading, status } = useWorkstation();

  /*
   * The clock, read once after mount rather than during render. Reading it in
   * render is impure - two renders can disagree - and React 19 rejects it.
   */
  const [thisYear, setThisYear] = useState<number | null>(null);
  useEffect(() => setThisYear(new Date().getUTCFullYear()), []);

  const years =
    reading && !("locked" in reading.years)
      ? (reading.years as PublicYear[])
      : null;
  const past = useMemo(
    () =>
      thisYear === null ? [] : (years?.filter((y) => y.year <= thisYear) ?? []),
    [years, thisYear],
  );
  const future = useMemo(
    () =>
      thisYear === null
        ? (years ?? [])
        : (years?.filter((y) => y.year > thisYear) ?? []),
    [years, thisYear],
  );

  /* Shown before the empty state, because a chart being computed is a different
     thing from no chart being chosen, and they should not look the same. */
  if (status === "loading") {
    return (
      <section className="panel @container h-full w-full">
        <PanelLoading label="Reading the chart" />
      </section>
    );
  }

  if (!natal || !reading || !client) {
    return (
      <section className="panel @container h-full w-full">
        <PanelEmpty
          mark="wheel"
          title="Nothing to read"
          line="The chart's signature, its combinations and the years that matter appear once a client is loaded."
        />
      </section>
    );
  }

  return (
    <section className="panel @container flex h-full w-full flex-col overflow-hidden">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4">
          {reading.opening && <OpeningLines opening={reading.opening} />}

          {reading.entitlements.analysis ? (
            <AnalysisSection
              clientId={client.id}
              mode="overview"
              label="Read the whole chart"
            />
          ) : (
            <LockedCard
              title="Written analysis"
              teaser={{
                locked: true,
                covers: "the whole chart, written out in plain language",
                has: [
                  {
                    label: "findings to draw on",
                    count: reading.signature.length + reading.yogas.length,
                  },
                ],
                line: "Everything in this chart, weighed against everything else and written as one piece rather than a list of parts.",
                needs: "basic",
              }}
            />
          )}

          <NativeProfileCards
            chart={natal.charts.D1}
            panchanga={reading.panchanga}
          />

          <div className="border-t border-[rgb(var(--hairline))] pt-4">
            <h3 className="eyebrow mb-1">
              What is distinctive about this chart
            </h3>
            <p className="mb-3 text-[rgb(var(--muted))]">
              Ordered by how unusual each one is, not by how important.
            </p>

            <div className="space-y-4">
              {reading.signature.map((o) => (
                <article
                  key={o.title}
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

          {reading.yogas.length > 0 && (
            <div className="border-t border-[rgb(var(--hairline))] pt-4">
              <h3 className="eyebrow mb-1">Named combinations</h3>
              <p className="mb-3 text-[rgb(var(--muted))]">
                Strongest first. Provenance is marked - not everything the
                tradition names is equally well attested.
              </p>
              <div className="space-y-4">
                {reading.yogas.map((y) => (
                  <YogaCard key={y.name} yoga={y} />
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[rgb(var(--hairline))] pt-4">
            <h3 className="eyebrow mb-1">The years that matter</h3>

            {years ? (
              <>
                <p className="mb-3 text-[rgb(var(--muted))]">
                  Only the years where several things ran at once. Read one back
                  and ask what happened - that is how you find out whether the
                  chart is calibrated for this person.
                </p>
                <div className="space-y-6">
                  <YearList years={past} thisYear={thisYear} />
                  <div className="border-t border-[rgb(var(--hairline))] pt-4">
                    <h4 className="eyebrow mb-2">Ahead</h4>
                    <YearList years={future} thisYear={thisYear} />
                  </div>
                </div>
              </>
            ) : (
              <LockedCard
                teaser={reading.years as Teaser}
                title="Twenty years"
              />
            )}
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}
