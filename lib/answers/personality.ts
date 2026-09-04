import type { SignName } from '@/types/astrology';
import { ordinal } from '@/lib/rule-engine';
import { fullDignity, planetStrength } from '@/lib/strength';
import {
  at, confidenceFor, houseSupport, lord, occupants, aspectors,
  type Answer, type AnswerContext,
} from './engine';
import { DUSTHANA_HOUSES, signIndex } from '@/lib/vedic-constants';

const FIRE: string[] = ['Aries', 'Leo', 'Sagittarius'];

/**
 * Habits, keyed on a planet and where it sits.
 *
 * Deliberately concrete. "You are indulgent" tells a client nothing they can act
 * on; "you eat when the day has gone badly rather than when you are hungry" is a
 * thing they can either recognise or reject, which is what makes it useful.
 */
const BAD_HABIT: { planet: string; houses: number[]; habit: string }[] = [
  { planet: 'Rahu', houses: [1, 2], habit: 'eating past full, and talking past the point where you had already made it' },
  { planet: 'Rahu', houses: [5], habit: 'chasing losses - betting, trading, or doubling down on a decision to avoid admitting the first one' },
  { planet: 'Rahu', houses: [7, 11], habit: 'collecting people rather than keeping them, and confusing a large circle with a close one' },
  { planet: 'Rahu', houses: [12], habit: 'escaping rather than resting - late nights, screens, substances, anything that postpones the day ending' },
  { planet: 'Saturn', houses: [1, 3], habit: 'putting off the thing you have already decided to do, sometimes for months, then doing it in one exhausting sitting' },
  { planet: 'Saturn', houses: [2], habit: 'holding onto money and objects past the point of usefulness, and calling it prudence' },
  { planet: 'Mars', houses: [1, 3, 6], habit: 'saying the sharp thing immediately and repairing it afterwards, which costs more than the delay would have' },
  { planet: 'Mars', houses: [2, 11], habit: 'impulsive spending when frustrated - the purchase is about the mood, not the object' },
  { planet: 'Moon', houses: [6, 8, 12], habit: 'withdrawing when you most need company, and describing it afterwards as needing space' },
  { planet: 'Venus', houses: [1, 4, 12], habit: 'choosing the comfortable option over the correct one and finding a good reason for it after the fact' },
  { planet: 'Mercury', houses: [3, 5, 8], habit: 'overthinking a decision that was already made, and calling the delay research' },
  { planet: 'Jupiter', houses: [2, 11], habit: 'over-promising - agreeing to things because the yes feels good in the moment' },
  { planet: 'Ketu', houses: [1, 10], habit: 'walking away from something almost finished because the interest has gone, not because it failed' },
];

const GOOD_HABIT: { planet: string; habit: string }[] = [
  { planet: 'Saturn', habit: 'you keep a routine once it is set, and it survives weeks when nothing else does' },
  { planet: 'Mercury', habit: 'you write things down and can find them later, which quietly does more for you than most of your talents' },
  { planet: 'Jupiter', habit: 'you give people time without keeping score, and it comes back through channels you did not plan' },
  { planet: 'Mars', habit: 'you move your body when stressed rather than sitting in it, which is the single most protective habit in this chart' },
  { planet: 'Moon', habit: 'you notice how other people are before they say, which makes you useful in rooms where that is rare' },
  { planet: 'Venus', habit: 'you make the space around you pleasant, and it measurably changes how you function in it' },
  { planet: 'Sun', habit: 'you turn up when you said you would, and people have built expectations on that' },
];

const APPEARANCE_BY_LAGNA: Record<SignName, string> = {
  Aries: 'lean and quick, with a strong brow and a face that shows what you think',
  Taurus: 'solid and settled, with a pleasant face and a voice people remember',
  Gemini: 'slight and restless, expressive hands, looks younger than the age',
  Cancer: 'softer features, a rounder face, changeable in appearance with mood',
  Leo: 'upright bearing, broad through the chest, visible in a room without trying',
  Virgo: 'neat and unshowy, moderate build, careful about presentation',
  Libra: 'balanced features, conventionally attractive, well-proportioned',
  Scorpio: 'intense eyes, strong features, a presence people find hard to read',
  Sagittarius: 'tall or long-limbed, open face, ages well',
  Capricorn: 'lean and angular, serious in repose, looks older young and younger later',
  Aquarius: 'unconventional in appearance, distinctive rather than pretty',
  Pisces: 'soft features, notable eyes, an unfocused quality that reads as gentle',
};

