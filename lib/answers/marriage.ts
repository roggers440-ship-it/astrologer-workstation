import type { HouseNumber, PlanetName, SignName } from '@/types/astrology';
import { SIGN_LORD, signIndex } from '@/lib/vedic-constants';
import { ordinal } from '@/lib/rule-engine';
import { fullDignity } from '@/lib/strength';
import {
  at, carriersOf, confidenceFor, directionFor, formatDate, houseSupport, lord,
  lordsConnected, occupants, pastWindows, topicWindows, type Answer, type AnswerContext,
} from './engine';

/**
 * Marriage.
 *
 * The 7th is the partner, the 2nd the family that forms, the 5th romance, the
 * 11th the fulfilment of desire. Love versus arranged is read from whether the
 * 5th and 7th are connected. D9 is consulted because it is the divisional chart
 * for partnership and any marriage reading that skips it is incomplete.
 */

/** Classical physical and temperamental indications by the sign of the 7th lord. */
const PARTNER_BY_SIGN: Record<SignName, { build: string; nature: string; classical: string }> = {
  Aries:       { build: 'lean, energetic, quick-moving', nature: 'direct, impatient, competitive', classical: 'of ruddy complexion, spare of flesh, quick to anger' },
  Taurus:      { build: 'solid, settled, physically comfortable', nature: 'steady, sensual, stubborn', classical: 'of pleasing form, fond of comfort, slow to move' },
  Gemini:      { build: 'slight, restless, expressive', nature: 'talkative, clever, easily bored', classical: 'of mixed complexion, skilled in speech, of two minds' },
  Cancer:      { build: 'soft-featured, rounder', nature: 'emotional, protective, home-centred', classical: 'fair, of tender disposition, attached to family' },
  Leo:         { build: 'upright, noticeable, carries themselves well', nature: 'proud, generous, needs recognition', classical: 'of noble bearing, broad of face, honoured among people' },
  Virgo:       { build: 'neat, precise, unshowy', nature: 'analytical, particular, quietly critical', classical: 'of moderate stature, learned, given to detail' },
  Libra:       { build: 'balanced features, attractive by convention', nature: 'agreeable, social, avoids conflict', classical: 'of graceful form, fond of ornament, well liked' },
  Scorpio:     { build: 'intense presence, strong features', nature: 'private, loyal, does not forget', classical: 'of dark complexion, secretive, of fixed purpose' },
  Sagittarius: { build: 'tall or long-limbed', nature: 'independent, principled, needs room', classical: 'of tall form, righteous, fond of travel' },
  Capricorn:   { build: 'lean, angular, ages well', nature: 'serious, disciplined, undemonstrative', classical: 'of thin body, patient, slow in affection' },
  Aquarius:    { build: 'unconventional in appearance', nature: 'detached, principled, unusual', classical: 'of uncommon appearance, given to strange company' },
  Pisces:      { build: 'soft, dreamy-eyed', nature: 'gentle, impressionable, imaginative', classical: 'of full body, compassionate, fond of the water' },
};

