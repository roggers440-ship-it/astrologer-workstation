import { ordinal } from '@/lib/rule-engine';
import { fullDignity, planetStrength } from '@/lib/strength';
import { HOUSE_THEME } from '@/lib/house-themes';
import {
  at, carriersOf, confidenceFor, formatDate, houseSupport, lord, lordsConnected,
  occupants, topicWindows, type Answer, type AnswerContext,
} from './engine';

export function luckAnswers(ctx: AnswerContext): Answer[] {
  const { chart, yogas } = ctx;
  const ninth = houseSupport(ctx, 9);
  const fifth = houseSupport(ctx, 5);
  const eleventh = houseSupport(ctx, 11);
  const overall = Math.round(ninth * 0.5 + fifth * 0.25 + eleventh * 0.25);
  const ninthLord = lord(chart, 9);
  const place = at(chart, ninthLord);

  const out: Answer[] = [
    {
      question: 'Am I lucky?',
      verdict:
        overall >= 68
          ? 'Yes, measurably. Things break your way more often than they should, and you have probably been told you are lucky by people who watched it happen.'
          : overall >= 52
            ? 'Moderately. Luck shows up when you have done the work, not instead of it.'
            : overall >= 36
              ? 'Not especially. What looks like luck for others is effort for you, and pretending otherwise wastes the effort.'
              : 'No, and it is worth saying plainly. This chart does not get handed things. Everything arrives through work, which is harder and also more reliable.',
      confidence: confidenceFor(overall),
      support: overall,
      because: `The 9th scores ${ninth}, run by ${ninthLord} in the ${ordinal(place?.house ?? 9)}.`,
    },
    {
      question: 'Where does luck come from, when it comes?',
      verdict: place
        ? `Through ${HOUSE_THEME[place.house]}. That is where the house of fortune is wired, so opportunities arrive from that direction rather than at random.`
        : 'No clear channel.',
      confidence: 'Likely',
    },
  ];

  const carriers = carriersOf(ctx, [9, 5], ['Jupiter']);
  const w = topicWindows(ctx, carriers, { yearsForward: 15, limit: 2 })[0];
  if (w) {
    out.push({
      question: 'When is my luckiest stretch?',
      verdict: `${formatDate(w.from)} to ${formatDate(w.to)}. Push for things during it - applications, asks, launches. Outside it the same requests get refused.`,
      confidence: 'Likely',
      window: { from: formatDate(w.from), to: formatDate(w.to), label: w.label },
    });
  }

  return out;
}

export function karmaAnswers(ctx: AnswerContext): Answer[] {
  const { chart } = ctx;
  const saturn = planetStrength(chart, 'Saturn');
  const ketu = at(chart, 'Ketu');
  const tenth = houseSupport(ctx, 10);
  const sixth = houseSupport(ctx, 6);

  return [
    {
      question: 'What is the recurring lesson in my life?',
      verdict: ketu
        ? `${HOUSE_THEME[ketu.house].charAt(0).toUpperCase()}${HOUSE_THEME[ketu.house].slice(1)} - you have this already and undervalue it. The pull is toward the opposite house, and that is where the work is.`
        : 'Not determinable without the nodes.',
      confidence: 'Likely',
      because: `Ketu sits in the ${ordinal(ketu?.house ?? 12)}.`,
    },
    {
      question: 'What do I owe, in the classical sense?',
      verdict:
        saturn.net <= -2
          ? `Saturn is ${saturn.dignityPlain} here, which the tradition reads as debt carried forward. Practically: you will be asked to do more than your share for less credit, particularly early. It eases with age, and that is not a platitude - Saturn genuinely improves with time.`
          : 'Nothing heavy. Saturn is workable, so the load is ordinary rather than inherited.',
      confidence: 'Mixed',
    },
    {
      question: 'Service or self-interest?',
      verdict:
        sixth > tenth
          ? 'The chart is wired for service - solving other people\u2019s problems, not building your own monument. Fighting that produces a career that never quite fits.'
          : 'Self-directed. You are meant to build something with your name on it, and service roles will feel like a waste of the chart.',
      confidence: 'Mixed',
    },
  ];
}

