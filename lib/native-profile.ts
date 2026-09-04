import type { ChartData, HouseNumber, PlanetName, SignName } from '@/types/astrology';
import {
  DUSTHANA_HOUSES, KENDRA_HOUSES, TRIKONA_HOUSES,
  dignityOf, housesRuledBy, lordOfHouse, SIGNS, SIGN_LORD, signIndex,
} from './vedic-constants';
import { ordinal } from './rule-engine';

/**
 * The native's constants: functional benefics and malefics for this lagna, and
 * the colours, days and numbers that follow from them, plus two classical age
 * measures.
 *
 * Functional nature is lagna-specific and is the thing most often got wrong in
 * consumer apps - Saturn is a malefic by nature but the single best planet in
 * the chart for a Taurus or Libra lagna. Everything on these cards derives from
 * that classification rather than from the planets' natural character.
 */

export type FunctionalNature = 'Yogakaraka' | 'Benefic' | 'Neutral' | 'Maraka' | 'Malefic';

interface PlanetAttributes {
  colours: string[];
  day: string | null;
  number: number;
  gem: string;
  metal: string;
}

/** Numbers follow the Indian/Chaldean assignment used with Vedic charts. */
export const PLANET_ATTRIBUTES: Record<PlanetName, PlanetAttributes> = {
  Sun:     { colours: ['Copper', 'Deep orange', 'Saffron'], day: 'Sunday',    number: 1, gem: 'Ruby',           metal: 'Gold' },
  Moon:    { colours: ['White', 'Cream', 'Silver'],         day: 'Monday',    number: 2, gem: 'Pearl',          metal: 'Silver' },
  Mars:    { colours: ['Red', 'Scarlet', 'Coral'],          day: 'Tuesday',   number: 9, gem: 'Red coral',      metal: 'Copper' },
  Mercury: { colours: ['Green', 'Emerald', 'Olive'],        day: 'Wednesday', number: 5, gem: 'Emerald',        metal: 'Brass' },
  Jupiter: { colours: ['Yellow', 'Gold', 'Turmeric'],       day: 'Thursday',  number: 3, gem: 'Yellow sapphire', metal: 'Gold' },
  Venus:   { colours: ['White', 'Pastel pink', 'Silver'],   day: 'Friday',    number: 6, gem: 'Diamond',        metal: 'Silver' },
  Saturn:  { colours: ['Dark blue', 'Black', 'Indigo'],     day: 'Saturday',  number: 8, gem: 'Blue sapphire',  metal: 'Iron' },
  Rahu:    { colours: ['Smoky grey', 'Ultramarine'],        day: null,        number: 4, gem: 'Hessonite',      metal: 'Lead' },
  Ketu:    { colours: ['Brown', 'Multicoloured', 'Grey'],   day: null,        number: 7, gem: "Cat's eye",      metal: 'Mixed' },
};

/**
 * Parashari functional nature.
 *
 * Trikona lords are benefic, 3/6/11 lords malefic, 8/12 lords malefic, 2/7 lords
 * maraka. A planet owning both a kendra and a trikona is a yogakaraka - the
 * single most useful planet in the chart. Natural benefics owning kendras lose
 * benefic strength (kendradhipati dosha); natural malefics owning kendras gain.
 * Rahu and Ketu own nothing and take their nature from their dispositor.
 */
export function functionalNature(
  planet: PlanetName,
  ascendant: SignName,
  chart?: ChartData,
): FunctionalNature {
  const owned = housesRuledBy(planet, ascendant);

  /*
   * Rahu and Ketu rule no house in the bhava scheme, so lordship cannot classify
   * them. The standard resolution is to read them through their dispositor, which
   * is strictly better than the flat "Neutral" this returned before - a node in
   * the sign of a yogakaraka is not neutral in any practical sense.
   */
  if (owned.length === 0) {
    if (!chart || !['Rahu', 'Ketu'].includes(planet)) return 'Neutral';
    const place = chart.placements.find((p) => p.planet === planet);
    if (!place) return 'Neutral';
    const dispositor = SIGN_LORD[place.sign];
    return dispositor === planet ? 'Neutral' : functionalNature(dispositor, ascendant, chart);
  }

  const ownsKendra = owned.some((h) => KENDRA_HOUSES.includes(h));
  const ownsTrikona = owned.some((h) => TRIKONA_HOUSES.includes(h) && h !== 1);
  const ownsLagna = owned.includes(1);

  if (ownsKendra && ownsTrikona) return 'Yogakaraka';
  if (ownsTrikona || ownsLagna) return 'Benefic';
  if (owned.some((h) => [8, 12].includes(h))) return 'Malefic';
  if (owned.some((h) => [3, 6, 11].includes(h))) return 'Malefic';
  if (owned.some((h) => [2, 7].includes(h))) return 'Maraka';
  return 'Neutral';
}

