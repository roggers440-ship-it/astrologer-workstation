import type { HouseNumber, NatalChart } from '@/types/astrology';
import { SIGNS, housesAspectedBy, housesRuledBy, lordOfHouse } from '@/lib/vedic-constants';
import { ordinal } from '@/lib/rule-engine';
import { fullDignity, digbala } from '@/lib/strength';
import { computeAshtakavarga } from '@/lib/ashtakavarga';
import { detectYogas, yogasTouchingHouse, yogasForTopic } from '@/lib/yogas';
import { chartSignature } from '@/lib/chart-signature';
import { yearImpacts } from '@/lib/year-impact';
import { findActive } from '@/lib/dasha';
import { readHouse } from '@/lib/house-reading';
import { chartCombinations, combinationsFor } from '@/lib/combinations';
import { answersForTopic } from '@/lib/answers';
import { topicById } from '@/lib/topics';

/**
 * Fact briefs.
 *
 * Everything the model sees is computed here. It gets no birth data, no name and
 * no location - only positions and derived values - so nothing identifying ever
 * leaves the server.
 *
 * Briefs are deliberately terse. The model is being asked to weigh and phrase,
 * not to be impressed by volume, and every extra field is tokens spent on
 * something a practitioner already knows.
 */

export type AnalysisMode = 'overview' | 'house' | 'topic';

/**
 * What each house covers, as an explicit list.
 *
 * The brief previously described the area in one prose line and never said what
 * was out of bounds, so the model imported significations from wherever the
 * planet suggested - partnership and shared resources appearing in a reading of
 * the 12th. Statements about the wrong house read perfectly well, which makes
 * them harder to catch than contradictions.
 */
const HOUSE_TOPIC: Record<number, number> = {
  1: 11, 2: 2, 3: 14, 4: 10, 5: 5, 6: 13, 7: 4, 9: 7, 10: 1, 11: 15, 12: 18,
};

const HOUSE_SCOPE: Record<number, string[]> = {
  1: ['physical health', 'appearance and presence', 'sense of self', 'general vitality'],
  2: ['money held and saved', 'family of origin', 'speech and voice', 'food'],
  3: ['self-driven effort', 'siblings', 'short journeys', 'courage', 'writing and communication'],
  4: ['home and property', 'the mother', 'vehicles', 'inner peace and feeling settled', 'schooling'],
  5: ['children', 'learning and intelligence', 'creative work', 'romance', 'speculation and risk'],
  6: ['daily work and service', 'competition and enemies', 'debt', 'illness and health routine'],
  7: ['marriage and the spouse', 'business partnership', 'one-to-one dealings', 'open opposition'],
  8: ['sudden change and upheaval', "other people's money", 'inheritance', 'research and hidden matters', 'longevity'],
  9: ['belief and philosophy', 'teachers and mentors', 'long journeys', 'the father', 'fortune'],
  10: ['career and profession', 'status and reputation', 'public role', 'authority'],
  11: ['income and gains', 'friends and networks', 'elder siblings', 'fulfilment of desires'],
  12: ['expenditure and loss', 'foreign places and distant residence', 'solitude and retreat', 'sleep', 'letting go', 'confinement'],
};

const SHARED_RULES = `
You are writing for a professional Vedic astrologer to read during a consultation.

ABSOLUTE RULES
- You are given computed facts. Never calculate anything yourself, and never introduce a placement, yoga, date or number that is not in the facts.
- Where the facts conflict, resolve them into one conclusion and say which side wins and why. Never present both sides as equally true. Contradiction is the single worst failure here.
- State a verdict. Do not hedge with "may", "could suggest", "tends to indicate" as padding. If something is genuinely uncertain, say it is uncertain once and move on.
- Plain language. Planet names are fine - Saturn, Venus, Jupiter. Technical vocabulary is not: no dusthana, kendra, trikona, dignity, aspect, lord, bhava, karaka.
- Never name a disease or predict death, injury or the timing of either.
- Use exact dates when the facts contain them.
- Do not intensify. If a fact says an area is tied to another, say tied - not "completely tied" or "relies entirely on". Absolutes that the facts do not contain are the easiest way to be confidently wrong, and a client will remember the absolute rather than the qualification.
- Weigh the ruling planet and the planets sitting in an area above planets that merely aspect it from elsewhere. An aspecting planet's own condition is background, not the headline.
- Plain punctuation only. No em-dashes, no en-dashes, no smart quotes - this text gets pasted into other documents.
- Plain prose. No markdown, no headers, no bullet lists.
`.trim();

