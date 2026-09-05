"use client";

import { useMemo, useState, type ReactElement } from "react";
import { Stethoscope, UserRound } from "lucide-react";
import type { PublicRegion } from "@/types/reading";
import type { RegionId, Severity } from "@/lib/medical";
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
 * the right side and nothing else moves.
 *
 * Regions arrive from the server already trimmed to the plan. A light reading
 * carries the region and the routine screening and nothing else; severity, the
 * layer reasoning and the dates are not computed for it, so there is nothing to
 * hide and nothing to leak.
 */
export function MedicalDialog({
  regions,
  note,
  depth,
  children,
}: {
  regions: PublicRegion[];
  note: string;
  depth: "plain" | "technical";
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [clientView, setClientView] = useState(depth !== "technical");
  const [selected, setSelected] = useState<RegionId | null>(null);

  const intensity = useMemo(() => {
    const max = Math.max(1, ...regions.map((r) => r.convergence ?? 1));
    return Object.fromEntries(
      regions.map((r) => [r.regionId, (r.convergence ?? 1) / max]),
    );
  }, [regions]);

  const severity = useMemo(
    () =>
      Object.fromEntries(
        regions.map((r) => [r.regionId, (r.severity as Severity) ?? "Watch"]),
      ) as Record<string, Severity>,
    [regions],
  );

  const labels = useMemo(
    () => Object.fromEntries(regions.map((r) => [r.regionId, r.name])),
    [regions],
  );

  const active = regions.find((r) => r.regionId === selected) ?? null;
  const technical = depth === "technical" && !clientView;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSelected(null);
          setClientView(depth !== "technical");
        }
      }}
    >
      <DialogTrigger render={children} />

      <DialogContent className="panel flex h-[92vh] min-w-[90vw] max-w-[1400px] flex-col p-0">
        <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-[rgb(var(--hairline))] px-4 pr-20 py-3">
          <DialogTitle className="text-[rgb(var(--ivory))]">
            Body map
          </DialogTitle>

          {depth === "technical" && (
            <Button
              variant="outline"
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
          )}
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <div className="flex w-[58%] items-center justify-center border-r border-[rgb(var(--hairline))] p-4">
            <BodyMap
              intensity={intensity}
              severity={severity}
              clientView={!technical}
              labels={labels}
              selected={selected}
              onSelect={setSelected}
              className="h-full max-h-[760px] w-full"
            />
          </div>

          <ScrollArea className="w-[42%]">
            <div className="space-y-4 p-4">
              {regions.length === 0 ? (
                <p className="text-[rgb(var(--muted))]">
                  Nothing in this chart reaches the threshold worth mentioning.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {regions.map((r) => (
                    <button
                      key={r.regionId}
                      onClick={() => setSelected(r.regionId as RegionId)}
                      className="data rounded border px-2 py-0.5 text-[11px]"
                      style={{
                        borderColor:
                          technical && r.severity === "Priority"
                            ? "rgb(var(--vermilion))"
                            : selected === r.regionId
                              ? "rgb(var(--brass))"
                              : "rgb(var(--hairline))",
                        color:
                          selected === r.regionId
                            ? "rgb(var(--ivory))"
                            : "rgb(var(--muted))",
                      }}
                    >
                      {technical ? r.name : r.plain}
                    </button>
                  ))}
                </div>
              )}

              {active ? (
                <div className="border-t border-[rgb(var(--hairline))] pt-4">
                  <RegionDetail region={active} technical={technical} />
                </div>
              ) : (
                <p className="border-t border-[rgb(var(--hairline))] pt-4 text-[rgb(var(--muted))]">
                  Pick a region on the figure or from the list.
                </p>
              )}

              <p className="border-t border-[rgb(var(--hairline))] pt-3 text-[11px] text-[rgb(var(--muted))]">
                {note}
              </p>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
