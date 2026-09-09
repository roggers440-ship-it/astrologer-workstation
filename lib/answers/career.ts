import { ordinal } from '@/lib/rule-engine';
import { fullDignity } from '@/lib/strength';
import {
  at, carriersOf, confidenceFor, formatDate, houseSupport, lord, lordsConnected,
  occupants, topicWindows, type Answer, type AnswerContext,
} from './engine';
import { KENDRA_HOUSES, SIGN_LORD } from '@/lib/vedic-constants';

/**
 * Neechabhanga: a debilitation that cancels.
 *
 * Classically the fall is undone when the dispositor of the fallen planet, or
 * the planet exalted in that sign, sits in a kendra from the lagna or the Moon -
 * and also when the fallen planet itself occupies a kendra. Venus fallen in the
 * 10th satisfies the last of those, which is why it cannot be read as a plain
 * defect, and why saying so is the difference between a useful reading and a
 * discouraging one.
 */
function cancellation(ctx: AnswerContext, planet: Parameters<typeof at>[1]): string | null {
  const { chart } = ctx;
  const place = at(chart, planet);
  if (!place || fullDignity(chart, planet).state !== 'Debilitated') return null;

  const reasons: string[] = [];
  if (KENDRA_HOUSES.includes(place.house)) reasons.push(`${planet} itself sits in a kendra`);

  const dispositor = SIGN_LORD[place.sign];
  const dispositorPlace = at(chart, dispositor);
  if (dispositorPlace && KENDRA_HOUSES.includes(dispositorPlace.house)) {
    reasons.push(`${dispositor}, which hosts it, is in a kendra`);
  }

  return reasons.length > 0 ? reasons.join(' and ') : null;
}

/** Field associations by the planet running the 10th. */
const FIELD_BY_PLANET: Record<string, string> = {
  Sun: 'government, administration, medicine, anything with a visible chair at the top',
  Moon: 'public-facing work, hospitality, healthcare, food, water, the general public',
  Mars: 'engineering, surgery, defence, sport, property, machinery, anything with risk in it',
  Mercury: 'writing, analysis, trade, accounting, software, teaching, brokerage',
  Jupiter: 'law, finance, teaching, advisory work, publishing, religion',
  Venus: 'design, media, fashion, luxury, entertainment, diplomacy',
  Saturn: 'infrastructure, land, mining, labour, government service, long-cycle industries',
  Rahu: 'technology, foreign trade, aviation, speculation, anything new enough to have no rules yet',
  Ketu: 'research, medicine, spiritual work, forensic and investigative fields',
};

