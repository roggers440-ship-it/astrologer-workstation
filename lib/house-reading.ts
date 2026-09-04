import type { ChartData, HouseNumber, NatalChart, PlanetName, PlanetPlacement } from '@/types/astrology';
import {
  DUSTHANA_HOUSES, KENDRA_HOUSES, TRIKONA_HOUSES,
  dignityOf, housesAspectedBy, housesRuledBy, lordOfHouse,
} from './vedic-constants';
import { isCombust, ordinal } from './rule-engine';
import { computeAshtakavarga, savBand, savStatement, type Ashtakavarga } from './ashtakavarga';
import { digbala, fullDignity, houseFromMoon, planetStrength } from './strength';
import { periodsInWindow } from './dasha';
import { yogasTouchingHouse, type Yoga } from './yogas';

/**
 * Plain-language reading for a single house.
 *
 * Written to be said out loud. Planet names stay - clients know Saturn and
 * Jupiter, and the words carry weight. What goes is the vocabulary that means
 * nothing outside the tradition: lord, dignity, aspect, dusthana, debilitated,
 * kendra.
 *
 * The hook sentence varies by what is actually distinctive about the house
 * rather than following one template. Twelve paragraphs off a single mould read
 * as filler no matter how good the mould is.
 */

const PLANET_CHARACTER: Record<PlanetName, { adjective: string; carries: string; verb: string }> = {
  Sun:     { adjective: 'proud and visible',      carries: 'authority, recognition, and the father',         verb: 'demands to be seen in' },
  Moon:    { adjective: 'changeable and feeling', carries: 'mood, comfort, and the mother',                   verb: 'brings feeling into' },
  Mars:    { adjective: 'fast and forceful',      carries: 'drive, conflict, and physical courage',           verb: 'pushes hard on' },
  Mercury: { adjective: 'quick and analytical',   carries: 'thinking, talking, and dealing',                  verb: 'keeps busy in' },
  Jupiter: { adjective: 'generous and expansive', carries: 'growth, guidance, and belief',                    verb: 'opens up' },
  Venus:   { adjective: 'easy and pleasure-loving', carries: 'comfort, taste, and close relationships',        verb: 'softens' },
  Saturn:  { adjective: 'slow and serious',       carries: 'patience, hard work, and delay',                  verb: 'slows down' },
  Rahu:    { adjective: 'hungry and restless',    carries: 'ambition and the pull of the unfamiliar',         verb: 'never gets enough of' },
  Ketu:    { adjective: 'detached and inward',    carries: 'old skill and a tendency to walk away',           verb: 'lets go of' },
};

/** Plain description of what each house covers. No house numbers spoken aloud. */
const HOUSE_PLAIN: Record<HouseNumber, string> = {
  1: 'how you come across, your health, and the sense you have of yourself',
  2: 'money you hold onto, your family, and the way you speak',
  3: 'your own effort, your siblings, and your nerve',
  4: 'home, your mother, property, and whether you feel settled',
  5: 'children, learning, creative work, and the risks you take',
  6: 'daily work, competition, debt, and health routines',
  7: 'marriage, close partnership, and dealing with people one to one',
  8: 'sudden change, other people\u2019s money, and the things kept private',
  9: 'belief, teachers, long journeys, and plain luck',
  10: 'work, status, and the part of you the public sees',
  11: 'income, friends and networks, and what you gain from them',
  12: 'what you spend, foreign places, rest, and letting go',
};

/** Where a planet sits, described without naming the house number. */
const HOUSE_AS_PLACE: Record<HouseNumber, string> = {
  1: 'their own sense of self',
  2: 'money and family',
  3: 'effort and siblings',
  4: 'home and inner life',
  5: 'children and creative work',
  6: 'work and conflict',
  7: 'partnership',
  8: 'upheaval and hidden things',
  9: 'belief and travel',
  10: 'career and public standing',
  11: 'income and friendships',
  12: 'expense and retreat',
};

