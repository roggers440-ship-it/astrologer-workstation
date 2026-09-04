import type { HouseNumber, PlanetName } from '@/types/astrology';
import { DUSTHANA_HOUSES, KENDRA_HOUSES } from '@/lib/vedic-constants';
import { ordinal } from '@/lib/rule-engine';
import { fullDignity } from '@/lib/strength';
import {
  at, carriersOf, confidenceFor, formatDate, houseSupport, lord, lordsConnected,
  occupants, topicWindows, type Answer, type AnswerContext,
} from './engine';

/**
 * Wealth.
 *
 * The 2nd holds what is kept, the 11th what comes in, the 5th and 9th what is
 * deserved. Dhana yogas are connections between their lords; the source of money
 * is read from which house the earning lords sit in.
 */
export function wealthAnswers(ctx: AnswerContext): Answer[] {
  const { chart, yogas } = ctx;
  const out: Answer[] = [];

  const second = houseSupport(ctx, 2);
  const eleventh = houseSupport(ctx, 11);
  const overall = Math.round(second * 0.45 + eleventh * 0.4 + houseSupport(ctx, 9) * 0.15);

  const dhana = yogas.filter((y) => y.category === 'Dhana' || y.category === 'Exchange');
  const raja = yogas.filter((y) => y.category === 'Raja');

  /* --- rich or struggling --- */
  out.push({
    question: 'Will I be wealthy, or is money going to be a struggle?',
    verdict:
      overall >= 68
        ? `Wealthy. ${dhana.length ? `${dhana.length} wealth combination${dhana.length > 1 ? 's' : ''} in the chart, and` : 'The earning houses are strong, and'} money accumulates rather than passing through.`
        : overall >= 52
          ? 'Comfortable rather than rich. You will not struggle, but wealth here is built steadily and will not arrive in one event.'
          : overall >= 36
            ? 'Money will be a recurring theme rather than a solved problem. Income arrives; holding onto it is the harder half.'
            : 'The chart points to financial pressure as a long-running condition. That is worth planning around honestly rather than waiting for it to lift.',
    confidence: confidenceFor(overall),
    support: overall,
    because: dhana.length
      ? `${dhana.map((d) => d.name).join('; ')}.`
      : 'No named wealth combination fires, so this rests on the strength of the earning houses alone.',
  });

  /* --- extreme wealth --- */
  const extreme = dhana.filter((d) => d.strength === 'Strong').length + raja.filter((r) => r.strength === 'Strong').length;
  out.push({
    question: 'Extreme wealth, or a luxurious lifestyle?',
    verdict:
      extreme >= 2
        ? 'The chart carries the combinations classically associated with substantial wealth. Whether they deliver depends entirely on the dasha catching them.'
        : extreme === 1
          ? 'One strong combination, which is enough for real prosperity but not for the kind the texts describe as royal.'
          : 'No. This is a working chart rather than a fortune chart, and saying so plainly is more useful than encouraging a hope the chart does not support.',
    confidence: extreme >= 2 ? 'Likely' : 'Clear',
    classical: extreme >= 2
      ? {
          claim: 'The native is possessed of much wealth, of gold and grain, of horses and elephants, and is charitable and famous.',
          source: 'Brihat Parashara Hora Shastra, chapter on dhana yogas',
        }
      : undefined,
  });

  /* --- salary, business or investment --- */
  const tenthLord = lord(chart, 10);
  const tenthPlace = at(chart, tenthLord);
  const seventhStrength = houseSupport(ctx, 7);
  const salarySignals = ['Saturn', 'Sun'].includes(tenthLord) || (tenthPlace ? [6, 10].includes(tenthPlace.house) : false);
  const businessSignals = seventhStrength > 55 || (tenthPlace ? [3, 7, 11].includes(tenthPlace.house) : false);
  const speculation = houseSupport(ctx, 5);

  out.push({
    question: 'Salary, business, or investments?',
    verdict:
      businessSignals && !salarySignals
        ? 'Business. The chart favours working for yourself or in partnership, and a salaried structure will feel like a cage rather than a floor.'
        : salarySignals && !businessSignals
          ? 'Salary. Structure suits this chart, and the risk profile for independent ventures is worse than it looks from the inside.'
          : 'Both work, in sequence rather than at once. Salary first to build the base, independent work later - and the dasha decides when the switch is safe.',
    confidence: businessSignals !== salarySignals ? 'Likely' : 'Mixed',
    because: `The 10th lord ${tenthLord} sits in the ${ordinal(tenthPlace?.house ?? 10)}, and the 7th scores ${seventhStrength}.`,
  });

  /* --- source of money --- */
  const eleventhLord = lord(chart, 11);
  const eleventhPlace = at(chart, eleventhLord);
  const sources: string[] = [];
  if (eleventhPlace) {
    if ([1, 3, 10].includes(eleventhPlace.house)) sources.push('your own effort');
    if ([4, 8].includes(eleventhPlace.house)) sources.push('inheritance or family property');
    if ([7].includes(eleventhPlace.house)) sources.push('marriage or partnership');
    if ([9, 12].includes(eleventhPlace.house)) sources.push('foreign sources or work abroad');
    if ([2, 5, 11].includes(eleventhPlace.house)) sources.push('accumulation and networks');
  }

  out.push({
    question: 'Where will the money come from?',
    verdict: sources.length
      ? `${sources.join(', then ')}`.replace(/^./, (c) => c.toUpperCase()) +
        '. That is where the earning house points, and it is usually more specific than people expect.'
      : 'No single source dominates. Income will be assembled from several places rather than arriving from one.',
    confidence: sources.length === 1 ? 'Clear' : 'Likely',
    because: `The 11th lord ${eleventhLord} sits in the ${ordinal(eleventhPlace?.house ?? 11)}.`,
  });

  /* --- peak earning years --- */
  const carriers = carriersOf(ctx, [2, 11], ['Jupiter', 'Venus']);
  const windows = topicWindows(ctx, carriers, { yearsForward: 25, limit: 3 });
  const peak = windows[0];

  if (peak) {
    out.push({
      question: 'When do the peak earning years start?',
      verdict: `${formatDate(peak.from)} to ${formatDate(peak.to)}. That is the stretch where the earning houses are actually running, and income decisions made inside it compound.`,
      confidence: peak.score >= 85 ? 'Clear' : 'Likely',
      window: { from: formatDate(peak.from), to: formatDate(peak.to), label: peak.label },
      support: Math.min(97, peak.score),
    });
  }

  /* --- risk appetite --- */
  const rahu = at(chart, 'Rahu');
  const rahuSpeculative = rahu ? [2, 5, 8, 11].includes(rahu.house) : false;

  out.push({
    question: 'Am I suited to high-risk investments?',
    verdict:
      speculation > 60 && rahuSpeculative
        ? 'Yes, with a caveat: the chart supports speculation and also supports overreaching. Set the exit rule before entering, because the chart will not supply the discipline.'
        : speculation > 60
          ? 'Reasonably. The house of speculation is strong enough to carry measured risk.'
          : rahuSpeculative
            ? 'The appetite is there and the support is not. That combination loses money, and it is worth saying so directly.'
            : 'No. Keep capital in things that do not require timing. This chart is not built for it.',
    confidence: 'Likely',
    support: speculation,
    because: `The 5th scores ${speculation}${rahuSpeculative ? `, and Rahu sits in the ${ordinal(rahu!.house)}` : ''}.`,
  });

  /* --- sudden wealth --- */
  const eighthLord = lord(chart, 8);
  const eighthPlace = at(chart, eighthLord);
  const windfall =
    (eighthPlace && [2, 11].includes(eighthPlace.house)) ||
    occupants(chart, 8).some((o) => ['Jupiter', 'Venus'].includes(o.planet)) ||
    lordsConnected(ctx, 8, 11) !== null;

  out.push({
    question: 'Sudden wealth - windfall, inheritance, speculation?',
    verdict: windfall
      ? 'There is a genuine indication. The house of other people\u2019s money is tied into the house of gains, which is the classical marker for wealth arriving from outside your own earning.'
      : 'No. Nothing links unearned money to the earning houses. Money here comes from work, and planning around a windfall would be planning around nothing.',
    confidence: windfall ? 'Likely' : 'Clear',
    because: windfall
      ? `${lordsConnected(ctx, 8, 11) ?? `The 8th lord ${eighthLord} sits in the ${ordinal(eighthPlace?.house ?? 8)}`}.`
      : undefined,
  });

  /* --- expenses and debt --- */
  const twelfthLord = lord(chart, 12);
  const twelfthPlace = at(chart, twelfthLord);
  const leaks = twelfthPlace && [2, 11].includes(twelfthPlace.house);
  const debtCarrier = lord(chart, 6);

  out.push({
    question: 'What causes unexpected expenses, and when do debts end?',
    verdict: leaks
      ? `Expense is wired directly into income - the 12th lord sits in the ${ordinal(twelfthPlace!.house)}. Money leaves as fast as it arrives, and the fix is structural: separate the accounts, because willpower will not do it.`
      : `${debtCarrier} periods are when debt builds and when it clears. Outside them, spending is not the problem it feels like.`,
    confidence: 'Likely',
    because: `The 12th lord ${twelfthLord} sits in the ${ordinal(twelfthPlace?.house ?? 12)}; the 6th is run by ${debtCarrier}.`,
  });

  return out;
}
