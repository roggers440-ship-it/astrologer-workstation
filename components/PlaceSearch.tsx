'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

export interface PickedPlace {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
}

/**
 * Search a place, get its coordinates.
 *
 * Typing latitude and longitude by hand is the worst part of intake: they are
 * long, easy to transpose, and a wrong sign puts the birth on the other side of
 * the planet without looking obviously wrong.
 *
 * Debounced at 600ms to stay inside Nominatim's one-request-per-second policy.
 */
export function PlaceSearch({ onPick }: { onPick: (place: PickedPlace) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch (e) {
        if (!controller.signal.aborted) setError('Lookup failed. Enter coordinates by hand below.');
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={box} className="relative">
      <div className="flex items-center gap-1.5 rounded border border-[rgb(var(--hairline))] px-2">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--muted))]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search a city, e.g. Kathmandu"
          aria-label="Search for the birth place"
          autoComplete="off"
          className="data w-full bg-transparent py-1.5 text-[rgb(var(--ivory))] outline-none placeholder:text-[rgb(var(--muted))]"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[rgb(var(--muted))]" />}
      </div>

      {error && <p className="mt-1 text-[11px] text-[rgb(var(--vermilion))]">{error}</p>}

      {open && results.length > 0 && (
        <ul className="panel absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded border border-[rgb(var(--hairline))]">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  onPick(r);
                  setQuery(r.label.split(',')[0]);
                  setOpen(false);
                }}
                className="w-full px-2 py-1.5 text-left hover:bg-[rgb(var(--hairline))]/40"
              >
                <span className="block text-[rgb(var(--ivory))]">{r.label}</span>
                <span className="data block text-[10px] text-[rgb(var(--muted))]">
                  {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                  {r.timezone && ` \u00b7 ${r.timezone}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
