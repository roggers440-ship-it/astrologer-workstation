import type { ChartData, HouseNumber, NatalChart, PlanetName } from '@/types/astrology';
import {
  DUSTHANA_HOUSES, SIGN_LORD, dignityOf, housesAspectedBy, housesRuledBy, lordOfHouse,
} from './vedic-constants';
import { houseDistance, isCombust, ordinal } from './rule-engine';
import { digbala, fullDignity, panchadhaMaitri } from './strength';
import { HOUSE_THEME } from './house-themes';

/**
 * The combination layer.
 *
 * Every other module in this application computes factors and reports what each
 * one means on its own. That produces a glossary: "Saturn in the 7th means
 * delay" is in every beginner book and a practitioner does not need software to
 * recall it.
 *
 * What distinguishes one chart from another is how the factors modify each
 * other. This file computes only those interactions, under one rule: a claim
 * here must be something neither input says alone. If a detector would restate
 * the textbook meaning of a single placement, it does not belong.
 */

export interface Combination {
  id: string;
  /** How much this changes the reading. Used to rank, not to score the house. */
  weight: number;
  /** The modified meaning. Never the plain meaning of either input. */
  claim: string;
  /** Which facts were combined, so the reasoning is checkable. */
  from: string[];
}

const at = (c: ChartData, p: PlanetName) => c.placements.find((x) => x.planet === p);

const BENEFICS: PlanetName[] = ['Jupiter', 'Venus', 'Mercury', 'Moon'];

/** Bhava karakas. A karaka sitting in the house it signifies is its own problem. */
const HOUSE_KARAKA: Record<HouseNumber, PlanetName> = {
  1: 'Sun', 2: 'Jupiter', 3: 'Mars', 4: 'Moon', 5: 'Jupiter', 6: 'Mars',
  7: 'Venus', 8: 'Saturn', 9: 'Jupiter', 10: 'Sun', 11: 'Jupiter', 12: 'Saturn',
};

