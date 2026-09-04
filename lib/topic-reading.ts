import type {
  ChartData, HouseNumber, NatalChart, PlanetName, PlanetPlacement, SignName, Topic,
} from '@/types/astrology';
import {
  DUSTHANA_HOUSES, KENDRA_HOUSES, TRIKONA_HOUSES,
  dignityOf, housesAspectedBy, housesRuledBy, lordOfHouse, signIndex,
} from './vedic-constants';
import { ordinal } from './rule-engine';
import { HOUSE_THEME } from './house-themes';
import { periodsInWindow } from './dasha';

/**
 * The derived layer.
 *
 * Hand-written rules will never cover twenty topics across every chart, and an
 * empty panel mid-consultation is worse than useless. Everything here is
 * computed from what the chart already knows - house lord, its placement and
 * dignity, occupants, aspects, karaka condition - so every topic always has
 * something substantive. The rule corpus then sits on top as the sharp,
 * specific overlay rather than being the only source of content.
 */

const NATURAL_BENEFICS: PlanetName[] = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
const NATURAL_MALEFICS: PlanetName[] = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];

export type Verdict = 'Supported' | 'Mixed' | 'Demanding';

export interface HouseAnalysis {
  house: HouseNumber;
  sign: SignName;
  lord: PlanetName;
  lordHouse: HouseNumber;
  lordSign: SignName;
  lordDignity: string;
  occupants: PlanetPlacement[];
  aspectedBy: PlanetName[];
  score: number;
  line: string;
}

export interface KarakaAnalysis {
  planet: PlanetName;
  house: HouseNumber;
  sign: SignName;
  dignity: string;
  score: number;
  line: string;
}

export interface TopicReading {
  topicId: number;
  verdict: Verdict;
  score: number;
  headline: string;
  houses: HouseAnalysis[];
  karakas: KarakaAnalysis[];
  strengths: string[];
  cautions: string[];
}

function placement(chart: ChartData, planet: PlanetName): PlanetPlacement | undefined {
  return chart.placements.find((p) => p.planet === planet);
}

function aspectingPlanets(chart: ChartData, house: HouseNumber): PlanetName[] {
  return chart.placements
    .filter((p) => p.house !== house && housesAspectedBy(p.planet, p.house).includes(house))
    .map((p) => p.planet);
}

/** Positional weight of a house, used to judge where a lord has landed. */
function houseQuality(house: HouseNumber): number {
  if (TRIKONA_HOUSES.includes(house)) return 2;
  if (KENDRA_HOUSES.includes(house)) return 1;
  if (DUSTHANA_HOUSES.includes(house)) return -2;
  if (house === 11) return 1;
  return 0;
}

function dignityScore(dignity: string): number {
  return dignity === 'Exalted' ? 3
    : dignity === 'Moolatrikona' ? 2
    : dignity === 'OwnSign' ? 2
    : dignity === 'Debilitated' ? -3
    : 0;
}

function analyseHouse(chart: ChartData, house: HouseNumber, careful: boolean): HouseAnalysis {
  const sign = chart.houseSigns[house];
  const lord = lordOfHouse(house, chart.ascendantSign);
  const lordPlacement = placement(chart, lord)!;
  const dignity = dignityOf(lord, lordPlacement.sign, lordPlacement.degree);

  const occupants = chart.placements.filter((p) => p.house === house);
  const aspectedBy = aspectingPlanets(chart, house);

  let score = dignityScore(dignity) + houseQuality(lordPlacement.house);
  score += occupants.filter((o) => NATURAL_BENEFICS.includes(o.planet)).length;
  score -= occupants.filter((o) => NATURAL_MALEFICS.includes(o.planet)).length;
  if (aspectedBy.includes('Jupiter')) score += 2;
  if (aspectedBy.includes('Saturn')) score -= 1;
  if (aspectedBy.includes('Mars')) score -= 1;

  /* Sentence assembled rather than looked up: 144 lord-in-house combinations is
     too many to hand-write, and composition reads better than a lookup table. */
  const verb = careful ? 'tends to be shaped by' : 'is run by';
  const dignityClause =
    dignity === 'Exalted' ? ', at full strength'
    : dignity === 'Debilitated' ? ', working against the grain'
    : dignity === 'OwnSign' || dignity === 'Moolatrikona' ? ', comfortable in its own sign'
    : '';

  const landing =
    lordPlacement.house === house
      ? 'It sits in its own house, which keeps the matter self-contained.'
      : `It sits in the ${ordinal(lordPlacement.house)}, so this area gets tangled up with ${HOUSE_THEME[lordPlacement.house]}.`;

  const company =
    occupants.length === 0
      ? `Nothing occupies the ${ordinal(house)}, so read it through the lord.`
      : `${occupants.map((o) => o.planet).join(' and ')} ${occupants.length > 1 ? 'sit' : 'sits'} in the house itself.`;

  const drishti = aspectedBy.length
    ? ` ${aspectedBy.join(', ')} ${aspectedBy.length > 1 ? 'cast aspects' : 'casts an aspect'} onto it.`
    : '';

  return {
    house,
    sign,
    lord,
    lordHouse: lordPlacement.house,
    lordSign: lordPlacement.sign,
    lordDignity: dignity,
    occupants,
    aspectedBy,
    score,
    line:
      `The ${ordinal(house)} covers ${HOUSE_THEME[house]}. It ${verb} ${lord} in ${lordPlacement.sign}${dignityClause}. ` +
      `${landing} ${company}${drishti}`,
  };
}

