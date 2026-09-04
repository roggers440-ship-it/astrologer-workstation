import type { ChartData, HouseNumber, PlanetName, SignName } from '@/types/astrology';
import { SIGN_LORD, dignityOf, signIndex } from './vedic-constants';
import { houseDistance, isCombust } from './rule-engine';

/**
 * Planetary strength beyond the four dignities.
 *
 * The app previously computed only exaltation, debilitation, own sign and
 * moolatrikona, and called everything else "Neutral". That collapses five
 * distinct states into one and hides real weakness - Saturn in Cancer sits in an
 * enemy's sign and is not neutral in any sense the tradition recognises.
 */

/* ------------------------- panchadha maitri ------------------------------- */

/** Naisargika: the permanent relationships, fixed for all charts. */
const PERMANENT: Record<PlanetName, { friends: PlanetName[]; enemies: PlanetName[] }> = {
  Sun:     { friends: ['Moon', 'Mars', 'Jupiter'],  enemies: ['Venus', 'Saturn'] },
  Moon:    { friends: ['Sun', 'Mercury'],           enemies: [] },
  Mars:    { friends: ['Sun', 'Moon', 'Jupiter'],   enemies: ['Mercury'] },
  Mercury: { friends: ['Sun', 'Venus'],             enemies: ['Moon'] },
  Jupiter: { friends: ['Sun', 'Moon', 'Mars'],      enemies: ['Mercury', 'Venus'] },
  Venus:   { friends: ['Mercury', 'Saturn'],        enemies: ['Sun', 'Moon'] },
  Saturn:  { friends: ['Mercury', 'Venus'],         enemies: ['Sun', 'Moon', 'Mars'] },
  Rahu:    { friends: ['Venus', 'Saturn'],          enemies: ['Sun', 'Moon', 'Mars'] },
  Ketu:    { friends: ['Mars', 'Venus', 'Saturn'],  enemies: ['Sun', 'Moon'] },
};

type Tier = 'permanent friend' | 'permanent neutral' | 'permanent enemy';

function permanentTier(subject: PlanetName, other: PlanetName): Tier {
  const rel = PERMANENT[subject];
  if (rel.friends.includes(other)) return 'permanent friend';
  if (rel.enemies.includes(other)) return 'permanent enemy';
  return 'permanent neutral';
}

/**
 * Tatkalika: temporary friendship from relative position. Planets in the 2nd,
 * 3rd, 4th, 10th, 11th and 12th from each other are temporary friends; the rest
 * are temporary enemies.
 */
function temporaryFriend(chart: ChartData, subject: PlanetName, other: PlanetName): boolean {
  const a = chart.placements.find((p) => p.planet === subject);
  const b = chart.placements.find((p) => p.planet === other);
  if (!a || !b) return false;
  return [2, 3, 4, 10, 11, 12].includes(houseDistance(a.house, b.house));
}

export type Maitri = 'Great friend' | 'Friend' | 'Neutral' | 'Enemy' | 'Great enemy';

/** The five-fold combination of permanent and temporary relationship. */
export function panchadhaMaitri(chart: ChartData, subject: PlanetName, other: PlanetName): Maitri {
  if (subject === other) return 'Great friend';
  const perm = permanentTier(subject, other);
  const temp = temporaryFriend(chart, subject, other);

  if (perm === 'permanent friend') return temp ? 'Great friend' : 'Neutral';
  if (perm === 'permanent neutral') return temp ? 'Friend' : 'Enemy';
  return temp ? 'Neutral' : 'Great enemy';
}

/* ---------------------------- full dignity -------------------------------- */

export type FullDignity =
  | 'Exalted' | 'Moolatrikona' | 'Own sign' | 'Great friend\u2019s sign' | 'Friend\u2019s sign'
  | 'Neutral sign' | 'Enemy\u2019s sign' | 'Great enemy\u2019s sign' | 'Debilitated';

/**
 * Dignity including the relationship layer, which is what makes "Saturn in
 * Cancer" readable. Ranked so callers can score without a lookup table.
 */
export function fullDignity(chart: ChartData, planet: PlanetName): { state: FullDignity; score: number; plain: string } {
  const p = chart.placements.find((x) => x.planet === planet);
  if (!p) return { state: 'Neutral sign', score: 0, plain: 'unclear' };

  const base = dignityOf(planet, p.sign, p.degree);
  if (base === 'Exalted') return { state: 'Exalted', score: 5, plain: 'at its strongest' };
  if (base === 'Debilitated') return { state: 'Debilitated', score: -5, plain: 'struggling' };
  if (base === 'Moolatrikona') return { state: 'Moolatrikona', score: 4, plain: 'very comfortable' };
  if (base === 'OwnSign') return { state: 'Own sign', score: 3, plain: 'at home' };

  const dispositor = SIGN_LORD[p.sign];
  const rel = panchadhaMaitri(chart, planet, dispositor);

  switch (rel) {
    case 'Great friend': return { state: 'Great friend\u2019s sign', score: 3, plain: 'well hosted' };
    case 'Friend':       return { state: 'Friend\u2019s sign', score: 2, plain: 'comfortable' };
    case 'Neutral':      return { state: 'Neutral sign', score: 0, plain: 'neither helped nor hindered' };
    case 'Enemy':        return { state: 'Enemy\u2019s sign', score: -2, plain: 'unwelcome where it sits' };
    case 'Great enemy':  return { state: 'Great enemy\u2019s sign', score: -4, plain: 'badly placed and unsupported' };
  }
}

