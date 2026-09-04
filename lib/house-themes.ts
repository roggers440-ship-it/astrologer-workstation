import type { HouseNumber } from '@/types/astrology';

/** One clause per house, written to drop into a sentence mid-flow. */
export const HOUSE_THEME: Record<HouseNumber, string> = {
  1: 'identity, health and how they come across',
  2: 'money held, family of origin and speech',
  3: 'effort, siblings, short journeys and nerve',
  4: 'home, mother, property and inner peace',
  5: 'children, learning, creative work and risk',
  6: 'daily work, conflict, debt and illness',
  7: 'partnership, marriage and open dealings',
  8: 'upheaval, other people\u2019s money, research and what stays hidden',
  9: 'belief, teachers, long journeys and fortune',
  10: 'career, status and public role',
  11: 'gains, networks and older siblings',
  12: 'expense, foreign places, retreat and letting go',
};

/** Two or three words, for chips and short labels. */
export const HOUSE_KEYWORD: Record<HouseNumber, string> = {
  1: 'self', 2: 'wealth', 3: 'effort', 4: 'home', 5: 'creativity', 6: 'service',
  7: 'partnership', 8: 'upheaval', 9: 'fortune', 10: 'career', 11: 'gains', 12: 'loss',
};