export function pastLifeAnswers(ctx: AnswerContext): Answer[] {
  const { chart } = ctx;
  const ketu = at(chart, 'Ketu');
  const twelfth = houseSupport(ctx, 12);
  const twelfthLord = lord(chart, 12);
  const place = at(chart, twelfthLord);

  return [
    {
      question: 'What did I bring with me?',
      verdict: ketu
        ? `Skill in ${HOUSE_THEME[ketu.house]} that arrives already formed and that you tend to dismiss because it was never hard. That dismissal is the actual pattern worth naming.`
        : 'Not determinable.',
      confidence: 'Likely',
      classical: {
        claim: 'Ketu shows what is finished; the native is detached from the fruits of that house though skilled in it.',
        source: 'Standard nodal attribution, later Parashari commentaries',
      },
    },
    {
      question: 'Am I spiritually inclined, or is that not this life?',
      verdict:
        twelfth >= 58 || (ketu ? [1, 5, 9, 12].includes(ketu.house) : false)
          ? 'Genuinely, and it predates any decision to be. Solitude and inner work are needs here rather than interests.'
          : 'Not particularly, and there is no deficit in that. The chart is pointed outward, and forcing a contemplative practice onto it usually produces guilt rather than peace.',
      confidence: 'Mixed',
      support: twelfth,
      because: `The 12th scores ${twelfth}, run by ${twelfthLord} in the ${ordinal(place?.house ?? 12)}.`,
    },
  ];
}

export function enemiesAnswers(ctx: AnswerContext): Answer[] {
  const { chart, yogas } = ctx;
  const sixth = houseSupport(ctx, 6);
  const sixthLord = lord(chart, 6);
  const place = at(chart, sixthLord);
  const harsha = yogas.find((y) => y.id === 'vipareeta.6');

  return [
    {
      question: 'Do I have real opposition, or am I imagining it?',
      verdict: harsha
        ? 'Real, and it defeats itself. The 6th lord is confined to a difficult house, which is the classical marker for opponents who lose without you having to beat them. Outlast rather than confront.'
        : sixth >= 60
          ? 'Real, and you win. The house of conflict is strong, which means you are better in a fight than the people who start them with you.'
          : sixth <= 40
            ? 'Real, and currently costing you. Opposition gets further with you than it should, usually because it is met late.'
            : 'Ordinary friction. Nothing organised against you.',
      confidence: confidenceFor(sixth),
      support: sixth,
      because: `The 6th is run by ${sixthLord} from the ${ordinal(place?.house ?? 6)}.`,
    },
    {
      question: 'Litigation or formal dispute - do I win?',
      verdict:
        sixth >= 55
          ? 'Yes, if you are prepared to let it run. Speed is not your advantage here; endurance is.'
          : 'Settle. The chart does not support a long fight, and the cost of winning would exceed the win.',
      confidence: 'Mixed',
    },
  ];
}

/**
 * Strengths and weaknesses, stated as behaviour rather than as planet qualities.
 *
 * "Venus is weak" tells a practitioner something and a client nothing. What a
 * client can use is the specific form the weakness takes in daily life, which
 * depends on the house as much as the planet.
 */
const STRENGTH_BY_HOUSE: Record<string, Record<number, string>> = {
  Sun: { 1: 'people follow you without being asked to', 10: 'you are trusted with authority earlier than your peers', 9: 'senior people take an interest in you and it changes your options' },
  Moon: { 1: 'you read a room before anyone speaks', 4: 'you make people feel safe, and they tell you things they have not told others', 5: 'you can hold an audience' },
  Mars: { 1: 'you act while other people are still deciding', 3: 'you have physical courage and it has been tested', 10: 'you are the one people put on a problem that has stalled' },
  Mercury: { 1: 'you can explain a hard thing simply, which is rarer than it sounds', 3: 'you write and negotiate better than you think you do', 10: 'you turn messy information into something usable' },
  Jupiter: { 1: 'your judgement is sought and it holds up', 5: 'you teach without meaning to', 9: 'people bring you decisions before they make them' },
  Venus: { 1: 'you are easy to be around and it opens doors', 7: 'you build partnerships that outlast the reason for them', 10: 'you have taste, and it is commercially useful' },
  Saturn: { 1: 'you outlast everyone, including people who are better than you', 6: 'you do the unglamorous work nobody else will', 10: 'you build things that are still standing in ten years' },
};