/** Primary bhava karaka. Every house has a natural significator and the app was ignoring them. */
const HOUSE_KARAKA: Record<HouseNumber, PlanetName> = {
  1: 'Sun', 2: 'Jupiter', 3: 'Mars', 4: 'Moon', 5: 'Jupiter', 6: 'Mars',
  7: 'Venus', 8: 'Saturn', 9: 'Jupiter', 10: 'Sun', 11: 'Jupiter', 12: 'Saturn',
};

/**
 * The lagna lord's placement is the single most specific thing about a chart,
 * and generic phrasing wastes it. One line each, plain, for all twelve.
 */
const LAGNA_LORD_IN: Record<HouseNumber, string> = {
  1: 'Self-contained. What you see is what there is, and this person is largely the author of their own life.',
  2: 'Identity is bound up with money, family and speech. Security matters more to them than they usually admit.',
  3: 'Self-made through effort. Siblings and their own initiative shape the life more than inheritance does.',
  4: 'Rooted at home. Their sense of themselves depends on whether the domestic base is solid.',
  5: 'Identity runs through children, creativity and risk. They need something of their own to make.',
  6: 'Built through struggle. They define themselves against opposition, and do badly with nothing to push against.',
  7: 'Identity forms through partnership. Marriage or a close business partner tends to be the defining relationship of the life, and they know themselves best through another person. Health often tracks the partner\u2019s.',
  8: 'Remade at least once. Life involves genuine upheaval, and the person who comes out is not the one who went in.',
  9: 'Guided from outside. Teachers, travel and belief shape them, and luck plays a larger role than effort.',
  10: 'Identity is the career. What they do and who they are collapse into one thing, which is a strength until the work stops.',
  11: 'Defined by their circle. Networks and friendships carry them, and gains arrive through people.',
  12: 'Turned inward. Solitude, foreign places or retreat are where they find themselves, and public life costs them.',
};

export interface HouseWindow {
  year: number;
  endYear: number;
  label: string;
  plain: string;
  isCurrent: boolean;
  isFuture: boolean;
}

export interface HouseReading {
  house: HouseNumber;
  /** Sarvashtakavarga bindus, 0-56. The classical measure, replacing an invented score. */
  bindus: number;
  /** Normalised to 0-100 purely so the bar has something to draw. */
  strength: number;
  savBand: string;
  savStatement: string;
  verdict: 'Strong' | 'Workable' | 'Under strain';
  /** The opening sentence. Say this one out loud. */
  hook: string;
  /** Three to five short plain lines. */
  detail: string[];
  /** Technical breakdown, kept separate and collapsed by default. */
  technical: string[];
  yogas: Yoga[];
  windows: HouseWindow[];
  /** Divisional cross-check, where one is conventional for this house. */
  divisional?: string;
}

const at = (c: ChartData, p: PlanetName) => c.placements.find((x) => x.planet === p);

function condition(chart: ChartData, planet: PlanetName): {
  word: string;
  score: number;
  combust: boolean;
} {
  const p = at(chart, planet);
  if (!p) return { word: 'unclear', score: 0, combust: false };

  const dig = dignityOf(planet, p.sign, p.degree);
  const combust = isCombust(chart, planet);

  if (combust) return { word: 'burnt out', score: -2, combust: true };
  if (dig === 'Exalted') return { word: 'at its best', score: 3, combust };
  if (dig === 'Moolatrikona' || dig === 'OwnSign') return { word: 'comfortable', score: 2, combust };
  if (dig === 'Debilitated') return { word: 'struggling', score: -3, combust };
  return { word: 'steady', score: 0, combust };
}

function aspectingPlanets(chart: ChartData, house: HouseNumber): PlanetName[] {
  return chart.placements
    .filter((p) => p.house !== house && housesAspectedBy(p.planet, p.house).includes(house))
    .map((p) => p.planet);
}

const HELPFUL: PlanetName[] = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
const HARSH: PlanetName[] = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];