export interface RemedialProfile {
  favourable: {
    planets: { planet: PlanetName; nature: FunctionalNature; why: string }[];
    colours: string[];
    days: string[];
    numbers: number[];
    gems: string[];
  };
  unfavourable: {
    planets: { planet: PlanetName; nature: FunctionalNature; why: string }[];
    colours: string[];
    days: string[];
    numbers: number[];
  };
}

export function remedialProfile(chart: ChartData): RemedialProfile {
  const asc = chart.ascendantSign;
  const rated = chart.placements.map((p) => ({
    planet: p.planet,
    nature: functionalNature(p.planet, asc, chart),
    owned: housesRuledBy(p.planet, asc),
  }));

  const describe = (r: (typeof rated)[number]) =>
    r.owned.length
      ? `Rules the ${r.owned.map(ordinal).join(' and ')}.`
      : 'Owns no house; takes its nature from its dispositor.';

  const good = rated.filter((r) => r.nature === 'Yogakaraka' || r.nature === 'Benefic');
  const bad = rated.filter((r) => r.nature === 'Malefic');

  const uniq = <T,>(xs: T[]) => [...new Set(xs)];

  return {
    favourable: {
      planets: good.map((r) => ({ planet: r.planet, nature: r.nature, why: describe(r) })),
      colours: uniq(good.flatMap((r) => PLANET_ATTRIBUTES[r.planet].colours)),
      days: uniq(good.map((r) => PLANET_ATTRIBUTES[r.planet].day).filter(Boolean) as string[]),
      numbers: uniq(good.map((r) => PLANET_ATTRIBUTES[r.planet].number)).sort((a, b) => a - b),
      gems: uniq(good.map((r) => PLANET_ATTRIBUTES[r.planet].gem)),
    },
    unfavourable: {
      planets: bad.map((r) => ({ planet: r.planet, nature: r.nature, why: describe(r) })),
      colours: uniq(bad.flatMap((r) => PLANET_ATTRIBUTES[r.planet].colours)),
      days: uniq(bad.map((r) => PLANET_ATTRIBUTES[r.planet].day).filter(Boolean) as string[]),
      numbers: uniq(bad.map((r) => PLANET_ATTRIBUTES[r.planet].number)).sort((a, b) => a - b),
    },
  };
}

/* ----------------------------- bhagyodaya ---------------------------------- */

/**
 * Bhagyodaya - the age at which fortune is classically said to rise.
 *
 * Determined by the planet occupying the 9th, falling back to the 9th lord when
 * the house is empty. Schools disagree on the age table and on which planet to
 * read; this uses the common assignment. Treat it as a decade to watch rather
 * than a birthday.
 */
const BHAGYODAYA_AGE: Record<PlanetName, number> = {
  Jupiter: 16, Sun: 22, Moon: 24, Venus: 25, Mars: 28,
  Mercury: 32, Saturn: 36, Rahu: 42, Ketu: 48,
};

export interface Bhagyodaya {
  age: number;
  via: PlanetName;
  basis: 'occupant of the 9th' | 'lord of the 9th';
  note: string;
}

