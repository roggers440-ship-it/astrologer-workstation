import 'server-only';
import type { PlanetName, SignName } from '@/types/astrology';
import { SIGNS } from '@/lib/vedic-constants';

/**
 * Swiss Ephemeris adapter.
 *
 * Bound against the underlying C constants rather than the wrapper's named
 * exports: SEFLG_* and the body numbers have been stable for two decades, while
 * the JavaScript surface varies between packages and versions. The module is
 * probed once at startup and the sidereal path is verified against a known
 * quantity before any chart is trusted to it.
 */

const SEFLG_SWIEPH = 2;
const SEFLG_SPEED = 256;
const SEFLG_SIDEREAL = 64 * 1024;
const SE_SIDM_LAHIRI = 1;

/** Swiss Ephemeris body numbers. 11 is the true node; 10 would be the mean node. */
const BODY: Record<Exclude<PlanetName, 'Ketu'>, number> = {
  Sun: 0, Moon: 1, Mercury: 2, Venus: 3, Mars: 4, Jupiter: 5, Saturn: 6, Rahu: 11,
};

const norm360 = (x: number) => ((x % 360) + 360) % 360;

interface Bound {
  julianDay: (y: number, m: number, d: number, hour: number) => number;
  position: (jd: number, body: number, flags: number) => { longitude: number; speed?: number };
  ascendant: (jd: number, lat: number, lon: number) => number;
  ayanamsha: (jd: number) => number;
  /** True when the library honours SEFLG_SIDEREAL directly. */
  nativeSidereal: boolean;
}

let bound: Promise<Bound> | null = null;

async function bind(): Promise<Bound> {
  const swe: Record<string, any> = await import('@swisseph/node');

  const pick = (...names: string[]) =>
    names.map((n) => swe[n]).find((f) => typeof f === 'function');

  const juldayNumeric = pick('julianDay', 'swe_julday');
  const juldayFromDate = pick('dateToJulianDay');
  const calc = pick('calculatePosition', 'swe_calc_ut');
  const houses = pick('calculateHouses', 'swe_houses');
  const setSidMode = pick('setSiderealMode', 'setSidMode', 'swe_set_sid_mode');
  const getAyan = pick('getAyanamsa', 'getAyanamsaUt', 'swe_get_ayanamsa_ut');

  if (!calc || !houses || !(juldayNumeric || juldayFromDate)) {
    throw new Error(
      `@swisseph/node did not expose the expected functions. Available: ${Object.keys(swe).join(', ')}`,
    );
  }

  const julianDay = (y: number, m: number, d: number, hour: number) =>
    juldayNumeric ? juldayNumeric(y, m, d, hour) : juldayFromDate(new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + hour * 3600_000));

  const readLon = (r: any) => (typeof r === 'number' ? r : r.longitude ?? r[0]);
  const readSpeed = (r: any) => (typeof r === 'object' ? r.longitudeSpeed ?? r.speed ?? r[3] : undefined);

  if (setSidMode) setSidMode(SE_SIDM_LAHIRI, 0, 0);

  /*
   * Verify rather than assume. Ask for a sidereal Sun and check it sits roughly
   * one ayanamsha behind the tropical Sun. A wrapper that silently ignores the
   * flag would otherwise hand back tropical positions that look plausible and
   * put every planet about 24 degrees - most of a sign - out of place.
   */
  const probeJd = julianDay(2000, 1, 1, 12);
  const tropical = norm360(readLon(calc(probeJd, BODY.Sun, SEFLG_SWIEPH | SEFLG_SPEED)));
  let nativeSidereal = false;

  if (setSidMode) {
    const sid = norm360(readLon(calc(probeJd, BODY.Sun, SEFLG_SWIEPH | SEFLG_SPEED | SEFLG_SIDEREAL)));
    const delta = norm360(tropical - sid);
    nativeSidereal = delta > 20 && delta < 30;
  }

  if (!nativeSidereal && !getAyan) {
    throw new Error(
      'Swiss Ephemeris is available but neither the sidereal flag nor an ayanamsha function works. Sidereal positions cannot be computed.',
    );
  }

  const ayanamsha = (jd: number): number => {
    if (getAyan) return getAyan(jd);
    const t = norm360(readLon(calc(jd, BODY.Sun, SEFLG_SWIEPH)));
    const s = norm360(readLon(calc(jd, BODY.Sun, SEFLG_SWIEPH | SEFLG_SIDEREAL)));
    return norm360(t - s);
  };

  const position = (jd: number, body: number, flags: number) => {
    const r = calc(jd, body, flags);
    return { longitude: norm360(readLon(r)), speed: readSpeed(r) };
  };

  /*
   * swe_houses takes no flags, so cusps always come back tropical. The ayanamsha
   * is subtracted unconditionally here - doing it only on the fallback path is
   * what puts a lagna a whole sign out.
   */
  const ascendant = (jd: number, lat: number, lon: number): number => {
    const system = swe.HouseSystem?.WholeSign ?? 'W';
    let result: any;
    for (const hsys of [system, 'W', 'P']) {
      try {
        result = houses(jd, lat, lon, hsys);
        break;
      } catch {
        /* try the next system; the ascendant is identical across all of them */
      }
    }
    if (result == null) throw new Error('calculateHouses rejected every house system tried.');

    const tropicalAsc =
      typeof result === 'object' ? result.ascendant ?? result.ascmc?.[0] ?? result.cusps?.[1] : result;

    return norm360(tropicalAsc - ayanamsha(jd));
  };

  return { julianDay, position, ascendant, ayanamsha, nativeSidereal };
}

