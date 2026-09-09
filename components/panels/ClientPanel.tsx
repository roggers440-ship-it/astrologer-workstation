"use client";

import { useState } from "react";
import {
  Clock3,
  Grid3x3,
  HeartPulse,
  History,
  Maximize2,
  Minimize2,
  Plus,
  Settings,
  Table2,
  UserRound,
} from "lucide-react";
import type { Varga } from "@/types/astrology";
import { useWorkstation } from "@/store/chart-store";
import { NorthIndianChart } from "@/components/NorthIndianChart";
import { CheatSheetTooltip, GLOSSARY } from "@/components/CheatSheetTooltip";
import { CHART_TABS, VARGA_LABEL } from "@/lib/varga";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NewClientDialog } from "@/components/NewClientDialog";
import { ClientTableDialog } from "@/components/ClientTableDialog";

import { MedicalDialog } from "@/components/medical/MedicalDialog";
import { HouseAnalysisDialog } from "@/components/HouseAnalysisDialog";
import { BirthTimeDialog } from "@/components/BirthTimeDialog";
import { PlanBadge } from "@/components/PlanBadge";
import { PanelLoading } from "@/components/PanelLoading";
import { PanelEmpty } from "../PanelEmpty";

function DashaProgress() {
  const reading = useWorkstation((s) => s.reading);
  const period = reading?.currentPeriod;

  /* Absent rather than empty without the timing entitlement - the server does not
     send it, so there is nothing here to reveal. */
  if (!period) return null;

  const rows = [
    {
      term: "mahadasha" as const,
      label: "Mahadasha",
      lord: period.major,
      ends: period.majorEnds,
    },
    ...(period.sub
      ? [
          {
            term: "antardasha" as const,
            label: "Antardasha",
            lord: period.sub,
            ends: period.subEnds,
          },
        ]
      : []),
    ...(period.subSub
      ? [
          {
            term: "pratyantardasha" as const,
            label: "Pratyantardasha",
            lord: period.subSub,
            ends: undefined,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-2 border-t border-[rgb(var(--hairline))] pt-3">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-baseline justify-between gap-2"
        >
          <CheatSheetTooltip {...GLOSSARY[r.term]}>
            <span className="eyebrow">{r.label}</span>
          </CheatSheetTooltip>
          <span className="data text-[rgb(var(--brass))]">{r.lord}</span>
          {r.ends && (
            <span className="data text-[10px] text-[rgb(var(--muted))]">
              to {r.ends}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function HistoryDrawer() {
  const { client, notes, setNotes } = useWorkstation();

  async function open() {
    if (!client) return;
    const res = await fetch(`/api/clients/${client.id}/notes`);
    if (res.ok) setNotes(await res.json());
  }

  return (
    <Sheet onOpenChange={(o) => o && open()}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start gap-2"
            disabled={!client}
          />
        }
      >
        <History className="h-3.5 w-3.5" /> Past sessions
      </SheetTrigger>

      <SheetContent side="left" className="panel w-[420px]">
        <SheetHeader>
          <SheetTitle className="text-[rgb(var(--ivory))]">
            {client?.fullName ?? "Session history"}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="mt-4 h-[calc(100vh-8rem)] pr-3">
          {notes.length === 0 ? (
            <p className="text-[rgb(var(--muted))]">
              No sessions recorded yet. Notes saved after a consultation appear
              here, newest first.
            </p>
          ) : (
            <ol className="space-y-4">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="border-l-2 border-[rgb(var(--hairline))] pl-3"
                >
                  <div className="data text-[11px] text-[rgb(var(--brass))]">
                    {new Date(n.sessionDate).toLocaleDateString()}
                  </div>
                  <p className="mt-1">{n.summary}</p>
                  {n.clientConfirmed && (
                    <p className="mt-2 text-[rgb(var(--muted))]">
                      <span className="eyebrow block">Client confirmed</span>
                      {n.clientConfirmed}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function ClientPanel() {
  /* The client list comes from the store so the splash screen can wait on it.
     A component cannot be waited on by something rendered above it. */
  const {
    client,
    natal,
    reading,
    activeVarga,
    setVarga,
    loadChart,
    status,
    error,
    clients,
    setClients,
  } = useWorkstation();
  console.log(client);
  /*
   * The dasha ring is drawn from the gated reading rather than recomputed here.
   * Without the timing entitlement the server sends no dasha tree at all, so
   * there is nothing to derive it from - which is the point.
   */
  const active = reading?.currentPeriod
    ? {
        maha: { lord: reading.currentPeriod.major },
        antar: reading.currentPeriod.sub
          ? { lord: reading.currentPeriod.sub }
          : undefined,
        mahaProgress: 0,
      }
    : null;

  /*
   * Maximised means the chart fills this panel, not the device. Everything else
   * in the column is hidden rather than scrolled past, so the chart can claim the
   * full height - which is the only way a D60 becomes legible at this width.
   */
  const [chartMaximised, setChartMaximised] = useState(false);

  const chartToggle = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={chartMaximised ? "Restore panel" : "Maximise chart"}
      onClick={() => setChartMaximised((v) => !v)}
    >
      {chartMaximised ? (
        <Minimize2 className="h-3.5 w-3.5" />
      ) : (
        <Maximize2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );

  const vargaTabs = natal && (
    <Tabs value={activeVarga} onValueChange={(v) => setVarga(v as Varga)}>
      <TabsList className="grid w-full grid-cols-4 bg-transparent">
        {CHART_TABS.map((v) => (
          <TabsTrigger key={v} value={v} className="data text-[11px]">
            {v}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  if (natal && chartMaximised) {
    return (
      <section className="panel flex h-full w-full flex-col gap-3 overflow-hidden p-3">
        <header className="flex items-center justify-between gap-2">
          <span className="truncate text-[rgb(var(--ivory))]">
            {client?.fullName}
          </span>
          {chartToggle}
        </header>

        {vargaTabs}

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <NorthIndianChart
            chart={natal.charts[activeVarga]}
            active={active}
            className="h-full w-full"
          />
        </div>

        <p className="data shrink-0 text-center text-[10px] text-[rgb(var(--muted))]">
          {VARGA_LABEL[activeVarga]} &middot;{" "}
          {natal.charts[activeVarga].ascendantSign} rising
        </p>
      </section>
    );
  }

  return (
    <section className="panel flex h-full w-full flex-col gap-3 overflow-hidden p-3">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4">
          <header className="flex items-center justify-between gap-2">
            <PlanBadge />
            <div className="flex shrink-0 items-center gap-1">
              {/* Settings rather than a bare sign-out icon. An unlabelled exit next
              to New and View all is a mis-click waiting to happen, and it was
              also the only route to billing. */}
              <a href="/settings" aria-label="Account and plan">
                <Button variant="ghost" size="icon-sm">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </a>

              <ClientTableDialog
                clients={clients}
                onUpdated={(updated) =>
                  setClients((prev) =>
                    prev.map((c) => (c.id === updated.id ? updated : c)),
                  )
                }
                onSelect={loadChart}
              >
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Table2 className="h-3.5 w-3.5" /> View all
                </Button>
              </ClientTableDialog>

              <NewClientDialog
                onCreated={(c) => {
                  setClients((prev) => [c, ...prev]);
                  loadChart(c);
                }}
              >
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> New
                </Button>
              </NewClientDialog>
            </div>
          </header>

          <label className="sr-only" htmlFor="client-select">
            Select a client
          </label>
          <select
            id="client-select"
            className="panel data w-full rounded px-2 py-1.5 text-[rgb(var(--ivory))]"
            value={client?.id ?? ""}
            onChange={(e) => {
              const next = clients?.find((c) => c.id === e.target.value);
              if (next) loadChart(next);
            }}
          >
            <option value="">Choose a client</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>

          {status === "error" && (
            <p className="text-[rgb(var(--vermilion))]">
              {error} Check the birth time and place, then load the client
              again.
            </p>
          )}

          {status === "loading" && (
            <div className="py-10 h-full flex flex-1 flex-col items-center justify-center gap-2 text-center text-[rgb(var(--muted))]">
              <PanelLoading label="Generating Birth Chart" />
            </div>
          )}

          {!natal && status !== "loading" && (
            <div className="min-h-[280px] flex-1">
              <PanelEmpty
                mark="chart"
                title="No chart yet"
                line="Pick a client above. Everything else on screen fills in from here."
              />
            </div>
          )}
          {natal && (
            <>
              <div className="data flex items-center gap-2 text-[11px] text-[rgb(var(--muted))]">
                <CheatSheetTooltip {...GLOSSARY.ayanamsha}>
                  <span>{natal.ayanamsha}</span>
                </CheatSheetTooltip>
                {natal.isApproximate && (
                  <Badge className="border-[rgb(var(--vermilion))] bg-transparent text-[rgb(var(--vermilion))]">
                    Approximate positions
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">{vargaTabs}</div>
                {chartToggle}
              </div>

              <NorthIndianChart
                chart={natal.charts[activeVarga]}
                active={active}
                className="w-full shrink-0"
              />

              <p className="data text-center text-[10px] text-[rgb(var(--muted))]">
                {VARGA_LABEL[activeVarga]} &middot;{" "}
                {natal.charts[activeVarga].ascendantSign} rising
              </p>

              {/*
            A fast-moving lagna means the recorded birth time, not the ephemeris,
            is the limiting factor. Half a degree per minute is roughly one D60
            division per minute, so the warning escalates with the varga on screen.
          */}
              {natal.ascendantDriftPerMinute > 0.25 && (
                <p className="border-l-2 border-[rgb(var(--vermilion))] pl-2 text-[11px] text-[rgb(var(--muted))]">
                  The lagna moves {natal.ascendantDriftPerMinute.toFixed(2)}
                  &deg; per minute here.
                  {activeVarga === "D60"
                    ? " At that rate a D60 division passes in about a minute - treat this chart as indicative only unless the birth time is exact to the second."
                    : " A minute of error in the birth time shifts the rising degree noticeably. Worth confirming the time before reading fine divisions."}
                </p>
              )}

              <DashaProgress />

              <div className="flex items-center gap-1">
                <HistoryDrawer />
                <BirthTimeDialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start gap-2"
                  >
                    <Clock3 className="h-3.5 w-3.5" /> Birth time
                  </Button>
                </BirthTimeDialog>

                <HouseAnalysisDialog
                  chart={natal.charts.D1}
                  reading={reading!}
                  clientId={client!.id}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start gap-2"
                  >
                    <Grid3x3 className="h-3.5 w-3.5" /> Houses
                  </Button>
                </HouseAnalysisDialog>
                <MedicalDialog
                  regions={reading!.medical}
                  note={reading!.medicalNote}
                  depth={reading!.entitlements.depth}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start gap-2"
                  >
                    <HeartPulse className="h-3.5 w-3.5" /> Body map
                  </Button>
                </MedicalDialog>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