/**
 * Dasha windows for a house: periods run by its ruler or its occupants.
 *
 * A mahadasha and the antardasha that opens it are the same event, so the
 * opening sub-period is dropped rather than consuming a second slot.
 */
function houseWindows(natal: NatalChart, planets: PlanetName[], now = new Date()): HouseWindow[] {
  const year = now.getUTCFullYear();
  const from = new Date(Date.UTC(year - 10, 0, 1));
  const to = new Date(Date.UTC(year + 10, 11, 31));

  const periods = periodsInWindow(natal.dashaTree, from, to).filter(
    (p) => planets.includes(p.lord) && Date.parse(p.start) >= from.getTime(),
  );

  const mahaStarts = new Set(
    periods.filter((p) => p.level === 'Maha').map((p) => `${p.lord}:${p.start.slice(0, 7)}`),
  );

  return periods
    .filter((p) => !(p.level === 'Antar' && mahaStarts.has(`${p.lord}:${p.start.slice(0, 7)}`)))
    .map((p) => {
      const isCurrent = Date.parse(p.start) <= now.getTime() && now.getTime() < Date.parse(p.end);
      const isFuture = Date.parse(p.start) > now.getTime();
      const long = p.level === 'Maha';
      return {
        year: new Date(p.start).getUTCFullYear(),
        endYear: new Date(p.end).getUTCFullYear(),
        label: `${p.lord} ${long ? 'major period' : 'sub-period'}`,
        plain: isCurrent
          ? `${p.lord} is running now, so whatever is moving here, this is why.`
          : isFuture
            ? `${p.lord} takes over again. This area gets busy${long ? ' for years' : ''}.`
            : `${p.lord} was running. Ask what changed here around then.`,
        isCurrent,
        isFuture,
      };
    })
    .sort((a, b) => a.year - b.year)
    .slice(0, 5);
}