function ephemeris(): Promise<Bound> {
  bound ??= bind();
  return bound;
}

export interface SiderealReading {
  longitude: number;
  /** Degrees per day. Negative means retrograde. */
  speed: number;
}

export async function julianDayFor(utc: Date): Promise<number> {
  const swe = await ephemeris();
  const hour = utc.getUTCHours() + utc.getUTCMinutes() / 60 + utc.getUTCSeconds() / 3600;
  return swe.julianDay(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate(), hour);
}

/** Sidereal longitude and speed for one graha. Ketu is derived from Rahu. */
export async function siderealPosition(jd: number, planet: PlanetName): Promise<SiderealReading> {
  const swe = await ephemeris();

  if (planet === 'Ketu') {
    const rahu = await siderealPosition(jd, 'Rahu');
    return { longitude: norm360(rahu.longitude + 180), speed: rahu.speed };
  }

  const body = BODY[planet];
  const flags = SEFLG_SWIEPH | SEFLG_SPEED | (swe.nativeSidereal ? SEFLG_SIDEREAL : 0);
  const raw = swe.position(jd, body, flags);

  const longitude = swe.nativeSidereal ? raw.longitude : norm360(raw.longitude - swe.ayanamsha(jd));

  /* The nodes are always retrograde; everything else takes its sign from speed. */
  const speed = planet === 'Rahu' ? -Math.abs(raw.speed ?? 0.053) : raw.speed ?? 0;
  return { longitude, speed };
}

export async function siderealAscendant(jd: number, latitude: number, longitude: number): Promise<number> {
  const swe = await ephemeris();
  return swe.ascendant(jd, latitude, longitude);
}

export async function ayanamshaAt(jd: number): Promise<number> {
  const swe = await ephemeris();
  return swe.ayanamsha(jd);
}

/**
 * How fast the lagna is moving, in degrees per minute of clock time. Short
 * ascension signs at high latitude can exceed half a degree per minute, at which
 * point a rounded birth time changes the rising sign outright.
 */
export async function ascendantDrift(jd: number, latitude: number, longitude: number): Promise<number> {
  const oneMinute = 1 / 1440;
  const a = await siderealAscendant(jd, latitude, longitude);
  const b = await siderealAscendant(jd + oneMinute, latitude, longitude);
  return Math.abs(norm360(b - a + 180) - 180);
}

export function signOf(longitude: number): SignName {
  return SIGNS[Math.floor(norm360(longitude) / 30)];
}
