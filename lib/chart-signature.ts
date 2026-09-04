import type { ChartData, HouseNumber, PlanetName, PlanetPlacement } from '@/types/astrology';
import {
  DEBILITATION, DUSTHANA_HOUSES, EXALTATION, KENDRA_HOUSES, SIGNS, SIGN_LORD, TRIKONA_HOUSES,
  dignityOf, housesAspectedBy, housesRuledBy, lordOfHouse, signIndex,
} from './vedic-constants';
import { houseDistance, isCombust, ordinal } from './rule-engine';
import { functionalNature } from './native-profile';
import { HOUSE_THEME } from './house-themes';
import { computeAshtakavarga, savBand } from './ashtakavarga';
import { chartCombinations } from './combinations';

/**
 * What is distinctive about THIS chart.
 *
 * The rule corpus can only speak when one of its patterns happens to match, so a
 * panel built on it alone is silent on most charts and generic on the rest. These
 * observations are computed from the chart's own numbers, so they are always
 * present and always specific to the person in front of you.
 *
 * `notability` is how unusual the fact is, not how important. A debilitated
 * lagna lord is worth leading with because most charts do not have one; the
 * dominant element is true of every chart and belongs near the bottom.
 */

export interface Observation {
  id: string;
  title: string;
  /** The specific finding, with the numbers in it. */
  statement: string;
  /** Why it changes the reading. */
  consequence: string;
  notability: 1 | 2 | 3 | 4 | 5;
  planets: PlanetName[];
  houses: HouseNumber[];
}

const at = (c: ChartData, p: PlanetName) => c.placements.find((x) => x.planet === p);

/** Distance from the exact degree of exaltation or fall. */
function fromExact(p: PlanetPlacement): number | null {
  const dig = dignityOf(p.planet, p.sign);
  const table = dig === 'Exalted' ? EXALTATION : dig === 'Debilitated' ? DEBILITATION : null;
  const exact = table?.[p.planet]?.degree;
  return exact === undefined ? null : p.degree - exact;
}

/**
 * Neechabhanga. Cancellation applies when the dispositor of the debilitated
 * planet, or the lord of the sign it would be exalted in, sits in a kendra from
 * the lagna or from the Moon.
 */
function neechabhanga(chart: ChartData, p: PlanetPlacement): string | null {
  const dispositor = SIGN_LORD[p.sign];
  const exaltationSign = EXALTATION[p.planet]?.sign;
  const exaltationLord = exaltationSign ? SIGN_LORD[exaltationSign] : undefined;
  const moon = at(chart, 'Moon');

  const cancels = ([dispositor, exaltationLord].filter(Boolean) as PlanetName[]).filter((candidate) => {
    const c = at(chart, candidate);
    if (!c) return false;
    const fromLagna = KENDRA_HOUSES.includes(c.house);
    const fromMoon = moon ? [1, 4, 7, 10].includes(houseDistance(moon.house, c.house)) : false;
    return fromLagna || fromMoon;
  });

  if (cancels.length === 0) return null;
  return `${[...new Set(cancels)].join(' and ')} sits in a kendra, so neechabhanga applies`;
}

/**
 * Chart-level interactions, folded in as observations so the panel improves even
 * with the written analysis switched off. They rank high because a combination
 * says more than any single placement it was built from.
 */
export function signatureWithCombinations(natal: import('@/types/astrology').NatalChart): Observation[] {
  const base = chartSignature(natal.charts.D1);
  const combos: Observation[] = chartCombinations(natal).map((c) => ({
    id: c.id,
    title: c.from[0],
    statement: c.from.join(' \u00b7 '),
    consequence: c.claim,
    notability: c.weight >= 9 ? 5 : 4,
    planets: [],
    houses: [],
  }));
  return [...combos, ...base].sort((a, b) => b.notability - a.notability);
}

