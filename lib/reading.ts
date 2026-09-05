import 'server-only';
import type { HouseNumber, NatalChart } from '@/types/astrology';
import type {
  PublicHouse, PublicRegion, PublicTopic, PublicWindow, PublicYear, Reading, Teaser,
} from '@/types/reading';
import {
  canSeeHouse, canSeeTopic, unlockedHouses, type Entitlements, type Tier,
} from '@/lib/entitlements';
import { computeAshtakavarga } from '@/lib/ashtakavarga';
import { detectYogas, yogasTouchingHouse, yogasForTopic } from '@/lib/yogas';
import { chartCombinations, combinationsFor } from '@/lib/combinations';
import { chartSignature } from '@/lib/chart-signature';
import { readHouse } from '@/lib/house-reading';
import { answersWithContext, buildContext } from '@/lib/answers';
import { yearImpacts } from '@/lib/year-impact';
import { analyseBody } from '@/lib/medical';
import { openingLines } from '@/lib/opening';
import { findActive } from '@/lib/dasha';
import { TOPICS, topicById } from '@/lib/topics';
import { HOUSE_THEME } from '@/lib/house-themes';

/**
 * Build the gated reading.
 *
 * The single place where entitlement meets content. Everything the browser
 * receives passes through here, and anything a plan does not cover is never
 * added to the object rather than being added and hidden - a difference that
 * matters because the second kind survives devtools and the first does not.
 *
 * ONE DELIBERATE EXCEPTION. An unlocked house may name a locked one in passing,
 * because a house cannot be read without saying where its ruler sits. A free
 * account reading the 1st will be told its ruler sits in partnership, and that
 * identity forms through it, while the 7th itself stays closed. Blocking that
 * would make the unlocked readings incoherent, and it happens to be the strongest
 * thing in the funnel: it tells someone marriage is the defining relationship of
 * their life and then declines to say more. What stays locked is the 7th house's
 * own reading - its hook, its findings, its combinations and every date.
 */

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Which plan opens a given thing. Basic covers everything except depth. */
const NEEDS: Tier = 'basic';

function toWindow(w: { year: number; endYear: number; label: string; isCurrent: boolean; isFuture: boolean }): PublicWindow {
  return {
    from: String(w.year),
    to: String(w.endYear),
    label: w.label,
    status: w.isCurrent ? 'now' : w.isFuture ? 'future' : 'past',
  };
}

/**
 * Describe a locked house without revealing it.
 *
 * Counts are real, so a subscriber never finds the tease was inflated. Naming
 * what the house covers is not the same as reading it - the anticipation comes
 * from knowing something specific is there.
 */
function houseTeaser(natal: NatalChart, house: HouseNumber): Teaser {
  const yogas = detectYogas(natal.charts.D1);
  const combos = combinationsFor(natal, house);
  const touching = yogasTouchingHouse(yogas, house);
  const reading = readHouse(natal, house, yogas, computeAshtakavarga(natal.charts.D1));

  const has = [
    { label: 'chart-specific findings', count: combos.length },
    { label: 'named combinations', count: touching.length },
    { label: 'timing windows', count: reading.windows.length },
  ].filter((h) => h.count > 0);

  const total = has.reduce((s, h) => s + h.count, 0);

  return {
    locked: true,
    covers: HOUSE_THEME[house],
    has,
    line:
      total === 0
        ? 'Quiet in this chart. Little here beyond the basics.'
        : total >= 6
          ? `There is a lot to say about this one - ${total} separate findings, several of them specific to your chart rather than general.`
          : `Your chart has ${total} specific things to say here.`,
    needs: NEEDS,
  };
}

function topicTeaser(natal: NatalChart, topicId: number): Teaser {
  const topic = topicById(topicId);
  const ctx = buildContext(natal);
  const answers = answersWithContext(ctx, topicId) ?? [];
  const yogas = yogasForTopic(detectYogas(natal.charts.D1), topicId);
  const dated = answers.filter((a) => a.window).length;

  const has = [
    { label: 'questions answered', count: answers.length },
    { label: 'named combinations', count: yogas.length },
    { label: 'dated windows', count: dated },
  ].filter((h) => h.count > 0);

  return {
    locked: true,
    covers: topic?.name.toLowerCase() ?? 'this area',
    has,
    line: dated > 0
      ? `Your chart answers ${answers.length} questions here, ${dated} of them with actual dates.`
      : `Your chart answers ${answers.length} questions here.`,
    needs: NEEDS,
  };
}