const WEAKNESS_BY_HOUSE: Record<string, Record<number, string>> = {
  Sun: { 6: 'you defer to authority you should challenge', 8: 'recognition arrives late and from unexpected directions', 10: 'you undercut your own standing by not claiming credit', 12: 'you work behind the scenes and then resent not being seen' },
  Moon: { 6: 'you carry other people\u2019s stress as though it were yours', 8: 'you go silent under pressure instead of asking', 12: 'you need more solitude than your life allows for' },
  Mars: { 6: 'you pick fights you could have won by waiting', 8: 'your energy comes in bursts and then disappears entirely', 12: 'you spend effort on things that leave no trace' },
  Mercury: { 6: 'you over-explain when challenged, which reads as defensive', 8: 'you keep your reasoning to yourself and are misread for it', 12: 'you think in circles at night' },
  Jupiter: { 6: 'you take on other people\u2019s obligations as your own', 8: 'your generosity is exploited more often than it is returned', 12: 'you give away things you needed' },
  Venus: { 6: 'you settle for less in relationships than you would advise anyone else to', 8: 'you keep affection hidden until it is too late to act on', 9: 'you defer pleasure indefinitely and call it discipline', 12: 'you spend on comfort and regret it' },
  Saturn: { 1: 'you are harder on yourself than on anyone else, and it slows you down', 7: 'you keep partners at a working distance', 8: 'you expect the worst and it becomes a strategy' },
};

export function strengthAnswers(ctx: AnswerContext): Answer[] {
  const { chart } = ctx;
  const rated = chart.placements
    .filter((p) => !['Rahu', 'Ketu'].includes(p.planet))
    .map((p) => ({ planet: p.planet, s: planetStrength(chart, p.planet) }))
    .sort((a, b) => b.s.net - a.s.net);

  const best = rated[0];
  const worst = rated[rated.length - 1];

  const GENERIC: Record<string, string> = {
    Sun: 'authority and being seen',
    Moon: 'emotional steadiness and reading people',
    Mars: 'drive and finishing fights',
    Mercury: 'analysis and dealing',
    Jupiter: 'judgement and generosity',
    Venus: 'relationships and taste',
    Saturn: 'endurance and the long game',
  };

  const bestHouse = at(chart, best.planet)!.house;
  const worstHouse = at(chart, worst.planet)!.house;
  const bestLine = STRENGTH_BY_HOUSE[best.planet]?.[bestHouse];
  const worstLine = WEAKNESS_BY_HOUSE[worst.planet]?.[worstHouse];

  return [
    {
      question: 'What am I actually good at?',
      verdict: bestLine
        ? `${bestLine.charAt(0).toUpperCase()}${bestLine.slice(1)}. That is ${best.planet} in the ${ordinal(bestHouse)}, the best-placed planet here - build around it rather than around what you think you should be good at.`
        : `${GENERIC[best.planet].charAt(0).toUpperCase()}${GENERIC[best.planet].slice(1)}. ${best.planet} in the ${ordinal(bestHouse)} is the strongest placement in the chart.`,
      confidence: 'Clear',
      because: `${best.planet} is ${best.s.dignityPlain}.`,
    },
    {
      question: 'Where do I actually lose?',
      verdict: worstLine
        ? `${worstLine.charAt(0).toUpperCase()}${worstLine.slice(1)}. That is ${worst.planet} in the ${ordinal(worstHouse)}, and it is where effort returns least. Route around it rather than trying to fix it - fixing it is expensive and rarely works.`
        : `${GENERIC[worst.planet].charAt(0).toUpperCase()}${GENERIC[worst.planet].slice(1)} - ${worst.planet} in the ${ordinal(worstHouse)} is ${worst.s.dignityPlain}, and this is where effort produces the least return.`,
      confidence: 'Clear',
      because: worst.s.notes[0] ?? undefined,
    },
  ];
}