const INSTRUCTIONS: Record<AnalysisMode, string> = {
  overview: `${SHARED_RULES}

Write a synthesis of the whole chart in four to six short paragraphs, under 450 words.
Build it from whatMakesThisChartDifferent. Those are interactions between factors and they are the only part that separates this chart from any other with the same placements. The plain meaning of a single placement is assumed known and must not be stated on its own - a practitioner does not need to be told what Saturn in a house means.
Use superlatives only where a fact says exalted.
Open with what is most distinctive about this person - the thing another astrologer would notice first.
Then what works, then what is difficult, then the years that matter and why.
Close with the single most useful thing the astrologer could say in this consultation.`,

  house: `${SHARED_RULES}

Write two or three short paragraphs about this one area of life, under 220 words in total. A practitioner reads this mid-consultation; length costs them.
Every statement must be about the matters listed in areaCovers and nothing else. Planets carry general meanings that belong to other areas of life - do not import those here. If Mars suggests conflict, that conflict must be about the matters in areaCovers, not about partnership or property unless those are listed.
Build the reading from whatMakesThisChartDifferent. Those are interactions between factors and they are the only part that distinguishes this chart from any other with the same placements. The plain meaning of a single placement - what Saturn in a house means, what a sign means - is assumed known and must not be stated on its own.
Do not describe two charts as agreeing or disagreeing unless a field says so explicitly.
Say the difficult part. If topicConclusions contains a delay, a limitation or a warning, it belongs in the reading; a reading that omits it is worse than useless.
Use superlatives only where a fact says exalted. Moolatrikona is strong, not exceptionally strong.
Lead with whatever has the largest effect on this area. A planet sitting here at its strongest or weakest outranks everything else and belongs in the first sentence. Do not work through every fact you are given; name the two or three that decide the outcome and leave the rest.
Reach one clear verdict on whether it is strong, mixed or difficult, and say plainly what makes it so.
The bindu count is a transit measure - it describes how this area responds when planets move through it - so weigh occupancy, the ruling planet's condition and any named combination above it when judging the area itself.
A planet that anchors a strong named combination is not simply weak, whatever its individual condition says. If the supporting observations call such a planet badly placed, treat that as one input to weigh, not as the conclusion.
Finish with what to actually do or watch for.`,

  topic: `${SHARED_RULES}

The facts contain direct answers to questions a client asks about this topic.
Write two or three short paragraphs, under 250 words, that turn them into something the astrologer can say out loud.
Use whatMakesThisChartDifferent to make the answers specific to this chart. The generic meaning of a placement is assumed known and adds nothing; only what this chart does to it is worth saying.
Lead with the answer, not the reasoning. Keep every date exactly as given.
If the answers disagree with each other, resolve the disagreement rather than repeating both.`,
};

export function instructionFor(mode: AnalysisMode): string {
  return INSTRUCTIONS[mode];
}

/** Planets casting an aspect onto a house from somewhere else. */
const aspectingPlanets = (chart: NatalChart['charts']['D1'], house: HouseNumber) =>
  chart.placements
    .filter((p) => p.house !== house && housesAspectedBy(p.planet, p.house).includes(house))
    .map((p) => p.planet);

const condition = (natal: NatalChart, planet: Parameters<typeof fullDignity>[1]) => {
  const chart = natal.charts.D1;
  const p = chart.placements.find((x) => x.planet === planet)!;
  const dig = fullDignity(chart, planet);
  const dir = digbala(chart, planet);
  return {
    planet,
    sign: p.sign,
    degree: Number(p.degree.toFixed(1)),
    house: p.house,
    rules: housesRuledBy(planet, chart.ascendantSign),
    state: dig.state,
    directionalStrength: Math.round(dir.value * 100),
    retrograde: p.isRetrograde,
  };
};

