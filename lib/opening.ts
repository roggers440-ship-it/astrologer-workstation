import type { HouseNumber, NatalChart, PlanetName } from '@/types/astrology';
import { DUSTHANA_HOUSES, KENDRA_HOUSES, TRIKONA_HOUSES, housesRuledBy, lordOfHouse } from './vedic-constants';
import { isCombust, ordinal } from './rule-engine';
import { digbala, fullDignity, planetStrength } from './strength';
import { detectYogas } from './yogas';
import { findActive } from './dasha';
import { HOUSE_THEME } from './house-themes';

/**
 * What to say first.
 *
 * Every line here is a statement about the person, never about a planet. The
 * previous version produced things like "the Moon is uncomfortable by sign but
 * sits in the best house for it by direction" - true, and nobody has ever wanted
 * to hear that about their own life. The chart is the reasoning; the sentence is
 * about them.
 *
 * Three rules each line has to pass. It has to be in the second person. It has
 * to be answerable - they can say yes or no immediately, which is the whole
 * point of opening with it. And it has to be specific enough that it would be
 * wrong for most other people, or it is a horoscope.
 */

export interface Opening {
  line: string;
  /** The reasoning, for the astrologer. Never said aloud. */
  basis: string;
  pull: number;
  kind: 'behaviour' | 'current' | 'structure' | 'timing';
}

export interface OpeningOptions {
  now?: Date;
  /** Houses this reader may see, so an opener never comes out of a locked one. */
  allowedHouses?: HouseNumber[];
  timing?: boolean;
}

/** Where the lagna lord sits, said as a life rather than as a placement. */
const SELF_IN_HOUSE: Record<HouseNumber, string> = {
  1: 'You are more self-contained than people realise. You would rather solve something alone than explain it to someone who might help, and that has cost you more than it has saved you.',
  2: 'Your sense of yourself is tied up with what you have and where you came from. Money worries hit you harder than they hit other people, even when the numbers are fine.',
  3: 'You built yourself. Whatever you have came from your own effort rather than from anyone handing it to you, and you find it hard to accept help even now.',
  4: 'You need a home that feels settled before anything else in your life works. When your living situation is unstable, everything else quietly stops functioning.',
  5: 'You are known for something you make or something you know. Your identity is bound up in being good at a thing rather than in holding a position.',
  6: 'You define yourself against opposition. You are at your best when something is being difficult, and oddly unsettled when life goes smoothly.',
  7: 'You come to know yourself through other people. Relationships are where your life actually happens, and being without one leaves you less sure who you are.',
  8: 'You have already been through something that changed you. You are not the person you would have been, and you know it.',
  9: 'You need to believe in what you are doing. You cannot work for something you do not respect, however good the money is.',
  10: 'People know you by what you do. Your work and your identity are the same thing, which is a strength until the work stops.',
  11: 'You get further through people than through effort. Your network has done more for you than your CV, and you may underrate that.',
  12: 'Part of you is always somewhere else. You need solitude the way other people need company, and you have probably been called distant for it.',
};

