'use client';

import { create } from 'zustand';
import type {
  Client, ConsultationHook, ConsultationNote, NatalChart, TimelineMarker, Varga,
} from '@/types/astrology';
import { evaluateRules } from '@/lib/rule-engine';
import { ALL_RULES } from '@/lib/rules';
import { buildTimeline } from '@/lib/timeline';
import { detectYogas } from '@/lib/yogas';
import type { Yoga } from '@/lib/yogas';
import type { TabKey } from '@/lib/topics';

interface WorkstationState {
  client: Client | null;
  natal: NatalChart | null;
  hooks: ConsultationHook[];
  /** Chart-wide named combinations. Computed once per client, not per topic. */
  yogas: Yoga[];
  timeline: TimelineMarker[];
  notes: ConsultationNote[];

  activeVarga: Varga;
  activeTab: TabKey;
  /** Longevity stays hidden until deliberately unlocked. Resets on client change. */
  confidentialUnlocked: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;

  loadChart: (client: Client) => Promise<void>;
  setVarga: (v: Varga) => void;
  setTab: (t: TabKey) => void;
  /** Returns false on a wrong passphrase so the caller can show an error. */
  unlockConfidential: (passphrase: string) => boolean;
  lockConfidential: () => void;
  setNotes: (notes: ConsultationNote[]) => void;
  clear: () => void;
}

export const useWorkstation = create<WorkstationState>((set) => ({
  client: null,
  natal: null,
  hooks: [],
  yogas: [],
  timeline: [],
  notes: [],
  activeVarga: 'D1',
  activeTab: 'life',
  confidentialUnlocked: false,
  status: 'idle',
  error: null,

  async loadChart(client) {
    set({ status: 'loading', error: null, client, confidentialUnlocked: false });
    try {
      const res = await fetch(`/api/chart/${client.id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Could not compute the chart (${res.status}).`);
      const natal: NatalChart = await res.json();

      set({
        natal,
        hooks: evaluateRules(natal.charts.D1, ALL_RULES),
        yogas: detectYogas(natal.charts.D1),
        timeline: buildTimeline(natal, { yearsBack: 10, yearsForward: 10 }),
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
  clear: () => set({ client: null, natal: null, hooks: [], yogas: [], timeline: [], notes: [], status: 'idle' }),
}));
