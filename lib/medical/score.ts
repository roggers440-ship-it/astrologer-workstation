import type { NatalChart, PlanetName, PlanetPlacement } from '@/types/astrology';
import { dignityOf, housesRuledBy } from '@/lib/vedic-constants';
import { inHarshTrimsamsha } from '@/lib/varga';
import { periodsInWindow } from '@/lib/dasha';
import { ordinal } from '@/lib/rule-engine';
import {
  BHAVA_REGIONS, DHATU_REGIONS, DUSTHANA_CHARACTER, KALAPURUSHA_REGIONS,
  LAYER_WEIGHT, type DusthanaHouse, type LayerName,
} from './layers';
import { regionById, type RegionId } from './regions';

const NATURAL_MALEFICS: PlanetName[] = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];

export interface LayerHit {
  layer: LayerName;
  planet: PlanetName;
  detail: string;
  weight: number;
}

/**
 * Two axes, deliberately separate.
 *
 * Convergence says how many traditions agree on the location. Severity says how
 * hard the affliction is - malefic count, debilitation, which dusthana, harsh
 * trimsamsha. A region can have high agreement and low severity, or the reverse,
 * and collapsing them into one number throws away the more useful of the two.
 */
export type Severity = 'Priority' | 'Watch' | 'Background';

export interface RegionFinding {
  regionId: RegionId;
  name: string;
  view: 'front' | 'back' | 'systemic';
  /** Number of independent layers pointing here. Agreement, not danger. */
  convergence: number;
  severity: Severity;
  severityScore: number;
  /** Plain statements of what makes this severe. No hedging. */
  severityReasons: string[];
  score: number;
  hits: LayerHit[];
  character: { label: string; meaning: string; house: DusthanaHouse } | null;
  screening: string;
  plain: string;
  windows: MedicalWindow[];
}

export interface MedicalWindow {
  year: number;
  endYear: number;
  label: string;
  why: string;
  isCurrent: boolean;
  isFuture: boolean;
}

/**
 * Only afflicting planets flag regions.
 *
 * Without this gate every region lights up on every chart, which is exactly the
 * failure mode of consumer apps that colour an organ because some planet is
 * vaguely nearby. A planet earns the right to flag anatomy by being a natural
 * malefic, being debilitated, ruling a dusthana, or sitting with a malefic.
 */
function afflictionReasons(chart: NatalChart['charts']['D1'], p: PlanetPlacement): string[] {
  const reasons: string[] = [];

  if (NATURAL_MALEFICS.includes(p.planet)) reasons.push('natural malefic');
  if (dignityOf(p.planet, p.sign) === 'Debilitated') reasons.push('debilitated');

  const owned = housesRuledBy(p.planet, chart.ascendantSign);
  const dusthanas = owned.filter((h) => [6, 8, 12].includes(h));
  if (dusthanas.length) reasons.push(`lord of the ${dusthanas.map(ordinal).join(' and ')}`);

  const companions = chart.placements.filter(
    (o) => o.planet !== p.planet && o.house === p.house && NATURAL_MALEFICS.includes(o.planet),
  );
  if (companions.length) reasons.push(`with ${companions.map((c) => c.planet).join(' and ')}`);

  return reasons;
}

function dusthanaOwned(chart: NatalChart['charts']['D1'], planet: PlanetName): DusthanaHouse | null {
  const owned = housesRuledBy(planet, chart.ascendantSign).filter((h) => [6, 8, 12].includes(h));
  return (owned[0] as DusthanaHouse) ?? null;
}

export interface MedicalOptions {
  /** Minimum number of layers before a region is shown. 3 in consultation, 2 for research. */
  threshold?: number;
  yearsBack?: number;
  yearsForward?: number;
  now?: Date;
}

