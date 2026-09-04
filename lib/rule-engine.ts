import type {
  ChartData,
  ConsultationHook,
  HouseNumber,
  PlanetName,
  PlanetPlacement,
  Rule,
  RuleCondition,
} from '@/types/astrology';
import {
  SIGN_LORD, dignityOf, housesAspectedBy, lordOfHouse, PLANET_ABBR, signIndex,
} from './vedic-constants';

/**
 * A deliberately small evaluator. Rules are data, not code, so an astrologer can
 * extend the corpus in /lib/rules without touching this file.
 *
 * Semantics of a RuleCondition:
 *  - Conditions inside one rule are ANDed. Express OR by writing two rules.
 *  - `planet` picks the subject. `lordOfHouse` picks it by lordship instead.
 *  - `house` / `sign` / `dignity` / `isRetrograde` constrain that subject.
 *  - `aspectsHouse` and `conjunctionWith` test relationships.
 *  - `not: true` inverts the whole condition.
 */

function subjectPlanet(cond: RuleCondition, chart: ChartData): PlanetName | undefined {
  if (cond.planet) return cond.planet;
  if (cond.lordOfHouse) return lordOfHouse(cond.lordOfHouse, chart.ascendantSign);
  return undefined;
}

function placementOf(chart: ChartData, planet: PlanetName): PlanetPlacement | undefined {
  return chart.placements.find((p) => p.planet === planet);
}

/** Standard combustion orbs, in degrees from the Sun. */
const COMBUST_ORB: Partial<Record<PlanetName, number>> = {
  Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15,
};

export function isCombust(chart: ChartData, planet: PlanetName): boolean {
  const orb = COMBUST_ORB[planet];
  const self = chart.placements.find((p) => p.planet === planet);
  const sun = chart.placements.find((p) => p.planet === 'Sun');
  if (!orb || !self || !sun) return false;
  return Math.abs(((self.longitude - sun.longitude + 540) % 360) - 180) < orb;
}

/** Does A aspect B's house? Aspects in this system are one-directional by graha. */
export function aspects(chart: ChartData, from: PlanetName, to: PlanetName): boolean {
  const a = chart.placements.find((p) => p.planet === from);
  const b = chart.placements.find((p) => p.planet === to);
  if (!a || !b) return false;
  return housesAspectedBy(a.planet, a.house).includes(b.house);
}

export function mutualAspect(chart: ChartData, a: PlanetName, b: PlanetName): boolean {
  return aspects(chart, a, b) && aspects(chart, b, a);
}

/**
 * Parivartana. Two planets each occupy the sign the other rules.
 *
 * This is the strongest relationship two significators can have short of
 * conjunction: the houses effectively trade places, and each supplies the other.
 */
export function hasExchange(chart: ChartData, a: PlanetName, b: PlanetName): boolean {
  const pa = chart.placements.find((p) => p.planet === a);
  const pb = chart.placements.find((p) => p.planet === b);
  if (!pa || !pb || a === b) return false;
  return SIGN_LORD[pa.sign] === b && SIGN_LORD[pb.sign] === a;
}

export function houseDistance(from: HouseNumber, to: HouseNumber): number {
  return (((to - from) % 12) + 12) % 12 + 1;
}

function conjunctions(chart: ChartData, planet: PlanetName): PlanetName[] {
  const self = placementOf(chart, planet);
  if (!self) return [];
  return chart.placements.filter((p) => p.planet !== planet && p.house === self.house).map((p) => p.planet);
}

interface Match {
  ok: boolean;
  evidence?: string;
}

