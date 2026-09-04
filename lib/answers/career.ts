import { ordinal } from '@/lib/rule-engine';
import { fullDignity } from '@/lib/strength';
import {
  at, carriersOf, confidenceFor, formatDate, houseSupport, lord, lordsConnected,
  occupants, topicWindows, type Answer, type AnswerContext,
} from './engine';

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

  out.push({
    question: 'Which field?',
    verdict:
      `${FIELD_BY_PLANET[tenthLord]}. ` +
      (d10Tenth.length
        ? `The D10 puts ${d10Tenth.map((p) => p.planet).join(' and ')} on the career house, which points the same way.`
        : `The D10 career house is empty, so this rests on the D1 alone.`),
    confidence: 'Likely',
    because: `${tenthLord} runs the 10th, and its significations describe the work.`,
  });

  const sixthLink = lordsConnected(ctx, 10, 6);
  out.push({
    question: 'Will I be recognised, or do the work behind the scenes?',
    verdict: occupants(chart, 10).length > 0
      ? `Visible. ${occupants(chart, 10).map((o) => o.planet).join(' and ')} sit in the career house, and occupied 10th houses do not stay quiet.`
      : sixthLink
        ? 'Behind the scenes. Career is tied to service and problem-solving, which is valued but rarely credited publicly.'
        : 'Moderately visible. Known inside the industry, not outside it.',
    confidence: 'Likely',
  });

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
