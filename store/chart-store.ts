'use client';

import { create } from 'zustand';
import type { Client, ConsultationNote, NatalChart, Varga } from '@/types/astrology';
import type { Reading } from '@/types/reading';
import type { TabKey } from '@/lib/topics';

interface WorkstationState {
  /* The client list lives here rather than in a panel, so the splash screen can
     wait for it - a component below cannot be waited on by something above it. */
  clients: Client[];
  clientsLoaded: boolean;

  client: Client | null;
  /**
   * Positions only, used to draw the wheel. Interpretation comes from the server
   * already filtered by plan, because anything computed in the browser can be
   * recomputed by the reader.
   */
  natal: NatalChart | null;
  reading: Reading | null;
  notes: ConsultationNote[];

  activeVarga: Varga;
  activeTab: TabKey;
  confidentialUnlocked: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;

  loadClients: () => Promise<void>;
  /**
   * Accepts an array or a React-style updater.
   *
   * Named like a React setter, so it is called like one. Accepting only an array
   * meant `setClients(prev => [...])` quietly stored the function itself, and the
   * next render died on `clients.map is not a function` - a long way from the
   * line that caused it.
   */
  setClients: (next: Client[] | ((prev: Client[]) => Client[])) => void;
  loadChart: (client: Client) => Promise<void>;
  setVarga: (v: Varga) => void;
  setTab: (t: TabKey) => void;
  unlockConfidential: (passphrase: string) => boolean;
  lockConfidential: () => void;
  setNotes: (notes: ConsultationNote[]) => void;
  clear: () => void;
}

export const useWorkstation = create<WorkstationState>((set) => ({
  clients: [],
  clientsLoaded: false,

  client: null,
  natal: null,
  reading: null,
  notes: [],
  activeVarga: 'D1',
  activeTab: 'life',
  confidentialUnlocked: false,
  status: 'idle',
  error: null,

  async loadClients() {
    try {
      const res = await fetch('/api/clients');
      const data = res.ok ? await res.json() : [];
      /* An error body is an object, not an array, and storing it would fail the
         same way an updater function did. */
      set({ clients: Array.isArray(data) ? data : [] });
    } catch {
      set({ clients: [] });
    } finally {
      /* Loaded, not necessarily non-empty. A new account has no clients and must
         still get past the splash. */
      set({ clientsLoaded: true });
    }
  },

  setClients: (next) =>
    set((state) => ({
      clients: typeof next === 'function' ? next(state.clients) : next,
    })),

  async loadChart(client) {
    /*
     * The previous chart is cleared, not left in place. Keeping it means the
     * panels show the last client's reading under the new client's name for as
     * long as the computation takes - the wrong person's chart, confidently
     * labelled, which is worse than a blank panel.
     */
    set({
      status: 'loading',
      error: null,
      client,
      natal: null,
      reading: null,
      notes: [],
      confidentialUnlocked: false,
    });

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
