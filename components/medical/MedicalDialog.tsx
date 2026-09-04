"use client";

import { useMemo, useState, type ReactElement } from "react";
import { Stethoscope, UserRound } from "lucide-react";
import type { NatalChart } from "@/types/astrology";
import {
  analyseBody,
  intensityMap,
  severityMap,
  type RegionId,
  type Severity,
} from "@/lib/medical";
import { BodyMap } from "./BodyMap";
import { RegionDetail } from "./RegionDetail";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Medical astrology at full size.
 *
 * Body fixed on the left, detail pinned on the right - clicking a region swaps
 * the right side and nothing else moves. That stability is the whole reason for
 * a big screen rather than a taller scroll.
 *
 * Opens in practitioner view, because the astrologer reads it before anyone else
 * does. The view toggle sits in the header rather than buried, since at this size
 * the laptop gets turned toward the client and switching has to be one obvious
 * click, not a hunt.
 */
export function MedicalDialog({
  natal,
  children,
}: {
  natal: NatalChart;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
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
    () => (showWeak ? all : all.filter((f) => f.severity !== "Background")),
    [all, showWeak],
  );
  const intensity = useMemo(() => intensityMap(findings), [findings]);
  const severity = useMemo(() => severityMap(findings), [findings]);
  const labels = useMemo(
    () => Object.fromEntries(findings.map((f) => [f.regionId, f.name])),
    [findings],
  );

  const active = findings.find((f) => f.regionId === selected) ?? null;
  const systemic = findings.filter((f) => f.view === "systemic");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        /* Reopening is a clean slate - a region left selected from the last
           client is a genuinely bad thing to have on screen. */
        if (!next) {
          setSelected(null);
          setClientView(false);
        }
      }}
    >
      <DialogTrigger render={children} />

      <DialogContent className="panel flex h-[92vh] min-w-[90vw] max-w-[1400px] flex-col p-0">
        <DialogHeader className="flex-row items-center justify-between border-b mr-20 border-[rgb(var(--hairline))] px-4 py-3">
          <DialogTitle className="text-[rgb(var(--ivory))]">
            Body map
          </DialogTitle>

          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[false, true].map((weak) => (
                <button
                  key={String(weak)}
                  onClick={() => setShowWeak(weak)}
                  className="data rounded border px-2 py-0.5 text-[11px]"
                  style={{
                    borderColor:
                      showWeak === weak
                        ? "rgb(var(--brass))"
                        : "rgb(var(--hairline))",
                    color:
                      showWeak === weak
                        ? "rgb(var(--brass))"
                        : "rgb(var(--muted))",
                  }}
                >
                  {weak ? "Everything" : "Significant only"}
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setClientView((v) => !v)}
            >
              {clientView ? (
                <UserRound className="h-3.5 w-3.5" />
              ) : (
                <Stethoscope className="h-3.5 w-3.5" />
              )}
              {clientView ? "Client view" : "Practitioner view"}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <div className="flex w-[58%] items-center justify-center border-r border-[rgb(var(--hairline))] p-4 pt-0">
            <BodyMap
              intensity={intensity}
              severity={severity}
              clientView={clientView}
              labels={labels}
              selected={selected}
              onSelect={setSelected}
              className="h-full max-h-[650px] w-full"
            />
          </div>

          <ScrollArea className="w-[42%]">
            <div className="space-y-4 p-4">
              {findings.length === 0 ? (
                <p className="text-[rgb(var(--muted))]">
                  No significant affliction in this chart. Switch to Everything
                  to see the weak signals.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {findings.map((f) => (
                      <button
                        key={f.regionId}
                        onClick={() => setSelected(f.regionId)}
                        className="data rounded border px-2 py-0.5 text-[11px]"
                        style={{
                          borderColor: clientView
                            ? "rgb(var(--hairline))"
                            : f.severity === "Priority"
                              ? "rgb(var(--vermilion))"
                              : f.severity === "Watch"
                                ? "rgb(var(--brass))"
                                : "rgb(var(--hairline))",
                          color:
                            selected === f.regionId
                              ? "rgb(var(--ivory))"
                              : "rgb(var(--muted))",
                          background:
                            selected === f.regionId
                              ? "rgb(var(--hairline))"
                              : "transparent",
                        }}
                      >
                        {clientView ? f.plain : f.name}
                        <span className="ml-1.5 text-[rgb(var(--muted))]">
                          {f.convergence}
                        </span>
                      </button>
                    ))}
                  </div>

                  {systemic.length > 0 && (
                    <p className="text-[11px] text-[rgb(var(--muted))]">
                      {systemic.map((s) => s.name).join(", ")}{" "}
                      {systemic.length > 1 ? "are" : "is"} flagged but
                      body-wide, so not drawn on the figures.
                    </p>
                  )}

                  {active ? (
                    <div className="border-t border-[rgb(var(--hairline))] pt-4">
                      <RegionDetail finding={active} clientView={clientView} />
                    </div>
                  ) : (
                    <p className="border-t border-[rgb(var(--hairline))] pt-4 text-[rgb(var(--muted))]">
                      Pick a region. Colour is severity, shading is how many
                      traditions agree - the two are separate readings and a
                      region can be high on one and low on the other.
                    </p>
                  )}
                </>
              )}

              <p className="border-t border-[rgb(var(--hairline))] pt-3 text-[11px] text-[rgb(var(--muted))]">
                Regions and screenings only. Severity grades the affliction in
                the chart, not medical risk - those are different things, and
                only a doctor can speak to the second.
              </p>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