export function bhagyodaya(chart: ChartData): Bhagyodaya {
  const occupants = chart.placements.filter((p) => p.house === 9);

  const rank = (planet: PlanetName, sign: SignName) => {
    const d = dignityOf(planet, sign);
    return d === 'Exalted' ? 3 : d === 'Moolatrikona' ? 2 : d === 'OwnSign' ? 1 : d === 'Debilitated' ? -1 : 0;
  };

  const strongest = [...occupants].sort((a, b) => rank(b.planet, b.sign) - rank(a.planet, a.sign))[0];
  const via = strongest?.planet ?? lordOfHouse(9, chart.ascendantSign);
  const basis = strongest ? 'occupant of the 9th' : 'lord of the 9th';

  return {
    age: BHAGYODAYA_AGE[via],
    via,
    basis,
    note:
      `Read from ${via} as ${basis}. Classical texts put the turn around ${BHAGYODAYA_AGE[via]}; ` +
      'in practice it marks the decade when effort starts converting, not a single year.',
  };
}

/* ------------------------------- ayurdaya ---------------------------------- */

export type AyushBand = 'Alpayu' | 'Madhyayu' | 'Purnayu';

export interface AyurdayaReading {
  band: AyushBand;
  approximateRange: string;
  pairs: { pair: string; verdict: AyushBand }[];
  caution: string;
}

type Modality = 'movable' | 'fixed' | 'dual';

function modality(sign: SignName): Modality {
  const i = signIndex(sign) % 3;
  return i === 0 ? 'movable' : i === 1 ? 'fixed' : 'dual';
}

/** BPHS pair rule: the combination of modalities decides the band. */
function pairVerdict(a: Modality, b: Modality): AyushBand {
  const key = [a, b].sort().join('-');
  switch (key) {
    case 'movable-movable': return 'Alpayu';
    case 'fixed-fixed': return 'Purnayu';
    case 'dual-dual': return 'Madhyayu';
    case 'fixed-movable': return 'Madhyayu';
    case 'dual-movable': return 'Purnayu';
    case 'dual-fixed': return 'Alpayu';
    default: return 'Madhyayu';
  }
}

/**
 * Ayurdaya band by the three-pair method. Practitioner reference only.
 *
 * This is deliberately a band and never a date. The classical ayurdaya schemes -
 * Pindayu, Amsayu, Naisargika - routinely disagree with each other by decades on
 * the same chart, which is the strongest evidence available that none of them
 * should be spoken aloud to a client. It is here because a practitioner asked
 * for it and it is gated behind the same reveal as topic 9.
 */
export function ayurdaya(chart: ChartData): AyurdayaReading {
  const at = (p: PlanetName) => chart.placements.find((x) => x.planet === p);

  const lagnaLord = lordOfHouse(1, chart.ascendantSign);
  const eighthLord = lordOfHouse(8, chart.ascendantSign);

  const pairs: { pair: string; verdict: AyushBand }[] = [];

  const l = at(lagnaLord), e = at(eighthLord);
  if (l && e) {
    pairs.push({ pair: `Lagna lord ${lagnaLord} and 8th lord ${eighthLord}`, verdict: pairVerdict(modality(l.sign), modality(e.sign)) });
  }

  const moon = at('Moon'), saturn = at('Saturn');
  if (moon && saturn) {
    pairs.push({ pair: 'Moon and Saturn', verdict: pairVerdict(modality(moon.sign), modality(saturn.sign)) });
  }

  const sun = at('Sun');
  if (sun) {
    pairs.push({ pair: 'Lagna and Sun', verdict: pairVerdict(modality(chart.ascendantSign), modality(sun.sign)) });
  }

  const tally = pairs.reduce<Record<AyushBand, number>>(
    (acc, p) => ({ ...acc, [p.verdict]: acc[p.verdict] + 1 }),
    { Alpayu: 0, Madhyayu: 0, Purnayu: 0 },
  );

  const band = (Object.keys(tally) as AyushBand[]).sort((a, b) => tally[b] - tally[a])[0];

  return {
    band,
    approximateRange:
      band === 'Alpayu' ? 'under 32 years by the classical reckoning'
      : band === 'Madhyayu' ? '32 to 64 years by the classical reckoning'
      : '64 to 100 years by the classical reckoning',
    pairs,
    caution:
      'Bands, not dates. The classical schemes disagree with each other by decades on the same chart, ' +
      'and balarishta and other cancellations override this entirely. Never spoken to a client.',
  };
}
