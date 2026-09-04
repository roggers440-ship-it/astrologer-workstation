import type { HouseNumber } from '@/types/astrology';
import { ordinal } from '@/lib/rule-engine';
import { fullDignity } from '@/lib/strength';
import {
  at, carriersOf, confidenceFor, formatDate, houseSupport, lord, lordsConnected,
  occupants, topicWindows, type Answer, type AnswerContext,
} from './engine';
import { SIGNS, signIndex } from '@/lib/vedic-constants';

/** Family, children and property share the household axis, so they sit together. */
export function familyAnswers(ctx: AnswerContext): Answer[] {
  const { chart } = ctx;
  const out: Answer[] = [];

  const second = houseSupport(ctx, 2);
  const fourth = houseSupport(ctx, 4);
  const third = houseSupport(ctx, 3);
  const moon = fullDignity(chart, 'Moon');
  const sun = fullDignity(chart, 'Sun');

  out.push({
    question: 'What is my family life actually like?',
    verdict:
      (second + fourth) / 2 >= 60
        ? 'Supportive and stable. The family houses hold, and this is a resource in your life rather than a drain on it.'
        : (second + fourth) / 2 >= 45
          ? 'Mixed. Real warmth alongside real friction, and the friction is usually about money or expectation rather than affection.'
          : 'Strained. The family houses are weak, which usually shows as either distance or obligation without much return. Worth naming plainly - people carrying this already know.',
    confidence: confidenceFor((second + fourth) / 2),
    support: Math.round((second + fourth) / 2),
    because: `Family and speech ${second}, home and mother ${fourth}.`,
  });

  out.push({
    question: 'Relationship with my mother?',
    verdict:
      moon.score >= 2 && fourth >= 50
        ? 'Close and sustaining. The mother is a genuine support in this chart, including materially.'
        : moon.score <= -2
          ? 'Complicated. Either distance, or care flowing the wrong way earlier than it should have. Ask rather than assert.'
          : 'Ordinary - close enough, with the usual friction. Nothing in the chart flags this as a defining wound.',
    confidence: 'Mixed',
    because: `The Moon is ${moon.plain} and the 4th scores ${fourth}.`,
  });

  out.push({
    question: 'Relationship with my father?',
    verdict:
      sun.score >= 2
        ? 'Strong. The father is a source of standing and direction here.'
        : sun.score <= -2
          ? 'Difficult or absent in some form - distance, illness, early loss, or authority that could not be reached. The debilitated Sun is one of the most reliable markers in the chart for this.'
          : 'Workable, with distance. Respect more than closeness.',
    confidence: sun.score <= -2 ? 'Likely' : 'Mixed',
    because: `The Sun is ${sun.plain}.`,
  });

  out.push({
    question: 'Siblings?',
    verdict:
      third >= 55
        ? 'Supportive, and likely older siblings do well. This is a helpful part of the chart.'
        : third <= 40
          ? 'Distance or rivalry rather than support. Not hostility - just not a resource.'
          : 'Ordinary. Present, neither a support nor a problem.',
    confidence: 'Mixed',
    support: third,
  });

  return out;
}

