"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useWorkstation } from "@/store/chart-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Life events, and the birth time they imply.
 *
 * The events are worth recording on their own - they are the calibration record
 * for everything else the application claims. Rectification is what they make
 * possible: search candidate birth times and score each by how well its dasha
 * explains what actually happened.
 */

const KINDS: { value: string; label: string }[] = [
  { value: "marriage", label: "Marriage" },
  { value: "engagement", label: "Engagement" },
  { value: "separation", label: "Separation or divorce" },
  { value: "child_born", label: "Child born" },
  { value: "bereavement", label: "Death in the family" },
  { value: "job_start", label: "Started a job" },
  { value: "job_loss", label: "Lost a job" },
  { value: "promotion", label: "Promotion" },
  { value: "business_start", label: "Started a business" },
  { value: "relocation", label: "Moved house" },
  { value: "went_abroad", label: "Went abroad" },
  { value: "education_start", label: "Started a course" },
  { value: "graduation", label: "Graduated" },
  { value: "illness", label: "Serious illness" },
  { value: "accident", label: "Accident" },
  { value: "property", label: "Bought property" },
  { value: "windfall", label: "Unexpected money" },
  { value: "loss", label: "Major loss" },
];

interface Event {
  id: string;
  kind: string;
  occurred_on: string;
  precision: "day" | "month" | "year";
  note: string | null;
}

interface Candidate {
  time: string;
  offsetMinutes: number;
  lagna: string;
  lagnaDegree: number;
  moonSign: string;
  moonNakshatraChanged: boolean;
  score: number;
}

interface Result {
  recorded: string;
  best: Candidate | null;
  candidates: Candidate[];
  separation: number;
  verdict: string;
  usable: boolean;
}

const label = (kind: string) =>
  KINDS.find((k) => k.value === kind)?.label ?? kind;

export function BirthTimeDialog({ children }: { children: ReactElement }) {
  const client = useWorkstation((s) => s.client);
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [kind, setKind] = useState("marriage");
  const [date, setDate] = useState("");
  const [precision, setPrecision] = useState<"day" | "month" | "year">("day");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!client) return;
    const res = await fetch(`/api/clients/${client.id}/events`);
    if (res.ok) setEvents(await res.json());
  }

  useEffect(() => {
    if (open) load();
  }, [open, client]);

  async function add() {
    if (!client || !date) return;
    setBusy(true);
    await fetch(`/api/clients/${client.id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, occurredOn: date, precision }),
    });
    setDate("");
    setResult(null);
    await load();
    setBusy(false);
  }

  async function remove(id: string) {
    if (!client) return;
    await fetch(`/api/clients/${client.id}/events?id=${id}`, {
      method: "DELETE",
    });
    setResult(null);
    await load();
  }

  async function search() {
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${client.id}/rectify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windowMinutes: 60, stepMinutes: 2 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The search failed.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!client) return children;

  const inputClass =
    "data rounded border border-[rgb(var(--hairline))] bg-transparent px-2 py-1.5 text-[rgb(var(--ivory))]";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />

      <DialogContent className="panel flex h-[88vh] min-w-[700px] max-w-[900px] flex-col p-0">
        <DialogHeader className="border-b border-[rgb(var(--hairline))] px-4 py-3">
          <DialogTitle className="text-[rgb(var(--ivory))]">
            Birth time &middot; recorded as {client.birthTime}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 p-5">
            <section>
              <h3 className="eyebrow mb-1">What actually happened</h3>
              <p className="mb-3 text-[rgb(var(--muted))]">
                Dated events, as precisely as they are known. These are worth
                recording on their own - they are what tells you whether a
                reading was calibrated for this person - and they are what makes
                the search below possible.
              </p>

              <div className="flex flex-wrap items-end gap-2">
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className={inputClass}
                >
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />

                <div className="flex gap-1">
                  {(["day", "month", "year"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrecision(p)}
                      title={`Known to the ${p}`}
                      className="data rounded border px-2 py-1 text-[11px] capitalize"
                      style={{
                        borderColor:
                          precision === p
                            ? "rgb(var(--brass))"
                            : "rgb(var(--hairline))",
                        color:
                          precision === p
                            ? "rgb(var(--brass))"
                            : "rgb(var(--muted))",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={!date || busy}
                  onClick={add}
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>

              <ul className="mt-4 divide-y divide-[rgb(var(--hairline))]">
                {events.length === 0 && (
                  <li className="py-2 text-[rgb(var(--muted))]">
                    Nothing recorded yet.
                  </li>
                )}
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <span className="text-[rgb(var(--ivory))]">
                      {label(e.kind)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="data text-[11px] text-[rgb(var(--muted))]">
                        {e.occurred_on}
                      </span>
                      {e.precision !== "day" && (
                        <Badge className="border-[rgb(var(--hairline))] bg-transparent text-[10px] text-[rgb(var(--muted))]">
                          to the {e.precision}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="icon-xs"
                        aria-label="Remove"
                        onClick={() => remove(e.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="border-t border-[rgb(var(--hairline))] pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="eyebrow mb-1">Which birth time fits</h3>
                  <p className="text-[rgb(var(--muted))]">
                    Searches an hour either side and scores each minute by how
                    well its periods explain the events above.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 gap-1.5"
                  disabled={busy}
                  onClick={search}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  Search
                </Button>
              </div>

              {error && <p className="text-[rgb(var(--vermilion))]">{error}</p>}

              {result && (
                <>
                  <p
                    className="border-l-2 pl-3 text-[rgb(var(--ivory))]"
                    style={{
                      borderColor:
                        result.separation >= 0.15
                          ? "rgb(var(--brass))"
                          : "rgb(var(--vermilion))",
                    }}
                  >
                    {result.verdict}
                  </p>

                  {result.candidates.length > 0 && (
                    <table className="mt-4 w-full text-left">
                      <thead>
                        <tr className="border-b border-[rgb(var(--hairline))]">
                          <th className="eyebrow py-1">Time</th>
                          <th className="eyebrow py-1">Score</th>
                          <th className="eyebrow py-1">Rising</th>
                          <th className="eyebrow py-1">Moon</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.candidates.map((c) => (
                          <tr
                            key={c.offsetMinutes}
                            className="border-b border-[rgb(var(--hairline))]"
                          >
                            <td className="data py-1.5 text-[rgb(var(--ivory))]">
                              {c.time}
                              {c.offsetMinutes === 0 && (
                                <span className="ml-2 text-[10px] text-[rgb(var(--muted))]">
                                  as recorded
                                </span>
                              )}
                            </td>
                            <td
                              className="data py-1.5"
                              style={{ color: "rgb(var(--brass))" }}
                            >
                              {c.score}
                            </td>
                            <td className="data py-1.5 text-[rgb(var(--muted))]">
                              {c.lagna} {c.lagnaDegree}&deg;
                            </td>
                            <td className="data py-1.5 text-[rgb(var(--muted))]">
                              {c.moonSign}
                              {c.moonNakshatraChanged && (
                                <span className="ml-1 text-[rgb(var(--vermilion))]">
                                  nakshatra shifts
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <p className="mt-3 text-[11px] text-[rgb(var(--muted))]">
                    Nothing here changes the saved birth time. Rectification is
                    a judgement to weigh against what the family remembers, not
                    an answer to accept - and a chart can be genuinely
                    insensitive across an hour, in which case the honest result
                    is that there is no result.
                  </p>
                </>
              )}
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
