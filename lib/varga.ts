import type { SignName, Varga } from '@/types/astrology';
import { SIGNS } from './vedic-constants';

const norm360 = (x: number) => ((x % 360) + 360) % 360;

/**
 * Divisional chart mapping. Each takes a sidereal longitude and returns the sign
 * the planet occupies in that varga.
 *
 * Conventions differ between schools. These follow the mappings used by
 * Jagannatha Hora, which is the de facto reference; if your parampara uses a
 * different shashtiamsha count, D60 is the one to change.
 */

/** D9 navamsha. Nine parts of 3 deg 20 min, counted continuously through the zodiac. */
export function navamshaSign(longitude: number): SignName {
  const lon = norm360(longitude);
  const s = Math.floor(lon / 30);
  const part = Math.floor((lon - s * 30) / (30 / 9));
  return SIGNS[(s * 9 + part) % 12];
}

/** D10 dashamsha. Odd signs count from themselves, even signs from the 9th. */
export function dashamshaSign(longitude: number): SignName {
  const lon = norm360(longitude);
  const s = Math.floor(lon / 30);
  const part = Math.floor((lon - s * 30) / 3);
  const isOdd = s % 2 === 0; // Aries is index 0 and is an odd sign
  return SIGNS[(s + (isOdd ? 0 : 8) + part) % 12];
}

/**
 * D60 shashtiamsha. Sixty parts of 0 deg 30 min, counted from the sign itself.
 *
 * Each division spans half a degree, which the ascendant crosses in about a
 * minute of clock time. The ephemeris is exact here; the birth time usually is
 * not. Read `ascendantDriftPerMinute` before trusting a D60 lagna.
 */
export function shashtiamshaSign(longitude: number): SignName {
  const lon = norm360(longitude);
  const s = Math.floor(lon / 30);
  const part = Math.floor((lon - s * 30) / 0.5);
  return SIGNS[(s + part) % 12];
}

/** D6 shashtamsha, the health divisional. Six parts of 5 deg: odd signs count from
 *  Aries, even signs from Libra. */
export function shashtamshaSign(longitude: number): SignName {
  const lon = norm360(longitude);
  const s = Math.floor(lon / 30);
  const part = Math.floor((lon - s * 30) / 5);
  const isOdd = s % 2 === 0;
  return SIGNS[((isOdd ? 0 : 6) + part) % 12];
}

/**
 * D30 trimsamsha, the affliction divisional.
 *
 * The only common varga with unequal divisions: five planetary spans per sign,
 * reversed between odd and even signs, and the luminaries rule none of them.
 * Mars and Saturn portions are the harsh ones, which is what makes this chart
 * useful for reading affliction rather than placement.
 */
const TRIMSAMSHA_ODD: { upto: number; sign: SignName }[] = [
  { upto: 5, sign: 'Aries' },        // Mars
  { upto: 10, sign: 'Aquarius' },    // Saturn
  { upto: 18, sign: 'Sagittarius' }, // Jupiter
  { upto: 25, sign: 'Gemini' },      // Mercury
  { upto: 30, sign: 'Libra' },       // Venus
];

const TRIMSAMSHA_EVEN: { upto: number; sign: SignName }[] = [
  { upto: 5, sign: 'Taurus' },       // Venus
  { upto: 12, sign: 'Virgo' },       // Mercury
  { upto: 20, sign: 'Pisces' },      // Jupiter
  { upto: 25, sign: 'Capricorn' },   // Saturn
  { upto: 30, sign: 'Scorpio' },     // Mars
];

export function trimsamshaSign(longitude: number): SignName {
  const lon = norm360(longitude);
  const s = Math.floor(lon / 30);
  const deg = lon - s * 30;
  const table = s % 2 === 0 ? TRIMSAMSHA_ODD : TRIMSAMSHA_EVEN;
  return (table.find((t) => deg < t.upto) ?? table[table.length - 1]).sign;
}

/** True when the longitude falls in a Mars or Saturn trimsamsha portion. */
export function inHarshTrimsamsha(longitude: number): boolean {
  const harsh: SignName[] = ['Aries', 'Scorpio', 'Aquarius', 'Capricorn'];
  return harsh.includes(trimsamshaSign(longitude));
}

export const VARGA_MAP: Record<Exclude<Varga, 'D1'>, (longitude: number) => SignName> = {
  D6: shashtamshaSign,
  D9: navamshaSign,
  D10: dashamshaSign,
  D30: trimsamshaSign,
  D60: shashtiamshaSign,
};

export const VARGA_LABEL: Record<Varga, string> = {
  D1: 'D1 natal',
  D6: 'D6 health',
  D9: 'D9 navamsha',
  D10: 'D10 career',
  D30: 'D30 affliction',
  D60: 'D60 shashtiamsha',
};

/** The four shown as chart tabs. D6 and D30 are read by the medical module, not drawn. */
export const CHART_TABS: Varga[] = ['D1', 'D9', 'D10', 'D60'];
