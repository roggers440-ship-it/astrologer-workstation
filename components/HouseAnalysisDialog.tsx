"use client";

import { useState, type ReactElement } from "react";
import { ChevronDown, ChevronRight, Clock, Lock } from "lucide-react";
import type { ChartData, HouseNumber } from "@/types/astrology";
import type { PublicHouse, Reading, Teaser } from "@/types/reading";
import { NorthIndianChart } from "@/components/NorthIndianChart";
import { YogaCard } from "@/components/YogaCard";
import { LockedCard } from "@/components/LockedCard";
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
 * House by house.
 *
 * The chart is the navigator - click a house and the right side fills. Content
 * arrives from the server already filtered, so a locked house renders a teaser
 * because that is all that was sent, not because anything is being concealed
 * here.
 */

const VERDICT_COLOUR: Record<string, string> = {
  Strong: "rgb(var(--lapis))",
  Workable: "rgb(var(--brass))",
  "Under strain": "rgb(var(--vermilion))",
};

const isLocked = (entry: PublicHouse | Teaser | undefined): entry is Teaser =>
  Boolean(entry && "locked" in entry && entry.locked);

export function HouseAnalysisDialog({
  chart,
  reading,
  clientId,
  children,
}: {
  chart: ChartData;
  reading: Reading;
  clientId: string;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [house, setHouse] = useState<HouseNumber>(1);
  const [showWorking, setShowWorking] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  const entry = reading.houses[house];
  const locked = isLocked(entry);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setHouse(1);
          setShowWorking(false);
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
              chart={chart}
              className="h-full max-h-[560px] w-full"
              selectedHouse={house}
              onSelectHouse={setHouse}
            />

            <div className="grid w-full grid-cols-12 gap-1">
              {Array.from({ length: 12 }, (_, i) => (i + 1) as HouseNumber).map(
                (h) => {
                  const e = reading.houses[h];
                  const shut = isLocked(e);
                  return (
                    <button
                      key={h}
                      onClick={() => setHouse(h)}
                      aria-label={`House ${h}${shut ? ", locked" : ""}`}
                      className="flex flex-col items-center gap-1"
                    >
                      <span
                        className="data text-[10px]"
                        style={{
                          color:
                            h === house
                              ? "rgb(var(--brass))"
                              : "rgb(var(--muted))",
                        }}
                      >
                        {h}
                      </span>
                      <span className="flex h-6 w-full items-end justify-center rounded-sm bg-[rgb(var(--hairline))]">
                        {shut ? (
                          <Lock className="mb-1 h-2.5 w-2.5 text-[rgb(var(--brass))]" />
                        ) : (
                          <span
                            className="block w-full rounded-sm"
                            style={{
                              height: "100%",
                              background:
                                VERDICT_COLOUR[(e as PublicHouse).verdict],
                              opacity: h === house ? 1 : 0.55,
                            }}
                          />
                        )}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </div>

          <ScrollArea className="w-[54%]">
            <div className="space-y-5 p-5">
              {locked ? (
                <LockedCard teaser={entry} title={`House ${house}`} />
              ) : entry ? (
                <>
                  <header className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] text-[rgb(var(--ivory))]">
                      {entry.sign}
                    </h3>
                    <Badge
                      className="bg-transparent text-[10px]"
                      style={{
                        borderColor: VERDICT_COLOUR[entry.verdict],
                        color: VERDICT_COLOUR[entry.verdict],
                      }}
                    >
                      {entry.verdict}
                    </Badge>
                    {entry.bindus !== undefined && (
                      <span className="data text-[10px] text-[rgb(var(--muted))]">
                        {entry.bindus} bindus
                      </span>
                    )}
                  </header>

                  {reading.entitlements.analysis && (
                    <AnalysisSection
                      key={house}
                      clientId={clientId}
                      mode="house"
                      scope={house}
                      label="Read this area with AI"
                    />
                  )}

                  {entry.combinations.length > 0 && (
                    <section>
                      <h4 className="eyebrow mb-2">
                        What makes this chart different here
                      </h4>
                      <ul className="space-y-2.5">
                        {entry.combinations.map((c, i) => (
                          <li
                            key={i}
                            className="border-l-2 border-[rgb(var(--brass))] pl-3 text-[rgb(var(--ivory))]"
                          >
                            {c}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

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
                      <p className="text-[rgb(var(--ivory))]">{entry.hook}</p>
                      <ul className="space-y-1.5">
                        {entry.detail.map((d, i) => (
                          <li key={i} className="text-[rgb(var(--muted))]">
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.divisional && (
                    <div className="border-l-2 border-[rgb(var(--lapis))] pl-2.5">
                      <span className="eyebrow block">Checked twice</span>
                      <p className="text-[rgb(var(--ivory))]">
                        {entry.divisional}
                      </p>
                    </div>
                  )}

                  {entry.yogas.length > 0 && (
                    <section className="border-t border-[rgb(var(--hairline))] pt-4">
                      <h4 className="eyebrow mb-2">
                        Named combinations touching this area
                      </h4>
                      <div className="space-y-4">
                        {entry.yogas.map((y) => (
                          <YogaCard
                            key={y.name}
                            yoga={{
                              ...y,
                              provenance: "classical",
                              participants: [],
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {entry.windows && entry.windows.length > 0 && (
                    <section className="border-t border-[rgb(var(--hairline))] pt-4">
                      <h4 className="eyebrow mb-2 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> When this area is busy
                      </h4>
                      <ol className="space-y-1.5">
                        {entry.windows.map((w, i) => (
                          <li key={i} className="flex gap-2.5">
                            <span
                              className="data w-[74px] shrink-0 text-[11px]"
                              style={{
                                color:
                                  w.status === "now"
                                    ? "rgb(var(--brass))"
                                    : w.status === "future"
                                      ? "rgb(var(--lapis))"
                                      : "rgb(var(--muted))",
                              }}
                            >
                              {w.from}
                              {w.to !== w.from && <>&ndash;{w.to.slice(2)}</>}
                            </span>
                            <span className="text-[rgb(var(--ivory))]">
                              {w.label}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}

                  {entry.technical && (
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
                          {entry.technical.map((t, i) => (
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
                  )}
                </>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