export function combinationsFor(natal: NatalChart, house: HouseNumber): Combination[] {
  const chart = natal.charts.D1;
  const d9 = natal.charts.D9;
  const out: Combination[] = [];

  const ruler = lordOfHouse(house, chart.ascendantSign);
  const rulerPlace = at(chart, ruler)!;
  const occupants = chart.placements.filter((p) => p.house === house);
  const karaka = HOUSE_KARAKA[house];
  const theme = HOUSE_THEME[house];

  const aspectingHere = chart.placements
    .filter((p) => p.house !== house && housesAspectedBy(p.planet, p.house).includes(house))
    .map((p) => p.planet);

  /* --- 1. An occupant sitting in the sign of the house's own ruler --------- */
  for (const o of occupants) {
    if (SIGN_LORD[o.sign] !== ruler || o.planet === ruler) continue;
    const rulerCondition = fullDignity(chart, ruler);
    out.push({
      id: `guest.${o.planet}`,
      weight: 9,
      claim:
        `${o.planet} sits here as a guest of ${ruler}, the planet that runs this area - it occupies ${ruler}'s own sign. ` +
        `So ${o.planet}'s effect is filtered through ${ruler}'s condition rather than acting on its own, and ${ruler} is ${rulerCondition.plain} in the ${ordinal(rulerPlace.house)}. ` +
        `Read ${ruler} first; ${o.planet} only gets to do what ${ruler} permits.`,
      from: [`${o.planet} in ${o.sign}`, `${ruler} rules ${o.sign} and the ${ordinal(house)}`],
    });
  }

  /* --- 2. Whether the occupant and the ruler are on the same side ---------- */
  for (const o of occupants) {
    if (o.planet === ruler) continue;
    const rel = panchadhaMaitri(chart, o.planet, ruler);
    if (rel === 'Neutral') continue;

    const hostile = rel === 'Enemy' || rel === 'Great enemy';
    out.push({
      id: `agenda.${o.planet}`,
      weight: hostile ? 8 : 6,
      claim: hostile
        ? `${o.planet} occupies this area while ${ruler} governs it, and the two are ${rel.toLowerCase() === 'great enemy' ? 'strongly opposed' : 'at odds'}. ` +
          `The area is run on one agenda and lived on another, so the friction here is internal rather than caused by anyone outside it. That is usually the part a client cannot explain about themselves.`
        : `${o.planet} occupies this area and ${ruler} governs it, and the two work well together. ` +
          `Unusually coherent - what this area wants and what it does are the same thing, which is rarer than it sounds and worth naming as a strength.`,
      from: [`${o.planet} in the ${ordinal(house)}`, `${ruler} rules it`, `relationship: ${rel}`],
    });
  }

  /* --- 3. Strong by direction, weak by sign, or the reverse ---------------- */
  for (const p of [...occupants.map((o) => o.planet), ruler]) {
    const dig = fullDignity(chart, p);
    const dir = digbala(chart, p);
    if (dig.score <= -2 && dir.value >= 0.75) {
      out.push({
        id: `split.${p}`,
        weight: 7,
        claim:
          `${p} is uncomfortable by sign here but sits in the best house for it by direction. ` +
          `That combination performs better than its sign suggests: it looks weak on paper and does not behave weakly. Expect capability that arrives without confidence attached.`,
        from: [`${p} ${dig.state}`, `digbala ${Math.round(dir.value * 100)}%`],
      });
    } else if (dig.score >= 3 && dir.value <= 0.25) {
      out.push({
        id: `split.${p}`,
        weight: 7,
        claim:
          `${p} is strong by sign and badly placed by direction. It promises more than it delivers here - the potential is real and the circumstances do not let it out.`,
        from: [`${p} ${dig.state}`, `digbala ${Math.round(dir.value * 100)}%`],
      });
    }
  }

  /* --- 4. Karako bhava nashaya - the significator in its own house --------- */
  if (occupants.some((o) => o.planet === karaka)) {
    out.push({
      id: 'karaka-in-own-house',
      weight: 8,
      claim:
        `${karaka} signifies this area and is also sitting in it. Classically that harms rather than helps - the significator crowds the house it stands for. ` +
        `In practice it reads as caring about this too much: over-investment in ${theme.split(',')[0]} that produces the opposite of what was wanted.`,
      from: [`${karaka} is the significator of the ${ordinal(house)}`, `${karaka} occupies the ${ordinal(house)}`],
    });
  }

  /* --- 5. A benefic aspect on a difficult occupant ------------------------- */
  const harshOccupants = occupants.filter((o) => !BENEFICS.includes(o.planet));
  const benignAspects = aspectingHere.filter((a) => a === 'Jupiter' || a === 'Venus');
  if (harshOccupants.length > 0 && benignAspects.length > 0) {
    out.push({
      id: 'mitigated',
      weight: 7,
      claim:
        `${harshOccupants.map((h) => h.planet).join(' and ')} make this area demanding, and ${benignAspects.join(' and ')} ${benignAspects.length > 1 ? 'watch' : 'watches'} it from elsewhere. ` +
        `The difficulty is not removed - it is made productive. Whatever this area costs, it returns something for the cost, which is a different reading from difficulty alone.`,
      from: [`${harshOccupants.map((h) => h.planet).join(', ')} occupy the ${ordinal(house)}`, `${benignAspects.join(', ')} aspect it`],
    });
  }

  /* --- 6. Strength contested by a malefic aspect --------------------------- */
  const harshAspects = aspectingHere.filter((a) => ['Saturn', 'Mars', 'Rahu', 'Ketu'].includes(a));
  const rulerStrong = fullDignity(chart, ruler).score >= 2;
  if (rulerStrong && harshAspects.length > 0 && occupants.every((o) => BENEFICS.includes(o.planet))) {
    out.push({
      id: 'contested',
      weight: 6,
      claim:
        `${ruler} runs this area from a position of strength, and ${harshAspects.join(' and ')} press on it from elsewhere. ` +
        `The strength is real and it is contested: this works, and it does not work quietly. Expect to defend it rather than simply enjoy it.`,
      from: [`${ruler} is strong`, `${harshAspects.join(', ')} aspect the ${ordinal(house)}`],
    });
  }

  /* --- 7. The ruler sitting in a house of difficulty from the house itself -
     Bhavat bhavam: counting 6, 8 and 12 from the bhava rather than from the
     lagna. A lord in the 12th from its own house drains that house specifically,
     which is invisible if you only count from the ascendant. */
  const fromHouse = houseDistance(house, rulerPlace.house);
  if ([6, 8, 12].includes(fromHouse)) {
    out.push({
      id: 'lord-dusthana-from-house',
      weight: 8,
      claim:
        `${ruler} sits ${ordinal(fromHouse)} from the house it runs. Counted from the ascendant that placement looks ordinary; counted from this house it is a house of loss. ` +
        (fromHouse === 12
          ? 'The matter leaks - effort and resources go into it and do not come back in the same form.'
          : fromHouse === 6
            ? 'The matter is contested from the inside. Progress here comes through conflict rather than around it.'
            : 'The matter gets remade rather than built. Expect at least one full reset in this area.'),
      from: [`${ruler} in the ${ordinal(rulerPlace.house)}`, `that is the ${ordinal(fromHouse)} from the ${ordinal(house)}`],
    });
  }

  /* --- 8. Vargottama and the D9 cross-check ------------------------------- */
  const rulerD9 = d9.placements.find((p) => p.planet === ruler);
  if (rulerD9) {
    const vargottama = rulerD9.sign === rulerPlace.sign;
    const d9Dignity = dignityOf(ruler, rulerD9.sign, rulerD9.degree);
    const d1Strong = fullDignity(chart, ruler).score >= 0;
    const d9Strong = !['Debilitated'].includes(d9Dignity);

    if (vargottama) {
      out.push({
        id: 'vargottama',
        weight: 9,
        claim:
          `${ruler} holds the same sign in the birth chart and the ninth-part chart. That doubling makes it the most dependable thing about this area - what it promises in outline it also delivers in detail, which is not true of most placements.`,
        from: [`${ruler} in ${rulerPlace.sign} in D1`, `${ruler} in ${rulerD9.sign} in D9`],
      });
    } else if (d1Strong !== d9Strong) {
      out.push({
        id: 'd9-divergence',
        weight: 8,
        claim: d1Strong
          ? `${ruler} looks well placed in the birth chart and does not hold up in the ninth-part chart. This area presents better than it functions: good on the surface, thinner underneath, and the gap tends to show after the first few years.`
          : `${ruler} looks poor in the birth chart and holds up in the ninth-part chart. This area functions better than it appears - it improves with time and with commitment, and early impressions of it are misleading.`,
        from: [`${ruler} ${fullDignity(chart, ruler).state} in D1`, `${ruler} ${d9Dignity} in D9`],
      });
    }
  }

  /* --- 9. A retrograde ruler or occupant ---------------------------------- */
  const retro = [...occupants, rulerPlace].filter(
    (p) => p.isRetrograde && !['Rahu', 'Ketu'].includes(p.planet),
  );
  for (const r of retro) {
    out.push({
      id: `retro.${r.planet}`,
      weight: 5,
      claim:
        `${r.planet} is retrograde here. The matter comes round twice: expect a second attempt at the same thing rather than a single clean run, and the second attempt is the one that holds.`,
      from: [`${r.planet} retrograde`],
    });
  }

  /* --- 10. A combust ruler ------------------------------------------------ */
  if (isCombust(chart, ruler)) {
    out.push({
      id: 'combust-lord',
      weight: 8,
      claim:
        `${ruler} runs this area and is burnt up by the Sun. Whatever its sign says, it cannot act freely - this area is subordinate to the person's need to be seen, and it gets sacrificed to that when the two conflict.`,
      from: [`${ruler} combust`],
    });
  }

  /* --- 11. The occupant also rules the ascendant ---------------------------
     The most useful thing this file computes. A planet sitting in a house while
     also running the person's own self means whatever it does there is
     self-authored - the delay, the caution or the drive is coming from them
     rather than happening to them. Textbook readings never say this because it
     needs two facts at once. */
  for (const o of occupants) {
    if (o.planet === ruler) continue;
    const owns = housesRuledBy(o.planet, chart.ascendantSign);
    if (!owns.includes(1 as HouseNumber)) continue;

    out.push({
      id: `self-authored.${o.planet}`,
      weight: 10,
      claim:
        `${o.planet} sits in this house and also runs the person themselves. Whatever ${o.planet} does to ${theme.split(',')[0]}, they are doing to themselves - it is chosen rather than imposed. ` +
        `Someone with this raises their own bar here and then lives with the consequences of the standard, so what looks from outside like bad luck is usually a series of refusals.`,
      from: [`${o.planet} occupies the ${ordinal(house)}`, `${o.planet} rules the ascendant`],
    });
  }

  /* --- 12. The occupant's other house, wired in --------------------------- */
  for (const o of occupants) {
    const owns = housesRuledBy(o.planet, chart.ascendantSign).filter((h) => h !== house && h !== 1);
    if (owns.length === 0) continue;

    out.push({
      id: `crosslink.${o.planet}`,
      weight: 6,
      claim:
        `${o.planet} sits here and also runs ${owns.map((h) => HOUSE_THEME[h].split(',')[0]).join(' and ')}. ` +
        `Those are not separate parts of the life for this person - they move together, and a change in one shows up in the other within the same period.`,
      from: [`${o.planet} in the ${ordinal(house)}`, `${o.planet} rules the ${owns.map(ordinal).join(' and ')}`],
    });
  }

  /* --- 13. Occupants pulling in different directions ---------------------- */
  if (occupants.length >= 2) {
    const benefic = occupants.filter((o) => BENEFICS.includes(o.planet));
    const malefic = occupants.filter((o) => !BENEFICS.includes(o.planet));
    if (benefic.length > 0 && malefic.length > 0) {
      out.push({
        id: 'mixed-occupants',
        weight: 7,
        claim:
          `${benefic.map((b) => b.planet).join(' and ')} and ${malefic.map((m) => m.planet).join(' and ')} share this house, which is why it never settles into one character. ` +
          `The area alternates rather than blends: good stretches and hard stretches, decided by which of them the current period belongs to, not by anything the person is doing differently.`,
        from: [`${occupants.map((o) => o.planet).join(', ')} in the ${ordinal(house)}`],
      });
    }
  }

  /* --- 14. Where the matter actually comes from --------------------------- */
  if (rulerPlace.house !== house) {
    const dispositor = SIGN_LORD[rulerPlace.sign];
    const dispositorPlace = at(chart, dispositor);
    if (dispositorPlace && dispositor !== ruler) {
      out.push({
        id: 'chain',
        weight: 6,
        claim:
          `The chain runs ${ruler} in the ${ordinal(rulerPlace.house)}, hosted by ${dispositor} in the ${ordinal(dispositorPlace.house)}. ` +
          `So this area is fed by ${HOUSE_THEME[dispositorPlace.house]} at one remove. That second step is where the results actually originate, and it is the part clients never guess.`,
        from: [`${ruler} in ${rulerPlace.sign}`, `${dispositor} rules ${rulerPlace.sign}`],
      });
    }
  }

  return out.sort((a, b) => b.weight - a.weight);
}