export function personalityAnswers(ctx: AnswerContext): Answer[] {
  const { chart } = ctx;
  const out: Answer[] = [];

  const lagnaLord = lord(chart, 1);
  const llStrength = planetStrength(chart, lagnaLord);
  const third = houseSupport(ctx, 3);
  const sixth = houseSupport(ctx, 6);
  const mars = planetStrength(chart, 'Mars');
  const saturn = planetStrength(chart, 'Saturn');
  const first = houseSupport(ctx, 1);

  /* Effort: the 3rd is self-driven exertion, the 6th is grinding through, Mars is
     initiative and Saturn is endurance. Laziness in a chart is low initiative,
     not low capability. */
  const drive = Math.round((third + sixth) / 2 + mars.net * 2);

  out.push({
    question: 'Am I lazy or hard-working?',
    verdict:
      drive >= 62
        ? 'Hard-working, and visibly so. You start things and finish them, and people rely on that.'
        : drive >= 48
          ? 'Hard-working in bursts. Strong initiative, weaker follow-through - you finish what stays interesting and abandon what does not.'
          : saturn.net > mars.net
            ? 'Slow rather than lazy. Low initiative, high endurance: bad at starting, very good at not stopping once started. Give this person a long task, not a fresh one.'
            : 'Effort is genuinely the weak point here. Not incapacity - the capability is elsewhere in the chart - but self-driven work does not come naturally and structure has to be imposed from outside.',
    confidence: 'Likely',
    support: Math.max(3, Math.min(97, drive)),
    because: `Effort ${third}, endurance ${sixth}, Mars ${mars.net > 0 ? 'strong' : 'weak'}.`,
  });

  const benefics = occupants(chart, 1).filter((o) => ['Venus', 'Jupiter', 'Moon', 'Mercury'].includes(o.planet));
  const venusOn1 = benefics.some((b) => b.planet === 'Venus') || aspectors(chart, 1).includes('Venus');

  out.push({
    question: 'How do I come across physically?',
    verdict:
      `${APPEARANCE_BY_LAGNA[chart.ascendantSign].charAt(0).toUpperCase()}${APPEARANCE_BY_LAGNA[chart.ascendantSign].slice(1)}. ` +
      (venusOn1
        ? 'Venus touches the rising sign, which the texts read as good looks - in practice it shows as being easy to be around more than as conventional beauty.'
        : benefics.length
          ? `${benefics.map((b) => b.planet).join(' and ')} on the rising sign softens the impression.`
          : 'No benefic on the rising sign, so the impression is the sign\u2019s own - unsoftened, which usually reads as more serious than intended.'),
    confidence: 'Likely',
    classical: {
      claim: 'The form of the body is known from the lagna and its lord, and from the planets aspecting the first bhava.',
      source: 'Brihat Jataka, chapter on the body',
    },
  });

  /* --- anger --- */
  const marsPlace = at(chart, 'Mars');
  const fireLagna = FIRE.includes(chart.ascendantSign);
  const marsHot = marsPlace ? [1, 3, 4, 6, 8].includes(marsPlace.house) : false;
  const ketuWithMars = marsPlace
    ? chart.placements.some((p) => p.planet === 'Ketu' && p.house === marsPlace.house)
    : false;

  out.push({
    question: 'Do I get angry quickly?',
    verdict:
      marsHot && (fireLagna || ketuWithMars)
        ? 'Yes, and it arrives before you have decided to be angry. It also passes quickly, which is why the people on the receiving end stay upset longer than you do.'
        : marsHot
          ? 'Quick to irritation, slower to real anger. It shows as sharpness in the voice before it shows as temper.'
          : mars.net <= -2
            ? 'No - the opposite, and that is its own problem. Anger goes inward and comes out weeks later as resentment about something unrelated.'
            : 'Slow to anger, and reasonable when it arrives. This is not the volatile part of the chart.',
    confidence: 'Likely',
    because: `Mars sits in the ${ordinal(marsPlace?.house ?? 1)} and is ${mars.dignityPlain}${ketuWithMars ? ', with Ketu' : ''}.`,
  });

  /* --- habits --- */
  const bad = BAD_HABIT.filter((h) => {
    const p = at(chart, h.planet as never);
    return p && h.houses.includes(p.house);
  });
  const good = GOOD_HABIT.filter((h) => planetStrength(chart, h.planet as never).net >= 1);

  out.push({
    question: 'What are my bad habits?',
    verdict: bad.length
      ? bad.slice(0, 3).map((h) => h.habit.charAt(0).toUpperCase() + h.habit.slice(1)).join('. ') + '.'
      : 'Nothing structural. The chart does not carry a strong compulsive signature, which is genuinely uncommon and worth saying.',
    confidence: bad.length ? 'Likely' : 'Mixed',
    because: bad.length ? bad.slice(0, 3).map((h) => `${h.planet} in the ${ordinal(at(chart, h.planet as never)!.house)}`).join('; ') : undefined,
  });

  out.push({
    question: 'What are my good habits?',
    verdict: good.length
      ? good.slice(0, 3).map((h) => h.habit.charAt(0).toUpperCase() + h.habit.slice(1)).join('. ') + '.'
      : 'None the chart hands you. Whatever discipline you have was built rather than given, and that is worth knowing because it means it can be lost if you stop maintaining it.',
    confidence: 'Likely',
  });

  out.push({
    question: 'What do people get wrong about me?',
    verdict:
      llStrength.net < 0
        ? `That you are less capable than you are. The lagna lord ${lagnaLord} is ${llStrength.dignityPlain}, which reads outwardly as hesitancy and inwardly is nothing of the kind.`
        : first < 45
          ? 'That you are harder to reach than you intend. The rising sign is under pressure, and it puts a barrier there that most people do not get past.'
          : `That you are simpler than you are. ${lagnaLord} carries the self-image here and does it confidently, so the complications underneath are not visible.`,
    confidence: 'Mixed',
  });

  return out;
}
