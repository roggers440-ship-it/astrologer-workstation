import type { HouseNumber } from '@/types/astrology';
import { ordinal } from '@/lib/rule-engine';
import { fullDignity } from '@/lib/strength';
import {
  at, carriersOf, confidenceFor, directionFor, formatDate, houseSupport, lord,
  lordsConnected, occupants, topicWindows, type Answer, type AnswerContext,
} from './engine';

/**
 * Foreign study and travel.
 *
 * The 12th is distant lands, the 9th is higher learning and long journeys, the
 * 4th is the home being left. A connection between the 9th and 12th is the
 * primary combination; Rahu adds the pull toward the unfamiliar.
 */
export function foreignAnswers(ctx: AnswerContext): Answer[] {
  const { chart } = ctx;
  const out: Answer[] = [];

  const ninth = houseSupport(ctx, 9);
  const twelfth = houseSupport(ctx, 12);
  const fourth = houseSupport(ctx, 4);
  const overall = Math.round(ninth * 0.4 + twelfth * 0.4 + fourth * 0.2);

  const link = lordsConnected(ctx, 9, 12);
  const rahu = at(chart, 'Rahu');
  const rahuInvolved = rahu ? [9, 12, 4, 1].includes(rahu.house) : false;

  const carriers = carriersOf(ctx, [9, 12], ['Rahu', 'Jupiter']);
  const windows = topicWindows(ctx, carriers);
  const best = windows[0];

  /* --- will it happen --- */
  out.push({
    question: 'Will I study or live abroad?',
    verdict:
      overall >= 68
        ? 'Yes. The chart carries a strong foreign signature and this is one of its natural directions.'
        : overall >= 52
          ? 'Likely, but it needs to be pursued rather than waited for. The chart supports it without handing it over.'
          : overall >= 36
            ? 'Possible, not indicated. It will take more effort and more paperwork than it does for other people.'
            : 'The chart does not support it strongly. Going abroad is achievable, but it will be the hard route, not the natural one.',
    confidence: confidenceFor(overall),
    support: overall,
    because: link
      ? `The 9th and 12th are connected - ${link} - which is the primary foreign-study combination.`
      : 'The 9th and 12th have no direct connection, which is the combination usually behind a straightforward move abroad.',
  });

  /* --- easy or delayed --- */
  const twelfthLord = lord(chart, 12);
  const ninthLord = lord(chart, 9);
  const saturnTouches = [twelfthLord, ninthLord].includes('Saturn') ||
    occupants(chart, 9).some((o) => o.planet === 'Saturn') ||
    occupants(chart, 12).some((o) => o.planet === 'Saturn');
  const ninthLordDig = fullDignity(chart, ninthLord);

  out.push({
    question: 'Will the process be smooth, or delayed?',
    verdict: saturnTouches
      ? 'Expect delay. Applications, visas and funding will each take longer than quoted, and at least one will be refused before it goes through.'
      : ninthLordDig.score < 0
        ? 'Friction rather than delay. The process moves, but paperwork and approvals go wrong in small ways repeatedly.'
        : 'Reasonably smooth. Nothing in the chart signals the kind of obstruction that stalls these applications for years.',
    confidence: saturnTouches ? 'Clear' : 'Likely',
    because: saturnTouches
      ? `Saturn is tied into the ${ordinal(9)} or ${ordinal(12)}, and delay is what Saturn does to a process.`
      : `The 9th lord ${ninthLord} is ${ninthLordDig.plain}.`,
  });

  /* --- when --- */
  if (best) {
    out.push({
      question: 'When is the strongest window?',
      verdict:
        `${formatDate(best.from)} to ${formatDate(best.to)}. Applications made inside this window carry the chart behind them; ` +
        `outside it the same effort meets more resistance.`,
      confidence: best.score >= 85 ? 'Clear' : 'Likely',
      window: { from: formatDate(best.from), to: formatDate(best.to), label: best.label },
      because: `Running under ${best.lords.join(', ')} - the planets that carry this topic in your chart.`,
      support: Math.min(97, best.score),
    });

    const next = windows.find((w) => Date.parse(w.from) > ctx.now.getTime());
    if (next && next !== best) {
      out.push({
        question: 'If I miss it, when does it come round again?',
        verdict: `${formatDate(next.from)} to ${formatDate(next.to)}. The next comparable opening, and there is nothing substantial between the two.`,
        confidence: 'Likely',
        window: { from: formatDate(next.from), to: formatDate(next.to), label: next.label },
      });
    }
  }

  /* --- direction --- */
  const dir12 = directionFor(ctx, 12);
  const dir9 = directionFor(ctx, 9);
  out.push({
    question: 'Which direction?',
    verdict:
      dir12.direction === dir9.direction
        ? `${dir12.direction.charAt(0).toUpperCase()}${dir12.direction.slice(1)}. Both the foreign house and the house of long journeys point the same way, which is as clear as this gets.`
        : `${dir12.direction.charAt(0).toUpperCase()}${dir12.direction.slice(1)} for the move itself, ${dir9.direction} for study. Where they disagree, follow the 12th for where you live and the 9th for where you learn.`,
    confidence: dir12.direction === dir9.direction ? 'Clear' : 'Mixed',
    because: `The 12th falls in ${chart.houseSigns[12]} and the 9th in ${chart.houseSigns[9]}.`,
    classical: {
      claim: 'The quarter is known from the sign occupying the bhava, counted east, south, west and north from Mesha.',
      source: 'Standard directional attribution, Brihat Samhita and later compendia',
    },
  });

  /* --- will it stick --- */
  const fourthLord = lord(chart, 4);
  const fourthLordPlace = at(chart, fourthLord);
  const rooted = fourthLordPlace ? [1, 4, 7, 10].includes(fourthLordPlace.house) : false;

  /* The verdict and the confidence have to be decided by the same test, or the
     panel says "uncertain" and labels it "likely" in the same breath. */
  const gap = twelfth - ninth;
  const decisive = rooted || Math.abs(gap) > 12;

  out.push({
    question: 'Will I settle there, or come back?',
    verdict: rooted
      ? 'You come back. The home base holds, and this reads as a long stay rather than emigration.'
      : gap > 12
        ? 'You stay. The foreign house is materially stronger than the home base, which is the pattern behind people who do not return.'
        : gap < -12
          ? 'You come back. The home base outweighs the foreign house, so expect the move to have a return date attached even if it is not fixed yet.'
          : 'Genuinely balanced. Both pulls are comparable, which in practice means circumstances decide rather than preference - so the useful question is what would make you stay, not whether you will.',
    confidence: decisive ? 'Likely' : 'Mixed',
    because: `The 4th lord ${fourthLord} sits in the ${ordinal(fourthLordPlace?.house ?? 4)}${rahuInvolved ? ', and Rahu is tied into the foreign axis' : ''}.`,
  });

  return out;
}