function evaluateCondition(cond: RuleCondition, chart: ChartData): Match {
  const planet = subjectPlanet(cond, chart);

  // House-only condition: "something occupies house N".
  if (!planet && cond.house) {
    const occupants = chart.placements.filter((p) => p.house === cond.house);
    const ok = occupants.length > 0;
    return finalize(cond, ok, `House ${cond.house}: ${occupants.map((o) => o.planet).join(', ') || 'empty'}`);
  }

  if (!planet) return finalize(cond, false);

  const pl = placementOf(chart, planet);
  if (!pl) return finalize(cond, false);

  let ok = true;
  if (cond.house !== undefined) ok &&= pl.house === cond.house;
  if (cond.sign !== undefined) ok &&= pl.sign === cond.sign;
  if (cond.isRetrograde !== undefined) ok &&= pl.isRetrograde === cond.isRetrograde;

  if (cond.dignity !== undefined) {
    const d = dignityOf(pl.planet, pl.sign);
    ok &&= cond.dignity === 'OwnSign' ? d === 'OwnSign' || d === 'Moolatrikona' : d === cond.dignity;
  }

  if (cond.aspectsHouse !== undefined) {
    ok &&= housesAspectedBy(pl.planet, pl.house).includes(cond.aspectsHouse);
  }

  if (cond.conjunctionWith !== undefined) {
    ok &&= conjunctions(chart, pl.planet).includes(cond.conjunctionWith);
  }

  if (cond.inHouses !== undefined) {
    ok &&= cond.inHouses.includes(pl.house);
  }

  if (cond.isCombust !== undefined) {
    ok &&= isCombust(chart, pl.planet) === cond.isCombust;
  }

  if (cond.housesFromMoon !== undefined) {
    const moon = chart.placements.find((p) => p.planet === 'Moon');
    ok &&= moon ? cond.housesFromMoon.includes(houseDistance(moon.house, pl.house)) : false;
  }

  /* Relational conditions. A planet ruling two houses can satisfy these against
     itself, which is meaningless, so self-matches are rejected. */
  if (cond.conjunctWithLordOf !== undefined) {
    const other = lordOfHouse(cond.conjunctWithLordOf, chart.ascendantSign);
    ok &&= other !== pl.planet && conjunctions(chart, pl.planet).includes(other);
  }

  if (cond.mutualAspectWithLordOf !== undefined) {
    const other = lordOfHouse(cond.mutualAspectWithLordOf, chart.ascendantSign);
    ok &&= other !== pl.planet && mutualAspect(chart, pl.planet, other);
  }

  if (cond.aspectedByLordOf !== undefined) {
    const other = lordOfHouse(cond.aspectedByLordOf, chart.ascendantSign);
    ok &&= other !== pl.planet && aspects(chart, other, pl.planet);
  }

  if (cond.exchangeWith !== undefined) {
    const other = lordOfHouse(cond.exchangeWith, chart.ascendantSign);
    ok &&= hasExchange(chart, pl.planet, other);
  }

  const lordship = cond.lordOfHouse ? ` (lord of ${ordinal(cond.lordOfHouse)})` : '';
  return finalize(cond, ok, `${pl.planet}${lordship} in ${pl.sign} ${pl.degree.toFixed(1)}, house ${pl.house}`);
}

function finalize(cond: RuleCondition, ok: boolean, evidence?: string): Match {
  return { ok: cond.not ? !ok : ok, evidence };
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function evaluateRules(chart: ChartData, rules: Rule[]): ConsultationHook[] {
  const hooks: ConsultationHook[] = [];

  for (const rule of rules) {
    const matches = rule.when.map((c) => evaluateCondition(c, chart));
    if (!matches.every((m) => m.ok)) continue;

    const evidence = matches.map((m) => m.evidence).filter(Boolean) as string[];

    for (const topicId of rule.topicIds) {
      hooks.push({
        id: `${rule.id}:${topicId}`,
        topicId,
        category: rule.category,
        title: rule.title,
        interpretiveGuideline: rule.interpretiveGuideline,
        cheatSheetNote: rule.cheatSheetNote,
        confidential: rule.confidential,
        strength: rule.strength ?? 'Moderate',
        evidence,
      });
    }
  }

  const order = { Strong: 0, Moderate: 1, Supporting: 2 } as const;
  return hooks.sort((a, b) => order[a.strength ?? 'Moderate'] - order[b.strength ?? 'Moderate']);
}

export function hooksForTopic(hooks: ConsultationHook[], topicId: number): ConsultationHook[] {
  return hooks.filter((h) => h.topicId === topicId);
}

/** Compact "Ma-Ke in 1" style descriptor used in chart cells and evidence chips. */
export function describePlacement(p: PlanetPlacement): string {
  const marks = [p.isExalted && '^', p.isDebilitated && 'v', p.isRetrograde && 'R'].filter(Boolean).join('');
  return `${PLANET_ABBR[p.planet]}${marks}`;
}

/** Planets occupying a house, for panel summaries. */
export function occupants(chart: ChartData, house: HouseNumber): PlanetPlacement[] {
  return chart.placements.filter((p) => p.house === house);
}