export function readHouse(natal: NatalChart, house: HouseNumber, yogas: Yoga[], av: Ashtakavarga): HouseReading {
  const chart = natal.charts.D1;
  const ruler = lordOfHouse(house, chart.ascendantSign);
  const rulerPlace = at(chart, ruler)!;
  /*
   * Combustion overrides the sign. A combust planet described as "neither helped
   * nor hindered" and then as obstructed two clauses later is the software
   * arguing with itself in one paragraph - the word has to carry both facts.
   */
  const rulerDignityRaw = fullDignity(chart, ruler);
  const rulerCombust = isCombust(chart, ruler);
  const rulerCondition = {
    word: rulerCombust ? 'burnt out by the Sun' : rulerDignityRaw.plain,
    score: rulerCombust ? Math.min(rulerDignityRaw.score, -2) : rulerDignityRaw.score,
    combust: rulerCombust,
  };

  const occupants = chart.placements.filter((p) => p.house === house);
  const aspectors = aspectingPlanets(chart, house);
  const helpfulAspects = aspectors.filter((a) => HELPFUL.includes(a));
  const harshAspects = aspectors.filter((a) => HARSH.includes(a));

  const houseYogas = yogasTouchingHouse(yogas, house);
  const strongYoga = houseYogas.find((y) => y.strength === 'Strong');

  /* ------------------------------- scoring -------------------------------- */

  /*
   * Strength is the Sarvashtakavarga bindu count, not an invented figure. The
   * average is 28 out of a possible 56, the scale is eight centuries old, and
   * practitioners already quote these numbers to each other.
   */
  const bindus = av.byHouse[house];
  const band = savBand(bindus);
  const strength = Math.max(4, Math.min(96, Math.round((bindus / 45) * 100)));
  const verdict: HouseReading['verdict'] =
    bindus >= 30 ? 'Strong' : bindus < 25 ? 'Under strain' : 'Workable';

  /* ------------------------------ hook shapes ------------------------------ */

  const rc = PLANET_CHARACTER[ruler];
  const topic = HOUSE_PLAIN[house];
  const rulerSits = HOUSE_AS_PLACE[rulerPlace.house];
  let hook: string;

  if (strongYoga) {
    /* Shape 1 - a strong named combination outranks everything else here.
       If the ruler is compromised the two facts have to be reconciled in the same
       breath, or the reading contradicts itself two lines later. */
    const obstructed = rulerCondition.score <= -2 || rulerCondition.combust;
    hook =
      `This is one of the stronger parts of the chart. ${strongYoga.participants.slice(0, -1).join(', ')}${strongYoga.participants.length > 1 ? ' and ' : ''}${strongYoga.participants[strongYoga.participants.length - 1]} form a combination the tradition names and rates highly, and it lands directly on ${topic}. ` +
      (obstructed
        ? `The complication is that ${ruler}, which runs this area, is ${rulerCondition.word}. The promise is real and the delivery is obstructed - expect this to arrive later and cost more than it looks like it should.`
        : `Worth leading with, though it needs the right years to actually show.`);
  } else if (occupants.length >= 3) {
    /* Shape 2 - a crowd. */
    hook =
      `A lot is happening here. ${occupants.map((o) => o.planet).join(', ')} all sit in this part of the chart, so ${topic} takes up far more room in this life than it does for most people. ` +
      `That is a strength and a distortion at once - other areas get less attention because this one takes it.`;
  } else if (occupants.length > 0) {
    /*
     * Shape 3 - one or two occupants set the tone directly.
     *
     * Condition leads when there is one. An exalted or fallen occupant is the
     * single most important thing about a house, and the previous version wrote
     * the same sentence for both because it used the planet's character and never
     * its dignity - Mars exalted and Mars debilitated read identically.
     */
    const ranked = [...occupants].sort(
      (a, b) => Math.abs(fullDignity(chart, b.planet).score) - Math.abs(fullDignity(chart, a.planet).score),
    );
    const lead = ranked[0];
    const lc = PLANET_CHARACTER[lead.planet];
    const leadDig = fullDignity(chart, lead.planet);
    const leadCombust = isCombust(chart, lead.planet);

    const opening =
      leadDig.state === 'Exalted'
        ? `${lead.planet} sits here at its strongest, which makes this one of the most capable parts of the chart even though the area itself is a demanding one.`
        : leadDig.state === 'Debilitated'
          ? `${lead.planet} sits here and is struggling, so this area gets ${lc.carries} without the strength to use it well.`
          : leadCombust
            ? `${lead.planet} sits here but is burnt out by the Sun, so it colours this area without being able to deliver much.`
            : ['Own sign', 'Moolatrikona'].includes(leadDig.state)
              ? `${lead.planet} sits here in its own ground and is ${lc.adjective}.`
              : `${lead.planet} sits here, and it is ${lc.adjective}.`;

    hook =
      `${opening} It ${lc.verb} ${topic}, and brings ${lc.carries} with it. ` +
      (occupants.length > 1
        ? `${ranked[1].planet} is here too, which complicates the picture rather than simply adding to it.`
        : 'Whatever else is true of this area, that quality runs through it.');
  } else if (rulerCondition.combust || rulerCondition.score <= -2) {
    /* Shape 4 - empty, and the ruler is compromised. */
    hook =
      `This area is run by ${ruler}, and ${ruler} is ${rulerCondition.word}. ` +
      `That means ${topic} tends to underdeliver relative to the effort put in. It is not absent - it is obstructed, which feels quite different from the inside and is usually the more accurate thing to say.`;
  } else if (rulerCondition.score >= 2) {
    /* Shape 5 - empty, ruler strong. A strong lord sitting in a house of
       difficulty is not simply good news, and calling it "well supported" without
       saying where it sits reads as the software not having noticed. */
    const inDusthana = DUSTHANA_HOUSES.includes(rulerPlace.house);
    hook = inDusthana
      ? `${ruler} runs this area and is ${rulerCondition.word} - but it sits in ${rulerSits}, a house of difficulty. ` +
        `That combination gives real capability that only shows under pressure: ${topic} works, and it works by being tested rather than by being easy.`
      : `${ruler} runs this area and is ${rulerCondition.word}, sitting over in ${rulerSits}. ` +
        `That means ${topic} is well supported, and improves whenever ${rulerSits} is going well. The two move together.`;
  } else {
    /* Shape 6 - empty, ruler ordinary: describe the fusion, which is the real content. */
    hook =
      `${ruler} runs this area from ${rulerSits}, so the two are tied together. ` +
      `This part of life rarely moves on its own - it moves when ${rulerSits} does. ${ruler} being ${rc.adjective} sets the pace, and that covers ${topic}.`;
  }

  /* ------------------------------- details -------------------------------- */

  const detail: string[] = [];

  if (occupants.length > 0 && occupants.length < 3) {
    for (const o of occupants.slice(1)) {
      detail.push(`${o.planet} adds ${PLANET_CHARACTER[o.planet].carries}.`);
    }
  }

  const rulerStrength = planetStrength(chart, ruler);
  const rulerDig = fullDignity(chart, ruler);

  if (occupants.length > 0) {
    detail.push(`${ruler} runs this area from ${rulerSits}, and is ${rulerDig.plain}.`);
  }

  /*
   * The ruler aspecting or occupying its own house is a classical strength, not
   * an outside pressure. Counting it as hostile - which the previous version did,
   * because it treated every aspect the same way - produced the nonsense of
   * "Saturn presses on it from elsewhere" when Saturn was the ruler aspecting its
   * own house from the 7th.
   */
  const rulerSupportsOwnHouse = aspectors.includes(ruler) || rulerPlace.house === house;
  const externalHelpful = helpfulAspects.filter((a) => a !== ruler);
  const externalHarsh = harshAspects.filter((a) => a !== ruler);

  if (rulerSupportsOwnHouse) {
    detail.push(
      rulerPlace.house === house
        ? `${ruler} sits in the area it runs, which keeps this self-contained and under their own control.`
        : `${ruler} looks back at the area it runs from where it sits. That is a genuine support - the house is not left unattended.`,
    );
  }

  if (externalHelpful.length > 0) {
    detail.push(
      `${externalHelpful.join(' and ')} ${externalHelpful.length > 1 ? 'keep' : 'keeps'} an eye on this area from elsewhere, which protects it.`,
    );
  }

  if (externalHarsh.length > 0) {
    detail.push(
      `${externalHarsh.join(' and ')} ${externalHarsh.length > 1 ? 'press' : 'presses'} on it from elsewhere, so there is friction here that the placement alone does not show.`,
    );
  }

  /* Directional strength. The interesting case is disagreement with the sign. */
  const dir = digbala(chart, ruler);
  if (dir.plain) detail.push(dir.plain);
  for (const note of rulerStrength.notes) {
    if (!detail.includes(note) && note !== dir.plain) detail.push(note);
  }

  /* Bhava karaka. */
  const karaka = HOUSE_KARAKA[house];
  const karakaDig = fullDignity(chart, karaka);
  const karakaPlace = at(chart, karaka);
  if (karakaPlace) {
    /* "Over in children and creative work" while describing the 5th house, with
       the significator sitting in it, is the kind of line that tells a reader the
       software is not paying attention. */
    const karakaHere = karakaPlace.house === house;
    detail.push(
      karaka === ruler
        ? `${karaka} both runs this area and is its natural significator, which doubles its importance here.`
        : karakaHere
          ? `${karaka} is the natural significator for this part of life and it sits right here, which concentrates the matter rather than spreading it.`
          : `${karaka} is the natural significator for this part of life, and it is ${karakaDig.plain} over in ${HOUSE_AS_PLACE[karakaPlace.house]}.`,
    );
  }

  /* The same house read from the Moon. Standard practice, and previously absent. */
  const fromMoon = houseFromMoon(chart, house);
  if (fromMoon && fromMoon !== house) {
    const moonBindus = av.byHouse[fromMoon as HouseNumber];
    const agrees = (moonBindus >= 28) === (bindus >= 28);
    detail.push(
      agrees
        ? `Read from the Moon instead of the ascendant this lands on the ${ordinal(fromMoon)}, and the two readings agree - which makes this safer to state firmly.`
        : `Read from the Moon this lands on the ${ordinal(fromMoon)}, where the support is ${moonBindus >= 28 ? 'better' : 'worse'} than from the ascendant. Mixed signals: how it feels from the inside differs from how it works out.`,
    );
  }

  /* House 1 gets the specific lagna-lord line rather than a generic one. */
  if (house === 1) detail.unshift(LAGNA_LORD_IN[rulerPlace.house]);

  if (detail.length === 0) {
    detail.push(`Nothing else is pushing on this area, so it behaves the way ${ruler} behaves.`);
  }

  /* ------------------------------ technical ------------------------------- */

  const technical = [
    `${ordinal(house)} house, ${chart.houseSigns[house]}. Sarvashtakavarga ${bindus} bindus (${band}, average 28).`,
    `Lord ${ruler} in ${rulerPlace.sign} ${rulerPlace.degree.toFixed(1)}\u00b0, ${ordinal(rulerPlace.house)} house. Dignity: ${rulerDig.state}. Digbala ${(dir.value * 100).toFixed(0)}%.`,
    occupants.length
      ? `Occupied by ${occupants.map((o) => `${o.planet} ${o.degree.toFixed(1)}\u00b0`).join(', ')}.`
      : 'Unoccupied.',
    aspectors.length ? `Aspected by ${aspectors.join(', ')}.` : 'No aspects onto this house.',
    `${ruler} also rules ${housesRuledBy(ruler, chart.ascendantSign).filter((h) => h !== house).map(ordinal).join(' and ') || 'nothing else'}.`,
  ];

  /* ----------------------------- divisionals ------------------------------ */

  let divisional: string | undefined;
  if (house === 7) {
    const d9 = natal.charts.D9;
    const d9Seventh = d9.placements.filter((p) => p.house === 7);
    divisional =
      `Marriage is checked twice. In the D9, the chart used specifically for partnership, the ascendant falls in ${d9.ascendantSign}` +
      (d9Seventh.length
        ? ` and ${d9Seventh.map((p) => p.planet).join(', ')} sit in the partnership house there.`
        : ' and the partnership house is empty there, so it is read through its ruler.') +
      ' Agreement between the two charts is what makes a marriage reading safe to give.';
  } else if (house === 10) {
    const d10 = natal.charts.D10;
    const d10Tenth = d10.placements.filter((p) => p.house === 10);
    divisional =
      `Career is checked twice. In the D10, the chart used specifically for work, the ascendant falls in ${d10.ascendantSign}` +
      (d10Tenth.length
        ? ` and ${d10Tenth.map((p) => p.planet).join(', ')} sit in the career house there.`
        : ' and the career house is empty there.') +
      ' Where D1 and D10 disagree, the D10 usually describes the actual job and the D1 the reputation.';
  }

  /* The natural significator carries the house as much as its lord does, and
     leaving it out left empty houses with only one window in twenty years. */
  const carriers = [...new Set([ruler, karaka, ...occupants.map((o) => o.planet)])];

  return {
    house,
    bindus,
    strength,
    savBand: band,
    savStatement: savStatement(bindus),
    verdict,
    hook,
    detail,
    technical,
    yogas: houseYogas,
    windows: houseWindows(natal, carriers),
    divisional,
  };
}

export function readAllHouses(natal: NatalChart, yogas: Yoga[]): HouseReading[] {
  /* Computed once - ashtakavarga is chart-wide, not per house. */
  const av = computeAshtakavarga(natal.charts.D1);
  return Array.from({ length: 12 }, (_, i) => readHouse(natal, (i + 1) as HouseNumber, yogas, av));
}