export function analyseBody(natal: NatalChart, options: MedicalOptions = {}): RegionFinding[] {
  const { threshold = 3, yearsBack = 10, yearsForward = 10, now = new Date() } = options;
  const d1 = natal.charts.D1;
  const d6 = natal.charts.D6;
  const asc = d1.ascendantSign;

  const buckets = new Map<RegionId, LayerHit[]>();
  const characters = new Map<RegionId, DusthanaHouse>();
  const carriers = new Map<RegionId, Set<PlanetName>>();
  const severityPoints = new Map<RegionId, number>();
  const severityWhy = new Map<RegionId, Set<string>>();

  const addSeverity = (region: RegionId, points: number, why: string) => {
    severityPoints.set(region, (severityPoints.get(region) ?? 0) + points);
    severityWhy.set(region, (severityWhy.get(region) ?? new Set()).add(why));
  };

  const record = (region: RegionId, hit: LayerHit) => {
    buckets.set(region, [...(buckets.get(region) ?? []), hit]);
    carriers.set(region, (carriers.get(region) ?? new Set()).add(hit.planet));
  };

  for (const p of d1.placements) {
    const reasons = afflictionReasons(d1, p);
    if (reasons.length === 0) continue;

    const via = reasons.join(', ');

    /*
     * Severity is scored per carrying planet, on the regions its own placement
     * reaches. The 8th weighs heaviest because chronic and hidden is the case
     * where a routine check actually changes the outcome; the 6th weighs least
     * because acute problems announce themselves.
     */
    const spatial = new Set([...BHAVA_REGIONS[p.house], ...DHATU_REGIONS[p.planet]]);
    for (const region of spatial) {
      if (NATURAL_MALEFICS.includes(p.planet)) {
        addSeverity(region, 2, `${p.planet} is a natural malefic`);
      }
      if (dignityOf(p.planet, p.sign, p.degree) === 'Debilitated') {
        addSeverity(region, 2, `${p.planet} is debilitated in ${p.sign}`);
      }
      if (inHarshTrimsamsha(p.longitude)) {
        addSeverity(region, 2, `${p.planet} sits in a Mars or Saturn trimsamsha`);
      }
      const owned = housesRuledBy(p.planet, asc).filter((h) => [6, 8, 12].includes(h));
      for (const h of owned) {
        const weight = h === 8 ? 3 : h === 12 ? 2 : 1;
        addSeverity(region, weight, `${p.planet} rules the ${ordinal(h)}`);
      }
    }

    /* Bhava - the occupied house. This is also how Rahu and Ketu reach anatomy,
       since they rule nothing: their physical locus is the house they sit in. */
    for (const region of BHAVA_REGIONS[p.house]) {
      record(region, {
        layer: 'bhava',
        planet: p.planet,
        detail: `${p.planet} occupies the ${ordinal(p.house)} (${via}).`,
        weight: LAYER_WEIGHT.bhava,
      });
    }

    for (const region of KALAPURUSHA_REGIONS[p.sign]) {
      record(region, {
        layer: 'kalapurusha',
        planet: p.planet,
        detail: `${p.planet} in ${p.sign}, which governs this region in the zodiacal man.`,
        weight: LAYER_WEIGHT.kalapurusha,
      });
    }

    for (const region of DHATU_REGIONS[p.planet]) {
      record(region, {
        layer: 'dhatu',
        planet: p.planet,
        detail: `${p.planet} governs this tissue directly.`,
        weight: LAYER_WEIGHT.dhatu,
      });
    }

    /* Dusthana - carries the character axis as well as weight. */
    const dus = dusthanaOwned(d1, p.planet);
    if (dus) {
      for (const region of BHAVA_REGIONS[p.house]) {
        record(region, {
          layer: 'dusthana',
          planet: p.planet,
          detail: `${p.planet} rules the ${ordinal(dus)} and sits in the ${ordinal(p.house)}.`,
          weight: LAYER_WEIGHT.dusthana,
        });
        if (!characters.has(region)) characters.set(region, dus);
      }
    }

    /* D6 - the same planet landing on the same regions in the health divisional. */
    const inD6 = d6.placements.find((x) => x.planet === p.planet);
    if (inD6) {
      const d6Regions = new Set([...BHAVA_REGIONS[inD6.house], ...KALAPURUSHA_REGIONS[inD6.sign]]);
      const natalRegions = new Set([...BHAVA_REGIONS[p.house], ...KALAPURUSHA_REGIONS[p.sign]]);
      for (const region of d6Regions) {
        if (!natalRegions.has(region)) continue;
        record(region, {
          layer: 'd6',
          planet: p.planet,
          detail: `Confirmed in D6: ${p.planet} lands on this region in the health chart too.`,
          weight: LAYER_WEIGHT.d6,
        });
      }
    }

    /* D30 - a harsh trimsamsha portion adds affliction without adding location. */
    if (inHarshTrimsamsha(p.longitude)) {
      for (const region of DHATU_REGIONS[p.planet]) {
        record(region, {
          layer: 'd30',
          planet: p.planet,
          detail: `${p.planet} falls in a Mars or Saturn trimsamsha.`,
          weight: LAYER_WEIGHT.d30,
        });
      }
    }
  }

  /* Windows: when the carrying planets run, this region is live. */
  const thisYear = now.getUTCFullYear();
  const from = new Date(Date.UTC(thisYear - yearsBack, 0, 1));
  const to = new Date(Date.UTC(thisYear + yearsForward, 11, 31));
  const periods = periodsInWindow(natal.dashaTree, from, to);

  const findings: RegionFinding[] = [];

  for (const [regionId, hits] of buckets) {
    const region = regionById(regionId);
    const layers = new Set(hits.map((h) => h.layer));
    const convergence = layers.size;
    if (convergence < threshold) continue;

    const carrying = carriers.get(regionId)!;

    const windows: MedicalWindow[] = periods
      .filter((p) => carrying.has(p.lord) && Date.parse(p.start) >= from.getTime())
      .map((p) => {
        const startYear = new Date(p.start).getUTCFullYear();
        return {
          year: startYear,
          endYear: new Date(p.end).getUTCFullYear(),
          label: `${p.lord} ${p.level === 'Maha' ? 'mahadasha' : 'antardasha'}`,
          why: `${p.lord} is one of the planets pointing at this region.`,
          isCurrent: Date.parse(p.start) <= now.getTime() && now.getTime() < Date.parse(p.end),
          isFuture: Date.parse(p.start) > now.getTime(),
        };
      })
      .sort((a, b) => a.year - b.year)
      .slice(0, 4);

    const dus = characters.get(regionId);
    const sev = severityPoints.get(regionId) ?? 0;
    const severity: Severity = sev >= 8 ? 'Priority' : sev >= 4 ? 'Watch' : 'Background';

    findings.push({
      regionId,
      name: region.name,
      view: region.view,
      convergence,
      severity,
      severityScore: sev,
      severityReasons: [...(severityWhy.get(regionId) ?? [])],
      score: hits.reduce((s, h) => s + h.weight, 0),
      hits: hits.sort((a, b) => b.weight - a.weight),
      character: dus ? { ...DUSTHANA_CHARACTER[dus], house: dus } : null,
      screening: region.screening,
      plain: region.plain,
      windows,
    });
  }

  const rank: Record<Severity, number> = { Priority: 0, Watch: 1, Background: 2 };
  return findings.sort(
    (a, b) =>
      rank[a.severity] - rank[b.severity] ||
      b.severityScore - a.severityScore ||
      b.convergence - a.convergence,
  );
}

/** Severity band per region id, for colouring the body map. */
export function severityMap(findings: RegionFinding[]): Record<string, Severity> {
  return Object.fromEntries(findings.map((f) => [f.regionId, f.severity]));
}

/** Fill strength per region, driven by agreement rather than severity. */
export function intensityMap(findings: RegionFinding[]): Record<string, number> {
  const max = Math.max(1, ...findings.map((f) => f.convergence));
  return Object.fromEntries(findings.map((f) => [f.regionId, f.convergence / max]));
}
