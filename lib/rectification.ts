import 'server-only';
import type { Client, HouseNumber, PlanetName, SignName } from '@/types/astrology';
import { SIGNS, housesRuledBy, lordOfHouse, signIndex } from '@/lib/vedic-constants';
import { julianDayFor, siderealAscendant, siderealPosition, signOf } from '@/lib/ephemeris/swiss';
import { buildVimshottariTree, findActive } from '@/lib/dasha';
import { birthMomentUTC } from '@/lib/astro-api';
import type { DashaPeriod } from '@/types/astrology';

/**
 * Birth time rectification.
 *
 * Given events whose dates are known, search candidate birth times and score
 * each by how well its dasha explains what actually happened. The best candidate
 * is the one under which the periods running at each event were run by planets
 * that govern that part of life.
 *
 * Two things make this honest rather than numerology. Every candidate is scored
 * against the same events by the same rule, and the confidence reported reflects
 * how much the winner beats its neighbours - a chart that scores 40 against a
 * runner-up at 39 has not been rectified, it has been guessed.
 */

/** Which houses each kind of event belongs to. */
const EVENT_HOUSES: Record<string, HouseNumber[]> = {
  marriage: [7, 2, 11],
  engagement: [7, 5],
  separation: [7, 6, 12],
  child_born: [5, 9, 11],
  bereavement: [8, 12],
  job_start: [10, 6, 2],
  job_loss: [10, 6, 12],
  promotion: [10, 11, 6],
  business_start: [7, 10, 11],
  relocation: [4, 3, 12],
  went_abroad: [12, 9, 4],
  education_start: [4, 5, 9],
  graduation: [4, 9, 5],
  illness: [6, 8, 1],
  accident: [6, 8, 1],
  property: [4, 11],
  windfall: [11, 8, 2],
  loss: [12, 8, 6],
  other: [],
};

/** Natural significator, which carries weight beyond house rulership. */
const EVENT_KARAKA: Record<string, PlanetName[]> = {
  marriage: ['Venus', 'Jupiter'],
  engagement: ['Venus'],
  separation: ['Saturn', 'Mars'],
  child_born: ['Jupiter'],
  bereavement: ['Saturn'],
  job_start: ['Sun', 'Saturn'],
  job_loss: ['Saturn'],
  promotion: ['Sun', 'Jupiter'],
  business_start: ['Mercury', 'Mars'],
  relocation: ['Moon', 'Mars'],
  went_abroad: ['Rahu', 'Jupiter'],
  education_start: ['Mercury', 'Jupiter'],
  graduation: ['Jupiter', 'Mercury'],
  illness: ['Saturn', 'Mars'],
  accident: ['Mars'],
  property: ['Mars', 'Venus'],
  windfall: ['Jupiter', 'Rahu'],
  loss: ['Saturn', 'Ketu'],
  other: [],
};

/** How much a date is worth. A year-precision event cannot discriminate minutes. */
const PRECISION_WEIGHT: Record<string, number> = { day: 1, month: 0.85, year: 0.55 };

export interface LifeEvent {
  kind: string;
  occurredOn: string;
  precision: 'day' | 'month' | 'year';
  note?: string | null;
}

export interface Candidate {
  /** Local birth time, HH:mm. */
  time: string;
  offsetMinutes: number;
  lagna: SignName;
  lagnaDegree: number;
  moonSign: SignName;
  moonNakshatraChanged: boolean;
  score: number;
  /** Per event, how well this candidate explains it. */
  detail: { kind: string; date: string; periods: string; matched: string[]; score: number }[];
}

export interface Rectification {
  recorded: string;
  best: Candidate | null;
  candidates: Candidate[];
  /** How strongly the winner separates from the field, 0 to 1. */
  separation: number;
  verdict: string;
  usable: boolean;
}

/**
 * Planets other than the Moon move less than a tenth of a degree across a
 * two-hour window, so they are computed once and reused. The Moon and the
 * ascendant are recomputed per candidate because both change enough to alter
 * the answer - the ascendant by a whole sign, the Moon by a nakshatra, which
 * changes the entire dasha sequence.
 */