export function openingLines(natal: NatalChart, options: OpeningOptions | Date = {}): Opening[] {
  const opts: OpeningOptions = options instanceof Date ? { now: options } : options;
  const now = opts.now ?? new Date();
  const allowed = opts.allowedHouses;
  const timingAllowed = opts.timing ?? true;

  const chart = natal.charts.D1;
  const out: Opening[] = [];
  const at = (p: PlanetName) => chart.placements.find((x) => x.planet === p);
  const visible = (h: HouseNumber) => !allowed || allowed.includes(h);

  const lagnaLord = lordOfHouse(1, chart.ascendantSign);
  const llPlace = at(lagnaLord);
  const moon = at('Moon');

  /* --- who they are, from where the chart's ruler sits ---------------------- */
  if (llPlace && visible(llPlace.house)) {
    out.push({
      line: SELF_IN_HOUSE[llPlace.house],
      basis: `${lagnaLord} rules the ascendant and sits in the ${ordinal(llPlace.house)}.`,
      pull: 94,
      kind: 'behaviour',
    });
  }

  /* --- the planet that runs them is also sitting in a house it complicates -- */
  for (const p of chart.placements) {
    if (p.planet === lagnaLord || !visible(p.house)) continue;
    if (!housesRuledBy(p.planet, chart.ascendantSign).includes(1 as HouseNumber)) continue;

    out.push({
      line:
        `Whatever is difficult about ${HOUSE_THEME[p.house].split(',')[0]} in your life, you are the one causing it. ` +
        'Not through fault - you hold a higher standard there than anyone around you does, and you turn things down that other people would have accepted years ago.',
      basis: `${p.planet} rules the ascendant and occupies the ${ordinal(p.house)}.`,
      pull: 96,
      kind: 'behaviour',
    });
  }

  /* --- capability that does not look like capability ------------------------ */
  for (const p of chart.placements) {
    if (['Rahu', 'Ketu'].includes(p.planet) || !visible(p.house)) continue;
    const dig = fullDignity(chart, p.planet);
    const dir = digbala(chart, p.planet);

    if (dig.score <= -2 && dir.value >= 0.75) {
      out.push({
        line:
          'You are consistently underestimated, and you have half accepted the estimate. ' +
          'On paper you look like the wrong person for the things you turn out to be good at, so you get overlooked in the room and then relied on afterwards.',
        basis: `${p.planet} is ${dig.plain} but holds ${Math.round(dir.value * 100)}% directional strength in the ${ordinal(p.house)}.`,
        pull: 92,
        kind: 'behaviour',
      });
      break;
    }

    if (dig.score >= 3 && dir.value <= 0.25) {
      out.push({
        line:
          'You have more ability than your life currently shows, and that gap is the thing that frustrates you most. ' +
          'It is not a question of working harder - you are in the wrong position for what you can actually do.',
        basis: `${p.planet} is ${dig.plain} but only ${Math.round(dir.value * 100)}% directionally strong in the ${ordinal(p.house)}.`,
        pull: 90,
        kind: 'behaviour',
      });
      break;
    }
  }

  /* --- how they carry things ----------------------------------------------- */
  if (moon && visible(moon.house)) {
    const withMoon = chart.placements.filter((p) => p.planet !== 'Moon' && p.house === moon.house).map((p) => p.planet);
    const moonStrength = planetStrength(chart, 'Moon');

    if (withMoon.includes('Saturn')) {
      out.push({
        line:
          'You carry things quietly and for a long time. People assume you are fine because you never say otherwise, and you have let them assume it because saying otherwise feels like a complaint.',
        basis: 'Saturn sits with the Moon.',
        pull: 93,
        kind: 'behaviour',
      });
    } else if (withMoon.includes('Rahu') || withMoon.includes('Ketu')) {
      out.push({
        line:
          'Your mind does not switch off at night. The thing you cannot stop turning over is rarely the thing that is actually wrong, and you know that and it does not help.',
        basis: `${withMoon.find((p) => p === 'Rahu' || p === 'Ketu')} sits with the Moon.`,
        pull: 91,
        kind: 'behaviour',
      });
    } else if (moonStrength.net >= 3) {
      out.push({
        line:
          'You are steadier than the people around you, and they use that. You are the one others come to when something has gone wrong, which is a compliment that also costs you something.',
        basis: `The Moon is ${moonStrength.dignityPlain}.`,
        pull: 88,
        kind: 'behaviour',
      });
    }
  }

  /* --- something they were handed, and something they were not -------------- */
  const classical = chart.placements.filter((p) => !['Rahu', 'Ketu'].includes(p.planet));
  const strongest = [...classical].sort((a, b) => fullDignity(chart, b.planet).score - fullDignity(chart, a.planet).score)[0];

  if (strongest && fullDignity(chart, strongest.planet).score >= 4 && visible(strongest.house)) {
    const GIFT: Record<string, string> = {
      Sun: 'People follow you without you having to ask, and you have never entirely understood why.',
      Moon: 'You read a room before anyone speaks, and you have been right about people that others got wrong.',
      Mars: 'You act while everyone else is still deciding. It has made you look reckless and it has also been why things got done.',
      Mercury: 'You can make a complicated thing simple, which is rarer than you think and worth more than you charge for it.',
      Jupiter: 'People bring you decisions before they make them. Your judgement is the thing others borrow.',
      Venus: 'People like you before you have done anything to earn it, and doors have opened on that alone.',
      Saturn: 'You outlast everyone. Not the fastest, not the loudest, still standing when the others have gone.',
    };
    if (GIFT[strongest.planet]) {
      out.push({
        line: GIFT[strongest.planet],
        basis: `${strongest.planet} is the best-placed planet in the chart, in the ${ordinal(strongest.house)}.`,
        pull: 87,
        kind: 'behaviour',
      });
    }
  }

  /* --- what a combust ruler does to a life ---------------------------------- */
  if (isCombust(chart, lagnaLord) && llPlace && visible(llPlace.house)) {
    out.push({
      line:
        'You put being seen ahead of being comfortable, and it has cost you. When the two conflict, you choose the version of yourself that other people can see, every time.',
      basis: `${lagnaLord} rules the ascendant and is combust.`,
      pull: 89,
      kind: 'behaviour',
    });
  }

  /* --- the recurring lesson ------------------------------------------------- */
  const ak = [...classical].sort((a, b) => b.degree - a.degree)[0];
  if (ak && visible(ak.house)) {
    out.push({
      line:
        `The same problem keeps finding you through ${HOUSE_THEME[ak.house].split(',')[0]}. ` +
        'Different people, different circumstances, recognisably the same shape - and you have noticed the pattern without being able to break it.',
      basis: `${ak.planet} holds the highest degree, in the ${ordinal(ak.house)}.`,
      pull: 86,
      kind: 'behaviour',
    });
  }

  /* --- what is happening to them right now ---------------------------------- */
  if (timingAllowed) {
    const active = findActive(natal.dashaTree, now);
    if (active?.antar) {
      const owns = housesRuledBy(active.antar.lord, chart.ascendantSign).filter(visible);
      if (owns.length > 0) {
        const ends = new Date(active.antar.end).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        out.push({
          line:
            `Something around ${HOUSE_THEME[owns[0]].split(',')[0]} has been unsettled for a while now, and it runs until about ${ends}. ` +
            'It is a season rather than a fault, which matters because you have probably been treating it as a fault.',
          basis: `${active.maha.lord}-${active.antar.lord} sub-period; ${active.antar.lord} rules the ${owns.map(ordinal).join(' and ')}.`,
          pull: 85,
          kind: 'current',
        });
      }
    }
  }

  const seen = new Set<string>();
  return out
    .filter((o) => {
      const key = o.line.slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.pull - a.pull)
    .slice(0, 4);
}