export function chartSignature(chart: ChartData): Observation[] {
  const out: Observation[] = [];
  const asc = chart.ascendantSign;
  const moon = at(chart, 'Moon');
  const sun = at(chart, 'Sun');

  /* --- lagna lord: present on every chart, and the first thing to check --- */
  const lagnaLord = lordOfHouse(1, asc);
  const ll = at(chart, lagnaLord);
  if (ll) {
    const dig = dignityOf(lagnaLord, ll.sign, ll.degree);
    const inDusthana = DUSTHANA_HOUSES.includes(ll.house);
    out.push({
      id: 'lagna-lord',
      title: `Lagna lord ${lagnaLord} in the ${ordinal(ll.house)}`,
      statement:
        `${lagnaLord} rules the lagna and sits at ${ll.degree.toFixed(1)}\u00b0 ${ll.sign} in the ${ordinal(ll.house)}` +
        `${dig === 'Neutral' ? '' : `, ${dig.toLowerCase()}`}.`,
      consequence:
        `The whole chart is read through this placement. Their sense of self is bound up with ${HOUSE_THEME[ll.house]}` +
        (inDusthana ? ' - a demanding house, so identity is built through difficulty rather than ease.' : '.'),
      notability: inDusthana || dig === 'Debilitated' ? 5 : dig === 'Exalted' ? 4 : 3,
      planets: [lagnaLord],
      houses: [1, ll.house],
    });
  }

  /* --- exaltation and fall, with distance from the exact degree --- */
  const yogakarakaPlanet = chart.placements.find((p) => functionalNature(p.planet, asc) === 'Yogakaraka')?.planet;

  for (const p of chart.placements) {
    const dig = dignityOf(p.planet, p.sign, p.degree);
    if (dig !== 'Exalted' && dig !== 'Debilitated') continue;
    if (p.planet === yogakarakaPlanet) continue; // folded into the yogakaraka observation

    const delta = fromExact(p);
    const nb = dig === 'Debilitated' ? neechabhanga(chart, p) : null;
    const owns = housesRuledBy(p.planet, asc);

    out.push({
      id: `dignity.${p.planet}`,
      title: `${p.planet} ${dig.toLowerCase()} in ${p.sign}`,
      statement:
        `${p.planet} at ${p.degree.toFixed(1)}\u00b0 ${p.sign}` +
        (delta === null ? '' :
          Math.abs(delta) < 1
            ? `, within a degree of exact ${dig === 'Exalted' ? 'exaltation' : 'fall'}`
            : `, ${Math.abs(delta).toFixed(1)}\u00b0 ${delta > 0 ? 'past' : 'short of'} the exact point`) +
        `. It rules ${owns.length ? `the ${owns.map(ordinal).join(' and ')}` : 'no house'}.`,
      consequence: nb
        ? `${nb}, so this recovers - late, and after struggle, but it recovers. Do not read it as a flat defect.`
        : dig === 'Exalted'
          ? `Strength, not necessarily benefit: it delivers ${owns.length ? `the ${owns.map(ordinal).join(' and ')} house results` : 'its significations'} forcefully, for good or ill.`
          : `The houses it rules operate against the grain. Effort produces less here than it should.`,
      notability: dig === 'Debilitated' ? 5 : 4,
      planets: [p.planet],
      houses: [p.house, ...owns],
    });
  }

  /* --- combustion: invisible in the chart drawing, and easy to miss --- */
  for (const p of chart.placements) {
    if (p.planet === 'Sun' || !isCombust(chart, p.planet) || !sun) continue;
    const gap = Math.abs(((p.longitude - sun.longitude + 540) % 360) - 180);
    const owns = housesRuledBy(p.planet, asc);
    out.push({
      id: `combust.${p.planet}`,
      title: `${p.planet} combust`,
      statement: `${p.planet} sits ${gap.toFixed(1)}\u00b0 from the Sun, inside its combustion orb.`,
      consequence:
        `Burnt up. ${owns.length ? `The ${owns.map(ordinal).join(' and ')} struggle to deliver` : 'Its significations struggle to deliver'} regardless of dignity or house. This overrides a lot of otherwise good placement.`,
      notability: 4,
      planets: [p.planet],
      houses: [p.house, ...owns],
    });
  }

  /* --- stellium: three or more grahas sharing a house --- */
  const byHouse = new Map<HouseNumber, PlanetPlacement[]>();
  for (const p of chart.placements) byHouse.set(p.house, [...(byHouse.get(p.house) ?? []), p]);

  for (const [house, group] of byHouse) {
    if (group.length < 3) continue;
    out.push({
      id: `stellium.${house}`,
      title: `${group.length} planets in the ${ordinal(house)}`,
      statement: `${group.map((g) => g.planet).join(', ')} all occupy the ${ordinal(house)}.`,
      consequence:
        `A concentration this heavy pulls the chart out of balance. ${HOUSE_THEME[house]} dominates, and the houses these planets rule all get routed through it. Their dashas will feel similar because they act from the same place.`,
      notability: group.length >= 4 ? 5 : 4,
      planets: group.map((g) => g.planet),
      houses: [house],
    });
  }

  /* --- retrogression --- */
  const retro = chart.placements.filter((p) => p.isRetrograde && !['Rahu', 'Ketu'].includes(p.planet));
  if (retro.length > 0) {
    out.push({
      id: 'retrograde',
      title: `${retro.length} retrograde planet${retro.length > 1 ? 's' : ''}`,
      statement: `${retro.map((r) => `${r.planet} in the ${ordinal(r.house)}`).join(', ')}.`,
      consequence:
        'Retrograde planets give results late and internally before they give them outwardly. Their dasha periods often feel like revisiting rather than starting.',
      notability: retro.length >= 3 ? 4 : 3,
      planets: retro.map((r) => r.planet),
      houses: retro.map((r) => r.house),
    });
  }

  /* --- yogakaraka: the single most useful planet, when one exists --- */
  const yogakaraka = yogakarakaPlanet ? at(chart, yogakarakaPlanet) : undefined;
  if (yogakaraka) {
    /*
     * A yogakaraka that is itself debilitated or combust is one fact, not two.
     * Listing "most useful planet" and "debilitated" as separate observations
     * reads as a contradiction and buries the synthesis, which is the single most
     * important thing to say about a chart like this.
     */
    const ykDignity = dignityOf(yogakaraka.planet, yogakaraka.sign, yogakaraka.degree);
    const ykCombust = isCombust(chart, yogakaraka.planet);
    const nb = ykDignity === 'Debilitated' ? neechabhanga(chart, yogakaraka) : null;
    const afflicted = ykDignity === 'Debilitated' || ykCombust;

    out.push({
      id: 'yogakaraka',
      title: afflicted
        ? `${yogakaraka.planet} is yogakaraka, and afflicted`
        : `${yogakaraka.planet} is yogakaraka`,
      statement:
        `${yogakaraka.planet} rules ${housesRuledBy(yogakaraka.planet, asc).map(ordinal).join(' and ')} - a kendra and a trikona together - and sits at ${yogakaraka.degree.toFixed(1)}\u00b0 ${yogakaraka.sign} in the ${ordinal(yogakaraka.house)}` +
        (ykDignity === 'Debilitated' ? ', debilitated' : '') +
        (ykCombust ? ', combust' : '') + '.',
      consequence: afflicted
        ? `The most useful planet in this chart is also a compromised one. ` +
          (nb
            ? `${nb}, so the promise holds but arrives late and through difficulty - which is usually the accurate thing to tell someone who feels their best asset keeps failing them.`
            : 'Nothing cancels it, so the yoga underdelivers. Say plainly that the potential is real and the delivery is obstructed; that combination is what people find hardest to name for themselves.')
        : 'The single most useful planet in this chart. Its periods are the ones to plan around, and it is the first target for any remedial work.',
      notability: 5,
      planets: [yogakaraka.planet],
      houses: housesRuledBy(yogakaraka.planet, asc),
    });
  }

  /* --- paksha bala: a waning Moon is a real weakness and rarely mentioned --- */
  if (moon && sun) {
    const elongation = ((moon.longitude - sun.longitude) % 360 + 360) % 360;
    const waxing = elongation < 180;
    const strength = Math.round((waxing ? elongation : 360 - elongation) / 1.8);
    if (strength < 40 || strength > 80) {
      out.push({
        id: 'paksha',
        title: waxing ? 'Waxing Moon, near new' : 'Waning Moon',
        statement: `The Moon is ${elongation.toFixed(0)}\u00b0 from the Sun, ${waxing ? 'waxing' : 'waning'}, at roughly ${strength}% paksha bala.`,
        consequence:
          strength < 40
            ? 'A dark Moon is functionally weak and classically counted among the malefics. Emotional reserves run lower than the rest of the chart suggests, and Moon periods ask more than they give.'
            : 'A bright Moon is strong and benefic. Emotional resilience is a genuine asset here and worth naming as one.',
        notability: strength < 40 ? 5 : 3,
        planets: ['Moon'],
        houses: [moon.house],
      });
    }
  }

  /* --- atmakaraka: highest degree, the soul significator in Jaimini --- */
  const classical = chart.placements.filter((p) => !['Rahu', 'Ketu'].includes(p.planet));
  const ak = [...classical].sort((a, b) => b.degree - a.degree)[0];
  if (ak) {
    out.push({
      id: 'atmakaraka',
      title: `${ak.planet} is atmakaraka`,
      statement: `${ak.planet} holds the highest degree in the chart at ${ak.degree.toFixed(2)}\u00b0 ${ak.sign}.`,
      consequence:
        'In Jaimini terms this carries the central lesson of the life. Whatever this planet signifies is the theme the person keeps being returned to until it is worked out.',
      notability: 3,
      planets: [ak.planet],
      houses: [ak.house],
    });
  }

  /* --- empty kendras: structural, and invisible unless counted --- */
  const occupiedKendras = KENDRA_HOUSES.filter((h) => (byHouse.get(h)?.length ?? 0) > 0);
  if (occupiedKendras.length <= 1) {
    out.push({
      id: 'empty-kendras',
      title: occupiedKendras.length === 0 ? 'All four kendras empty' : 'Kendras almost empty',
      statement:
        occupiedKendras.length === 0
          ? 'None of the four angular houses is occupied by any graha.'
          : `Only the ${ordinal(occupiedKendras[0])} of the four angular houses is occupied.`,
      consequence:
        'The chart has little angular support, so results depend heavily on house lords and dasha rather than on visible placement. Expect a life that builds indirectly.',
      notability: 4,
      planets: [],
      houses: KENDRA_HOUSES,
    });
  }

  /* --- nodal axis --- */
  const rahu = at(chart, 'Rahu');
  const ketu = at(chart, 'Ketu');
  if (rahu && ketu) {
    out.push({
      id: 'nodal-axis',
      title: `Nodal axis across the ${ordinal(rahu.house)} and ${ordinal(ketu.house)}`,
      statement: `Rahu in ${rahu.sign} in the ${ordinal(rahu.house)}, Ketu in ${ketu.sign} in the ${ordinal(ketu.house)}.`,
      consequence:
        `The direction of travel in this life runs from ${HOUSE_THEME[ketu.house]} toward ${HOUSE_THEME[rahu.house]}. What sits behind Ketu comes easily and is undervalued; what Rahu wants is unfamiliar and never quite satisfies.`,
      notability: 4,
      planets: ['Rahu', 'Ketu'],
      houses: [rahu.house, ketu.house],
    });
  }

  /*
   * Sandhi. A planet in the last or first degree of a sign is at a junction and
   * gives unstable results. It is also the placement most sensitive to birth-time
   * error, so it doubles as a warning about the recorded time.
   */
  /* Rahu and Ketu are always exactly opposite, so a junction placement for one is
     always a junction placement for the other. Reporting both says the same thing
     twice. */
  const sandhiSeen = new Set<string>();

  for (const p of chart.placements) {
    const edge = p.degree > 29 ? 'end' : p.degree < 1 ? 'start' : null;
    if (!edge) continue;
    if (p.planet === 'Ketu' && sandhiSeen.has('Rahu')) continue;
    if (p.planet === 'Rahu' && sandhiSeen.has('Ketu')) continue;
    sandhiSeen.add(p.planet);
    const neighbour = edge === 'end'
      ? SIGNS[(signIndex(p.sign) + 1) % 12]
      : SIGNS[(signIndex(p.sign) + 11) % 12];

    out.push({
      id: `sandhi.${p.planet}`,
      title: ['Rahu', 'Ketu'].includes(p.planet)
        ? `Nodal axis on a sign boundary`
        : `${p.planet} at the ${edge} of ${p.sign}`,
      statement: `${p.planet} sits at ${p.degree.toFixed(2)}\u00b0, ${edge === 'end' ? `${(30 - p.degree).toFixed(2)}\u00b0 from ${neighbour}` : `${p.degree.toFixed(2)}\u00b0 into the sign from ${neighbour}`}.`,
      consequence:
        `Junction placement - results are unstable and the planet behaves partly like its neighbour. It is also the first thing to recheck if the reading does not land: a few minutes of birth-time error moves ${p.planet} into ${neighbour} and changes its dignity, dispositor and varga positions.`,
      notability: 4,
      planets: [p.planet],
      houses: [p.house],
    });
  }

  /*
   * Ashtakavarga extremes. The classical strength measure was feeding the houses
   * dialog and the year timeline but not this panel, which meant the single most
   * quotable number about a chart was missing from the place a practitioner reads
   * first.
   */
  const av = computeAshtakavarga(chart);
  const ranked = (Object.entries(av.byHouse) as unknown as [string, number][])
    .map(([h, bindus]) => ({ house: Number(h) as HouseNumber, bindus }))
    .sort((a, b) => b.bindus - a.bindus);

  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];

  if (strongest.bindus >= 32) {
    out.push({
      id: 'sav-strong',
      title: `The ${ordinal(strongest.house)} is the best-supported house`,
      statement: `${strongest.bindus} bindus against an average of 28 - ${savBand(strongest.bindus).toLowerCase()}.`,
      consequence: `${HOUSE_THEME[strongest.house].charAt(0).toUpperCase()}${HOUSE_THEME[strongest.house].slice(1)} works with less effort here than anything else in the chart. Push decisions toward it.`,
      notability: 4,
      planets: [],
      houses: [strongest.house],
    });
  }

  if (weakest.bindus <= 24) {
    out.push({
      id: 'sav-weak',
      title: `The ${ordinal(weakest.house)} is the thinnest house`,
      statement: `${weakest.bindus} bindus against an average of 28 - ${savBand(weakest.bindus).toLowerCase()}.`,
      consequence: `${HOUSE_THEME[weakest.house].charAt(0).toUpperCase()}${HOUSE_THEME[weakest.house].slice(1)} takes more effort here for less return, and transits over it bite harder than they would elsewhere.`,
      notability: 4,
      planets: [],
      houses: [weakest.house],
    });
  }

  /* --- modality balance: true of every chart, so it ranks low --- */
  const modality = { movable: 0, fixed: 0, dual: 0 };
  for (const p of classical) {
    const i = signIndex(p.sign) % 3;
    if (i === 0) modality.movable++;
    else if (i === 1) modality.fixed++;
    else modality.dual++;
  }
  const dominant = (Object.entries(modality).sort((a, b) => b[1] - a[1])[0]) as [keyof typeof modality, number];
  if (dominant[1] >= 4) {
    out.push({
      id: 'modality',
      title: `${dominant[0][0].toUpperCase()}${dominant[0].slice(1)} emphasis`,
      statement: `${dominant[1]} of the seven classical grahas fall in ${dominant[0]} signs.`,
      consequence:
        dominant[0] === 'movable'
          ? 'Starts readily, changes direction readily. The coaching conversation is about finishing.'
          : dominant[0] === 'fixed'
            ? 'Holds a position once taken. Durable, and slow to change course even when it should.'
            : 'Adapts and negotiates rather than committing. Flexible, and can be hard to pin down.',
      notability: 2,
      planets: [],
      houses: [],
    });
  }

  return out.sort((a, b) => b.notability - a.notability);
}
