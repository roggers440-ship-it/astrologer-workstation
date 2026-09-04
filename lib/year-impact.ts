import type { HouseNumber, NatalChart, PlanetName, SignName } from '@/types/astrology';
import { housesAspectedBy, housesRuledBy, lordOfHouse, signIndex } from './vedic-constants';
import { hasExchange, houseDistance, mutualAspect, ordinal } from './rule-engine';
import { computeAshtakavarga, type Ashtakavarga } from './ashtakavarga';
import { periodsInWindow } from './dasha';
import { functionalNature } from './native-profile';
import { HOUSE_THEME } from './house-themes';

/**
 * Year impact.
 *
 * The previous timeline listed every dasha change and every transit as its own
 * entry, which produced three separate lines for one event and gave a routine
 * sub-period the same visual weight as a mahadasha change. It also had no way to
 * tell a loud year from a quiet one, so it showed all of them.
 *
 * This scores everything running concurrently in a year, drops the years that do
 * not clear a threshold, and writes one synthesised paragraph naming the domains
 * that several factors agree on. Convergence is the signal here exactly as it is
 * in the medical module: one factor pointing at the 7th is noise, three is a year
 * worth asking about.
 */

export type FactorKind =
  | 'maha' | 'antar' | 'sade-sati' | 'saturn-house' | 'saturn-return'
  | 'jupiter-house' | 'jupiter-return' | 'double-transit' | 'nodal';

export interface YearFactor {
  kind: FactorKind;
  weight: number;
  houses: HouseNumber[];
  planets: PlanetName[];
  /** Short clause, written to be joined into a sentence with others. */
  clause: string;
  /** Longer explanation, used once per year for the leading factor only. */
  why?: string;
  tone: 'supportive' | 'difficult' | 'mixed';
}

export interface YearReading {
  year: number;
  impact: number;
  band: 'Peak' | 'High' | 'Notable';
  tone: 'supportive' | 'difficult' | 'mixed';
  /** The synthesised paragraph. This is the whole point. */
  headline: string;
  /** Houses several factors agree on, strongest first. */
  domains: { house: HouseNumber; weight: number; theme: string }[];
  factors: YearFactor[];
  isPast: boolean;
  isCurrent: boolean;
}

const BENEFICS: PlanetName[] = ['Jupiter', 'Venus', 'Mercury', 'Moon'];

/** Houses a dasha lord activates: those it rules, plus the one it occupies. */
function activated(natal: NatalChart, planet: PlanetName): HouseNumber[] {
  const chart = natal.charts.D1;
  const place = chart.placements.find((p) => p.planet === planet);
  const ruled = housesRuledBy(planet, chart.ascendantSign);
  return [...new Set([...ruled, ...(place ? [place.house] : [])])];
}

function houseOfSign(chart: NatalChart['charts']['D1'], sign: SignName): HouseNumber {
  return ((((signIndex(sign) - signIndex(chart.ascendantSign)) % 12) + 12) % 12 + 1) as HouseNumber;
}

/**
 * Whether the sub-period lord and the major-period lord are connected. Classical
 * timing rests on this: an antardasha lord with no relationship to the mahadasha
 * lord tends to pass without event, however well placed it is.
 */
function linked(natal: NatalChart, a: PlanetName, b: PlanetName): string | null {
  const chart = natal.charts.D1;
  if (a === b) return null;
  const pa = chart.placements.find((p) => p.planet === a);
  const pb = chart.placements.find((p) => p.planet === b);
  if (!pa || !pb) return null;

  if (hasExchange(chart, a, b)) return 'they exchange signs';
  if (pa.house === pb.house) return 'they sit together';
  if (mutualAspect(chart, a, b)) return 'they aspect each other';
  return null;
}

export interface YearImpactOptions {
  yearsBack?: number;
  yearsForward?: number;
  /** Below this, a year is treated as quiet and dropped. */
  threshold?: number;
  now?: Date;
}

