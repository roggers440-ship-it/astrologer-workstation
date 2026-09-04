import type { ChartData, DashaPeriod, HouseNumber, NatalChart, PlanetName, SignName } from '@/types/astrology';
import {
  DUSTHANA_HOUSES, KENDRA_HOUSES, SIGNS, TRIKONA_HOUSES,
  housesAspectedBy, housesRuledBy, lordOfHouse, signIndex,
} from '@/lib/vedic-constants';
import { hasExchange, isCombust, mutualAspect, ordinal } from '@/lib/rule-engine';
import { computeAshtakavarga, type Ashtakavarga } from '@/lib/ashtakavarga';
import { fullDignity, planetStrength } from '@/lib/strength';
import { pratyantardashas } from '@/lib/dasha';
import { detectYogas, type Yoga } from '@/lib/yogas';

/**
 * Shared machinery for direct answers.
 *
 * The topic panel exists to answer the question a client actually asked, with a
 * verdict and a date, rather than to show the reasoning - the houses dialog and
 * the year timeline already do that. Everything here is built to produce short,
 * committed statements.
 */

export type Confidence = 'Clear' | 'Likely' | 'Mixed' | 'Weak';

export interface Answer {
  /** The client's question, in their words. */
  question: string;
  /** The direct answer. One or two sentences, no hedging. */
  verdict: string;
  confidence: Confidence;
  /** Optional supporting line - the reason, not the working. */
  because?: string;
  /**
   * Chart support out of 100. This is a strength index, not a probability -
   * nothing in a chart yields odds, and presenting one as a percentage chance is
   * a claim no astrologer can stand behind.
   */
  support?: number;
  /** Exact window, where the answer is a timing question. */
  window?: { from: string; to: string; label: string };
  /** Classical claim preserved verbatim in register, where one applies. */
  classical?: { claim: string; source: string };
}

export interface AnswerContext {
  natal: NatalChart;
  chart: ChartData;
  av: Ashtakavarga;
  yogas: Yoga[];
  now: Date;
}

export function buildContext(natal: NatalChart, now = new Date()): AnswerContext {
  const chart = natal.charts.D1;
  return { natal, chart, av: computeAshtakavarga(chart), yogas: detectYogas(chart), now };
}

/* ------------------------------- primitives ------------------------------- */

export const at = (c: ChartData, p: PlanetName) => c.placements.find((x) => x.planet === p);
export const lord = (c: ChartData, h: HouseNumber) => lordOfHouse(h, c.ascendantSign);
export const occupants = (c: ChartData, h: HouseNumber) => c.placements.filter((p) => p.house === h);

export function aspectors(c: ChartData, h: HouseNumber): PlanetName[] {
  return c.placements.filter((p) => p.house !== h && housesAspectedBy(p.planet, p.house).includes(h)).map((p) => p.planet);
}

export const BENEFICS: PlanetName[] = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
export const MALEFICS: PlanetName[] = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];

/**
 * Support for a house, 0-100.
 *
 * Anchored on Sarvashtakavarga - the classical measure, averaging 28 of 56 - then
 * adjusted for the lord's condition, occupants, aspects and any yoga touching it.
 * Bindus carry most of the weight because they are the one part of this with an
 * eight-hundred-year track record.
 */
export function houseSupport(ctx: AnswerContext, house: HouseNumber): number {
  const { chart, av, yogas } = ctx;
  const bindus = av.byHouse[house];

  let score = ((bindus - 18) / 22) * 60; // 18 bindus -> 0, 40 -> 60

  const ruler = lord(chart, house);
  const rulerPlace = at(chart, ruler);
  const dig = fullDignity(chart, ruler);
  score += dig.score * 3;

  if (rulerPlace) {
    if (TRIKONA_HOUSES.includes(rulerPlace.house)) score += 8;
    else if (KENDRA_HOUSES.includes(rulerPlace.house)) score += 5;
    else if (DUSTHANA_HOUSES.includes(rulerPlace.house)) score -= 10;
  }
  if (isCombust(chart, ruler)) score -= 8;

  const occ = occupants(chart, house);
  score += occ.filter((o) => BENEFICS.includes(o.planet)).length * 5;
  score -= occ.filter((o) => MALEFICS.includes(o.planet)).length * 4;

  const asp = aspectors(chart, house);
  if (asp.includes('Jupiter')) score += 7;
  if (asp.includes('Saturn')) score -= 4;

  score += yogas.filter((y) => y.houses.includes(house) && y.strength === 'Strong').length * 9;

  return Math.max(3, Math.min(97, Math.round(score + 30)));
}