export function buildReading(natal: NatalChart, ent: Entitlements, now = new Date()): Reading {
  const chart = natal.charts.D1;
  const av = computeAshtakavarga(chart);
  const yogas = detectYogas(chart);
  const ctx = buildContext(natal, now);
  const technical = ent.depth === 'technical';

  /* --- houses ------------------------------------------------------------ */
  const houses: Record<number, PublicHouse | Teaser> = {};

  for (let h = 1; h <= 12; h++) {
    const house = h as HouseNumber;

    if (!canSeeHouse(ent, house)) {
      houses[h] = houseTeaser(natal, house);
      continue;
    }

    const r = readHouse(natal, house, yogas, av);

    houses[h] = {
      house,
      sign: chart.houseSigns[house],
      verdict: r.verdict,
      hook: r.hook,
      detail: r.detail,
      combinations: combinationsFor(natal, house).map((c) => c.claim),
      yogas: yogasTouchingHouse(yogas, house).map((y) => ({
        name: y.name,
        strength: y.strength,
        reading: y.modernReading,
        caveat: y.caveat,
      })),
      /* Dates are the thing people pay for, so the field is absent rather than
         empty when the plan does not include them. */
      ...(ent.timing ? { windows: r.windows.map(toWindow) } : {}),
      ...(technical ? { technical: r.technical, bindus: r.bindus, divisional: r.divisional } : {}),
    };
  }

  /* --- topics ------------------------------------------------------------ */
  const topics: Record<number, PublicTopic | Teaser> = {};

  for (const topic of TOPICS) {
    if (!canSeeTopic(ent, topic.id)) {
      topics[topic.id] = topicTeaser(natal, topic.id);
      continue;
    }

    const answers = answersWithContext(ctx, topic.id);
    if (!answers) continue;

    topics[topic.id] = {
      id: topic.id,
      name: topic.name,
      handlingNote: topic.handlingNote,
      answers: answers.map((a) => ({
        question: a.question,
        verdict: a.verdict,
        confidence: a.confidence,
        because: a.because,
        support: a.support,
        ...(ent.timing && a.window ? { window: a.window } : {}),
        ...(technical && a.classical ? { classical: a.classical } : {}),
      })),
    };
  }

  /* --- the twenty-year view ---------------------------------------------- */
  const allYears = yearImpacts(natal, { now });
  const years: PublicYear[] | Teaser = ent.timeline
    ? allYears.map((y) => ({ year: y.year, band: y.band, tone: y.tone, headline: y.headline }))
    : {
        locked: true,
        covers: 'the years that matter, ten back and ten forward',
        has: [
          { label: 'significant years', count: allYears.length },
          { label: 'peak years', count: allYears.filter((y) => y.band === 'Peak').length },
        ],
        line: `Your chart marks ${allYears.length} years out of the next and last twenty as significant. The rest are quiet.`,
        needs: NEEDS,
      };

  /* --- medical ------------------------------------------------------------ */
  const findings = analyseBody(natal, { threshold: technical ? 1 : 3, now });
  const medical: PublicRegion[] = (technical ? findings : findings.slice(0, 3)).map((f) => ({
    regionId: f.regionId,
    name: f.name,
    plain: f.plain,
    screening: f.screening,
    ...(technical
      ? {
          severity: f.severity,
          convergence: f.convergence,
          character: f.character?.label,
          hits: f.hits.map((h) => h.detail),
          windows: f.windows.map(toWindow),
        }
      : {}),
  }));

  /* --- everything else ---------------------------------------------------- */
  const active = findActive(natal.dashaTree, now);
  /* The opener is the most prominent line on the screen, so it is filtered by
     the same rules as everything else rather than trusted to be harmless. */
  const opening =
    openingLines(natal, {
      now,
      allowedHouses: unlockedHouses(ent),
      timing: ent.timing,
    })[0] ?? null;

  return {
    clientId: natal.clientId,
    entitlements: {
      tier: ent.tier,
      isAdmin: ent.role === 'admin',
      chartLimit: Number.isFinite(ent.chartLimit) ? ent.chartLimit : null,
      unlockedHouses: unlockedHouses(ent),
      unlockedTopics: ent.topics,
      timing: ent.timing,
      analysis: ent.analysis,
      timeline: ent.timeline,
      medical: ent.medical,
      depth: ent.depth,
    },
    ascendantSign: chart.ascendantSign,
    panchanga: natal.panchanga,
    opening: opening ? { line: opening.line, basis: opening.basis, kind: opening.kind } : null,
    ...(ent.timing && active
      ? {
          currentPeriod: {
            major: active.maha.lord,
            sub: active.antar?.lord,
            subSub: active.pratyantar?.lord,
            majorEnds: fmt(active.maha.end),
            subEnds: active.antar ? fmt(active.antar.end) : undefined,
          },
        }
      : {}),
    signature: chartSignature(chart)
      .slice(0, technical ? 12 : 5)
      .map((o) => ({ title: o.title, statement: o.statement, consequence: o.consequence })),
    yogas: yogas.map((y) => ({
      name: y.name,
      strength: y.strength,
      provenance: y.provenance,
      reading: y.modernReading,
      caveat: y.caveat,
      participants: y.participants,
    })),
    houses,
    topics,
    years,
    medical,
    medicalNote: technical
      ? 'Regions and screenings only. Severity grades the affliction in the chart, not medical risk.'
      : 'Areas worth a routine check, nothing more. A chart cannot diagnose anything, and none of this replaces a doctor.',
  };
}
