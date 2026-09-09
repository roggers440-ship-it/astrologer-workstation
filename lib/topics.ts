import type { Topic } from '@/types/astrology';

/**
 * The 20 client topics.
 *
 * NOTE ON #10: the source specification numbers topics 1-20 but only names 19 of
 * them - slot 10 is never assigned. It is filled here as "Property & Vehicles"
 * (4th house, the natural gap in the Life Directions group). Rename it in one
 * place if the practice intends something else; nothing else references the label.
 */
export const TOPICS: Topic[] = [
  { id: 1, name: 'Career', tab: 'life', houses: [10, 6, 2], karaka: ['Sun', 'Saturn', 'Mercury'] },
  { id: 2, name: 'Wealth', tab: 'life', houses: [2, 11, 5, 9], karaka: ['Jupiter', 'Venus'] },
  { id: 3, name: 'Education', tab: 'life', houses: [4, 5, 9], karaka: ['Mercury', 'Jupiter'] },
  { id: 4, name: 'Love & Marriage', tab: 'relationships', houses: [7, 5, 2, 11], karaka: ['Venus', 'Jupiter'] },
  { id: 5, name: 'Children', tab: 'relationships', houses: [5, 9, 11], karaka: ['Jupiter'] },
  { id: 6, name: 'Family', tab: 'relationships', houses: [2, 4, 3], karaka: ['Moon', 'Venus'] },
  { id: 7, name: 'Foreign Study & Travel', tab: 'life', houses: [9, 12, 4], karaka: ['Rahu', 'Jupiter'] },
  {
    id: 8,
    name: 'Medical Astrology',
    tab: 'health',
    houses: [6, 8, 12, 1],
    karaka: ['Sun', 'Moon', 'Saturn'],
    handlingNote:
      'Frame every reading here as a theme to watch, never a diagnosis. If a client raises a real symptom, the only responsible next step is a referral to a doctor.',
  },
  {
    id: 9,
    name: 'Longevity Indicator',
    tab: 'health',
    houses: [8, 1, 3],
    karaka: ['Saturn'],
    confidential: true,
    handlingNote:
      'Practitioner reference only. Classical ayurdaya is unreliable and frightening when spoken aloud. Kept behind a reveal so it is never on screen during a session.',
  },
  { id: 10, name: 'Property & Vehicles', tab: 'life', houses: [4, 11], karaka: ['Mars', 'Venus'] },
  { id: 11, name: 'Personality', tab: 'psychology', houses: [1, 10], karaka: ['Sun', 'Moon'] },
  { id: 12, name: 'Mindset', tab: 'psychology', houses: [1, 5, 9], karaka: ['Mercury', 'Moon'] },
  { id: 13, name: 'Enemies & Opposition', tab: 'relationships', houses: [6, 12, 8], karaka: ['Mars', 'Saturn'] },
  { id: 14, name: 'Soft Skills', tab: 'psychology', houses: [3, 2, 11], karaka: ['Mercury', 'Venus'] },
  { id: 15, name: 'Luck', tab: 'life', houses: [9, 5, 11], karaka: ['Jupiter'] },
  { id: 16, name: 'Karma', tab: 'life', houses: [9, 12, 6, 10], karaka: ['Saturn', 'Ketu'] },
  { id: 17, name: 'Strengths & Weaknesses', tab: 'health', houses: [1, 6, 3], karaka: ['Sun', 'Mars'] },
  { id: 18, name: 'Past Life Themes', tab: 'health', houses: [12, 5, 9], karaka: ['Ketu', 'Saturn'] },
  {
    id: 19,
    name: 'Mood Swings',
    tab: 'psychology',
    houses: [4, 1, 12],
    karaka: ['Moon'],
    handlingNote: 'Describes emotional weather, not a clinical condition.',
  },
  {
    id: 20,
    name: 'Mental Health',
    tab: 'psychology',
    houses: [4, 12, 8, 1],
    karaka: ['Moon', 'Mercury'],
    handlingNote:
      'Talk about stress load and coping style, not illness. If a client describes real distress, stop reading the chart and point them to a clinician or a crisis line.',
  },
];

export const TAB_GROUPS = [
  { key: 'life', label: 'Life Directions', short:"Life", topicIds: [1, 2, 3, 7, 10, 15, 16] },
  { key: 'relationships', label: 'Relationships', short:"Family", topicIds: [4, 5, 6, 13] },
  { key: 'psychology', label: 'Psychology', short:"Mind", topicIds: [11, 12, 14, 19, 20] },
  { key: 'health', label: 'Health', short:"Health", topicIds: [8, 9, 17, 18] },
] as const;

export type TabKey = (typeof TAB_GROUPS)[number]['key'];

export const topicById = (id: number) => TOPICS.find((t) => t.id === id);
