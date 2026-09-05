import type { HouseNumber, NatalChart, PlanetName } from '@/types/astrology';
import { chartCombinations, combinationsFor } from './combinations';
import { detectYogas } from './yogas';
import { chartSignature } from './chart-signature';
import { findActive } from './dasha';
import { yearImpacts } from './year-impact';
import { fullDignity } from './strength';
import { housesRuledBy, lordOfHouse } from './vedic-constants';
import { ordinal } from './rule-engine';

/**
 * What to say first.
 *
 * A practitioner opens a consultation with one statement that makes the client
 * sit forward. The software has all the material to choose it and has never
 * chosen - it presents three panels and leaves the selection to the astrologer
 * at exactly the moment they have least attention to spare.
 *
 * Ranking is by recognisability, not by astrological weight. A structural fact
 * like a final dispositor matters enormously to the reading and means nothing to
 * the person hearing it. A statement about how they behave, or about what is
 * happening to them this year, is the one they answer.
 */

export interface Opening {
  /** Say this. Written to be spoken, not read. */
  line: string;
  /** What it rests on, for the astrologer's own confidence. */
  basis: string;
  /** Higher means more likely to land as an opener. */
  pull: number;
  kind: 'behaviour' | 'current' | 'structure' | 'timing';
}

/** Houses whose combinations describe behaviour rather than circumstance. */
const PERSONAL_HOUSES = [1, 3, 5, 7, 10, 12];

/**
 * The combination layer writes for the practitioner, so it says "the person".
 * This is said to the person, so it says "you". A limited substitution rather
 * than anything clever - it covers the phrasings the generators actually
 * produce, and anything it misses the astrologer rephrases naturally anyway.
 */
