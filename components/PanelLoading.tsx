'use client';

import { Loader2 } from 'lucide-react';

/**
 * A panel waiting on the server.
 *
 * Computing a chart takes a second or two - ephemeris, dasha tree, twelve
 * houses, every topic. Without this the panels keep showing the previous
 * client's reading while the new one loads, which is worse than showing
 * nothing: it is showing the wrong person's chart with the right person's name
 * above it.
 */
export function PanelLoading({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
      <Loader2 className="h-4 w-4 animate-spin text-[rgb(var(--brass))]" />
      <p className="data text-[11px] text-[rgb(var(--muted))]">{label}</p>
    </div>
  );
}