function analyseKaraka(chart: ChartData, planet: PlanetName, careful: boolean, topicName: string): KarakaAnalysis | null {
  const p = placement(chart, planet);
  if (!p) return null;

  const dignity = dignityOf(planet, p.sign, p.degree);
  const score = dignityScore(dignity) + houseQuality(p.house);

  const state =
    dignity === 'Exalted' ? 'is at its strongest'
    : dignity === 'Debilitated' ? 'is weak and needs support elsewhere in the chart'
    : DUSTHANA_HOUSES.includes(p.house) ? 'is under strain from its placement'
    : 'is workable';

  const hedge = careful ? 'may show up as' : 'shows up as';

  return {
    planet,
    house: p.house,
    sign: p.sign,
    dignity,
    score,
    line:
      `${planet}, the natural significator, ${state} in ${p.sign} in the ${ordinal(p.house)}. ` +
      `That ${hedge} the texture ${topicName.toLowerCase()} takes on day to day.`,
  };
}

export function deriveTopicReading(chart: ChartData, topic: Topic): TopicReading {
  const careful = Boolean(topic.handlingNote);

  const houses = topic.houses.map((h) => analyseHouse(chart, h, careful));
  const karakas = topic.karaka
    .map((k) => analyseKaraka(chart, k, careful, topic.name))
    .filter(Boolean) as KarakaAnalysis[];

  /*
   * Houses carry the verdict; the karaka only shades it. Weighting them equally
   * let a single exalted significator mark a topic "Supported" while every one
   * of its houses was under strain - which is exactly the kind of confident
   * wrong answer this panel exists to avoid.
   */
  const houseAvg = houses.reduce((s, h) => s + h.score, 0) / Math.max(1, houses.length);
  const karakaAvg = karakas.reduce((s, k) => s + k.score, 0) / Math.max(1, karakas.length);
  const score = houseAvg * 0.7 + karakaAvg * 0.3;

  const verdict: Verdict = score >= 1.5 ? 'Supported' : score <= -1.5 ? 'Demanding' : 'Mixed';

  const headline = careful
    ? verdict === 'Supported'
      ? 'The chart is not flagging strain here. Ask open questions rather than leading ones.'
      : verdict === 'Demanding'
        ? 'The chart shows load in this area. Describe the pressure and the coping style; do not name a condition.'
        : 'A mixed picture. Worth asking about rather than pronouncing on.'
    : verdict === 'Supported'
      ? 'Well supported. Say so plainly - clients rarely hear what is working.'
      : verdict === 'Demanding'
        ? 'Demanding. Expect effort and delay rather than absence; the area asks for work.'
        : 'Mixed. Genuine strengths and genuine friction, and the dasha decides which shows.';

  const strengths = [
    ...houses.filter((h) => h.score >= 2).map((h) => `${h.lord} handles the ${ordinal(h.house)} well.`),
    ...karakas.filter((k) => k.score >= 2).map((k) => `${k.planet} is strong as karaka.`),
  ];

  const cautions = [
    ...houses.filter((h) => h.score <= -2).map((h) =>
      `The ${ordinal(h.house)} is under pressure - ${h.lord} in the ${ordinal(h.lordHouse)}${h.lordDignity === 'Debilitated' ? ' and debilitated' : ''}.`),
    ...karakas.filter((k) => k.score <= -2).map((k) => `${k.planet} is weak as karaka.`),
  ];

  return { topicId: topic.id, verdict, score, headline, houses, karakas, strengths, cautions };
}

/* ------------------------- topic-specific timeline ------------------------- */