export function buildBrief(natal: NatalChart, mode: AnalysisMode, scope?: number): string {
  const chart = natal.charts.D1;
  const av = computeAshtakavarga(chart);
  const yogas = detectYogas(chart);
  const active = findActive(natal.dashaTree);

  if (mode === 'overview') {
    return JSON.stringify({
      risingSign: chart.ascendantSign,
      moonSign: chart.placements.find((p) => p.planet === 'Moon')?.sign,
      birthMomentQualities: natal.panchanga,
      planets: chart.placements.map((p) => condition(natal, p.planet)),
      houseStrengthByBindus: av.byHouse,
      /* Interactions before ingredients. Same reasoning as the house brief: a
         list of placements produces a glossary, and what separates one chart
         from another is how its factors modify each other. */
      whatMakesThisChartDifferent: chartCombinations(natal).map((c) => c.claim),
      distinctiveFeatures: chartSignature(chart).slice(0, 8).map((o) => ({
        title: o.title,
        fact: o.statement,
        meaning: o.consequence,
      })),
      namedCombinations: yogas.map((y) => ({
        name: y.name,
        strength: y.strength,
        planets: y.participants,
        houses: y.houses,
        meaning: y.modernReading,
        caveat: y.caveat,
      })),
      currentPeriod: active && {
        major: active.maha.lord,
        sub: active.antar?.lord,
        subSub: active.pratyantar?.lord,
        majorEnds: active.maha.end.slice(0, 10),
        subEnds: active.antar?.end.slice(0, 10),
      },
      significantYears: yearImpacts(natal).map((y) => ({
        year: y.year,
        weight: y.band,
        tone: y.tone,
        summary: y.headline,
      })),
      birthTimeConfidence: {
        lagnaDegreesPerMinute: Number(natal.ascendantDriftPerMinute.toFixed(2)),
        note: natal.ascendantDriftPerMinute > 0.25
          ? 'The rising sign moves fast at this birth moment, so fine divisions are sensitive to birth-time error.'
          : 'Rising sign is stable against small birth-time error.',
      },
    }, null, 1);
  }

  if (mode === 'house') {
    const house = (scope ?? 1) as HouseNumber;
    const reading = readHouse(natal, house, yogas, av);
    const ruler = lordOfHouse(house, chart.ascendantSign);

    return JSON.stringify({
      house,
      areaCovers: HOUSE_SCOPE[house],
      doNotDiscuss: 'Any matter not in areaCovers, however strongly a planet here suggests it.',
      sign: chart.houseSigns[house],
      rulingPlanet: condition(natal, ruler),
      planetsSittingHere: chart.placements
        .filter((p) => p.house === house)
        .map((p) => condition(natal, p.planet)),
      /*
       * Aspecting planets are explicitly marked secondary. Handing their full
       * condition alongside the occupants let the model read "a struggling Sun"
       * as central to a house the Sun neither rules nor occupies.
       */
      planetsLookingAtItFromElsewhere: aspectingPlanets(chart, house).map((planet) => ({
        planet,
        influence: 'secondary - it neither rules this area nor sits in it',
      })),
      bindus: { value: reading.bindus, average: 28, note: 'Transit responsiveness, not intrinsic strength.' },
      /*
       * The interactions, not the ingredients. Everything else in the brief says
       * what one factor means on its own, which produces textbook output - the
       * meaning of Saturn in the 7th is in every beginner book. These are the
       * statements that separate this chart from every other chart with the same
       * placement, and they are what the analysis should be built from.
       */
      whatMakesThisChartDifferent: combinationsFor(natal, house).map((c) => c.claim),
      supportingObservations: reading.detail,
      /* What this house's own topic module concluded. Computed separately, so a
         house reading previously had no idea its topic had already answered the
         question - the 7th described Saturn without mentioning delay. */
      topicConclusions: HOUSE_TOPIC[house]
        ? (answersForTopic(natal, HOUSE_TOPIC[house]) ?? []).slice(0, 4).map((a) => ({
            question: a.question,
            answer: a.verdict,
          }))
        : undefined,
      namedCombinations: yogasTouchingHouse(yogas, house).map((y) => ({
        name: y.name,
        strength: y.strength,
        meaning: y.modernReading,
        caveat: y.caveat,
      })),
      activePeriods: reading.windows.map((w) => ({
        from: w.year,
        to: w.endYear,
        planet: w.label,
        status: w.isCurrent ? 'running now' : w.isFuture ? 'future' : 'past',
      })),
      divisionalCrossCheck: reading.divisional
        ? {
            note: reading.divisional,
            /* Never say the charts agree unless something computed it. The model
               inferred concordance from the mere presence of this field and told
               a client the marriage charts agreed, which nothing had checked. */
            agreementWasNotComputed: true,
          }
        : undefined,
    }, null, 1);
  }

  const topicId = scope ?? 1;
  const topic = topicById(topicId);

  const topicHouses = topic?.houses ?? [];

  return JSON.stringify({
    topic: topic?.name,
    housesRead: topicHouses,
    /* The same interaction layer the houses use. Without it a topic reading is
       assembled from single placements and reads like a textbook entry. */
    whatMakesThisChartDifferent: topicHouses
      .flatMap((h) => combinationsFor(natal, h).slice(0, 3).map((c) => c.claim))
      .concat(chartCombinations(natal).slice(0, 3).map((c) => c.claim)),
    handlingNote: topic?.handlingNote,
    answers: (answersForTopic(natal, topicId) ?? []).map((a) => ({
      question: a.question,
      answer: a.verdict,
      confidence: a.confidence,
      chartSupportOutOf100: a.support,
      window: a.window,
      reason: a.because,
    })),
    namedCombinations: yogasForTopic(yogas, topicId).map((y) => ({
      name: y.name,
      strength: y.strength,
      meaning: y.modernReading,
    })),
    currentPeriod: active && { major: active.maha.lord, sub: active.antar?.lord },
  }, null, 1);
}

/** Changes when the facts change, so a cached analysis is invalidated correctly. */
export function factHash(brief: string): string {
  let h = 0;
  for (let i = 0; i < brief.length; i++) {
    h = (Math.imul(31, h) + brief.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}