function toSecondPerson(text: string): string {
  return text
    .replace(/\bthe person themselves\b/g, 'you yourself')
    .replace(/\bthe person's\b/g, 'your')
    .replace(/\bthe person\b/g, 'you')
    .replace(/\bSomeone with this\b/g, 'You')
    .replace(/\bthey are doing to themselves\b/g, 'you are doing to yourself')
    .replace(/\bthey\b/g, 'you')
    .replace(/\bthem\b/g, 'you')
    .replace(/\btheir\b/g, 'your')
    .replace(/\bthemselves\b/g, 'yourself')
    .replace(/\byou raises\b/g, 'you raise')
    .replace(/\byou lives\b/g, 'you live')
    .replace(/\byou has\b/g, 'you have')
    .replace(/\byou does\b/g, 'you do')
    .replace(/\byou is\b/g, 'you are')
    .replace(/\byou keeps\b/g, 'you keep')
    .replace(/\byou tends\b/g, 'you tend')
    .replace(/\byou cannot explain about yourself\b/g, 'you cannot explain about yourself');
}

const PLANETS_IN_TEXT = /\b(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\b/;

export interface OpeningOptions {
  now?: Date;
  /**
   * Houses this reader may see. The opener is drawn from house combinations, so
   * without this filter a free account's best line can come straight out of a
   * locked house - handing over the content the lock exists to protect, in the
   * most prominent position on the screen.
   */
  allowedHouses?: HouseNumber[];
  /** Whether dates may appear. A timing opener is a paid opener. */
  timing?: boolean;
}

export function openingLines(natal: NatalChart, options: OpeningOptions | Date = {}): Opening[] {
  const opts: OpeningOptions = options instanceof Date ? { now: options } : options;
  const now = opts.now ?? new Date();
  const allowed = opts.allowedHouses;
  const timingAllowed = opts.timing ?? true;
  const chart = natal.charts.D1;
  const out: Opening[] = [];

  /* --- what they are living through right now ---------------------------- */
  const active = timingAllowed ? findActive(natal.dashaTree, now) : null;
  const thisYear = now.getUTCFullYear();
  const current = timingAllowed ? yearImpacts(natal, { now }).find((y) => y.year === thisYear) : undefined;

  if (current) {
    out.push({
      line: current.headline.split('. ').slice(0, 2).join('. ') + '.',
      basis: `${current.factors.length} factors converge on ${current.year}, weighted ${current.impact}.`,
      pull: current.band === 'Peak' ? 100 : current.band === 'High' ? 88 : 70,
      kind: 'current',
    });
  }

  if (active?.antar) {
    const lord = active.antar.lord;
    const owns = housesRuledBy(lord, chart.ascendantSign);
    const dig = fullDignity(chart, lord);
    if (owns.length > 0) {
      out.push({
        line:
          `Right now you are in a stretch run by ${lord}, which handles ${owns.map(ordinal).join(' and ')} matters in your chart, and it is ${dig.plain}. ` +
          `It ends around ${new Date(active.antar.end).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}.`,
        basis: `${active.maha.lord}-${lord} sub-period, ${active.daysRemainingAntar} days remaining.`,
        pull: 76,
        kind: 'timing',
      });
    }
  }

  /* --- how they behave, which is what they recognise --------------------- */
  const personal = allowed ? PERSONAL_HOUSES.filter((h) => allowed.includes(h as HouseNumber)) : PERSONAL_HOUSES;

  for (const house of personal) {
    for (const combo of combinationsFor(natal, house as never).slice(0, 2)) {
      const behavioural =
        combo.id.startsWith('self-authored') ||
        combo.id.startsWith('agenda') ||
        combo.id.startsWith('split') ||
        combo.id === 'karaka-in-own-house';

      out.push({
        line: combo.claim.split('. ').slice(0, 2).join('. ') + '.',
        basis: combo.from.join(' \u00b7 '),
        /* A behavioural claim about the 1st is the strongest opener available:
           it is about them, and they can confirm or deny it immediately. */
        pull: (behavioural ? 90 : 62) + (house === 1 ? 8 : 0) - (combo.weight < 7 ? 12 : 0),
        kind: behavioural ? 'behaviour' : 'structure',
      });
    }
  }

  /* --- one thing about the chart as a whole ------------------------------- */
  for (const combo of chartCombinations(natal).slice(0, 3)) {
    /* A chart-level claim can still name a locked house in passing. Cheap to
       check, and the alternative is a paywall with a hole in the headline. */
    if (allowed && /\b(\d+)(?:st|nd|rd|th)\b/.test(combo.claim)) {
      const named = [...combo.claim.matchAll(/\b(\d+)(?:st|nd|rd|th)\b/g)].map((m) => Number(m[1]));
      if (named.some((h) => h >= 1 && h <= 12 && !allowed.includes(h as HouseNumber))) continue;
    }
    out.push({
      line: combo.claim.split('. ').slice(0, 2).join('. ') + '.',
      basis: combo.from.join(' \u00b7 '),
      pull: combo.id.startsWith('self-vs') ? 84 : 58,
      kind: combo.id.startsWith('self-vs') ? 'behaviour' : 'structure',
    });
  }

  /* --- a genuinely rare placement, which is worth naming outright --------- */
  const rare = chartSignature(chart).filter((o) => o.notability === 5).slice(0, 2);
  for (const o of rare) {
    out.push({
      line: `${o.consequence.split('. ')[0]}.`,
      basis: o.statement,
      pull: 66,
      kind: 'structure',
    });
  }

  /* --- a strong yoga, phrased as an observation rather than a label ------- */
  const strong = detectYogas(chart).find((y) => y.strength === 'Strong');
  if (strong) {
    out.push({
      line: strong.modernReading.split('. ').slice(0, 2).join('. ') + '.',
      basis: `${strong.name}, ${strong.participants.join(' and ')}.`,
      pull: 64,
      kind: 'structure',
    });
  }

  /* Dedupe on the opening clause - several sources can reach the same claim. */
  const seen = new Set<string>();
  return out
    .map((o) => ({ ...o, line: toSecondPerson(o.line) }))
    .filter((o) => {
      const key = o.line.slice(0, 48);
      if (seen.has(key)) return false;
      seen.add(key);
      /*
       * A line has to stand alone when spoken. Fragments cut from a longer
       * paragraph lose their subject - "the houses it rules operate against the
       * grain" names nothing - so a candidate must mention a planet outright.
       */
      return o.line.length > 40 && PLANETS_IN_TEXT.test(o.line);
    })
    .sort((a, b) => b.pull - a.pull)
    .slice(0, 4);
}
