"use client";

import { useState } from "react";
import { NotebookPen } from "lucide-react";
import type { ConsultationNote } from "@/types/astrology";
import { useWorkstation } from "@/store/chart-store";
import { TAB_GROUPS, topicById } from "@/lib/topics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Closes the loop the timeline opens. The `Client confirmed` field is the one that
 * matters over time: it records what the client actually recognised, which is the
 * only evidence available that a reading was calibrated to this person rather than
 * agreeable in general. It is a separate field from the summary so it stays honest
 * - it is easy to write a summary that quietly absorbs a correction.
 */
export function ConsultationNoteComposer() {
  const { client, activeTab, hooks, notes, setNotes } = useWorkstation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const group = TAB_GROUPS.find((g) => g.key === activeTab)!;
  const discussed = group.topicIds.filter((id) =>
    hooks.some((h) => h.topicId === id),
  );
  const [selected, setSelected] = useState<number[]>(discussed);

  if (!client) return null;

  async function save(form: HTMLFormElement) {
    setSaving(true);
    setError(null);
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch(`/api/clients/${client!.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: data.summary,
          clientConfirmed: data.clientConfirmed || null,
          followUpAt: data.followUpAt || null,
          topicIds: selected,
        }),
      });
      if (!res.ok)
        throw new Error(
          "The note was not saved. Copy the text somewhere safe before closing this.",
        );

      const saved: ConsultationNote = await res.json();
      setNotes([saved, ...notes]);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saving failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 rounded-none border-t border-[rgb(var(--hairline))] py-3"
          />
        }
      >
        <NotebookPen className="h-3.5 w-3.5" /> Record this session
      </DialogTrigger>

      <DialogContent className="panel sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[rgb(var(--ivory))]">
            Session with {client.fullName}
          </DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save(e.currentTarget);
          }}
        >
          <div>
            <span className="eyebrow mb-1.5 block">Topics covered</span>
            <div className="flex flex-wrap gap-1.5">
              {group.topicIds.map((id) => {
                const on = selected.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setSelected((s) =>
                        on ? s.filter((x) => x !== id) : [...s, id],
                      )
                    }
                    className="data rounded border px-2 py-0.5 text-[11px]"
                    style={{
                      borderColor: on
                        ? "rgb(var(--brass))"
                        : "rgb(var(--hairline))",
                      color: on ? "rgb(var(--brass))" : "rgb(var(--muted))",
                    }}
                  >
                    {topicById(id)!.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="summary" className="eyebrow mb-1 block">
              What you told them
            </label>
            <textarea
              id="summary"
              name="summary"
              rows={4}
              required
              className="w-full rounded border border-[rgb(var(--hairline))] bg-transparent px-2 py-1.5 text-[rgb(var(--ivory))]"
            />
          </div>

          <div>
            <label htmlFor="clientConfirmed" className="eyebrow mb-1 block">
              What they confirmed or corrected
            </label>
            <textarea
              id="clientConfirmed"
              name="clientConfirmed"
              rows={3}
              placeholder="Which timeline years landed, which did not, anything they pushed back on."
              className="w-full rounded border border-[rgb(var(--hairline))] bg-transparent px-2 py-1.5 text-[rgb(var(--ivory))] placeholder:text-[rgb(var(--muted))]"
            />
          </div>

          <div>
            <label htmlFor="followUpAt" className="eyebrow mb-1 block">
              Follow up on
            </label>
            <input
              id="followUpAt"
              name="followUpAt"
              type="date"
              className="data rounded border border-[rgb(var(--hairline))] bg-transparent px-2 py-1.5 text-[rgb(var(--ivory))]"
            />
          </div>

          {error && <p className="text-[rgb(var(--vermilion))]">{error}</p>}

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Saving" : "Save note"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