/* ========================================================================== */
/*  Chart-level combinations                                                  */
/* ========================================================================== */

/**
 * Interactions that belong to the chart rather than to one house.
 *
 * Same rule as above: nothing here may restate what a single placement means.
 * These are the statements a practitioner reaches by holding two or three facts
 * together, and they are the ones that make a reading sound like it was done for
 * this person.
 */
export function chartCombinations(natal: NatalChart): Combination[] {
  const chart = natal.charts.D1;
  const out: Combination[] = [];
  const asc = chart.ascendantSign;

  const lagnaLord = lordOfHouse(1, asc);
  const classical = chart.placements.filter((p) => !['Rahu', 'Ketu'].includes(p.planet));

  /* --- Final dispositor -----------------------------------------------------
     Follow each planet to the ruler of its sign, then that ruler's sign, and so
     on. Most chains terminate at a planet sitting in its own sign, and when a
     large share of the chart flows into one planet, that planet effectively runs
     the chart. Rarely computed, and it changes where remedial work goes. */
  const dispositorOf = (p: PlanetName): PlanetName | null => {
    const place = at(chart, p);
    if (!place) return null;
    const d = SIGN_LORD[place.sign];
    return d === p ? null : d;
  };

  const terminus = (start: PlanetName): PlanetName | null => {
    const seen = new Set<PlanetName>();
    let current: PlanetName | null = start;
    while (current && !seen.has(current)) {
      seen.add(current);
      const next: PlanetName | null = dispositorOf(current);
      if (!next) return current;
      current = next;
    }
    return null; // a loop rather than a terminus
  };

  const endpoints = new Map<PlanetName, number>();
  for (const p of classical) {
    const end = terminus(p.planet);
    if (end) endpoints.set(end, (endpoints.get(end) ?? 0) + 1);
  }

  const [finalDispositor, count] = [...endpoints.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  if (finalDispositor && count >= 4) {
    const place = at(chart, finalDispositor)!;
    out.push({
      id: 'final-dispositor',
      weight: 10,
      claim:
        `${count} of the seven planets trace their chain of rulership back to ${finalDispositor}, sitting in the ${ordinal(place.house)}. ` +
        `That makes ${finalDispositor} the planet the whole chart answers to: its periods matter more than their length suggests, and it is where any remedial effort should go first. ` +
        `A chart with one endpoint like this is more single-minded than one where the chains scatter.`,
      from: [`dispositor chains terminate at ${finalDispositor}`, `${finalDispositor} in ${place.sign}`],
    });
  }

  /* --- Planetary war: two planets within a degree of each other ------------- */
  for (let i = 0; i < classical.length; i++) {
    for (let j = i + 1; j < classical.length; j++) {
      const a = classical[i];
      const b = classical[j];
      if (a.house !== b.house) continue;
      const gap = Math.abs(a.longitude - b.longitude);
      if (gap > 1) continue;

      const winner = a.longitude < b.longitude ? a : b;
      const loser = winner === a ? b : a;
      out.push({
        id: `war.${a.planet}.${b.planet}`,
        weight: 9,
        claim:
          `${a.planet} and ${b.planet} sit within a degree of each other, which the tradition treats as a war between them rather than a partnership. ` +
          `${winner.planet} takes the ground and ${loser.planet} loses much of its ability to act, whatever its own condition says. ` +
          `Read ${loser.planet}'s significations as underdelivering throughout the life, not only in its own periods.`,
        from: [`${a.planet} ${a.degree.toFixed(1)}`, `${b.planet} ${b.degree.toFixed(1)}`, `separation ${gap.toFixed(2)} degrees`],
      });
    }
  }

  /* --- The self and the significators it has to work through ---------------- */
  const pairings: { other: PlanetName; label: string; meaning: string }[] = [
    { other: 'Moon', label: 'their own mind', meaning: 'how they feel about themselves matches, or does not match, what they actually are' },
    { other: 'Sun', label: 'authority and the father', meaning: 'how comfortably they carry authority, and how they got on with the first one they met' },
  ];

  for (const pair of pairings) {
    if (pair.other === lagnaLord) continue;
    const rel = panchadhaMaitri(chart, lagnaLord, pair.other);
    if (rel === 'Neutral' || rel === 'Friend') continue;

    const hostile = rel === 'Enemy' || rel === 'Great enemy';
    out.push({
      id: `self-vs-${pair.other}`,
      weight: 8,
      claim: hostile
        ? `${lagnaLord} runs this person and is at odds with ${pair.other}, which governs ${pair.label}. ` +
          `Expect a standing internal disagreement about ${pair.meaning}. It is not situational and it does not resolve with circumstances - it is structural.`
        : `${lagnaLord} runs this person and works closely with ${pair.other}, which governs ${pair.label}. ` +
          `That agreement is worth naming: ${pair.meaning} lines up, which removes a friction most people carry.`,
      from: [`lagna lord ${lagnaLord}`, `relationship with ${pair.other}: ${rel}`],
    });
  }

  /* --- The strongest and weakest planet, and whether they interact ---------- */
  const ranked = [...classical]
    .map((p) => ({ planet: p.planet, score: fullDignity(chart, p.planet).score, house: p.house }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];

  if (best && worst && best.planet !== worst.planet && best.score - worst.score >= 6) {
    const together = best.house === worst.house;
    const rel = panchadhaMaitri(chart, best.planet, worst.planet);
    out.push({
      id: 'range',
      weight: 7,
      claim:
        `The gap between ${best.planet} and ${worst.planet} in this chart is unusually wide. ` +
        (together
          ? `They also share the ${ordinal(best.house)}, so the best and worst of this person surface in the same area of life at the same time. That is why this part of the life is so uneven.`
          : rel === 'Great friend' || rel === 'Friend'
            ? `They are on good terms, so ${best.planet} can be used to carry ${worst.planet} - the strength is available to prop up the weakness, which is not always the case.`
            : `They are not on good terms, so the strength cannot be borrowed to cover the weakness. Those two areas of life have to be run separately.`),
      from: [`${best.planet} strongest`, `${worst.planet} weakest`, `relationship: ${rel}`],
    });
  }

  /* --- Atmakaraka: the highest degree, and where it sits -------------------- */
  const ak = [...classical].sort((a, b) => b.degree - a.degree)[0];
  if (ak) {
    const dig = fullDignity(chart, ak.planet);
    out.push({
      id: 'atmakaraka-placement',
      weight: 7,
      claim:
        `${ak.planet} holds the highest degree in the chart and sits in the ${ordinal(ak.house)}, ${dig.plain}. ` +
        `The lesson of the life is therefore not ${ak.planet}'s significations in the abstract but what happens to them in ${HOUSE_THEME[ak.house]} - that is the specific version of the lesson this person keeps meeting.`,
      from: [`${ak.planet} at ${ak.degree.toFixed(2)} degrees`, `${ak.planet} in the ${ordinal(ak.house)}`],
    });
  }

  return out.sort((a, b) => b.weight - a.weight);
}
