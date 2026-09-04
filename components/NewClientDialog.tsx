"use client";

import { useState, type ReactElement } from "react";
import { Pencil } from "lucide-react";
import type { Client, TimeConfidence } from "@/types/astrology";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlaceSearch, type PickedPlace } from "@/components/PlaceSearch";
import { TimezoneCombobox } from "@/components/TimezoneCombobox";

/**
 * Client intake.
 *
 * Coordinates are derived from a place search rather than typed. Hand-entered
 * latitude and longitude were the slowest and most error-prone part of this
 * form, and a transposed digit or a dropped minus sign moves the birth across
 * the planet without looking wrong.
 *
 * They remain editable behind a toggle, because a practitioner who has the exact
 * coordinates from a birth certificate should not be forced through a search.
 */
export function NewClientDialog({
  children,
  onCreated,
}: {
  children: ReactElement;
  onCreated: (c: Client) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [place, setPlace] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [timezone, setTimezone] = useState("");
  const [manualCoords, setManualCoords] = useState(false);
  const [confidence, setConfidence] = useState<TimeConfidence>("exact");

  function reset() {
    setPlace("");
    setLatitude("");
    setLongitude("");
    setTimezone("");
    setManualCoords(false);
    setConfidence("exact");
    setError(null);
  }

  function pick(p: PickedPlace) {
    setPlace(p.label.split(",").slice(0, 3).join(",").trim());
    setLatitude(p.latitude.toFixed(6));
    setLongitude(p.longitude.toFixed(6));
    /* Only filled for single-zone countries. Elsewhere the picker decides,
       because guessing wrong shifts the ascendant by hours. */
    if (p.timezone) setTimezone(p.timezone);
  }

  async function save(form: HTMLFormElement) {
    if (!latitude || !longitude) {
      setError("Pick a place, or enter coordinates by hand.");
      return;
    }
    if (!timezone) {
      setError(
        "Choose a time zone. Without it the birth moment cannot be resolved.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
          dob: data.dob,
          birthTime: data.birthTime,
          birthPlace: place,
          latitude: Number(latitude),
          longitude: Number(longitude),
          timezone,
          timeConfidence: confidence,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(
          payload.detail ?? payload.error ?? "The client could not be saved.",
        );
      }

      onCreated(await res.json());
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saving failed.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "data w-full rounded border border-[rgb(var(--hairline))] bg-transparent px-2 py-1.5 text-[rgb(var(--ivory))]";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
      disablePointerDismissal
    >
      <DialogTrigger render={children} />

      <DialogContent className="panel sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[rgb(var(--ivory))]">
            Add a client
          </DialogTitle>
        </DialogHeader>

        <p className="text-[rgb(var(--muted))]">
          Birth time drives the ascendant, and the ascendant drives every house
          in the chart. If the time is uncertain, record it anyway and mark it
          below.
        </p>

        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save(e.currentTarget);
          }}
        >
          <div>
            <label htmlFor="fullName" className="eyebrow mb-1 block">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="dob" className="eyebrow mb-1 block">
                Date of birth
              </label>
              <input
                id="dob"
                name="dob"
                type="date"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="birthTime" className="eyebrow mb-1 block">
                Time of birth
              </label>
              <input
                id="birthTime"
                name="birthTime"
                type="time"
                required
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <span className="eyebrow mb-1 block">
              How reliable is that time?
            </span>
            <div className="flex gap-1">
              {(["exact", "approximate", "unknown"] as TimeConfidence[]).map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setConfidence(c)}
                    className="data rounded border px-2 py-0.5 text-[11px] capitalize"
                    style={{
                      borderColor:
                        confidence === c
                          ? "rgb(var(--brass))"
                          : "rgb(var(--hairline))",
                      color:
                        confidence === c
                          ? "rgb(var(--brass))"
                          : "rgb(var(--muted))",
                    }}
                  >
                    {c}
                  </button>
                ),
              )}
            </div>
          </div>

          <div>
            <label className="eyebrow mb-1 block">Place of birth</label>
            <PlaceSearch onPick={pick} />

            {place && (
              <p className="data mt-1 text-[10px] text-[rgb(var(--muted))]">
                {place}
              </p>
            )}

            <div className="mt-1.5 flex items-center gap-2">
              {!manualCoords ? (
                <>
                  <span className="data text-[11px] text-[rgb(var(--ivory))]">
                    {latitude && longitude
                      ? `${latitude}, ${longitude}`
                      : "No coordinates yet"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setManualCoords(true)}
                    className="data flex items-center gap-1 text-[10px] text-[rgb(var(--muted))] hover:text-[rgb(var(--brass))]"
                  >
                    <Pencil className="h-3 w-3" /> enter by hand
                  </button>
                </>
              ) : (
                <div className="grid w-full grid-cols-2 gap-2">
                  <input
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="Latitude"
                    inputMode="decimal"
                    className={inputClass}
                  />
                  <input
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="Longitude"
                    inputMode="decimal"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="eyebrow mb-1 block">Time zone</label>
            <TimezoneCombobox
              name="timezone"
              value={timezone}
              onChange={setTimezone}
            />
          </div>

          {error && <p className="text-[rgb(var(--vermilion))]">{error}</p>}

          <Button type="submit" disabled={saving} className="mt-3 w-full py-5">
            {saving ? "Saving" : "Save client"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
