import type { NatalChart } from '@/types/astrology';
import { buildContext, type Answer, type AnswerContext } from './engine';
import { foreignAnswers } from './foreign';
import { wealthAnswers } from './wealth';
import { marriageAnswers } from './marriage';
import { careerAnswers } from './career';
import { educationAnswers } from './education';
import { familyAnswers, childrenAnswers, propertyAnswers } from './family';
import { personalityAnswers } from './personality';
import { mindsetAnswers, softSkillsAnswers, moodAnswers, mentalLoadAnswers } from './mind';
import { luckAnswers, karmaAnswers, pastLifeAnswers, enemiesAnswers, strengthAnswers } from './fortune';

export type { Answer, Confidence, AnswerContext } from './engine';
export { buildContext } from './engine';

/**
 * Topic id to answer module.
 *
 * Topic 8 is absent because the medical module owns it - a body map answers that
 * question better than prose. Topic 9 is absent because longevity is gated and
 * belongs behind the passphrase rather than in a list of direct answers.
 */
const MODULES: Record<number, (ctx: AnswerContext) => Answer[]> = {
  1: careerAnswers,
  2: wealthAnswers,
  3: educationAnswers,
  4: marriageAnswers,
  5: childrenAnswers,
  6: familyAnswers,
  7: foreignAnswers,
  10: propertyAnswers,
  11: personalityAnswers,
  12: mindsetAnswers,
  13: enemiesAnswers,
  14: softSkillsAnswers,
  15: luckAnswers,
  16: karmaAnswers,
  17: strengthAnswers,
  18: pastLifeAnswers,
  19: moodAnswers,
  20: mentalLoadAnswers,
};

/**
 * Answers for one topic, with the context supplied.
 *
 * Building a context computes ashtakavarga and detects every yoga, so a panel
 * showing several topics should build it once and pass it in rather than
 * rebuilding it per topic.
 */
export function answersWithContext(ctx: AnswerContext, topicId: number): Answer[] | null {
  const build = MODULES[topicId];
  return build ? build(ctx) : null;
}

/** Convenience for callers with a chart but no context. */
export function answersForTopic(natal: NatalChart, topicId: number, now = new Date()): Answer[] | null {
  return answersWithContext(buildContext(natal, now), topicId);
}

export function hasAnswers(topicId: number): boolean {
  return topicId in MODULES;
}

export const TOPICS_WITH_ANSWERS = Object.keys(MODULES).map(Number);