export function confidenceFor(support: number): Confidence {
  if (support >= 68) return 'Clear';
  if (support >= 52) return 'Likely';
  if (support >= 36) return 'Mixed';
  return 'Weak';
}

/* -------------------------------- direction ------------------------------- */

/** Classical direction of each sign, cycling east, south, west, north from Aries. */
const SIGN_DIRECTION: Record<SignName, string> = {
  Aries: 'east', Taurus: 'south', Gemini: 'west', Cancer: 'north',
  Leo: 'east', Virgo: 'south', Libra: 'west', Scorpio: 'north',
  Sagittarius: 'east', Capricorn: 'south', Aquarius: 'west', Pisces: 'north',
};

/** Direction each graha governs, used when a planet rather than a sign decides. */
const PLANET_DIRECTION: Record<PlanetName, string> = {
  Sun: 'east', Venus: 'south-east', Mars: 'south', Rahu: 'south-west',
  Saturn: 'west', Moon: 'north-west', Mercury: 'north', Jupiter: 'north-east',
  Ketu: 'south-west',
};

/**
 * Direction indicated by a house: its sign, cross-checked against its lord's
 * planetary direction. Agreement between the two is what makes it worth saying.
 */
export function directionFor(ctx: AnswerContext, house: HouseNumber): { direction: string; agrees: boolean } {
  const sign = ctx.chart.houseSigns[house];
  const ruler = lord(ctx.chart, house);
  const bySign = SIGN_DIRECTION[sign];
  const byPlanet = PLANET_DIRECTION[ruler];
  return { direction: bySign, agrees: byPlanet.includes(bySign) };
}

/* --------------------------------- timing --------------------------------- */

