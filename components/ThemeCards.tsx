'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

/**
 * Theme, chosen by looking at it.
 *
 * Two preview cards rather than a toggle. A switch labelled "dark mode" makes
 * someone imagine the result; a card painted in the actual palette shows it, and
 * the choice takes no thought.
 *
 * The previews are hardcoded rather than variable-driven on purpose - each card
 * must show its own theme while the page is still in the other one.
 */

const THEMES = [
  {
    id: 'dark' as const,
    label: 'Dark',
    note: 'For long sessions at a desk.',
    ground: '#0A0F1E',
    panel: '#121A2E',
    line: '#26314F',
    text: '#E9E4D6',
    dim: '#8A94B0',
    accent: '#C89B3C',
  },
  {
    id: 'light' as const,
    label: 'Light',
    note: 'For daylight, and for phones.',
    ground: '#F4F1E8',
    panel: '#FDFBF6',
    line: '#D6D0C1',
    text: '#1A2030',
    dim: '#6A7082',
    accent: '#966C18',
  },
];

export function ThemeCards({ initial = 'dark' }: { initial?: 'dark' | 'light' }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(initial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* private browsing; the account copy still holds it */
    }
  }, [theme]);

  function choose(next: 'dark' | 'light') {
    setTheme(next);
    /* Not awaited. A theme that waits on a round trip before changing feels
       broken, and the local copy is authoritative for this session anyway. */
    fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {THEMES.map((t) => {
        const chosen = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => choose(t.id)}
            aria-pressed={chosen}
            className="rounded border p-2 text-left transition-all"
            style={{
              borderColor: chosen ? 'rgb(var(--brass))' : 'rgb(var(--hairline))',
              borderWidth: chosen ? 2 : 1,
            }}
          >
            {/* A miniature of the workstation: ground, panel, a rule, a line of
                text and the one accent colour. Enough to recognise. */}
            <span
              className="block rounded p-2"
              style={{ background: t.ground }}
              aria-hidden
            >
              <span className="block rounded p-2" style={{ background: t.panel, border: `1px solid ${t.line}` }}>
                <span className="mb-1.5 block h-1 w-8 rounded-full" style={{ background: t.accent }} />
                <span className="mb-1 block h-1 w-full rounded-full" style={{ background: t.text, opacity: 0.7 }} />
                <span className="mb-1 block h-1 w-4/5 rounded-full" style={{ background: t.dim, opacity: 0.6 }} />
                <span className="block h-1 w-2/3 rounded-full" style={{ background: t.dim, opacity: 0.4 }} />
              </span>
            </span>

            <span className="mt-2 flex items-center gap-1.5">
              <span className="text-[rgb(var(--ivory))]">{t.label}</span>
              {chosen && <Check className="h-3 w-3 text-[rgb(var(--brass))]" />}
            </span>
            <span className="block text-[11px] text-[rgb(var(--muted))]">{t.note}</span>
          </button>
        );
      })}
    </div>
  );
}
