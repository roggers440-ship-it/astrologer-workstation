import { ordinal } from '@/lib/rule-engine';
import { fullDignity } from '@/lib/strength';
import {
  at, carriersOf, confidenceFor, formatDate, houseSupport, lord, lordsConnected,
  occupants, topicWindows, type Answer, type AnswerContext,
} from './engine';

export function educationAnswers(ctx: AnswerContext): Answer[] {
  const { chart } = ctx;
  const out: Answer[] = [];

  const fourth = houseSupport(ctx, 4);
  const fifth = houseSupport(ctx, 5);
  const ninth = houseSupport(ctx, 9);
  const overall = Math.round(fourth * 0.25 + fifth * 0.4 + ninth * 0.35);

  const mercury = fullDignity(chart, 'Mercury');
  const jupiter = fullDignity(chart, 'Jupiter');

  out.push({
    question: 'Does my luck support education?',
    verdict:
      overall >= 68
        ? 'Strongly. Study is one of the reliable paths in this chart - effort put into learning returns more than effort put elsewhere.'
        : overall >= 52
          ? 'Yes, with application. The capacity is there; it does not arrive without work, which is the usual and less flattering answer.'
          : overall >= 36
            ? 'Patchy. You are capable, but formal education specifically is not where this chart is strongest. Skills learned on the job may serve better than another degree.'
            : 'Formal study is uphill here. That is not about intelligence - the intelligence houses and the schooling houses are different things, and it is the second set that is weak.',
    confidence: confidenceFor(overall),
    support: overall,
    because: `Schooling ${fourth}, intelligence ${fifth}, higher study ${ninth}.`,
  });

  out.push({
    question: 'Will I get a higher degree?',
    verdict:
      ninth >= 55
        ? 'Yes. The higher-education house carries it, and postgraduate study is a natural extension rather than a stretch.'
        : ninth >= 40
          ? 'Possible but not indicated. If you do it, expect it to be part-time, interrupted, or later than usual.'
          : 'The chart does not push toward it. A further degree is achievable and will not be the thing that changes your trajectory.',
    confidence: confidenceFor(ninth),
    support: ninth,
  });

  out.push({
    question: 'How do I actually learn best?',
    verdict:
      mercury.score >= jupiter.score
        ? 'By working through detail. Analysis, practice, repetition - you learn by doing the problems rather than by hearing the theory.'
        : 'By framework. You need to understand why before the detail sticks, and rote learning will always feel wasteful.',
    confidence: 'Likely',
    because: `Mercury is ${mercury.plain}; Jupiter is ${jupiter.plain}.`,
  });

  const breaks = occupants(chart, 4).some((o) => ['Saturn', 'Rahu', 'Ketu'].includes(o.planet)) ||
    (at(chart, lord(chart, 4))?.house ?? 0) in { 6: 1, 8: 1, 12: 1 };
  out.push({
    question: 'Will there be a break or disruption in study?',
    verdict: breaks
      ? 'Likely one interruption - a changed course, a gap year, a move mid-programme. It resolves; it is not a failure signature.'
      : 'No structural break indicated. Study runs continuously unless circumstances outside the chart intervene.',
    confidence: 'Mixed',
  });

  const carriers = carriersOf(ctx, [4, 5, 9], ['Mercury', 'Jupiter']);
  const w = topicWindows(ctx, carriers, { yearsForward: 12, limit: 2 })[0];
  if (w) {
    out.push({
      question: 'Best window to start something demanding?',
      verdict: `${formatDate(w.from)} to ${formatDate(w.to)}. Exams, admissions and course starts inside this window run with the chart rather than against it.`,
      confidence: 'Likely',
      window: { from: formatDate(w.from), to: formatDate(w.to), label: w.label },
    });
  }

  return out;
}
