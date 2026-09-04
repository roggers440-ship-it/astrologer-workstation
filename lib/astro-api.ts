import type {
  ChartData,
  Client,
  HouseNumber,
  NatalChart,
  PlanetName,
  PlanetPlacement,
  SignName,
  Varga,
  YearlyTransit,
} from '@/types/astrology';
import {
  DEBILITATION,
  EXALTATION,
  houseSignsFor,
  nakshatraOf,
  PLANETS,
  SIGNS,
  signIndex,
} from './vedic-constants';
import { VARGA_MAP } from './varga';
import { buildVimshottariTree } from './dasha';
import { computePanchanga } from './panchanga';
import {
  ascendantDrift,
  ayanamshaAt,
  julianDayFor,
  siderealAscendant,
  siderealPosition,
  signOf,
} from './ephemeris/swiss';

/* ------------------------------ time helpers ------------------------------ */

/** Birth moment as a UTC Date, resolved through the real DST rules for the zone. */
export function birthMomentUTC(client: Client): Date {
  const [h, m] = client.birthTime.split(':').map(Number);
  const naive = new Date(`${client.dob}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
  return new Date(naive.getTime() - zoneOffsetMinutes(client.timezone, naive) * 60_000);
}

function zoneOffsetMinutes(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(at).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second),
  );
  return (asUTC - at.getTime()) / 60_000;
}

/* ------------------------------ chart building ---------------------------- */

function placementFrom(
  planet: PlanetName,
  longitude: number,
  speed: number,
  ascendantSign: SignName,
): PlanetPlacement {
  const sIdx = Math.floor(longitude / 30);
  const sign = SIGNS[sIdx];
  const nak = nakshatraOf(longitude);

  return {
    planet,
    house: ((((sIdx - signIndex(ascendantSign)) % 12) + 12) % 12 + 1) as HouseNumber,
    sign,
    degree: longitude - sIdx * 30,
    longitude,
    isExalted: EXALTATION[planet]?.sign === sign,
    isDebilitated: DEBILITATION[planet]?.sign === sign,
    isRetrograde: speed < 0,
    nakshatra: nak.name,
    nakshatraPada: nak.pada,
  };
}

/** Project a rasi chart into a divisional chart, re-deriving dignity in the new sign. */
function buildVarga(d1: ChartData, varga: Varga): ChartData {
  if (varga === 'D1') return d1;
  const map = VARGA_MAP[varga];

  const ascendantSign = map(signIndex(d1.ascendantSign) * 30 + d1.ascendantDegree);
  const ascIdx = signIndex(ascendantSign);

  const placements = d1.placements.map((p) => {
    const sign = map(p.longitude);
    const sIdx = signIndex(sign);
    return {
      ...p,
      sign,
      house: ((((sIdx - ascIdx) % 12) + 12) % 12 + 1) as HouseNumber,
      isExalted: EXALTATION[p.planet]?.sign === sign,
      isDebilitated: DEBILITATION[p.planet]?.sign === sign,
    };
  });

  return { varga, ascendantSign, ascendantDegree: 0, placements, houseSigns: houseSignsFor(ascendantSign) };
}

/**
 * Saturn and Jupiter sign positions per year, precomputed on the server.
 *
 * The timeline only reads transits at sign level, so 40 values cover a 20-year
 * window - far cheaper than shipping an ephemeris to the browser, and correct,
 * which the previous mean-element approximation was not.
 */
async function yearlyTransits(fromYear: number, toYear: number): Promise<YearlyTransit[]> {
  const out: YearlyTransit[] = [];

  for (let year = fromYear; year <= toYear; year++) {
    const jd = await julianDayFor(new Date(Date.UTC(year, 5, 15, 12)));
    const [saturn, jupiter, rahu] = await Promise.all([
      siderealPosition(jd, 'Saturn'),
      siderealPosition(jd, 'Jupiter'),
      siderealPosition(jd, 'Rahu'),
    ]);
    out.push({
      year,
      saturnSign: signOf(saturn.longitude),
      jupiterSign: signOf(jupiter.longitude),
      rahuSign: signOf(rahu.longitude),
    });
  }

  return out;
}

/**
 * Compute a full natal chart. Server-side only: the Swiss Ephemeris binding is a
 * native addon and cannot run in the browser.
 */
export async function computeNatalChart(client: Client, timelineYears = 10): Promise<NatalChart> {
  const utc = birthMomentUTC(client);
  const jd = await julianDayFor(utc);

  const ascLon = await siderealAscendant(jd, client.latitude, client.longitude);
  const ascendantSign = SIGNS[Math.floor(ascLon / 30)];

  const readings = await Promise.all(
    PLANETS.map(async (planet) => ({ planet, ...(await siderealPosition(jd, planet)) })),
  );

  const d1: ChartData = {
    varga: 'D1',
    ascendantSign,
    ascendantDegree: ascLon - Math.floor(ascLon / 30) * 30,
    placements: readings.map((r) => placementFrom(r.planet, r.longitude, r.speed, ascendantSign)),
    houseSigns: houseSignsFor(ascendantSign),
  };

  const moon = d1.placements.find((p) => p.planet === 'Moon')!;
  const sun = d1.placements.find((p) => p.planet === 'Sun')!;
  const thisYear = new Date().getUTCFullYear();

  return {
    clientId: client.id,
    computedAt: new Date().toISOString(),
    ayanamsha: `Lahiri ${(await ayanamshaAt(jd)).toFixed(4)}\u00b0`,
    isApproximate: false,
    charts: {
      D1: d1,
      D6: buildVarga(d1, 'D6'),
      D9: buildVarga(d1, 'D9'),
      D30: buildVarga(d1, 'D30'),
      D10: buildVarga(d1, 'D10'),
      D60: buildVarga(d1, 'D60'),
    },
    dashaTree: buildVimshottariTree(moon.longitude, utc),
    transits: await yearlyTransits(thisYear - timelineYears, thisYear + timelineYears),
    panchanga: computePanchanga(sun, moon, utc, client.timezone),
    ascendantDriftPerMinute: await ascendantDrift(jd, client.latitude, client.longitude),
  };
}
