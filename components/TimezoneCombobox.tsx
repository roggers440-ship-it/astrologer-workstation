'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

/**
 * IANA time zone picker.
 *
 * The list comes from Intl.supportedValuesOf, so it is the runtime's own zone
 * database rather than a hardcoded one that drifts. Zone names matter more than
 * they look: the app resolves historical daylight-saving rules from them, so
 * "Asia/Kolkata" and a fixed +05:30 offset are not interchangeable for a birth
 * decades ago.
 */
function allZones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (fn) return fn('timeZone');
  } catch {
    /* falls through to the short list below */
  }
  return [
    'Asia/Kathmandu', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Karachi', 'Asia/Colombo',
    'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'Europe/Paris',
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Australia/Sydney', 'UTC',
  ];
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
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const zones = useMemo(allZones, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, '_');
    if (!q) return zones.slice(0, 60);
    return zones.filter((z) => z.toLowerCase().includes(q)).slice(0, 60);
  }, [zones, query]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  /*
   * Current offset, so a wrong pick is visible before it silently moves the
   * ascendant by hours.
   *
   * Computed in an effect rather than in a memo: new Date() during render is
   * impure, and a useMemo still runs in the render path. The offset only has to
   * be right when it is read, not on the first frame.
   */
  const [offset, setOffset] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return setOffset(null);
    try {
      setOffset(
        new Intl.DateTimeFormat('en', { timeZone: value, timeZoneName: 'shortOffset' })
          .formatToParts(new Date())
          .find((p) => p.type === 'timeZoneName')?.value ?? null,
      );
    } catch {
      setOffset(null);
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
        <span className={value ? '' : 'text-[rgb(var(--muted))]'}>
          {value || 'Choose a time zone'}
          {offset && <span className="ml-2 text-[10px] text-[rgb(var(--muted))]">{offset}</span>}
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
              <li className="px-2 py-2 text-[rgb(var(--muted))]">No zone matches that.</li>
            )}
            {filtered.map((z) => (
              <li key={z}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(z);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="data flex w-full items-center justify-between px-2 py-1 text-left text-[rgb(var(--ivory))] hover:bg-[rgb(var(--hairline))]/40"
                >
                  {z}
                  {z === value && <Check className="h-3 w-3 text-[rgb(var(--brass))]" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