export function marriageAnswers(ctx: AnswerContext): Answer[] {
  const { chart, natal, yogas } = ctx;
  const out: Answer[] = [];

  const seventh = houseSupport(ctx, 7);
  const seventhLord = lord(chart, 7);
  const seventhPlace = at(chart, seventhLord);
  const venus = at(chart, 'Venus');
  const saturnOn7 = occupants(chart, 7).some((o) => o.planet === 'Saturn') || seventhLord === 'Saturn';

  const carriers = carriersOf(ctx, [7, 2], ['Venus', 'Jupiter']);
  const windows = topicWindows(ctx, carriers, { yearsForward: 20, limit: 3 });
  const best = windows[0];

  /* --- when --- */
  if (best) {
    out.push({
      question: 'When will I marry, or meet them?',
      verdict:
        `${formatDate(best.from)} to ${formatDate(best.to)}. That is when the partnership significators are actually running. ` +
        'Meeting usually falls at the start of such a window and the commitment toward the end of it.',
      confidence: best.score >= 85 ? 'Clear' : 'Likely',
      window: { from: formatDate(best.from), to: formatDate(best.to), label: best.label },
      because: `Running under ${best.lords.join(', ')}.`,
      support: Math.min(97, best.score),
    });
  }

  /* --- delay --- */
  const seventhDig = fullDignity(chart, seventhLord);
  const delayed = saturnOn7 || seventhDig.score < 0 || (seventhPlace ? [6, 8, 12].includes(seventhPlace.house) : false);

  out.push({
    question: 'Will marriage be delayed?',
    verdict: delayed
      ? `Yes. Expect it later than your circle, and expect at least one near-miss that does not complete. ${best ? `The waiting ends around ${formatDate(best.from)}.` : ''}`
      : 'No structural delay in the chart. If it is late, that is circumstance rather than the chart obstructing it.',
    confidence: delayed ? 'Clear' : 'Likely',
    because: saturnOn7
      ? 'Saturn is tied to the 7th, and delay is precisely what Saturn does to partnership.'
      : `The 7th lord ${seventhLord} is ${seventhDig.plain} in the ${ordinal(seventhPlace?.house ?? 7)}.`,
  });

  /* --- love or arranged --- */
  const fiveSeven = lordsConnected(ctx, 5, 7);
  const venusInvolved = venus ? [1, 5, 7, 11].includes(venus.house) : false;

  out.push({
    question: 'Love marriage or arranged?',
    verdict: fiveSeven
      ? `Love. The house of romance and the house of marriage are connected - ${fiveSeven} - and that combination means the person is met before the families are involved.`
      : venusInvolved
        ? 'Leaning love, but without the strong link. Likely an introduction that turns into a choice rather than a match made for you.'
        : 'Arranged, or at least family-mediated. Romance and marriage are not linked in this chart, which usually means the two happen separately.',
    confidence: fiveSeven ? 'Clear' : 'Mixed',
  });

  /* --- family acceptance --- */
  const secondSupport = houseSupport(ctx, 2);
  const ninthSupport = houseSupport(ctx, 9);
  const familyEasy = secondSupport > 50 && ninthSupport > 45;

  out.push({
    question: 'Will my family accept the partner?',
    verdict: familyEasy
      ? 'Yes, without a fight. The family houses are supportive and there is no combination here that sets marriage against the household.'
      : `Expect resistance before acceptance. The family houses are the weaker part of this picture, so the objection is real but it is about them rather than about the partner.`,
    confidence: 'Mixed',
    because: `The 2nd scores ${secondSupport} and the 9th ${ninthSupport}.`,
  });

  /* --- partner description --- */
  if (seventhPlace) {
    const desc = PARTNER_BY_SIGN[seventhPlace.sign];
    const d9 = natal.charts.D9;
    out.push({
      question: 'What will my partner be like?',
      verdict:
        `${desc.nature.charAt(0).toUpperCase()}${desc.nature.slice(1)}. Physically ${desc.build}. ` +
        `The D9 ascendant falls in ${d9.ascendantSign}, which colours the marriage itself rather than the person.`,
      confidence: 'Likely',
      because: `The 7th lord ${seventhLord} sits in ${seventhPlace.sign}.`,
      classical: {
        claim: `The spouse is ${desc.classical}.`,
        source: 'Descriptions by sign, Brihat Jataka and Phaladeepika. Complexion and caste readings in these texts belong to their period and are given here as source material, not as a claim.',
      },
    });

    /* --- distance --- */
    const dir = directionFor(ctx, 7);
    const far = [9, 12].includes(seventhPlace.house);
    out.push({
      question: 'Near home or far away?',
      verdict: far
        ? `Far. The 7th lord sits in the ${ordinal(seventhPlace.house)}, which points to distance, a different community, or abroad. Direction: ${dir.direction}.`
        : `Near. Nothing pushes partnership away from home, so expect them from within reach - broadly ${dir.direction} of where you were born.`,
      confidence: far ? 'Likely' : 'Mixed',
    });
  }

  /* --- does marriage help --- */
  const marriageHelps = seventh > 55 && (seventhPlace ? ![6, 8, 12].includes(seventhPlace.house) : true);
  out.push({
    question: 'Will marriage improve my luck, career or money?',
    verdict: marriageHelps
      ? 'Yes, materially. Partnership lifts this chart rather than costing it, and that is worth planning around - the years after marriage are better than the years before.'
      : 'Not by itself. Marriage here is its own project rather than a lever on the rest of the life. Expect it to take energy before it returns any.',
    confidence: confidenceFor(seventh),
    support: seventh,
  });

  /*
   * Past relationships. The most checkable output in the whole application - the
   * client either recognises the year or does not, and that answer calibrates
   * everything said afterwards about the future.
   */
  const romanceCarriers = carriersOf(ctx, [5, 7], ['Venus']);
  const past = pastWindows(ctx, romanceCarriers, { yearsBack: 15, limit: 3 });
  const afflictedRomance = occupants(chart, 5).some((o) => ['Saturn', 'Ketu', 'Rahu'].includes(o.planet)) ||
    occupants(chart, 7).some((o) => ['Saturn', 'Ketu', 'Rahu'].includes(o.planet));

  if (past.length) {
    out.push({
      question: 'When were the past relationships and the breakups?',
      verdict:
        past
          .map((w) => `${new Date(w.from).getUTCFullYear()}\u2013${new Date(w.to).getUTCFullYear()}`)
          .join(', ') +
        '. Those are the stretches when the romance and partnership significators were running. ' +
        'Ask which of them they recognise before saying anything about the future - a client who does not recognise these will not believe the forward dates either.',
      confidence: 'Likely',
      because: `Periods of ${[...new Set(past.flatMap((w) => w.lords))].join(', ')}.`,
    });
  }

  out.push({
    question: 'Was there real heartbreak, or just endings?',
    verdict: afflictedRomance
      ? `Real. ${[...occupants(chart, 5), ...occupants(chart, 7)].filter((o) => ['Saturn', 'Ketu', 'Rahu'].includes(o.planet)).map((o) => o.planet).join(' and ')} sits on the romance axis, which is the signature for endings that leave a mark rather than ones that simply close. Expect at least one that shaped how they approach it now.`
      : 'Endings rather than damage. Nothing on the romance axis suggests a loss that changed the way they engage.',
    confidence: 'Mixed',
  });

  /* --- separation risk --- */
  const harshOn7 = occupants(chart, 7).filter((o) => ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'].includes(o.planet));
  const eighthLink = lordsConnected(ctx, 7, 8);
  const risk = harshOn7.length >= 2 || (harshOn7.length >= 1 && eighthLink !== null);

  out.push({
    question: 'Is there a risk of separation?',
    verdict: risk
      ? `The chart carries the classical markers - ${harshOn7.map((h) => h.planet).join(' and ')} on the 7th${eighthLink ? `, and ${eighthLink}` : ''}. That is a risk factor, not a verdict: it describes strain that needs managing, and plenty of charts with it stay married.`
      : 'No strong separation signature. Ordinary friction, not structural instability.',
    confidence: risk ? 'Mixed' : 'Likely',
  });

  return out;
}