/* ------------------------------- digbala ---------------------------------- */

/** Houses of full directional strength. */
const DIGBALA_HOUSE: Record<PlanetName, HouseNumber | null> = {
  Jupiter: 1, Mercury: 1,
  Sun: 10, Mars: 10,
  Saturn: 7,
  Moon: 4, Venus: 4,
  Rahu: null, Ketu: null,
};

export interface Digbala {
  /** 0-1, full at the strong house and zero at the house opposite it. */
  value: number;
  strongHouse: HouseNumber | null;
  plain: string | null;
}

export function digbala(chart: ChartData, planet: PlanetName): Digbala {
  const p = chart.placements.find((x) => x.planet === planet);
  const strongHouse = DIGBALA_HOUSE[planet];
  if (!p || strongHouse === null) return { value: 0.5, strongHouse: null, plain: null };

  /* Strength falls off linearly with distance from the ideal house, reaching
     zero at the opposite one. Six houses of separation is the maximum. */
  const distance = Math.min(
    Math.abs(p.house - strongHouse),
    12 - Math.abs(p.house - strongHouse),
  );
  const value = 1 - distance / 6;

  const plain =
    value >= 0.95 ? `${planet} is in the best possible house for its own kind of strength.`
    : value >= 0.75 ? `${planet} has good directional strength here.`
    : value <= 0.1 ? `${planet} is in the weakest house for it by direction, whatever else the chart says.`
    : null;

  return { value, strongHouse, plain };
}

/* --------------------------- combined summary ----------------------------- */

export interface PlanetStrength {
  planet: PlanetName;
  dignity: FullDignity;
  dignityScore: number;
  dignityPlain: string;
  digbala: number;
  combust: boolean;
  retrograde: boolean;
  /** -10 to +10, for ordering and for the bar. */
  net: number;
  /** Short plain sentences, only the ones that apply. */
  notes: string[];
}

export function planetStrength(chart: ChartData, planet: PlanetName): PlanetStrength {
  const p = chart.placements.find((x) => x.planet === planet)!;
  const dig = fullDignity(chart, planet);
  const dir = digbala(chart, planet);
  const combust = isCombust(chart, planet);

  let net = dig.score + (dir.value - 0.5) * 4;
  if (combust) net -= 4;

  const notes: string[] = [];
  if (dir.plain) notes.push(dir.plain);
  if (combust) notes.push(`${planet} is too close to the Sun to work properly.`);
  if (p.isRetrograde && !['Rahu', 'Ketu'].includes(planet)) {
    notes.push(`${planet} is moving backwards, so it gives its results late and inwardly first.`);
  }

  /* The interesting case is a planet strong on one measure and weak on another -
     that tension is what a practitioner resolves out loud, and it is invisible
     if the two are averaged into a single number. */
  if (dig.score <= -2 && dir.value >= 0.75) {
    notes.push(
      `Worth holding both facts at once: ${planet} is ${dig.plain} by sign but strongly placed by direction. It performs better than its sign suggests.`,
    );
  }
  if (dig.score >= 3 && dir.value <= 0.25) {
    notes.push(
      `${planet} is ${dig.plain} by sign but poorly placed by direction, so it promises more than it delivers.`,
    );
  }

  return {
    planet,
    dignity: dig.state,
    dignityScore: dig.score,
    dignityPlain: dig.plain,
    digbala: dir.value,
    combust,
    retrograde: p.isRetrograde,
    net: Math.max(-10, Math.min(10, net)),
    notes,
  };
}

/* ------------------------------ chandra lagna ----------------------------- */

/**
 * The same twelve houses counted from the Moon rather than the ascendant.
 * Standard practice reads both; a house strong from the lagna and weak from the
 * Moon is a genuinely different situation from one strong in both.
 */
export function houseFromMoon(chart: ChartData, house: HouseNumber): HouseNumber | null {
  const moon = chart.placements.find((p) => p.planet === 'Moon');
  if (!moon) return null;
  return houseDistance(moon.house, house) as HouseNumber;
}

/** Which sign falls on a given house counted from the Moon. */
export function signFromMoon(chart: ChartData, houseFromTheMoon: number): SignName | null {
  const moon = chart.placements.find((p) => p.planet === 'Moon');
  if (!moon) return null;
  const SIGNS_ORDER = Object.keys(SIGN_LORD) as SignName[];
  return SIGNS_ORDER[(signIndex(moon.sign) + houseFromTheMoon - 1) % 12];
}