export interface TopicEvent {
  year: number;
  endYear: number;
  label: string;
  reason: string;
  guidance: string;
  kind: 'Mahadasha' | 'Antardasha' | 'Transit';
  isFuture: boolean;
  isCurrent: boolean;
  weight: number;
}

/**
 * Which planets carry this topic: the lords of its houses, its karakas, and
 * anything sitting in those houses. Their dasha periods are when the topic
 * becomes live, which is the question clients actually ask.
 */
function carriers(chart: ChartData, topic: Topic): Map<PlanetName, { reason: string; weight: number }> {
  const map = new Map<PlanetName, { reason: string; weight: number }>();

  const add = (planet: PlanetName, reason: string, weight: number) => {
    const existing = map.get(planet);
    if (!existing || existing.weight < weight) map.set(planet, { reason, weight });
  };

  for (const h of topic.houses) {
    add(lordOfHouse(h, chart.ascendantSign), `is lord of the ${ordinal(h)}`, 3);
  }
  for (const k of topic.karaka) {
    add(k, 'is the natural significator', 2);
  }
  for (const p of chart.placements) {
    if (topic.houses.includes(p.house)) add(p.planet, `sits in the ${ordinal(p.house)}`, 2);
  }

  return map;
}

export interface TopicEventOptions {
  yearsBack?: number;
  yearsForward?: number;
  limit?: number;
  now?: Date;
}

export function topicEvents(natal: NatalChart, topic: Topic, options: TopicEventOptions = {}): TopicEvent[] {
  const { yearsBack = 10, yearsForward = 10, limit = 6, now = new Date() } = options;
  const chart = natal.charts.D1;
  const carrying = carriers(chart, topic);
  const careful = Boolean(topic.handlingNote);

  const thisYear = now.getUTCFullYear();
  const from = new Date(Date.UTC(thisYear - yearsBack, 0, 1));
  const to = new Date(Date.UTC(thisYear + yearsForward, 11, 31));

  const events: TopicEvent[] = [];

  for (const period of periodsInWindow(natal.dashaTree, from, to)) {
    const carrier = carrying.get(period.lord);
    if (!carrier) continue;

    const startYear = new Date(period.start).getUTCFullYear();
    const endYear = new Date(period.end).getUTCFullYear();
    const isFuture = Date.parse(period.start) > now.getTime();
    const isCurrent = Date.parse(period.start) <= now.getTime() && now.getTime() < Date.parse(period.end);
    const isMaha = period.level === 'Maha';

    events.push({
      year: startYear,
      endYear,
      label: `${period.lord} ${isMaha ? 'mahadasha' : 'antardasha'}`,
      reason: `${period.lord} ${carrier.reason} for this topic.`,
      guidance: careful
        ? isCurrent
          ? 'This is running now, so anything in this area is live rather than remembered. Let them lead.'
          : isFuture
            ? 'A stretch where this theme is likely to be more present. Worth naming in advance so it is not a surprise.'
            : 'If something surfaced in this window, it probably showed here first. Ask openly.'
        : isCurrent
          ? 'Running now. Whatever is moving in this area, this is why.'
          : isFuture
            ? 'The topic becomes live again here. Plan around it rather than waiting for it.'
            : 'This is where the topic last moved. Ask what happened and check it against what they remember.',
      kind: isMaha ? 'Mahadasha' : 'Antardasha',
      isFuture,
      isCurrent,
      weight: carrier.weight * (isMaha ? 2 : 1),
    });
  }

  for (const t of natal.transits) {
    if (t.year < thisYear - yearsBack || t.year > thisYear + yearsForward) continue;

    const satHouse = ((((signIndex(t.saturnSign) - signIndex(chart.ascendantSign)) % 12) + 12) % 12 + 1) as HouseNumber;
    if (!topic.houses.includes(satHouse)) continue;

    events.push({
      year: t.year,
      endYear: t.year,
      label: `Saturn crosses the ${ordinal(satHouse)}`,
      reason: `Saturn transiting ${t.saturnSign} sits on one of this topic's houses.`,
      guidance: 'Slow, structural pressure on this area for the year. Consolidation rather than breakthrough.',
      kind: 'Transit',
      isFuture: t.year > thisYear,
      isCurrent: t.year === thisYear,
      weight: 1,
    });
  }

  /* Rank by significance, then present chronologically - the astrologer scans by
     date, but a mahadasha of the house lord matters more than a passing transit. */
  return events
    .sort((a, b) => b.weight - a.weight || Math.abs(a.year - thisYear) - Math.abs(b.year - thisYear))
    .slice(0, limit)
    .sort((a, b) => a.year - b.year);
}
