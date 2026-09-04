import type { PlanetName, SignName, HouseNumber, Dignity } from '@/types/astrology';

export const SIGNS: SignName[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const PLANETS: PlanetName[] = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu',
];

/** Two-letter glyphs for the chart cells. */
export const PLANET_ABBR: Record<PlanetName, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju',
  Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

export const SIGN_LORD: Record<SignName, PlanetName> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

/** Exaltation sign and exact degree of deepest exaltation. */
export const EXALTATION: Partial<Record<PlanetName, { sign: SignName; degree: number }>> = {
  Sun: { sign: 'Aries', degree: 10 },
  Moon: { sign: 'Taurus', degree: 3 },
  Mars: { sign: 'Capricorn', degree: 28 },
  Mercury: { sign: 'Virgo', degree: 15 },
  Jupiter: { sign: 'Cancer', degree: 5 },
  Venus: { sign: 'Pisces', degree: 27 },
  Saturn: { sign: 'Libra', degree: 20 },
  /*
   * Node dignities follow Parasara as given in Narasimha Rao's table: Rahu
   * exalted in Gemini and owning Aquarius, Ketu exalted in Sagittarius and owning
   * Scorpio. The popular alternative puts them in Taurus and Scorpio; it is a
   * genuine school split rather than an error, and swapping these two lines is
   * all that is needed to follow the other one.
   */
  Rahu: { sign: 'Gemini', degree: 20 },
  Ketu: { sign: 'Sagittarius', degree: 20 },
};

/** Signs the nodes own. Kept separate from SIGN_LORD, which drives house rulership. */
export const NODE_OWN: Record<'Rahu' | 'Ketu', SignName> = {
  Rahu: 'Aquarius',
  Ketu: 'Scorpio',
};

export function oppositeSign(sign: SignName): SignName {
  return SIGNS[(SIGNS.indexOf(sign) + 6) % 12];
}

export const DEBILITATION: Partial<Record<PlanetName, { sign: SignName; degree: number }>> =
  Object.fromEntries(
    Object.entries(EXALTATION).map(([p, v]) => [p, { sign: oppositeSign(v!.sign), degree: v!.degree }]),
  ) as Partial<Record<PlanetName, { sign: SignName; degree: number }>>;

export const MOOLATRIKONA: Partial<Record<PlanetName, SignName>> = {
  Sun: 'Leo', Moon: 'Taurus', Mars: 'Aries', Mercury: 'Virgo',
  Jupiter: 'Sagittarius', Venus: 'Libra', Saturn: 'Aquarius',
  Rahu: 'Virgo', Ketu: 'Pisces',
};

/**
 * Moolatrikona is a degree range, not a whole sign, and the states stack inside
 * one sign.
 *
 * Mercury in Virgo is exalted only to 15 degrees, moolatrikona to 20, own sign
 * thereafter. The Moon is exalted only in the first 3 degrees of Taurus and
 * moolatrikona across the remaining 27. Treating the whole sign as exaltation -
 * which this file did until now - overstates half the charts that have a planet
 * in one of these signs.
 *
 * Ranges as given in Narasimha Rao, "Vedic Astrology: An Integrated Approach",
 * section 3.3.
 */
export const DIGNITY_RANGES: Partial<
  Record<PlanetName, { sign: SignName; bands: { upto: number; state: Dignity }[] }>
> = {
  Sun:     { sign: 'Leo',         bands: [{ upto: 20, state: 'Moolatrikona' }, { upto: 30, state: 'OwnSign' }] },
  Moon:    { sign: 'Taurus',      bands: [{ upto: 3,  state: 'Exalted' },      { upto: 30, state: 'Moolatrikona' }] },
  Mars:    { sign: 'Aries',       bands: [{ upto: 12, state: 'Moolatrikona' }, { upto: 30, state: 'OwnSign' }] },
  Mercury: { sign: 'Virgo',       bands: [{ upto: 15, state: 'Exalted' },      { upto: 20, state: 'Moolatrikona' }, { upto: 30, state: 'OwnSign' }] },
  Jupiter: { sign: 'Sagittarius', bands: [{ upto: 10, state: 'Moolatrikona' }, { upto: 30, state: 'OwnSign' }] },
  Venus:   { sign: 'Libra',       bands: [{ upto: 15, state: 'Moolatrikona' }, { upto: 30, state: 'OwnSign' }] },
  Saturn:  { sign: 'Aquarius',    bands: [{ upto: 20, state: 'Moolatrikona' }, { upto: 30, state: 'OwnSign' }] },
};