export function childrenAnswers(ctx: AnswerContext): Answer[] {
  const { chart } = ctx;
  const out: Answer[] = [];

  const fifth = houseSupport(ctx, 5);
  const jupiter = fullDignity(chart, 'Jupiter');
  const fifthLord = lord(chart, 5);
  const fifthPlace = at(chart, fifthLord);
  const afflicted = fifthPlace ? [6, 8, 12].includes(fifthPlace.house) : false;

  out.push({
    question: 'Will I have children?',
    verdict:
      fifth >= 60 && jupiter.score >= 0
        ? 'Yes, without difficulty indicated. The house of children is sound and Jupiter supports it.'
        : afflicted || jupiter.score <= -2
          ? 'Delay or difficulty is indicated rather than denial. Most charts with this signature do have children, later or with medical help. This is the one place where the chart should never be the last word - it is a medical question first.'
          : 'Ordinary indications. Nothing obstructing, nothing exceptional.',
    confidence: 'Mixed',
    support: fifth,
    because: `The 5th scores ${fifth}, its lord ${fifthLord} sits in the ${ordinal(fifthPlace?.house ?? 5)}, and Jupiter is ${jupiter.plain}.`,
  });

  /*
   * Sex of successive children.
   *
   * The classical method reads the 5th for the first child and the 7th - the 3rd
   * from the 5th - for the second, taking odd signs and male grahas as a son.
   * It is a genuine classical technique and it is also a coin flip dressed as a
   * prediction, so the answer says so rather than pretending otherwise.
   */
  const maleGrahas = ['Sun', 'Mars', 'Jupiter'];
  const sexOf = (house: HouseNumber): { call: 'son' | 'daughter'; agrees: boolean } => {
    const sign = chart.houseSigns[house];
    const oddSign = signIndex(sign) % 2 === 0;
    const ruler = lord(chart, house);
    const maleRuler = maleGrahas.includes(ruler);
    return { call: oddSign ? 'son' : 'daughter', agrees: oddSign === maleRuler };
  };

  const first = sexOf(5);
  const second = sexOf(7);

  out.push({
    question: 'First child - son or daughter?',
    verdict:
      `The classical reading gives ${first.call}. ` +
      (first.agrees
        ? 'Sign and ruler agree, which is as strong as this method gets.'
        : 'Sign and ruler disagree, so even by its own method the indication is weak.') +
      ' Treat it as a coin toss with a tradition attached - this is the least reliable prediction in the whole corpus, and it is wrong about half the time by construction.',
    confidence: 'Weak',
    because: `The 5th falls in ${chart.houseSigns[5]}, ruled by ${lord(chart, 5)}.`,
    classical: {
      claim: 'An odd sign on the bhava, or a male graha owning it, indicates a male child; an even sign or female graha, a female.',
      source: 'Standard attribution across Brihat Jataka and later texts. Never give this for a pregnancy already underway.',
    },
  });

  out.push({
    question: 'Second child - son or daughter?',
    verdict:
      `${second.call.charAt(0).toUpperCase()}${second.call.slice(1)} by the same method, read from the 7th. ` +
      (second.agrees ? 'Sign and ruler agree here.' : 'Sign and ruler disagree, so weaker still.') +
      ' The same caution applies, more so - each successive child is read from a house further from the source and the method degrades with distance.',
    confidence: 'Weak',
    because: `The 7th falls in ${chart.houseSigns[7]}, ruled by ${lord(chart, 7)}.`,
  });

  /*
   * Counts of children are not computed. The classical methods disagree with each
   * other and predate contraception, falling infant mortality and fertility
   * treatment. A number here would be invented precision of the damaging kind.
   */
  out.push({
    question: 'How many?',
    verdict:
      'Not answerable. The classical methods for counting children disagree with each other and were written before contraception, infant mortality rates fell, or fertility treatment existed. Any number given here would be invented precision.',
    confidence: 'Clear',
  });

  const carriers = carriersOf(ctx, [5], ['Jupiter']);
  const w = topicWindows(ctx, carriers, { yearsForward: 20, limit: 2 })[0];
  if (w) {
    out.push({
      question: 'When?',
      verdict: `${formatDate(w.from)} to ${formatDate(w.to)} is when the relevant periods run.`,
      confidence: 'Mixed',
      window: { from: formatDate(w.from), to: formatDate(w.to), label: w.label },
    });
  }

  return out;
}

export function propertyAnswers(ctx: AnswerContext): Answer[] {
  const { chart } = ctx;
  const out: Answer[] = [];

  const fourth = houseSupport(ctx, 4);
  const fourthLord = lord(chart, 4);
  const mars = fullDignity(chart, 'Mars');
  const venus = fullDignity(chart, 'Venus');

  out.push({
    question: 'Will I own property?',
    verdict:
      fourth >= 60
        ? 'Yes, and more than one. The property house is strong and this is a natural accumulation for you.'
        : fourth >= 45
          ? 'Yes, once, and it will take longer to arrange than you expect. Not a portfolio.'
          : 'Difficult. Renting may be the better financial decision here rather than a failure - the chart does not reward property the way it rewards other things.',
    confidence: confidenceFor(fourth),
    support: fourth,
    because: `The 4th lord ${fourthLord} and Mars is ${mars.plain}.`,
  });

  out.push({
    question: 'Vehicles?',
    verdict: venus.score >= 1
      ? 'Comfortable. Vehicles come easily and tend to be better than the income would suggest.'
      : 'Functional rather than indulgent. Nothing obstructed, nothing luxurious.',
    confidence: 'Mixed',
  });

  const carriers = carriersOf(ctx, [4], ['Mars', 'Venus']);
  const w = topicWindows(ctx, carriers, { yearsForward: 20, limit: 2 })[0];
  if (w) {
    out.push({
      question: 'When is a good time to buy?',
      verdict: `${formatDate(w.from)} to ${formatDate(w.to)}. Purchases inside this window settle; outside it expect disputes, delays or a resale within a few years.`,
      confidence: 'Likely',
      window: { from: formatDate(w.from), to: formatDate(w.to), label: w.label },
    });
  }

  return out;
}
