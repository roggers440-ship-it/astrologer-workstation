"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

/**
 * IANA time zone picker.
 *
 * The list comes from Intl.supportedValuesOf, so it is the runtime's own zone
 * database rather than a hardcoded one that drifts. Zone names matter more than
 * they look: the app resolves historical daylight-saving rules from them, so
 * "Asia/Kolkata" and a fixed +05:30 offset are not interchangeable for a birth
 * decades ago.
 */
const ALIASES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Europe/Kiev": "Europe/Kyiv",
  "Asia/Dacca": "Asia/Dhaka",
};

function allZones(): string[] {
  let zones: string[] = [];
  try {
    const fn = (
      Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf;
    if (fn) zones = fn("timeZone");
  } catch {
    /* falls through */
  }

  if (zones.length === 0) zones = Object.values(ALIASES);

  // Ensure the modern spelling is present even when the runtime lists the old one.
  const merged = new Set(zones.map((z) => ALIASES[z] ?? z));
  return [...merged].sort();
}

export function TimezoneCombobox({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (zone: string) => void;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const zones = useMemo(allZones, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "_");
    if (!q) return zones.slice(0, 60);
    return zones.filter((z) => z.toLowerCase().includes(q)).slice(0, 60);
  }, [zones, query]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  /* Current offset, so a wrong pick is visible before it silently moves the
     ascendant by hours. */
  const offset = useMemo(() => {
    if (!value) return null;
    try {
      return (
        new Intl.DateTimeFormat("en", {
          timeZone: value,
          timeZoneName: "shortOffset",
        })
          .formatToParts(new Date())
          .find((p) => p.type === "timeZoneName")?.value ?? null
      );
    } catch {
      return null;
    }
  }, [value]);

  return (
    <div ref={box} className="relative">
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="data flex w-full items-center justify-between rounded border border-[rgb(var(--hairline))] px-2 py-1.5 text-left text-[rgb(var(--ivory))]"
      >
        <span className={value ? "" : "text-[rgb(var(--muted))]"}>
          {value || "Choose a time zone"}
          {offset && (
            <span className="ml-2 text-[10px] text-[rgb(var(--muted))]">
              {offset}
            </span>
          )}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--muted))]" />
      </button>

      {open && (
        <div className="panel absolute z-50 mt-1 w-full rounded border border-[rgb(var(--hairline))]">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to filter, e.g. kathmandu"
            aria-label="Filter time zones"
            className="data w-full border-b border-[rgb(var(--hairline))] bg-transparent px-2 py-1.5 text-[rgb(var(--ivory))] outline-none placeholder:text-[rgb(var(--muted))]"
          />

          <ul className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-2 py-2 text-[rgb(var(--muted))]">
                No zone matches that.
              </li>
            )}
            {filtered.map((z) => (
              <li key={z}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(z);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="data flex w-full items-center justify-between px-2 py-1 text-left text-[rgb(var(--ivory))] hover:bg-[rgb(var(--hairline))]/40"
                >
                  {z}
                  {z === value && (
                    <Check className="h-3 w-3 text-[rgb(var(--brass))]" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