/**
 * Special Vedic aspects (drishti) by house-distance. Every planet aspects the 7th.
 * Rahu/Ketu aspects follow the 5-7-9 convention used by most modern schools;
 * flip RAHU_KETU_ASPECTS to [7] if your tradition disagrees.
 */
export const SPECIAL_ASPECTS: Record<PlanetName, number[]> = {
  Sun: [7], Moon: [7], Mercury: [7], Venus: [7],
  Mars: [4, 7, 8],
  Jupiter: [5, 7, 9],
  Saturn: [3, 7, 10],
  Rahu: [5, 7, 9],
  Ketu: [5, 7, 9],
};

export const KENDRA_HOUSES: HouseNumber[] = [1, 4, 7, 10];
export const TRIKONA_HOUSES: HouseNumber[] = [1, 5, 9];
export const DUSTHANA_HOUSES: HouseNumber[] = [6, 8, 12];
export const UPACHAYA_HOUSES: HouseNumber[] = [3, 6, 10, 11];

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

/** Vimshottari order and period lengths in years. Sums to 120. */
export const VIMSHOTTARI_ORDER: PlanetName[] = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
];

export const VIMSHOTTARI_YEARS: Record<PlanetName, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

export const NAKSHATRA_ARC = 360 / 27; // 13 deg 20 min

/* ----------------------------- derived helpers ---------------------------- */

export function signIndex(sign: SignName): number {
  return SIGNS.indexOf(sign);
}

/** Whole-sign house map anchored on the ascendant. */
export function houseSignsFor(ascendant: SignName): Record<HouseNumber, SignName> {
  const start = signIndex(ascendant);
  const map = {} as Record<HouseNumber, SignName>;
  for (let h = 1; h <= 12; h++) map[h as HouseNumber] = SIGNS[(start + h - 1) % 12];
  return map;
}

/** Which house does `planet` rule, given this ascendant? Mercury/Venus etc. rule two. */
export function housesRuledBy(planet: PlanetName, ascendant: SignName): HouseNumber[] {
  const map = houseSignsFor(ascendant);
  return (Object.keys(map) as unknown as HouseNumber[])
    .map(Number)
    .filter((h) => SIGN_LORD[map[h as HouseNumber]] === planet) as HouseNumber[];
}

/** The ruling planet of a given house. Rahu/Ketu never own houses in this scheme. */
export function lordOfHouse(house: HouseNumber, ascendant: SignName): PlanetName {
  return SIGN_LORD[houseSignsFor(ascendant)[house]];
}

/**
 * Dignity, degree-aware when a degree is supplied.
 *
 * The degree argument is optional so existing callers keep working, but any
 * caller holding a placement should pass it - without it Mercury at 25 Virgo
 * reads as exalted when Parasara has it in its own sign.
 */
export function dignityOf(planet: PlanetName, sign: SignName, degree?: number): Dignity {
  const range = DIGNITY_RANGES[planet];
  if (range && range.sign === sign && degree !== undefined) {
    return (range.bands.find((b) => degree < b.upto) ?? range.bands[range.bands.length - 1]).state;
  }

  if (EXALTATION[planet]?.sign === sign) return 'Exalted';
  if (DEBILITATION[planet]?.sign === sign) return 'Debilitated';
  if (MOOLATRIKONA[planet] === sign) return 'Moolatrikona';
  if (SIGN_LORD[sign] === planet) return 'OwnSign';
  if (NODE_OWN[planet as 'Rahu' | 'Ketu'] === sign) return 'OwnSign';
  return 'Neutral';
}

/** House aspected by a planet sitting in `from`, at house-distance `n`. */
export function aspectedHouse(from: HouseNumber, n: number): HouseNumber {
  return (((from - 1 + (n - 1)) % 12) + 1) as HouseNumber;
}

export function housesAspectedBy(planet: PlanetName, from: HouseNumber): HouseNumber[] {
  return SPECIAL_ASPECTS[planet].map((n) => aspectedHouse(from, n));
}

export function nakshatraOf(longitude: number): { name: string; index: number; pada: 1 | 2 | 3 | 4 } {
  const norm = ((longitude % 360) + 360) % 360;
  const index = Math.floor(norm / NAKSHATRA_ARC);
  const within = norm - index * NAKSHATRA_ARC;
  const pada = (Math.floor(within / (NAKSHATRA_ARC / 4)) + 1) as 1 | 2 | 3 | 4;
  return { name: NAKSHATRAS[index], index, pada };
}
