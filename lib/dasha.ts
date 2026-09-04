import type { DashaPeriod, PlanetName } from '@/types/astrology';
import {
  NAKSHATRA_ARC,
  VIMSHOTTARI_ORDER,
  VIMSHOTTARI_YEARS,
} from './vedic-constants';

const DAYS_PER_YEAR = 365.2425;

function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * DAYS_PER_YEAR * 86_400_000);
}

const iso = (d: Date) => d.toISOString();

/**
 * Vimshottari mahadasha/antardasha tree from the Moon's sidereal longitude.
 *
 * The nakshatra the Moon occupies at birth fixes the starting lord; the unelapsed
 * portion of that nakshatra gives the balance of the first mahadasha.
 */
export function buildVimshottariTree(
  moonLongitude: number,
  birth: Date,
  yearsToProject = 120,
): DashaPeriod[] {
  const norm = ((moonLongitude % 360) + 360) % 360;
  const nakIndex = Math.floor(norm / NAKSHATRA_ARC);
  const elapsedFraction = (norm % NAKSHATRA_ARC) / NAKSHATRA_ARC;

  const startLordIndex = nakIndex % 9;
  const startLord = VIMSHOTTARI_ORDER[startLordIndex];
  const balanceYears = VIMSHOTTARI_YEARS[startLord] * (1 - elapsedFraction);

  const periods: DashaPeriod[] = [];
  let cursor = new Date(birth);
  let projected = 0;

  for (let i = 0; projected < yearsToProject; i++) {
    const lord = VIMSHOTTARI_ORDER[(startLordIndex + i) % 9];
    const span = i === 0 ? balanceYears : VIMSHOTTARI_YEARS[lord];
    const end = addYears(cursor, span);

    // The opening mahadasha is already part-elapsed at birth. Its antardashas are
    // generated from the notional start of the full period and then clipped, so the
    // native lands mid-sequence exactly as the tradition has it. Scaling all nine
    // sub-periods down to fit the remainder would put the wrong antardasha lord in
    // charge on day one.
    const notionalStart = i === 0 ? addYears(cursor, -(VIMSHOTTARI_YEARS[lord] - span)) : cursor;

    periods.push({
      lord,
      level: 'Maha',
      start: iso(cursor),
      end: iso(end),
      children: buildAntardashas(lord, notionalStart, cursor),
    });

    cursor = end;
    projected += span;
  }

  return periods;
}

/**
 * Antardashas run in the same planetary order starting from the mahadasha lord.
 * Each sub-period is (maha years x sub years) / 120.
 *
 * `clipFrom` drops sub-periods that ended before birth and truncates the one in
 * progress, which is what makes the balance-of-dasha correct.
 */
function buildAntardashas(mahaLord: PlanetName, notionalStart: Date, clipFrom: Date): DashaPeriod[] {
  const fullMaha = VIMSHOTTARI_YEARS[mahaLord];
  const startIdx = VIMSHOTTARI_ORDER.indexOf(mahaLord);

  const out: DashaPeriod[] = [];
  let cursor = new Date(notionalStart);

  for (let i = 0; i < 9; i++) {
    const lord = VIMSHOTTARI_ORDER[(startIdx + i) % 9];
    const end = addYears(cursor, (fullMaha * VIMSHOTTARI_YEARS[lord]) / 120);

    if (end > clipFrom) {
      const start = cursor < clipFrom ? clipFrom : cursor;
      out.push({ lord, level: 'Antar', start: iso(start), end: iso(end) });
    }

    cursor = end;
  }

  return out;
}

/**
 * Pratyantardashas for one antardasha, generated on demand.
 *
 * Deliberately not stored in the tree: nine mahadashas x nine antardashas x nine
 * pratyantardashas is over seven hundred periods, and shipping them all to the
 * browser to display one of them is waste. Timing questions ask about the period
 * running now, so it is computed when asked for.
 */
export function pratyantardashas(antar: DashaPeriod): DashaPeriod[] {
  const start = new Date(antar.start);
  const spanYears = (Date.parse(antar.end) - Date.parse(antar.start)) / 86_400_000 / DAYS_PER_YEAR;
  const startIdx = VIMSHOTTARI_ORDER.indexOf(antar.lord);

  const out: DashaPeriod[] = [];
  let cursor = start;

  for (let i = 0; i < 9; i++) {
    const lord = VIMSHOTTARI_ORDER[(startIdx + i) % 9];
    const end = addYears(cursor, (spanYears * VIMSHOTTARI_YEARS[lord]) / 120);
    out.push({ lord, level: 'Pratyantar', start: iso(cursor), end: iso(end) });
    cursor = end;
  }

  return out;
}

export interface ActiveDasha {
  maha: DashaPeriod;
  antar?: DashaPeriod;
  pratyantar?: DashaPeriod;
  /** 0-1 completion of the mahadasha. */
  mahaProgress: number;
  antarProgress: number;
  pratyantarProgress: number;
  daysRemainingMaha: number;
  daysRemainingAntar: number;
  daysRemainingPratyantar: number;
}

export function findActive(tree: DashaPeriod[], at: Date = new Date()): ActiveDasha | null {
  const t = at.getTime();
  const maha = tree.find((p) => Date.parse(p.start) <= t && t < Date.parse(p.end));
  if (!maha) return null;

  const antar = maha.children?.find((c) => Date.parse(c.start) <= t && t < Date.parse(c.end));
  const pratyantar = antar
    ? pratyantardashas(antar).find((c) => Date.parse(c.start) <= t && t < Date.parse(c.end))
    : undefined;

  const pct = (p: DashaPeriod) => {
    const s = Date.parse(p.start);
    const e = Date.parse(p.end);
    return Math.min(1, Math.max(0, (t - s) / (e - s)));
  };
  const daysLeft = (p: DashaPeriod) => Math.max(0, Math.ceil((Date.parse(p.end) - t) / 86_400_000));

  return {
    maha,
    antar,
    pratyantar,
    mahaProgress: pct(maha),
    antarProgress: antar ? pct(antar) : 0,
    pratyantarProgress: pratyantar ? pct(pratyantar) : 0,
    daysRemainingMaha: daysLeft(maha),
    daysRemainingAntar: antar ? daysLeft(antar) : 0,
    daysRemainingPratyantar: pratyantar ? daysLeft(pratyantar) : 0,
  };
}

/** Every mahadasha and antardasha change inside a window - the timeline's backbone. */
export function periodsInWindow(tree: DashaPeriod[], from: Date, to: Date): DashaPeriod[] {
  const overlaps = (p: DashaPeriod) =>
    Date.parse(p.end) >= from.getTime() && Date.parse(p.start) <= to.getTime();

  return tree.filter(overlaps).flatMap((maha) => [maha, ...(maha.children ?? []).filter(overlaps)]);
}
