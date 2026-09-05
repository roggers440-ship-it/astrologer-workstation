"use client";

import { Fragment, useState, type ReactElement } from "react";
import { Check, ChevronDown, ChevronRight, Pencil, X } from "lucide-react";
import type { Client } from "@/types/astrology";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Every client, with the full record behind an expandable row.
 *
 * Contact is editable here and nowhere else. It is deliberately absent from the
 * intake form: birth data is what a consultation needs and a phone number is not,
 * so asking for it up front adds friction to the only screen that must be quick.
 *
 * Birth fields are read-only in this table. Editing a birth time invalidates
 * every chart, dasha tree and reading derived from it, so that belongs behind a
 * deliberate recalculation rather than an inline edit that looks harmless.
 */

function ContactCell({
  client,
  onSaved,
}: {
  client: Client;
  onSaved: (updated: Client) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(client.contact ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    setSaving(true);
    setError(false);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: value.trim() }),
      });
      if (!res.ok) throw new Error();
      onSaved(await res.json());
      setEditing(false);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group flex items-center gap-1.5 text-left"
        aria-label={`Edit contact for ${client.fullName}`}
      >
        <span
          className={
            client.contact
              ? "data text-[rgb(var(--ivory))]"
              : "text-[rgb(var(--muted))]"
          }
        >
          {client.contact ?? "Add"}
        </span>
        <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder="Phone or email"
        className="data w-40 rounded border px-1.5 py-0.5 text-[11px] text-[rgb(var(--ivory))]"
        style={{
          borderColor: error ? "rgb(var(--vermilion))" : "rgb(var(--hairline))",
          background: "transparent",
        }}
      />
      <Button
        variant="outline"
        size="icon-xs"
        onClick={save}
        disabled={saving}
        aria-label="Save contact"
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        variant="outline"
        size="icon-xs"
        onClick={() => setEditing(false)}
        aria-label="Cancel"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="eyebrow block">{label}</span>
      <span className="data text-[rgb(var(--ivory))]">{value}</span>
    </div>
  );
}

export function ClientTableDialog({
  clients,
  onUpdated,
  onSelect,
  children,
}: {
  clients: Client[];
  onUpdated: (client: Client) => void;
  onSelect: (client: Client) => void;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = clients.filter((c) =>
    [c.fullName, c.birthPlace, c.contact]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setExpanded(null);
          setQuery("");
        }
      }}
    >
      <DialogTrigger render={children} />

      <DialogContent className="panel flex h-[88vh] min-w-[85vw] max-w-[1200px] flex-col shadow-xl p-0">
        <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-[rgb(var(--hairline))] px-4 py-3 ">
          <DialogTitle className="text-[rgb(var(--ivory))]">
            All clients
            <span className="data ml-2 text-[11px] text-[rgb(var(--muted))]">
              {clients.length}
            </span>
          </DialogTitle>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, place or contact"
            aria-label="Search clients"
            className="data w-64 mr-10 rounded border border-[rgb(var(--hairline))] bg-transparent px-2 py-1 text-[11px] text-[rgb(var(--ivory))] placeholder:text-[rgb(var(--muted))]"
          />
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-[rgb(var(--panel))]">
              <tr className="border-b border-[rgb(var(--hairline))]">
                <th className="w-8" />
                <th className="eyebrow px-3 py-2">Name</th>
                <th className="eyebrow px-3 py-2">Born</th>
                <th className="eyebrow px-3 py-2">Place</th>
                <th className="eyebrow px-3 py-2">Contact</th>
                <th className="w-20" />
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-[rgb(var(--muted))]"
                  >
                    {clients.length === 0
                      ? "No clients yet."
                      : "Nothing matches that search."}
                  </td>
                </tr>
              )}

              {filtered.map((c) => {
                const isOpen = expanded === c.id;
                return (
                  /* The key belongs on the fragment - two sibling rows per client
                     means React cannot infer it from either one. */
                  <Fragment key={c.id}>
                    <tr
                      className="border-b cursor-pointer border-[rgb(var(--hairline))] hover:bg-[rgb(var(--hairline))]/25"
                      onClick={() => setExpanded(isOpen ? null : c.id)}
                    >
                      <td className="px-1">
                        <button
                          aria-expanded={isOpen}
                          aria-label={`Full record for ${c.fullName}`}
                          className="p-2 cursor-pointer text-[rgb(var(--muted))]"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-[rgb(var(--ivory))]">
                        {c.fullName}
                      </td>
                      <td className="data px-3 py-2 text-[11px] text-[rgb(var(--muted))]">
                        {c.dob} {c.birthTime}
                      </td>
                      <td className="px-3 py-2 text-[rgb(var(--muted))]">
                        {c.birthPlace || "\u2014"}
                      </td>
                      <td className="px-3 py-2">
                        <ContactCell client={c} onSaved={onUpdated} />
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            onSelect(c);
                            setOpen(false);
                          }}
                        >
                          Load
                        </Button>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="border-b border-[rgb(var(--hairline))]">
                        <td />
                        <td
                          colSpan={5}
                          className="px-3 pb-4 pt-1 bg-slate-800 "
                        >
                          <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                            <Field label="Date of birth" value={c.dob} />
                            <Field label="Time of birth" value={c.birthTime} />
                            <Field
                              label="Time confidence"
                              value={c.timeConfidence ?? "exact"}
                            />
                            <Field
                              label="Birth place"
                              value={c.birthPlace || "\u2014"}
                            />
                            <Field
                              label="Latitude"
                              value={c.latitude.toFixed(6)}
                            />
                            <Field
                              label="Longitude"
                              value={c.longitude.toFixed(6)}
                            />
                            <Field label="Time zone" value={c.timezone} />
                            <Field
                              label="Contact"
                              value={c.contact ?? "\u2014"}
                            />
                            <Field
                              label="Added"
                              value={new Date(c.createdAt).toLocaleDateString()}
                            />
                          </div>

                          {(c.timeConfidence ?? "exact") !== "exact" && (
                            <p className="mt-3 border-l-2 border-[rgb(var(--vermilion))] pl-2 text-[11px] text-[rgb(var(--muted))]">
                              The birth time is recorded as {c.timeConfidence}.
                              Divisional charts below D9 are not safe to read
                              for this client until it is confirmed.
                            </p>
                          )}

                          <p className="data mt-3 text-[10px] text-[rgb(var(--muted))]">
                            Birth fields are read-only here. Changing them
                            invalidates every chart and reading already derived
                            from them.
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
