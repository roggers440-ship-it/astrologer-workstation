import { ordinal } from '@/lib/rule-engine';
import { fullDignity, planetStrength } from '@/lib/strength';
import {
  at, confidenceFor, houseSupport, lord, occupants, aspectors,
  type Answer, type AnswerContext,
} from './engine';

/**
 * Mindset, communication, emotional weather and mental load.
 *
 * These four topics share the Moon and the 4th, so they share a module. The
 * register is deliberately different from the rest: this describes how someone
 * copes and what wears them down. It does not name conditions, and where the
 * signature is heavy the answer says to stop reading the chart.
 */

export function mindsetAnswers(ctx: AnswerContext): Answer[] {
  const { chart } = ctx;
  const mercury = planetStrength(chart, 'Mercury');
  const fifth = houseSupport(ctx, 5);
  const ninth = houseSupport(ctx, 9);

  return [
    {
      question: 'How does my mind actually work?',
      verdict:
        mercury.net >= 2
          ? 'Fast and precise. You think in detail and get impatient with people who cannot keep up - which costs you more than the speed gains.'
          : mercury.net <= -2
            ? 'Slower and more thorough. You arrive at the right answer late rather than the wrong answer fast, and you have probably been penalised for that in settings that reward quickness.'
            : 'Balanced. Neither the fastest nor the most careful thinker in the room, which is a more useful position than either.',
      confidence: 'Likely',
      because: `Mercury is ${mercury.dignityPlain}.`,
    },
    {
      question: 'Do I trust reasoning or instinct?',
      verdict:
        fifth > ninth
          ? 'Reasoning. You work it out. Belief and received wisdom carry little weight with you, and that includes advice you asked for.'
          : 'Instinct and framework. You need something to believe before the detail organises itself, and pure analysis leaves you cold.',
      confidence: 'Mixed',
    },
  ];
}

export function softSkillsAnswers(ctx: AnswerContext): Answer[] {
  const { chart } = ctx;
  const third = houseSupport(ctx, 3);
  const second = houseSupport(ctx, 2);
  const mercury = planetStrength(chart, 'Mercury');
  const venus = fullDignity(chart, 'Venus');

  return [
    {
      question: 'Am I good with people?',
      verdict:
        venus.score >= 2 && second >= 50
          ? 'Yes, naturally. You are easy to deal with and people extend you goodwill before you have earned it.'
          : venus.score <= -2
            ? 'Not naturally. Warmth has to be deliberate here, and you will be read as cooler than you feel. That is a fixable presentation problem, not a character one.'
            : 'Adequate. Fine one to one, less strong in a room.',
      confidence: 'Mixed',
      because: `Venus is ${venus.plain}; speech scores ${second}.`,
    },
    {
      question: 'How do I communicate under pressure?',
      verdict:
        third >= 58
          ? 'You get sharper. Pressure improves your delivery, which is rare and worth putting yourself in situations to use.'
          : third <= 42
            ? 'You go quiet or go blunt. Neither serves you. Preparing the words in advance is the whole fix.'
            : 'Steady. Neither improved nor degraded by pressure.',
      confidence: 'Mixed',
      support: third,
    },
  ];
}

export function moodAnswers(ctx: AnswerContext): Answer[] {
  const { chart } = ctx;
  const moon = at(chart, 'Moon');
  const moonStrength = planetStrength(chart, 'Moon');
  const withMoon = moon
    ? chart.placements.filter((p) => p.planet !== 'Moon' && p.house === moon.house).map((p) => p.planet)
    : [];
  const fourth = houseSupport(ctx, 4);

  return [
    {
      question: 'What is my emotional weather like?',
      verdict:
        withMoon.includes('Saturn')
          ? 'Heavy rather than swinging. A low, steady weight instead of highs and lows. Routine and small realistic targets do more here than encouragement does.'
          : withMoon.includes('Rahu')
            ? 'Restless and amplified, worst at night. Racing thoughts rather than sadness. Sleep and screen time are the two practical levers and they matter more than they sound.'
            : moonStrength.net >= 2
              ? 'Stable. Emotional resilience is a genuine asset in this chart and worth naming as one - people rarely get told what is working.'
              : 'Changeable. Mood tracks circumstances closely, so a stable environment does more for you than most people need it to.',
      confidence: 'Likely',
      because: `The Moon is ${moonStrength.dignityPlain}${withMoon.length ? `, with ${withMoon.join(' and ')}` : ''}.`,
    },
    {
      question: 'What actually settles me?',
      verdict:
        fourth >= 55
          ? 'Home. The domestic base is strong here and returning to it genuinely restores you - that is not avoidance.'
          : 'Not home, which is the difficulty. The domestic house is weak, so rest has to be found somewhere you build deliberately rather than somewhere you return to.',
      confidence: 'Mixed',
      support: fourth,
    },
  ];
}

export function mentalLoadAnswers(ctx: AnswerContext): Answer[] {
  const { chart } = ctx;
  const moon = at(chart, 'Moon');
  const moonStrength = planetStrength(chart, 'Moon');
  const twelfth = houseSupport(ctx, 12);
  const afflictors = moon
    ? chart.placements
        .filter((p) => p.house === moon.house && ['Saturn', 'Rahu', 'Ketu', 'Mars'].includes(p.planet))
        .map((p) => p.planet)
    : [];
  const heavy = afflictors.length > 0 || moonStrength.net <= -3;

  return [
    {
      question: 'Where does stress actually land for me?',
      verdict: heavy
        ? `Internally, and it accumulates before it shows. ${afflictors.length ? `${afflictors.join(' and ')} sit with the Moon, ` : ''}which describes someone who carries load quietly and is assumed to be fine for longer than they are.`
        : 'Outwardly and quickly. You are not a quiet sufferer, which is protective - people around you know when something is wrong.',
      confidence: 'Likely',
      because: `The Moon is ${moonStrength.dignityPlain}.`,
    },
    {
      question: 'What depletes me?',
      verdict:
        twelfth <= 45
          ? 'Not getting enough alone time, and then getting too much of it. The house of retreat is weak, so solitude both restores and unsettles you - the balance has to be managed rather than followed by instinct.'
          : 'Overcommitment rather than conflict. You say yes past your capacity and only notice at the point of exhaustion.',
      confidence: 'Mixed',
    },
    {
      question: 'Is this something to worry about?',
      verdict:
        'The chart describes coping style and load, not illness, and it cannot tell you whether something is wrong. If what you are actually describing is persistent distress rather than a difficult stretch, that is a conversation for a doctor and the chart should be set aside for it.',
      confidence: 'Clear',
    },
  ];
}
