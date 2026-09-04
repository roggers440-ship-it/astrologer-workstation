import type { ChartData, HouseNumber, PlanetName, SignName } from '@/types/astrology';
import { SIGNS, signIndex } from './vedic-constants';

/**
 * Ashtakavarga.
 *
 * The classical numeric strength measure, and the reason it matters here: it
 * replaces an invented 0-100 score with one that has an eight-hundred-year
 * pedigree and that practitioners already quote to each other.
 *
 * Seven planets plus the lagna each contribute a bindu to specified houses
 * counted from their own position. Tables are B.V. Raman's, which follow
 * Parashara. The totals are invariant for every chart - Sun 48, Moon 49, Mars 39,
 * Mercury 54, Jupiter 56, Venus 52, Saturn 39, summing to 337 - which gives the
 * system a built-in checksum that `verify()` below asserts on every computation.
 *
 * Rahu and Ketu are excluded, as Parashara prescribes.
 */

export type AVPlanet = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';
type Contributor = AVPlanet | 'Lagna';

export const AV_PLANETS: AVPlanet[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

/** Benefic places for each planet's own chart, counted from each contributor. */
const BENEFIC_PLACES: Record<AVPlanet, Record<Contributor, number[]>> = {
  Sun: {
    Sun: [1, 2, 4, 7, 8, 9, 10, 11],
    Moon: [3, 6, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [3, 5, 6, 9, 10, 11, 12],
    Jupiter: [5, 6, 9, 11],
    Venus: [6, 7, 12],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [3, 4, 6, 10, 11, 12],
  },
  Moon: {
    Sun: [3, 6, 7, 8, 10, 11],
    Moon: [1, 3, 6, 7, 10, 11],
    Mars: [2, 3, 5, 6, 9, 10, 11],
    Mercury: [1, 3, 4, 5, 7, 8, 10, 11],
    Jupiter: [1, 4, 7, 8, 10, 11, 12],
    Venus: [3, 4, 5, 7, 9, 10, 11],
    Saturn: [3, 5, 6, 11],
    Lagna: [3, 6, 10, 11],
  },
  Mars: {
    Sun: [3, 5, 6, 10, 11],
    Moon: [3, 6, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [3, 5, 6, 11],
    Jupiter: [6, 10, 11, 12],
    Venus: [6, 8, 11, 12],
    Saturn: [1, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 3, 6, 10, 11],
  },
  Mercury: {
    Sun: [5, 6, 9, 11, 12],
    Moon: [2, 4, 6, 8, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [1, 3, 5, 6, 9, 10, 11, 12],
    Jupiter: [6, 8, 11, 12],
    Venus: [1, 2, 3, 4, 5, 8, 9, 11],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 2, 4, 6, 8, 10, 11],
  },
  Jupiter: {
    Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11],
    Moon: [2, 5, 7, 9, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [1, 2, 4, 5, 6, 9, 10, 11],
    Jupiter: [1, 2, 3, 4, 7, 8, 10, 11],
    Venus: [2, 5, 6, 9, 10, 11],
    Saturn: [3, 5, 6, 12],
    Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  Venus: {
    Sun: [8, 11, 12],
    Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12],
    Mars: [3, 5, 6, 9, 11, 12],
    Mercury: [3, 5, 6, 9, 11],
    Jupiter: [5, 8, 9, 10, 11],
    Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    Saturn: [3, 4, 5, 8, 9, 10, 11],
    Lagna: [1, 2, 3, 4, 5, 8, 9, 11],
  },
  Saturn: {
    Sun: [1, 2, 4, 7, 8, 10, 11],
    Moon: [3, 6, 11],
    Mars: [3, 5, 6, 10, 11, 12],
    Mercury: [6, 8, 9, 10, 11, 12],
    Jupiter: [5, 6, 11, 12],
    Venus: [6, 11, 12],
    Saturn: [3, 5, 6, 11],
    Lagna: [1, 3, 4, 6, 10, 11],
  },
};

/** Invariant totals. Any deviation means the tables have been corrupted. */
export const EXPECTED_TOTAL: Record<AVPlanet, number> = {
  Sun: 48, Moon: 49, Mars: 39, Mercury: 54, Jupiter: 56, Venus: 52, Saturn: 39,
};

export interface Ashtakavarga {
  /** Bindus per sign for each planet's own chart. */
  bhinna: Record<AVPlanet, Record<SignName, number>>;
  /** Sum across all seven, per sign. Always totals 337. */
  sarva: Record<SignName, number>;
  /** Sarva re-indexed by house, using the chart's ascendant. */
  byHouse: Record<HouseNumber, number>;
}

const emptySigns = (): Record<SignName, number> =>
  Object.fromEntries(SIGNS.map((s) => [s, 0])) as Record<SignName, number>;

export function computeAshtakavarga(chart: ChartData): Ashtakavarga {
  const positions: Record<Contributor, number> = {
    Sun: 0, Moon: 0, Mars: 0, Mercury: 0, Jupiter: 0, Venus: 0, Saturn: 0,
    Lagna: signIndex(chart.ascendantSign),
  };

  for (const p of chart.placements) {
    if ((AV_PLANETS as string[]).includes(p.planet)) {
      positions[p.planet as AVPlanet] = signIndex(p.sign);
    }
  }

  const bhinna = {} as Record<AVPlanet, Record<SignName, number>>;

  for (const subject of AV_PLANETS) {
    const counts = emptySigns();

    for (const [contributor, places] of Object.entries(BENEFIC_PLACES[subject]) as [Contributor, number[]][]) {
      const from = positions[contributor];
      for (const place of places) {
        /* "3rd from X" counts X itself as the 1st, so the offset is place - 1. */
        counts[SIGNS[(from + place - 1) % 12]] += 1;
      }
    }

    bhinna[subject] = counts;
  }

  const sarva = emptySigns();
  for (const subject of AV_PLANETS) {
    for (const sign of SIGNS) sarva[sign] += bhinna[subject][sign];
  }

  const ascIdx = signIndex(chart.ascendantSign);
  const byHouse = {} as Record<HouseNumber, number>;
  for (let h = 1; h <= 12; h++) {
    byHouse[h as HouseNumber] = sarva[SIGNS[(ascIdx + h - 1) % 12]];
  }

  return { bhinna, sarva, byHouse };
}

/** Checksum. The totals are invariant, so a mismatch is always a bug. */
export function verify(av: Ashtakavarga): { ok: boolean; problems: string[] } {
  const problems: string[] = [];

  for (const planet of AV_PLANETS) {
    const total = SIGNS.reduce((s, sign) => s + av.bhinna[planet][sign], 0);
    if (total !== EXPECTED_TOTAL[planet]) {
      problems.push(`${planet} totals ${total}, expected ${EXPECTED_TOTAL[planet]}`);
    }
  }

  const grand = SIGNS.reduce((s, sign) => s + av.sarva[sign], 0);
  if (grand !== 337) problems.push(`Sarvashtakavarga totals ${grand}, expected 337`);

  return { ok: problems.length === 0, problems };
}

export const SAV_AVERAGE = 337 / 12; // 28.08

export type SavBand = 'Very strong' | 'Strong' | 'Average' | 'Weak' | 'Very weak';

export function savBand(bindus: number): SavBand {
  if (bindus >= 33) return 'Very strong';
  if (bindus >= 30) return 'Strong';
  if (bindus >= 25) return 'Average';
  if (bindus >= 20) return 'Weak';
  return 'Very weak';
}

/**
 * Plain-language reading of a house's bindu count, phrased for saying out loud.
 * The average is 28, so the comparison is always against that rather than
 * against an abstract scale.
 */
export function savStatement(bindus: number): string {
  const diff = Math.round(bindus - SAV_AVERAGE);
  if (bindus >= 33) return `${bindus} points against an average of 28. One of the best-supported parts of this chart - things here tend to work out with less effort than elsewhere.`;
  if (bindus >= 30) return `${bindus} points against an average of 28. Well supported. Effort put in here generally returns.`;
  if (bindus >= 25) return `${bindus} points against an average of 28. Ordinary support - neither helped nor obstructed.`;
  if (bindus >= 20) return `${bindus} points against an average of 28, so ${Math.abs(diff)} below. This area needs more effort than it should for the same result.`;
  return `${bindus} points against an average of 28, well below. A genuinely weak area. Worth saying plainly rather than softening - people usually already know.`;
}

/** Bindus a specific planet holds in the sign it occupies. Used for transit reading. */
export function bindusForPlanet(av: Ashtakavarga, planet: AVPlanet, sign: SignName): number {
  return av.bhinna[planet][sign];
}
