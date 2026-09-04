import type {
  ChartData, DashaPeriod, HouseNumber, NatalChart, SignName, TimelineMarker,
} from '@/types/astrology';
import { housesRuledBy, signIndex } from './vedic-constants';
import { periodsInWindow } from './dasha';
import { ordinal } from './rule-engine';

/**
 * The verification and preparation timeline.
 *
 * Past markers are read back to the client and checked - that confirmation is the
 * only evidence the chart is calibrated to this person. Future markers are the
 * same machinery pointed forward, and are phrased as periods to prepare for
 * rather than events that will occur.
 */

const HOUSE_THEME: Record<HouseNumber, string> = {
  1: 'identity, health, how they present themselves',
  2: 'money, family, speech',
  3: 'effort, siblings, short moves, courage',
  4: 'home, mother, property, emotional base',
  5: 'children, study, creative work, risk',
  6: 'work, conflict, debt, health routine',
  7: 'partnership, marriage, negotiation',
  8: 'upheaval, joint finances, research, health focus',
  9: 'belief, teachers, travel, fortune',
  10: 'career direction, status, public role',
  11: 'gains, networks, older siblings',
  12: 'expense, foreign places, retreat, letting go',
};

const yearOf = (iso: string) => new Date(iso).getUTCFullYear();

function dashaMarker(period: DashaPeriod, chart: ChartData, isFuture: boolean): TimelineMarker | null {
  const houses = housesRuledBy(period.lord, chart.ascendantSign);
  const placement = chart.placements.find((p) => p.planet === period.lord);
  if (!placement) return null;

  const primary = (houses[0] ?? placement.house) as HouseNumber;
  const ruled = houses.length
    ? `lord of the ${houses.map(ordinal).join(' and ')}`
    : 'a node, read by placement';

  const prompt = isFuture
    ? `A period to prepare for around ${HOUSE_THEME[primary]}. Frame it as a season, not an event.`
    : `Expect this stretch to have turned on ${HOUSE_THEME[primary]}. Ask what changed.`;

  return {
    year: yearOf(period.start),
    label: period.level === 'Maha' ? `${period.lord} mahadasha begins` : `${period.lord} antardasha`,
    house: primary,
    lord: period.lord,
    source: 'Dasha',
    description: `${period.lord} is ${ruled} and sits in the ${ordinal(placement.house)}. ${prompt}`,
  };
}

function transitMarker(
  year: number,
  sign: SignName,
  chart: ChartData,
  isFuture: boolean,
): TimelineMarker | null {
  const sIdx = signIndex(sign);
  const ascIdx = signIndex(chart.ascendantSign);
  const house = ((((sIdx - ascIdx) % 12) + 12) % 12 + 1) as HouseNumber;

  const moon = chart.placements.find((p) => p.planet === 'Moon');
  const fromMoon = moon ? ((((sIdx - signIndex(moon.sign)) % 12) + 12) % 12) + 1 : 0;

  if ([12, 1, 2].includes(fromMoon)) {
    return {
      year,
      label: 'Sade sati window',
      house,
      lord: 'Saturn',
      source: 'SaturnTransit',
      description:
        `Saturn in ${sign}, the ${ordinal(fromMoon)} from the natal Moon. ` +
        (isFuture
          ? 'A demanding stretch with a known end date. Worth naming early so it is not a surprise.'
          : 'Classically a period of pressure and rebuilding. Ask about workload and sleep in this year.'),
    };
  }

  if ([1, 4, 7, 8, 10].includes(house)) {
    return {
      year,
      label: `Saturn over the ${ordinal(house)}`,
      house,
      lord: 'Saturn',
      source: 'SaturnTransit',
      description: `Saturn in ${sign} pressing on ${HOUSE_THEME[house]}. A slow, structural year rather than a dramatic one.`,
    };
  }

  return null;
}

export interface TimelineOptions {
  yearsBack?: number;
  yearsForward?: number;
  now?: Date;
}

export function buildTimeline(natal: NatalChart, options: TimelineOptions = {}): TimelineMarker[] {
  const { yearsBack = 10, yearsForward = 10, now = new Date() } = options;
  const chart = natal.charts.D1;
  const thisYear = now.getUTCFullYear();

  const from = new Date(Date.UTC(thisYear - yearsBack, 0, 1));
  const to = new Date(Date.UTC(thisYear + yearsForward, 11, 31));

  const dashaMarkers = periodsInWindow(natal.dashaTree, from, to)
    .filter((p) => Date.parse(p.start) >= from.getTime() && Date.parse(p.start) <= to.getTime())
    .map((p) => dashaMarker(p, chart, Date.parse(p.start) > now.getTime()))
    .filter(Boolean) as TimelineMarker[];

  const transitMarkers = natal.transits
    .filter((t) => t.year >= thisYear - yearsBack && t.year <= thisYear + yearsForward)
    .map((t) => transitMarker(t.year, t.saturnSign, chart, t.year > thisYear))
    .filter(Boolean) as TimelineMarker[];

  return [...dashaMarkers, ...transitMarkers].sort((a, b) => a.year - b.year);
}

export function groupByYear(markers: TimelineMarker[]): { year: number; markers: TimelineMarker[] }[] {
  const map = new Map<number, TimelineMarker[]>();
  for (const m of markers) map.set(m.year, [...(map.get(m.year) ?? []), m]);
  return [...map.entries()].map(([year, ms]) => ({ year, markers: ms })).sort((a, b) => a.year - b.year);
}
