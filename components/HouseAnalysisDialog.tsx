"use client";

import { useMemo, useState, type ReactElement } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import type { HouseNumber, NatalChart } from "@/types/astrology";
import { readAllHouses } from "@/lib/house-reading";
import type { Yoga } from "@/lib/yogas";
import { NorthIndianChart } from "@/components/NorthIndianChart";
import { YogaCard } from "@/components/YogaCard";
import { AnalysisSection } from "@/components/AnalysisSection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

/**
 * House by house, in plain language.
 *
 * The chart is the navigator - click a house and the right side fills. That
 * reuses the shape already looked at all session rather than making the reader
 * learn a second index, and it keeps the house numbers where they belong: on the
 * diagram, not in the sentences.
 *
 * Strength is Sarvashtakavarga, not an invented score. The bars are bindu counts
 * normalised only so they have something to draw.
 *
 * The prose deliberately avoids the technical vocabulary. Planet names stay,
 * because clients know Saturn and Jupiter and the words carry weight; lord,
 * dignity, aspect and dusthana go, because outside the tradition they mean
 * nothing. The technical breakdown is one click away for the practitioner.
 */

const VERDICT_COLOUR = {
  Strong: "rgb(var(--lapis))",
  Workable: "rgb(var(--brass))",
  "Under strain": "rgb(var(--vermilion))",
} as const;

export function HouseAnalysisDialog({
  natal,
  yogas,
  clientId,
  children,
}: {
  natal: NatalChart;
  yogas: Yoga[];
  clientId: string;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [house, setHouse] = useState<HouseNumber>(1);
  const [showTechnical, setShowTechnical] = useState(false);
  /* The written analysis is the reading now. The computed lines are the working -
     still there, still checkable, no longer competing for attention with it. */
  const [showWorking, setShowWorking] = useState(false);

  const readings = useMemo(() => readAllHouses(natal, yogas), [natal, yogas]);
  const reading = readings[house - 1];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setHouse(1);
          setShowTechnical(false);
        }
      }}
    >
      <DialogTrigger render={children} />

      <DialogContent className="panel flex h-[92vh] min-w-[95vw] max-w-[1400px] flex-col p-0">
        <DialogHeader className="border-b border-[rgb(var(--hairline))] px-4 py-3">
          <DialogTitle className="text-[rgb(var(--ivory))]">
            House by house
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <div className="flex w-[46%] flex-col items-center justify-center gap-3 border-r border-[rgb(var(--hairline))] p-4">
            <NorthIndianChart
              chart={natal.charts.D1}
              className="h-full max-h-[560px] w-full"
              selectedHouse={house}
              onSelectHouse={setHouse}
            />

            {/* Strength across all twelve, so ranking is visible without reordering. */}
            <div className="grid w-full grid-cols-12 gap-1">
              {readings.map((r) => (
                <button
                  key={r.house}
                  onClick={() => setHouse(r.house)}
                  aria-label={`House ${r.house}, ${r.bindus} bindus, ${r.verdict}`}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    className="data text-[10px]"
                    style={{
                      color:
                        r.house === house
                          ? "rgb(var(--brass))"
                          : "rgb(var(--muted))",
                    }}
                  >
                    {r.house}
                  </span>
                  <span className="h-8 w-full rounded-sm bg-[rgb(var(--hairline))]">
                    <span
                      className="block w-full rounded-sm"
                      style={{
                        height: `${r.strength}%`,
                        marginTop: `${100 - r.strength}%`,
                        background: VERDICT_COLOUR[r.verdict],
                        opacity: r.house === house ? 1 : 0.55,
                      }}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="w-[54%]">
            <div className="space-y-5 p-5">
              <header className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] text-[rgb(var(--ivory))]">
                  {natal.charts.D1.houseSigns[house]}
                </h3>
                <Badge
                  className="bg-transparent text-[10px]"
                  style={{
                    borderColor: VERDICT_COLOUR[reading.verdict],
                    color: VERDICT_COLOUR[reading.verdict],
                  }}
                >
                  {reading.verdict}
                </Badge>
                <span className="data text-[10px] text-[rgb(var(--muted))]">
                  {reading.bindus} bindus &middot; {reading.savBand}
                </span>
              </header>

              <p className="data text-[11px] text-[rgb(var(--muted))]">
                {reading.savStatement}
              </p>

              <AnalysisSection
                key={house}
                clientId={clientId}
                mode="house"
                scope={house}
                label="Read this area"
              />

              <button
                onClick={() => setShowWorking((v) => !v)}
                aria-expanded={showWorking}
                className="data flex items-center gap-1 text-[10px] uppercase tracking-widest text-[rgb(var(--muted))] hover:text-[rgb(var(--brass))]"
              >
                {showWorking ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Show the working
              </button>

              {showWorking && (
                <div className="space-y-3 border-l border-[rgb(var(--hairline))] pl-3">
                  <p className="text-[rgb(var(--ivory))]">{reading.hook}</p>

                  <ul className="space-y-1.5">
                    {reading.detail.map((d, i) => (
                      <li key={i} className="text-[rgb(var(--muted))]">
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {reading.divisional && (
                <div className="border-l-2 border-[rgb(var(--lapis))] pl-2.5">
                  <span className="eyebrow block">Checked twice</span>
                  <p className="text-[rgb(var(--ivory))]">
                    {reading.divisional}
                  </p>
                </div>
              )}

              {reading.yogas.length > 0 && (
                <section className="border-t border-[rgb(var(--hairline))] pt-4">
                  <h4 className="eyebrow mb-2">
                    Named combinations touching this area
                  </h4>
                  <div className="space-y-4">
                    {reading.yogas.map((y) => (
                      <YogaCard key={y.id} yoga={y} />
                    ))}
                  </div>
                </section>
              )}

              {reading.windows.length > 0 && (
                <section className="border-t border-[rgb(var(--hairline))] pt-4">
                  <h4 className="eyebrow mb-2 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> When this area is busy
                  </h4>
                  <ol className="space-y-1.5">
                    {reading.windows.map((w, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span
                          className="data w-[74px] shrink-0 text-[11px]"
                          style={{
                            color: w.isCurrent
                              ? "rgb(var(--brass))"
                              : w.isFuture
                                ? "rgb(var(--lapis))"
                                : "rgb(var(--muted))",
                          }}
                        >
                          {w.year}
                          {w.endYear !== w.year && (
                            <>&ndash;{String(w.endYear).slice(2)}</>
                          )}
                        </span>
                        <span className="text-[rgb(var(--ivory))]">
                          {w.plain}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <section className="border-t border-[rgb(var(--hairline))] pt-4">
                <button
                  onClick={() => setShowTechnical((v) => !v)}
                  aria-expanded={showTechnical}
                  className="data flex items-center gap-1 text-[10px] uppercase tracking-widest text-[rgb(var(--muted))] hover:text-[rgb(var(--brass))]"
                >
                  {showTechnical ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  Technical
                </button>

                {showTechnical && (
                  <ul className="mt-2 space-y-1">
                    {reading.technical.map((t, i) => (
                      <li
                        key={i}
                        className="data text-[11px] text-[rgb(var(--muted))]"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
