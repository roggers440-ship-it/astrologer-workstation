'use client';

import { useEffect, useMemo, useState } from 'react';
import { Grid3x3, HeartPulse, History, Maximize2, Minimize2, Plus, Table2, UserRound } from 'lucide-react';
import type { Client, Varga } from '@/types/astrology';
import { useWorkstation } from '@/store/chart-store';
import { NorthIndianChart } from '@/components/NorthIndianChart';
import { CheatSheetTooltip, GLOSSARY } from '@/components/CheatSheetTooltip';
import { findActive } from '@/lib/dasha';
import { CHART_TABS, VARGA_LABEL } from '@/lib/varga';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { NewClientDialog } from '@/components/NewClientDialog';
import { ClientTableDialog } from '@/components/ClientTableDialog';
import { MedicalDialog } from '@/components/medical/MedicalDialog';
import { HouseAnalysisDialog } from '@/components/HouseAnalysisDialog';



function DashaProgress() {
  const natal = useWorkstation((s) => s.natal);
  const active = useMemo(() => (natal ? findActive(natal.dashaTree) : null), [natal]);
  if (!active) return null;

  const rows = [
    { term: 'mahadasha' as const, label: 'Mahadasha', period: active.maha, pct: active.mahaProgress, days: active.daysRemainingMaha },
    ...(active.antar
      ? [{ term: 'antardasha' as const, label: 'Antardasha', period: active.antar, pct: active.antarProgress, days: active.daysRemainingAntar }]
      : []),
    ...(active.pratyantar
      ? [{ term: 'pratyantardasha' as const, label: 'Pratyantardasha', period: active.pratyantar, pct: active.pratyantarProgress, days: active.daysRemainingPratyantar }]
      : []),
  ];

  return (
    <div className="space-y-3 border-t border-[rgb(var(--hairline))] pt-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-baseline justify-between">
            <CheatSheetTooltip {...GLOSSARY[r.term]}>
              <span className="eyebrow">{r.label}</span>
            </CheatSheetTooltip>
            <span className="data text-[11px] text-[rgb(var(--muted))]">
              {r.days.toLocaleString()} days left
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="data w-16 text-[rgb(var(--brass))]">{r.period.lord}</span>
            <div
              className="h-1.5 flex-1 rounded-full bg-[rgb(var(--hairline))]"
              role="progressbar"
              aria-valuenow={Math.round(r.pct * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${r.label} completion`}
            >
              <div
                className="h-full rounded-full bg-[rgb(var(--brass))] transition-[width] duration-500"
                style={{ width: `${r.pct * 100}%` }}
              />
            </div>
            <span className="data w-9 text-right text-[11px]">{Math.round(r.pct * 100)}%</span>
          </div>

          <div className="data mt-1 text-[10px] text-[rgb(var(--muted))]">
            {new Date(r.period.start).toLocaleDateString()} &rarr; {new Date(r.period.end).toLocaleDateString()}
          </div>
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
        render={<Button variant="ghost" size="sm" className="flex-1 justify-start gap-2" disabled={!client} />}
      >
        <History className="h-3.5 w-3.5" /> Past sessions
      </SheetTrigger>

      <SheetContent side="left" className="panel w-[420px]">
        <SheetHeader>
          <SheetTitle className="text-[rgb(var(--ivory))]">{client?.fullName ?? 'Session history'}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="mt-4 h-[calc(100vh-8rem)] pr-3">
          {notes.length === 0 ? (
            <p className="text-[rgb(var(--muted))]">
              No sessions recorded yet. Notes saved after a consultation appear here, newest first.
            </p>
          ) : (
            <ol className="space-y-4">
              {notes.map((n) => (
                <li key={n.id} className="border-l-2 border-[rgb(var(--hairline))] pl-3">
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
  const { client, natal, yogas, activeVarga, setVarga, loadChart, status, error } = useWorkstation();
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => (r.ok ? r.json() : []))
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  const active = useMemo(() => (natal ? findActive(natal.dashaTree) : null), [natal]);

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
      aria-label={chartMaximised ? 'Restore panel' : 'Maximise chart'}
      onClick={() => setChartMaximised((v) => !v)}
    >
      {chartMaximised ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
    </Button>
  );

  const vargaTabs = natal && (
    <Tabs value={activeVarga} onValueChange={(v) => setVarga(v as Varga)}>
      <TabsList className="grid w-full grid-cols-4 bg-transparent">
        {CHART_TABS.map((v) => (
          <TabsTrigger key={v} value={v} className="data text-[11px]">{v}</TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  if (natal && chartMaximised) {
    return (
      <section className="panel flex h-full w-full flex-col gap-3 overflow-hidden p-3">
        <header className="flex items-center justify-between gap-2">
          <span className="truncate text-[rgb(var(--ivory))]">{client?.fullName}</span>
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
          {VARGA_LABEL[activeVarga]} &middot; {natal.charts[activeVarga].ascendantSign} rising
        </p>
      </section>
    );
  }

  return (
    <section className="panel flex h-full w-full flex-col gap-3 overflow-y-auto p-3">
      <header className="flex items-center justify-between">
        <span className="eyebrow">Who you are reading</span>
        <div className="flex items-center gap-1">
          <ClientTableDialog
            clients={clients}
            onUpdated={(updated) =>
              setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
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

      <label className="sr-only" htmlFor="client-select">Select a client</label>
      <select
        id="client-select"
        className="panel data w-full rounded px-2 py-1.5 text-[rgb(var(--ivory))]"
        value={client?.id ?? ''}
        onChange={(e) => {
          const next = clients.find((c) => c.id === e.target.value);
          if (next) loadChart(next);
        }}
      >
        <option value="">Choose a client</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.fullName}</option>
        ))}
      </select>

      {status === 'error' && (
        <p className="text-[rgb(var(--vermilion))]">
          {error} Check the birth time and place, then load the client again.
        </p>
      )}

      {!client && status !== 'loading' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-[rgb(var(--muted))]">
          <UserRound className="h-6 w-6" />
          <p>Pick a client to build the chart. Everything else on screen fills in from here.</p>
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
            {VARGA_LABEL[activeVarga]} &middot; {natal.charts[activeVarga].ascendantSign} rising
          </p>

          {/*
            A fast-moving lagna means the recorded birth time, not the ephemeris,
            is the limiting factor. Half a degree per minute is roughly one D60
            division per minute, so the warning escalates with the varga on screen.
          */}
          {natal.ascendantDriftPerMinute > 0.25 && (
            <p className="border-l-2 border-[rgb(var(--vermilion))] pl-2 text-[11px] text-[rgb(var(--muted))]">
              The lagna moves {natal.ascendantDriftPerMinute.toFixed(2)}&deg; per minute here.
              {activeVarga === 'D60'
                ? ' At that rate a D60 division passes in about a minute - treat this chart as indicative only unless the birth time is exact to the second.'
                : ' A minute of error in the birth time shifts the rising degree noticeably. Worth confirming the time before reading fine divisions.'}
            </p>
          )}

          <DashaProgress />

          <div className="flex items-center gap-1">
            <HistoryDrawer />
            <HouseAnalysisDialog natal={natal} yogas={yogas} clientId={client!.id}>
              <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2">
                <Grid3x3 className="h-3.5 w-3.5" /> Houses
              </Button>
            </HouseAnalysisDialog>
            <MedicalDialog natal={natal}>
              <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2">
                <HeartPulse className="h-3.5 w-3.5" /> Body map
              </Button>
            </MedicalDialog>
          </div>
        </>
      )}
    </section>
  );
}