export function careerAnswers(ctx: AnswerContext): Answer[] {
  const { chart, natal, yogas } = ctx;
  const out: Answer[] = [];

  const tenth = houseSupport(ctx, 10);
  const tenthLord = lord(chart, 10);
  const tenthPlace = at(chart, tenthLord);
  const d10 = natal.charts.D10;
  const d10Tenth = d10.placements.filter((p) => p.house === 10);
  const raja = yogas.filter((y) => y.category === 'Raja' && y.strength === 'Strong');

  /*
   * Recognition read from the occupants' condition, not merely their presence.
   * A fallen planet in the 10th still makes the house visible - it just makes
   * the visibility harder won, which is a different sentence.
   */
  const inTenth = occupants(chart, 10);
  const fallen = inTenth.filter((o) => fullDignity(chart, o.planet).state === 'Debilitated');
  const dignified = inTenth.filter((o) => fullDignity(chart, o.planet).score >= 3);
  const names = (list: typeof inTenth) => list.map((o) => o.planet).join(' and ');
  const verb = (list: typeof inTenth) => (list.length === 1 ? 'sits' : 'sit');


  out.push({
    question: 'How far does my career actually go?',
    verdict:
      tenth >= 68
        ? 'High. The chart supports genuine standing in whatever field you enter, and that is not true of most charts.'
        : tenth >= 52
          ? 'Solid and senior, without national visibility. You get respected in your field rather than known outside it.'
          : tenth >= 36
            ? 'Steady work rather than a rising arc. Advancement comes from staying put and being reliable, not from moves.'
            : 'Career is the harder part of this chart. Income will come more easily than status, and it is worth building the life around that rather than fighting it.',
    confidence: confidenceFor(tenth),
    support: tenth,
    because: raja.length
      ? `${raja[0].name} touches the career houses.`
      : `The 10th lord ${tenthLord} sits in the ${ordinal(tenthPlace?.house ?? 10)}.`,
  });

  /* Occupants colour the field as much as the lord does, and a planet sitting in
     the 10th is often the more recognisable half of the answer. */
  const occupantFields = inTenth
    .filter((o) => FIELD_BY_PLANET[o.planet] && o.planet !== tenthLord)
    .map((o) => FIELD_BY_PLANET[o.planet]);

  out.push({
    question: 'Which field?',
    verdict:
      `${FIELD_BY_PLANET[tenthLord]}. ` +
      (occupantFields.length > 0
        ? `${names(inTenth.filter((o) => o.planet !== tenthLord))} also sits in the career house, which pulls it toward ${occupantFields.join('; ')}. `
        : '') +
      (d10Tenth.length
        ? `The D10 puts ${d10Tenth.map((p) => p.planet).join(' and ')} on the career house, which points the same way.`
        : `The D10 career house is empty, so this rests on the D1 alone.`),
    confidence: 'Likely',
    because: `${tenthLord} runs the 10th, and its significations describe the work.`,
  });

  const sixthLink = lordsConnected(ctx, 10, 6);
  out.push({
    question: 'Will I be recognised, or do the work behind the scenes?',
    verdict:
      inTenth.length === 0
        ? sixthLink
          ? 'Behind the scenes. Career is tied to service and problem-solving, which is valued but rarely credited publicly.'
          : 'Moderately visible. Known inside the industry, not outside it.'
        : dignified.length > 0
          ? `Visible, and comfortably so. ${names(dignified)} ${verb(dignified)} well in the career house, which puts you in front of people rather than behind them.`
          : fallen.length > 0
            ? `Visible, but it is hard won. ${names(fallen)} ${verb(fallen)} in the career house at its weakest, so you are seen without being valued at first - recognition arrives later than the work does, and usually from a second employer rather than the one you did it for.`
            : `Visible. ${names(inTenth)} ${verb(inTenth)} in the career house, and an occupied 10th does not stay quiet.`,
    confidence: 'Likely',
    because: fallen.length > 0 ? `${names(fallen)} is debilitated in the 10th.` : undefined,
  });

  /* A cancelled debilitation is a different chart from an uncancelled one, and a
     reading that omits it is discouraging someone for no reason. */
  for (const o of fallen) {
    const cancelled = cancellation(ctx, o.planet);
    if (!cancelled) continue;

    out.push({
      question: `Is ${o.planet} in the 10th as bad as it sounds?`,
      verdict:
        `No. The fall cancels - ${cancelled} - so this reads as a slow start rather than a permanent ceiling. ` +
        'Expect the first decade of work to undersell you and the reversal to be sharp when it comes.',
      confidence: 'Likely',
      classical: {
        claim: 'When the lord of the sign of debilitation, or the lord of the sign of its exaltation, occupies a kendra from the lagna or the Moon, the debilitation is cancelled and a raja yoga results.',
        source: 'Neechabhanga raja yoga, standard formulation across Parashari texts',
      },
    });
  }

  const carriers = carriersOf(ctx, [10, 6], ['Sun', 'Saturn']);
  const windows = topicWindows(ctx, carriers, { yearsForward: 20, limit: 3 });
  if (windows[0]) {
    out.push({
      question: 'When does the career actually move?',
      verdict: `${formatDate(windows[0].from)} to ${formatDate(windows[0].to)}. Moves made inside this window stick; moves made outside it tend to get reversed within a year.`,
      confidence: windows[0].score >= 85 ? 'Clear' : 'Likely',
      window: { from: formatDate(windows[0].from), to: formatDate(windows[0].to), label: windows[0].label },
      support: Math.min(97, windows[0].score),
    });
  }

  return out;
}