export interface Window {
  from: string;
  to: string;
  label: string;
  lords: PlanetName[];
  score: number;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Precise windows for a topic.
 *
 * Works at antardasha level and drops to pratyantardasha inside the running
 * period, because "the Rahu mahadasha, 2013 to 2031" is not a timing answer. A
 * window scores higher when both the major and the sub-period lord carry the
 * topic - that agreement is what separates a live window from a nominal one.
 */
export function topicWindows(
  ctx: AnswerContext,
  carriers: PlanetName[],
  options: { yearsForward?: number; limit?: number } = {},
): Window[] {
  const { yearsForward = 15, limit = 4 } = options;
  const { natal, now } = ctx;
  const horizon = new Date(now.getTime() + yearsForward * 365.25 * 86_400_000);

  const windows: Window[] = [];

  for (const maha of natal.dashaTree) {
    if (Date.parse(maha.end) < now.getTime() || Date.parse(maha.start) > horizon.getTime()) continue;
    const mahaCarries = carriers.includes(maha.lord);

    for (const antar of maha.children ?? []) {
      if (Date.parse(antar.end) < now.getTime() || Date.parse(antar.start) > horizon.getTime()) continue;
      const antarCarries = carriers.includes(antar.lord);
      if (!mahaCarries && !antarCarries) continue;

      const both = mahaCarries && antarCarries;
      const running = Date.parse(antar.start) <= now.getTime() && now.getTime() < Date.parse(antar.end);

      /* Inside the period running now, narrow to pratyantardasha - a client
         asking "when" wants weeks, not a three-year band. */
      if (running && both) {
        for (const pratyantar of pratyantardashas(antar)) {
          if (Date.parse(pratyantar.end) < now.getTime()) continue;
          if (!carriers.includes(pratyantar.lord)) continue;
          windows.push({
            from: pratyantar.start,
            to: pratyantar.end,
            label: `${maha.lord}\u2013${antar.lord}\u2013${pratyantar.lord}`,
            lords: [maha.lord, antar.lord, pratyantar.lord],
            score: 100,
          });
        }
      }

      windows.push({
        from: antar.start,
        to: antar.end,
        label: `${maha.lord}\u2013${antar.lord}`,
        lords: [maha.lord, antar.lord],
        score: (both ? 70 : 40) + (running ? 15 : 0),
      });
    }
  }

  return windows.sort((a, b) => b.score - a.score || Date.parse(a.from) - Date.parse(b.from)).slice(0, limit);
}

/**
 * The same machinery pointed backwards.
 *
 * Retrospective windows are the most checkable thing the software produces: the
 * client either recognises the year or does not, and that answer is worth more
 * than any forward prediction.
 */
export function pastWindows(
  ctx: AnswerContext,
  carriers: PlanetName[],
  options: { yearsBack?: number; limit?: number } = {},
): Window[] {
  const { yearsBack = 15, limit = 4 } = options;
  const { natal, now } = ctx;
  const floor = new Date(now.getTime() - yearsBack * 365.25 * 86_400_000);
  const windows: Window[] = [];

  for (const maha of natal.dashaTree) {
    if (Date.parse(maha.end) < floor.getTime() || Date.parse(maha.start) > now.getTime()) continue;
    const mahaCarries = carriers.includes(maha.lord);

    for (const antar of maha.children ?? []) {
      if (Date.parse(antar.end) < floor.getTime() || Date.parse(antar.start) > now.getTime()) continue;
      const antarCarries = carriers.includes(antar.lord);
      if (!mahaCarries && !antarCarries) continue;

      /* A period still running has not finished happening, so its end is clamped
         to today. Without this a "past relationships" answer prints year ranges
         that run into the future, which is the fastest way to lose a client's
         confidence in everything said afterwards. */
      const ends = Math.min(Date.parse(antar.end), now.getTime());

      windows.push({
        from: antar.start,
        to: new Date(ends).toISOString(),
        label: `${maha.lord}\u2013${antar.lord}`,
        lords: [maha.lord, antar.lord],
        score: mahaCarries && antarCarries ? 80 : 45,
      });
    }
  }

  return windows.sort((a, b) => b.score - a.score || Date.parse(b.from) - Date.parse(a.from)).slice(0, limit);
}

export function windowAnswer(w: Window | undefined, label: string): Answer['window'] | undefined {
  if (!w) return undefined;
  return { from: fmt(w.from), to: fmt(w.to), label };
}

/** "Strongest until 19 Sep 2026" - the phrasing a client remembers. */
export function untilPhrase(w: Window | undefined): string | null {
  return w ? `strongest until ${fmt(w.to)}` : null;
}

export { fmt as formatDate };

/* ------------------------------- relations -------------------------------- */

/** Any connection between two house lords, named. Null when they are unrelated. */
export function lordsConnected(ctx: AnswerContext, a: HouseNumber, b: HouseNumber): string | null {
  const { chart } = ctx;
  const la = lord(chart, a);
  const lb = lord(chart, b);
  if (la === lb) return 'the same planet rules both';

  const pa = at(chart, la);
  const pb = at(chart, lb);
  if (!pa || !pb) return null;

  if (hasExchange(chart, la, lb)) return 'their lords exchange signs';
  if (pa.house === pb.house) return 'their lords sit together';
  if (mutualAspect(chart, la, lb)) return 'their lords aspect each other';
  if (pa.house === b) return `the ${ordinal(a)} lord sits in the ${ordinal(b)}`;
  if (pb.house === a) return `the ${ordinal(b)} lord sits in the ${ordinal(a)}`;
  return null;
}

/** Planets that carry a topic: lords of its houses, its karakas, its occupants. */
export function carriersOf(ctx: AnswerContext, houses: HouseNumber[], karakas: PlanetName[]): PlanetName[] {
  const set = new Set<PlanetName>(karakas);
  for (const h of houses) {
    set.add(lord(ctx.chart, h));
    for (const o of occupants(ctx.chart, h)) set.add(o.planet);
  }
  return [...set];
}
