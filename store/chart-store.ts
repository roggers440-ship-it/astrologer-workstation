'use client';

import { create } from 'zustand';
import type { Client, ConsultationNote, NatalChart, Varga } from '@/types/astrology';
import type { Reading } from '@/types/reading';
import type { TabKey } from '@/lib/topics';

interface WorkstationState {
  client: Client | null;
  /**
   * Positions only, used to draw the wheel. Interpretation no longer comes from
   * here - it comes from the server already filtered by plan, because anything
   * computed in the browser can be recomputed by the reader.
   */
  natal: NatalChart | null;
  reading: Reading | null;
  notes: ConsultationNote[];

  activeVarga: Varga;
  activeTab: TabKey;
  confidentialUnlocked: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;

  loadChart: (client: Client) => Promise<void>;
  setVarga: (v: Varga) => void;
  setTab: (t: TabKey) => void;
  unlockConfidential: (passphrase: string) => boolean;
  lockConfidential: () => void;
  setNotes: (notes: ConsultationNote[]) => void;
  clear: () => void;
}

export const useWorkstation = create<WorkstationState>((set) => ({
  client: null,
  natal: null,
  reading: null,
  notes: [],
  activeVarga: 'D1',
  activeTab: 'life',
  confidentialUnlocked: false,
  status: 'idle',
  error: null,

  async loadChart(client) {
    set({ status: 'loading', error: null, client, confidentialUnlocked: false });

    try {
      /* Both in parallel: the wheel needs positions, everything else needs the
         gated reading, and neither depends on the other. */
      const [chartRes, readingRes] = await Promise.all([
        fetch(`/api/chart/${client.id}`, { cache: 'no-store' }),
        fetch(`/api/reading/${client.id}`, { cache: 'no-store' }),
      ]);

      if (!chartRes.ok) throw new Error(`Could not compute the chart (${chartRes.status}).`);
      if (!readingRes.ok) {
        const payload = await readingRes.json().catch(() => ({}));
        throw new Error(payload.error ?? `Could not build the reading (${readingRes.status}).`);
      }

      set({
        natal: await chartRes.json(),
        reading: await readingRes.json(),
        status: 'ready',
      });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : 'Chart calculation failed.' });
    }
  },

  setVarga: (activeVarga) => set({ activeVarga }),
  setTab: (activeTab) => set({ activeTab }),

  unlockConfidential: (passphrase) => {
    const required = process.env.NEXT_PUBLIC_CONFIDENTIAL_PASSPHRASE;
    if (required && passphrase !== required) return false;
    set({ confidentialUnlocked: true });
    return true;
  },

  lockConfidential: () => set({ confidentialUnlocked: false }),
  setNotes: (notes) => set({ notes }),
  clear: () => set({ client: null, natal: null, reading: null, notes: [], status: 'idle' }),
}));