export function yearImpacts(natal: NatalChart, options: YearImpactOptions = {}): YearReading[] {
  const { yearsBack = 10, yearsForward = 10, threshold = 30, now = new Date() } = options;
  const chart = natal.charts.D1;
  const av = computeAshtakavarga(chart);
  const thisYear = now.getUTCFullYear();

  const moon = chart.placements.find((p) => p.planet === 'Moon');
  const natalSaturn = chart.placements.find((p) => p.planet === 'Saturn');
  const natalJupiter = chart.placements.find((p) => p.planet === 'Jupiter');

  const from = new Date(Date.UTC(thisYear - yearsBack, 0, 1));
  const to = new Date(Date.UTC(thisYear + yearsForward, 11, 31));
  const periods = periodsInWindow(natal.dashaTree, from, to);

  const byYear = new Map<number, YearFactor[]>();
  const add = (year: number, factor: YearFactor) => {
    if (year < thisYear - yearsBack || year > thisYear + yearsForward) return;
    byYear.set(year, [...(byYear.get(year) ?? []), factor]);
  };

  /* ------------------------------- periods -------------------------------- */

  for (const period of periods) {
    const startYear = new Date(period.start).getUTCFullYear();
    if (Date.parse(period.start) < from.getTime()) continue;

    const houses = activated(natal, period.lord);
    const nature = functionalNature(period.lord, chart.ascendantSign);
    const tone: YearFactor['tone'] =
      nature === 'Yogakaraka' || nature === 'Benefic' ? 'supportive'
      : nature === 'Malefic' ? 'difficult'
      : 'mixed';

    if (period.level === 'Maha') {
      add(startYear, {
        kind: 'maha',
        weight: 34,
        houses,
        planets: [period.lord],
        clause: `a new ${period.lord} chapter opens`,
        why: 'A mahadasha change resets the background conditions for years, so everything after this reads differently.',
        tone,
      });
      continue;
    }

    /* A sub-period only carries weight when it is connected to the chapter it
       sits inside, or when its lord is one of the chart's decisive planets. */
    const maha = periods.find(
      (m) => m.level === 'Maha' && Date.parse(m.start) <= Date.parse(period.start) && Date.parse(period.start) < Date.parse(m.end),
    );
    const link = maha ? linked(natal, period.lord, maha.lord) : null;
    const decisive = nature === 'Yogakaraka' || housesRuledBy(period.lord, chart.ascendantSign).some((h) => [8, 12].includes(h));

    add(startYear, {
      kind: 'antar',
      weight: 8 + (link ? 12 : 0) + (decisive ? 6 : 0),
      houses,
      planets: [period.lord],
      clause: link
        ? `${period.lord} takes the sub-period and ${link} with ${maha!.lord}`
        : `${period.lord} takes the sub-period`,
      why: link
        ? 'A sub-period lord connected to the chapter lord is what makes results land rather than simmer. Unconnected ones usually pass without event.'
        : undefined,
      tone,
    });
  }

  /* ------------------------------- transits -------------------------------- */

  for (const t of natal.transits) {
    const satHouse = houseOfSign(chart, t.saturnSign);
    const jupHouse = houseOfSign(chart, t.jupiterSign);
    const rahuHouse = houseOfSign(chart, t.rahuSign);
    const bindus = av.byHouse[satHouse];

    if (moon) {
      const fromMoon = houseDistance(moon.house, satHouse);
      if ([12, 1, 2].includes(fromMoon)) {
        const peak = fromMoon === 1;
        add(t.year, {
          kind: 'sade-sati',
          weight: peak ? 28 : 16,
          houses: [satHouse],
          planets: ['Saturn'],
          clause: peak
            ? 'Saturn sits directly on the natal Moon'
            : `sade sati is ${fromMoon === 12 ? 'opening' : 'closing'}`,
          why: peak
            ? 'The middle phase of sade sati is the one people actually feel. Sleep, workload and mood are the practical things to ask about.'
            : 'The flanking phases are lighter than the middle one, and there is a known end date - which is the most useful thing to say about it.',
          tone: 'difficult',
        });
      }
    }

    if (natalSaturn && t.saturnSign === natalSaturn.sign) {
      add(t.year, {
        kind: 'saturn-return',
        weight: 32,
        houses: [satHouse],
        planets: ['Saturn'],
        clause: 'Saturn returns to its birth position',
        why: 'The Saturn return reliably forces a reckoning about work, responsibility and what was built in the previous cycle. It is the single most-asked-about transit in a life.',
        tone: 'difficult',
      });
    }

    if ([1, 4, 7, 10, 8].includes(satHouse)) {
      add(t.year, {
        kind: 'saturn-house',
        weight: bindus < 25 ? 18 : 12,
        houses: [satHouse],
        planets: ['Saturn'],
        clause: `Saturn crosses ${HOUSE_THEME[satHouse]}`,
        why: bindus < 25
          ? `That part of the chart carries only ${bindus} bindus against an average of 28, so it is thinly supported to begin with and the transit bites harder than it would elsewhere.`
          : undefined,
        tone: 'difficult',
      });
    }

    if ([1, 4, 5, 7, 9, 10, 11].includes(jupHouse)) {
      add(t.year, {
        kind: 'jupiter-house',
        weight: 11,
        houses: [jupHouse],
        planets: ['Jupiter'],
        clause: `Jupiter opens up ${HOUSE_THEME[jupHouse]}`,
        tone: 'supportive',
      });
    }

    if (natalJupiter && t.jupiterSign === natalJupiter.sign) {
      add(t.year, {
        kind: 'jupiter-return',
        weight: 12,
        houses: [jupHouse],
        planets: ['Jupiter'],
        clause: 'Jupiter returns to its birth position',
        tone: 'supportive',
      });
    }

    /* Double transit - Saturn and Jupiter both touching one house is the
       classical event trigger, and neither planet alone means as much. */
    const satTouches = new Set([satHouse, ...housesAspectedBy('Saturn', satHouse)]);
    const jupTouches = new Set([jupHouse, ...housesAspectedBy('Jupiter', jupHouse)]);
    const both = [...satTouches].filter((h) => jupTouches.has(h)) as HouseNumber[];

    /* One factor for the year, not one per house - the same sentence repeated
       three times is what made the old timeline read as machine output. */
    const doubled = both.filter((h) => [1, 2, 4, 5, 7, 9, 10, 11].includes(h));
    if (doubled.length > 0) {
      const themes = doubled.map((h) => HOUSE_THEME[h]);
      add(t.year, {
        kind: 'double-transit',
        weight: 20 + (doubled.length - 1) * 6,
        houses: doubled,
        planets: ['Saturn', 'Jupiter'],
        clause:
          `Saturn and Jupiter both fall on ${themes.length > 1 ? `${themes.slice(0, -1).join('; ')} and ${themes[themes.length - 1]}` : themes[0]}`,
        tone: 'mixed',
      });
    }

    if (moon && (rahuHouse === moon.house || rahuHouse === 1)) {
      add(t.year, {
        kind: 'nodal',
        weight: 10,
        houses: [rahuHouse],
        planets: ['Rahu'],
        clause: `Rahu passes over ${rahuHouse === 1 ? 'the rising sign' : 'the natal Moon'}`,
        why: 'Nodal transits unsettle more than they damage. Expect restlessness and appetite rather than loss.',
        tone: 'mixed',
      });
    }
  }

  /* ------------------------------ synthesis -------------------------------- */

  const readings: YearReading[] = [];

  for (const [year, factors] of byYear) {
    /*
     * Diminishing returns. A straight sum let five ordinary factors outscore one
     * Saturn return, and saturated at the cap so the loudest years all looked
     * identical. Each additional factor contributes less than the last.
     */
    const impact = Math.round(
      [...factors]
        .sort((a, b) => b.weight - a.weight)
        .reduce((total, f, i) => total + f.weight * Math.pow(0.72, i), 0),
    );
    if (impact < threshold) continue;

    /* Domains: houses several factors agree on. Convergence again. */
    const weights = new Map<HouseNumber, number>();
    for (const f of factors) {
      for (const h of f.houses) weights.set(h, (weights.get(h) ?? 0) + f.weight / f.houses.length);
    }
    const domains = [...weights.entries()]
      .map(([house, weight]) => ({ house, weight, theme: HOUSE_THEME[house] }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);

    const difficult = factors.filter((f) => f.tone === 'difficult').reduce((s, f) => s + f.weight, 0);
    const supportive = factors.filter((f) => f.tone === 'supportive').reduce((s, f) => s + f.weight, 0);
    const tone: YearReading['tone'] =
      difficult > supportive * 1.6 ? 'difficult'
      : supportive > difficult * 1.6 ? 'supportive'
      : 'mixed';

    const band: YearReading['band'] = impact >= 55 ? 'Peak' : impact >= 35 ? 'High' : 'Notable';
    const isPast = year < thisYear;
    const isCurrent = year === thisYear;

    const ordered = [...factors].sort((a, b) => b.weight - a.weight);
    const lead = ordered[0];
    const second = ordered[1];

    /*
     * An explanation only earns its place when the factor is rare. Attaching one
     * to a double transit - which fires in most years - reproduced the template
     * problem a level up: every paragraph ending in the same paragraph of theory.
     */
    const explanation = ordered.find((f) => f.why)?.why;

    const domainPhrase =
      domains.length === 1
        ? domains[0].theme
        : `${domains.slice(0, -1).map((d) => d.theme).join('; ')}, and ${domains[domains.length - 1].theme}`;

    const load =
      tone === 'difficult'
        ? isPast
          ? 'A heavy year. If something broke or had to be rebuilt, it was probably this one.'
          : 'Expect load rather than opportunity. Worth naming early so it is planned around.'
        : tone === 'supportive'
          ? isPast
            ? 'A year that should have opened things up. Ask what started here.'
            : 'The supportive years are the ones to schedule decisions into.'
          : isPast
            ? 'Mixed - real movement, and it will have cost something.'
            : 'Movement in both directions. Change is likely; comfort is not guaranteed.';

    const convergence =
      factors.length >= 4
        ? ` ${factors.length} separate factors land in the same year, which is what marks it out.`
        : '';

    readings.push({
      year,
      impact,
      band,
      tone,
      domains,
      factors: ordered,
      isPast,
      isCurrent,
      headline:
        `${lead.clause.charAt(0).toUpperCase()}${lead.clause.slice(1)}` +
        (second ? `, while ${second.clause}` : '') +
        `. ${explanation ? `${explanation} ` : ''}` +
        `The weight falls on ${domainPhrase}. ${load}${convergence}`,
    });
  }

  return readings.sort((a, b) => a.year - b.year);
}