async function slowPlanets(jd: number) {
  const names: PlanetName[] = ['Sun', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const out = new Map<PlanetName, number>();
  for (const name of names) {
    out.set(name, (await siderealPosition(jd, name)).longitude);
  }
  return out;
}

function houseOf(longitude: number, ascendant: SignName): HouseNumber {
  const s = Math.floor(((longitude % 360) + 360) % 360 / 30);
  return ((((s - signIndex(ascendant)) % 12) + 12) % 12 + 1) as HouseNumber;
}

/** Lords and occupants of the houses an event belongs to. */
function activatorsFor(
  kind: string,
  ascendant: SignName,
  positions: Map<PlanetName, number>,
  moonLongitude: number,
): Set<PlanetName> {
  const houses = EVENT_HOUSES[kind] ?? [];
  const set = new Set<PlanetName>(EVENT_KARAKA[kind] ?? []);

  for (const h of houses) set.add(lordOfHouse(h, ascendant));

  for (const [planet, lon] of positions) {
    if (houses.includes(houseOf(lon, ascendant))) set.add(planet);
  }
  if (houses.includes(houseOf(moonLongitude, ascendant))) set.add('Moon');

  return set;
}

function periodsAt(tree: DashaPeriod[], when: Date) {
  const active = findActive(tree, when);
  if (!active) return null;
  return {
    maha: active.maha.lord,
    antar: active.antar?.lord,
    pratyantar: active.pratyantar?.lord,
  };
}

export interface RectifyOptions {
  /** Minutes either side of the recorded time. */
  windowMinutes?: number;
  /** Step size. One minute is the finest that means anything given how birth times are recorded. */
  stepMinutes?: number;
}

export async function rectify(
  client: Client,
  events: LifeEvent[],
  options: RectifyOptions = {},
): Promise<Rectification> {
  const { windowMinutes = 60, stepMinutes = 2 } = options;

  const usable = events.filter((e) => (EVENT_HOUSES[e.kind] ?? []).length > 0);
  const recorded = client.birthTime;

  if (usable.length < 3) {
    return {
      recorded,
      best: null,
      candidates: [],
      separation: 0,
      usable: false,
      verdict:
        `Only ${usable.length} dated event${usable.length === 1 ? '' : 's'} recorded. ` +
        'Rectification needs at least three, and reads far better with six - fewer than that and the search fits noise, then reports the noise confidently. Add more events first.',
    };
  }

  const baseUtc = birthMomentUTC(client);
  const baseJd = await julianDayFor(baseUtc);
  const positions = await slowPlanets(baseJd);
  const baseMoon = (await siderealPosition(baseJd, 'Moon')).longitude;
  const baseNakshatra = Math.floor(baseMoon / (360 / 27));

  const candidates: Candidate[] = [];

  for (let offset = -windowMinutes; offset <= windowMinutes; offset += stepMinutes) {
    const when = new Date(baseUtc.getTime() + offset * 60_000);
    const jd = await julianDayFor(when);

    const ascLongitude = await siderealAscendant(jd, client.latitude, client.longitude);
    const lagna = SIGNS[Math.floor(ascLongitude / 30)];
    const moon = (await siderealPosition(jd, 'Moon')).longitude;
    const tree = buildVimshottariTree(moon, when);

    let total = 0;
    let possible = 0;
    const detail: Candidate['detail'] = [];

    for (const event of usable) {
      const activators = activatorsFor(event.kind, lagna, positions, moon);
      const periods = periodsAt(tree, new Date(event.occurredOn));
      const weight = PRECISION_WEIGHT[event.precision] ?? 1;

      /* The sub-period carries the most weight: a mahadasha lasts years and
         cannot pin a date, while an antardasha usually can. */
      const scores = { maha: 3, antar: 4, pratyantar: 2 };
      possible += (scores.maha + scores.antar + scores.pratyantar) * weight;

      if (!periods) {
        detail.push({ kind: event.kind, date: event.occurredOn, periods: 'outside the dasha span', matched: [], score: 0 });
        continue;
      }

      const matched: string[] = [];
      let earned = 0;

      if (activators.has(periods.maha)) {
        earned += scores.maha;
        matched.push(`${periods.maha} major`);
      }
      if (periods.antar && activators.has(periods.antar)) {
        earned += scores.antar;
        matched.push(`${periods.antar} sub`);
      }
      if (periods.pratyantar && activators.has(periods.pratyantar)) {
        earned += scores.pratyantar;
        matched.push(`${periods.pratyantar} sub-sub`);
      }

      total += earned * weight;
      detail.push({
        kind: event.kind,
        date: event.occurredOn,
        periods: [periods.maha, periods.antar, periods.pratyantar].filter(Boolean).join('\u2013'),
        matched,
        score: Math.round((earned / (scores.maha + scores.antar + scores.pratyantar)) * 100),
      });
    }

    const [h, m] = recorded.split(':').map(Number);
    const shifted = new Date(2000, 0, 1, h, m + offset);

    candidates.push({
      time: `${String(shifted.getHours()).padStart(2, '0')}:${String(shifted.getMinutes()).padStart(2, '0')}`,
      offsetMinutes: offset,
      lagna,
      lagnaDegree: Number((ascLongitude - Math.floor(ascLongitude / 30) * 30).toFixed(2)),
      moonSign: signOf(moon),
      moonNakshatraChanged: Math.floor(moon / (360 / 27)) !== baseNakshatra,
      score: possible > 0 ? Math.round((total / possible) * 100) : 0,
      detail,
    });
  }

  const ranked = [...candidates].sort((a, b) => b.score - a.score);
  const best = ranked[0] ?? null;

  /*
   * Separation, not score, decides whether this is worth anything. A winner on
   * 62 with a runner-up on 61 has not been rectified. Compared against the
   * median rather than the second place, because neighbouring minutes share a
   * lagna and would flatter the result.
   */
  const median = ranked[Math.floor(ranked.length / 2)]?.score ?? 0;
  const separation = best && best.score > 0 ? Math.max(0, (best.score - median) / best.score) : 0;

  const lagnaChanges = new Set(candidates.map((c) => c.lagna)).size > 1;

  return {
    recorded,
    best,
    candidates: ranked.slice(0, 12),
    separation,
    usable: true,
    verdict:
      !best
        ? 'No candidate could be scored.'
        : separation < 0.15
          ? `The search does not separate. The best time scores ${best.score} and the middle of the field scores ${median}, which is not a difference worth acting on. More events, or events with exact dates, would help; a chart can also simply be insensitive across this window.`
          : lagnaChanges
            ? `${best.time} scores ${best.score}, clearly above the field. Note that the rising sign changes across this window, so this is not a small correction - it decides which sign the whole chart is read from.`
            : `${best.time} scores ${best.score}, clearly above the field. The rising sign is the same across the whole window, so this refines the degrees rather than changing the chart's foundation.`,
  };
}
