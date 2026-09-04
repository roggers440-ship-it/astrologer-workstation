import type { ChartData, HouseNumber, PlanetName, SignName } from '@/types/astrology';
import {
  DUSTHANA_HOUSES, EXALTATION, KENDRA_HOUSES, TRIKONA_HOUSES,
  dignityOf, housesRuledBy, lordOfHouse, SIGN_LORD, signIndex,
} from './vedic-constants';
import { hasExchange, houseDistance, isCombust, mutualAspect, ordinal } from './rule-engine';

/**
 * Yoga detection.
 *
 * Named combinations are patterns to detect, not rules to hand-write - which is
 * why they live here rather than in the rule corpus. A detector returns the
 * planets and houses involved so the reading can show its working.
 *
 * THREE REGISTERS, and the distinction is the point:
 *
 *   classicalClaim - what the tradition asserts, in its own register. These are
 *     summaries of the classical claim, NOT verbatim translations. Verse
 *     numbering differs between editions and recensions, so inventing precise
 *     citations would be worse than useless.
 *   literalMeaning - what that meant in the society that wrote it.
 *   modernReading  - the transposition a practitioner would actually deliver.
 *
 * PROVENANCE is tracked because it is not all one thing. Gajakesari is in
 * Phaladeepika and Saravali. Kuja dosha is late and regional, absent from BPHS.
 * Kalasarpa is a twentieth-century invention with no classical basis at all.
 * Presenting the three as equally authoritative misleads the practitioner.
 */

export type YogaCategory =
  | 'Mahapurusha' | 'Raja' | 'Dhana' | 'Exchange' | 'Lunar'
  | 'Solar' | 'Vipareeta' | 'Learning' | 'Affliction';

export type Provenance = 'classical' | 'medieval' | 'modern';

export interface Yoga {
  id: string;
  name: string;
  sanskrit?: string;
  category: YogaCategory;
  source: string;
  provenance: Provenance;
  classicalClaim: string;
  literalMeaning: string;
  modernReading: string;
  participants: PlanetName[];
  houses: HouseNumber[];
  strength: 'Strong' | 'Moderate' | 'Weak';
  /** Set when something in the chart undercuts the yoga. */
  caveat?: string;
  topicIds: number[];
}

const BENEFICS: PlanetName[] = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
const MALEFICS: PlanetName[] = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];

const at = (c: ChartData, p: PlanetName) => c.placements.find((x) => x.planet === p);

/** "Jupiter, Venus and Mercury" rather than "Jupiter and Venus and Mercury". */
const nameList = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0];
const houseOf = (c: ChartData, p: PlanetName) => at(c, p)?.house;
const inKendra = (h?: HouseNumber) => h !== undefined && KENDRA_HOUSES.includes(h);
const isStrong = (c: ChartData, p: PlanetName) => {
  const d = at(c, p);
  if (!d) return false;
  const dig = dignityOf(p, d.sign, d.degree);
  return dig === 'Exalted' || dig === 'OwnSign' || dig === 'Moolatrikona';
};

/* --------------------------- panch mahapurusha ---------------------------- */

const MAHAPURUSHA: { planet: PlanetName; name: string; sanskrit: string; claim: string; literal: string; modern: string }[] = [
  {
    planet: 'Mars', name: 'Ruchaka', sanskrit: 'Ruchaka Yoga',
    claim: 'The native is a commander of armies, of fierce countenance, victorious over enemies, ruler of lands, with a body marked by wounds.',
    literal: 'A military caste description: physical courage, command over men, and a career made through conflict and conquest.',
    modern: 'Physical authority and competitive drive. Does well where there is something to fight - surgery, litigation, defence, sport, sales, engineering under pressure. Poorly suited to roles with no adversary.',
  },
  {
    planet: 'Mercury', name: 'Bhadra', sanskrit: 'Bhadra Yoga',
    claim: 'The native is learned in all sciences, of pleasing speech, lion-like in form, and lives long.',
    literal: 'The scholar-administrator: literate in an era when literacy itself conferred status, employed in courts and counting-houses.',
    modern: 'Analytical intelligence that converts to income. Writing, negotiation, teaching, trade, anything where the work is the explaining. The weakness is depth - breadth comes easily, commitment does not.',
  },
  {
    planet: 'Jupiter', name: 'Hamsa', sanskrit: 'Hamsa Yoga',
    claim: 'The native is honoured by kings, of righteous conduct, beautiful of form, with fair limbs and a voice of authority in assembly.',
    literal: 'The brahmin advisor: moral standing that produced material patronage, since counsel to power was itself a livelihood.',
    modern: 'Advisory authority. People come for judgement rather than for execution. Teaching, law, medicine, consulting, anything where being trusted is the asset. Watch for overcommitment - saying yes costs this person nothing.',
  },
  {
    planet: 'Venus', name: 'Malavya', sanskrit: 'Malavya Yoga',
    claim: 'The native possesses conveyances, wife and sons, wealth and fame, enjoys all pleasures, and is of splendid appearance.',
    literal: 'Household prosperity in a society where vehicles, spouse and heirs were the visible measures of arrival.',
    modern: 'Aesthetic and relational strength. Comfort accumulates rather than being chased. Design, luxury, hospitality, diplomacy, the arts. The risk is that comfort becomes the ceiling.',
  },
  {
    planet: 'Saturn', name: 'Sasa', sanskrit: 'Sasa Yoga',
    claim: 'The native commands villages, is a leader of armies or of men of low birth, acquires the wealth of others, and is hard of disposition.',
    literal: 'Authority over labour and land - an overseer, not an aristocrat. Note that the classical description is frankly unflattering.',
    modern: 'Authority built slowly and held long. Systems, infrastructure, real estate, operations, government. Arrives late and outlasts everyone. The classical note about hardness is worth taking seriously as a warning about how this person is experienced by subordinates.',
  },
];

function mahapurushaYogas(chart: ChartData): Yoga[] {
  const out: Yoga[] = [];

  for (const m of MAHAPURUSHA) {
    const p = at(chart, m.planet);
    if (!p) continue;

    const dignity = dignityOf(m.planet, p.sign, p.degree);
    const qualifies = ['Exalted', 'OwnSign', 'Moolatrikona'].includes(dignity) && inKendra(p.house);
    if (!qualifies) continue;

    const combust = isCombust(chart, m.planet);

    out.push({
      id: `mahapurusha.${m.name.toLowerCase()}`,
      name: `${m.name} Yoga`,
      sanskrit: m.sanskrit,
      category: 'Mahapurusha',
      source: 'Brihat Parashara Hora Shastra; Phaladeepika, chapter on yogas',
      provenance: 'classical',
      classicalClaim: m.claim,
      literalMeaning: m.literal,
      modernReading: m.modern,
      participants: [m.planet],
      houses: [p.house],
      strength: dignity === 'Exalted' ? 'Strong' : 'Moderate',
      caveat: combust
        ? `${m.planet} is combust, which most authorities treat as substantially reducing the yoga.`
        : undefined,
      topicIds: [11, 17, 1],
    });
  }

  return out;
}

/* ------------------------------- exchanges -------------------------------- */

/**
 * Parivartana, in the three grades the texts distinguish. The grade matters more
 * than the fact of the exchange: Maha is a genuine strength, Dainya is a
 * liability, and reporting them identically loses the whole distinction.
 */
function parivartanaYogas(chart: ChartData): Yoga[] {
  const out: Yoga[] = [];
  const seen = new Set<string>();

  for (let a = 1; a <= 12; a++) {
    for (let b = a + 1; b <= 12; b++) {
      const ha = a as HouseNumber;
      const hb = b as HouseNumber;
      const la = lordOfHouse(ha, chart.ascendantSign);
      const lb = lordOfHouse(hb, chart.ascendantSign);
      if (la === lb || !hasExchange(chart, la, lb)) continue;

      const key = [la, lb].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);

      /*
       * A planet ruling two houses makes one exchange satisfy several house
       * pairs at once. Reporting only the first pair found is how a chart ends up
       * labelled a mere Dainya when the same exchange is also linking the 9th and
       * 10th lords - so collect every pair, then grade by the best of them.
       */
      const pairs: [HouseNumber, HouseNumber][] = [];
      for (const x of housesRuledBy(la, chart.ascendantSign)) {
        for (const y of housesRuledBy(lb, chart.ascendantSign)) {
          pairs.push(x < y ? [x, y] : [y, x]);
        }
      }

      const gradeOf = (pair: [HouseNumber, HouseNumber]) =>
        pair.some((h) => DUSTHANA_HOUSES.includes(h)) ? 'Dainya'
        : pair.includes(3 as HouseNumber) ? 'Khala'
        : 'Maha';

      /*
       * Which pair leads. A Maha pair always wins; otherwise the pair touching the
       * most consequential house does, and the lagna outranks everything. Taking
       * whichever pair happened to be generated first produced a chart headlined
       * "Khala" while three of its four pairs were Dainya.
       */
      const priority = (pair: [HouseNumber, HouseNumber]) => {
        if (pair.includes(1 as HouseNumber)) return 3;
        if (pair.some((h) => [9, 10, 5].includes(h))) return 2;
        return 1;
      };

      /* Among pairs of equal consequence, the harsher grade leads. An exchange
         forming both Khala across the 1st/3rd and Dainya across the 1st/6th is a
         Dainya chart - headlining the milder pair buries the thing worth saying. */
      const severity = (pair: [HouseNumber, HouseNumber]) =>
        ({ Dainya: 3, Khala: 2, Maha: 1 } as const)[gradeOf(pair)];

      const best =
        pairs.find((pr) => gradeOf(pr) === 'Maha') ??
        [...pairs].sort((a, b) => priority(b) - priority(a) || severity(b) - severity(a))[0];

      const grade = gradeOf(best);
      const grades = pairs.map(gradeOf);
      const mixed = new Set(grades).size > 1;

      const joinList = (items: string[]) =>
        items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0];

      const pairLabel = joinList(pairs.map(([x, y]) => `${ordinal(x)}/${ordinal(y)}`));

      out.push({
        id: `parivartana.${la}.${lb}`,
        name: `${grade} Parivartana, ${ordinal(best[0])} and ${ordinal(best[1])} lords`,
        sanskrit: 'Parivartana Yoga',
        category: 'Exchange',
        source: 'Phaladeepika, chapter on yogas; Jataka Parijata',
        provenance: 'classical',
        classicalClaim:
          grade === 'Maha'
            ? 'The native obtains wealth, lands and the favour of rulers; what is sought in one quarter is supplied from another.'
            : grade === 'Dainya'
              ? 'The native is troubled by enemies and debt, of wandering mind, and suffers reversal after gain.'
              : 'The native is of mixed character, sometimes generous and sometimes wicked, prospering by irregular means.',
        literalMeaning:
          grade === 'Maha'
            ? 'The two houses trade places, each supplying the other. In a land economy this described estates and patronage arriving together.'
            : grade === 'Dainya'
              ? 'A house of difficulty is wired directly into a functioning house, so the difficulty is not contained.'
              : 'The 3rd, the house of self-interested effort, is fused to another domain - hence the moral ambivalence in the text.',
        modernReading:
          `${la} and ${lb} each occupy the other's sign, which links ${pairLabel}. ` +
          (grade === 'Maha'
            ? `Progress in one of these houses shows up reliably in the other, and the periods of ${la} and ${lb} are when that happens.`
            : grade === 'Dainya'
              ? 'Gains here come attached to costs, because a house of difficulty is fused to a working one. Name the cost explicitly rather than reading it as a straight benefit.'
              : 'Results arrive by unconventional routes. The person usually knows this about themselves already.') +
          (mixed
            ? ' Because both planets rule two houses each, this single exchange carries several readings at once - work through the pairs rather than taking one label.'
            : ''),
        participants: [la, lb],
        houses: [...new Set(pairs.flat())] as HouseNumber[],
        strength: grade === 'Maha' ? 'Strong' : 'Moderate',
        caveat: mixed
          ? `The same exchange also forms ${joinList(
              pairs
                .filter((pr) => gradeOf(pr) !== grade)
                .map(([x, y]) => `${gradeOf([x, y])} across ${ordinal(x)}/${ordinal(y)}`),
            )}.`
          : undefined,
        topicIds: grade === 'Maha' ? [2, 15, 1] : [13, 16],
      });
    }
  }

  return out;
}

/* -------------------------- raja and dhana yogas -------------------------- */

function relationship(chart: ChartData, a: PlanetName, b: PlanetName): string | null {
  if (a === b) return null;
  const pa = at(chart, a);
  const pb = at(chart, b);
  if (!pa || !pb) return null;

  if (hasExchange(chart, a, b)) return 'exchange';
  if (pa.house === pb.house) return 'conjunction';
  if (mutualAspect(chart, a, b)) return 'mutual aspect';
  return null;
}

function rajaYogas(chart: ChartData): Yoga[] {
  const out: Yoga[] = [];
  const seen = new Set<string>();

  for (const k of KENDRA_HOUSES) {
    for (const t of TRIKONA_HOUSES) {
      if (k === t) continue;
      const lk = lordOfHouse(k, chart.ascendantSign);
      const lt = lordOfHouse(t, chart.ascendantSign);
      const rel = relationship(chart, lk, lt);
      if (!rel) continue;

      const key = [lk, lt].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);

      const where = at(chart, lk)!.house;
      const strongK = isStrong(chart, lk);
      const strongT = isStrong(chart, lt);
      const both = strongK && strongT;

      /*
       * Name which lord is weak rather than asserting neither is strong. The old
       * wording claimed "neither lord is in dignity" whenever they were not both
       * strong, which contradicted the chart outright on any horoscope with one
       * exalted lord - understating the yoga in exactly the charts where it
       * matters most.
       */
      const dignityCaveat = both
        ? undefined
        : strongK || strongT
          ? `${strongK ? lt : lk} is not in dignity, so this delivers less than the classical description implies. ${strongK ? lk : lt} carries it alone.`
          : `Neither ${lk} nor ${lt} is in dignity, so this stays closer to potential than to the classical description.`;

      /* Dharma is the 9th and karma the 10th. A 1st-and-9th link is a raja yoga
         but not this one, and mislabelling it puts a name in the practitioner's
         mouth that the tradition does not support. */
      const dharmaKarma = k === 10 && t === 9;

      out.push({
        id: `raja.${k}.${t}`,
        name: dharmaKarma ? 'Dharma-Karmadhipati Yoga' : `Raja Yoga, ${ordinal(k)} and ${ordinal(t)} lords`,
        sanskrit: dharmaKarma ? 'Dharma-Karmadhipati Yoga' : 'Raja Yoga',
        category: 'Raja',
        source: 'Brihat Parashara Hora Shastra, chapters on raja yoga',
        provenance: 'classical',
        classicalClaim:
          'The native becomes a king, or equal to a king; he is honoured by rulers, commands wealth and retinue, and his fame spreads in all directions.',
        literalMeaning:
          'Literal kingship for a few; for everyone else the texts intend elevation above the station one was born into - the pre-modern description of social mobility, which was rare enough to be worth a named combination.',
        modernReading:
          `The ${ordinal(k)} lord and the ${ordinal(t)} lord are linked by ${rel}${where ? ` in the ${ordinal(where)}` : ''}. ` +
          'Real authority in whatever field this person enters, and status that outruns their starting position. It needs a dasha of one of the two planets to actually fire - without that it stays potential.',
        participants: [lk, lt],
        houses: [k, t],
        strength: rel === 'exchange' || both ? 'Strong' : 'Moderate',
        caveat: dignityCaveat,
        topicIds: [1, 15, 16],
      });
    }
  }

  return out;
}

function dhanaYogas(chart: ChartData): Yoga[] {
  const out: Yoga[] = [];
  const wealthHouses: HouseNumber[] = [2, 5, 9, 11];
  const seen = new Set<string>();

  for (const a of wealthHouses) {
    for (const b of wealthHouses) {
      if (a >= b) continue;
      const la = lordOfHouse(a, chart.ascendantSign);
      const lb = lordOfHouse(b, chart.ascendantSign);
      const rel = relationship(chart, la, lb);
      if (!rel) continue;

      const key = [la, lb].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        id: `dhana.${a}.${b}`,
        name: `Dhana Yoga, ${ordinal(a)} and ${ordinal(b)} lords`,
        sanskrit: 'Dhana Yoga',
        category: 'Dhana',
        source: 'Brihat Parashara Hora Shastra, chapter on dhana yogas; Saravali',
        provenance: 'classical',
        classicalClaim:
          'The native is possessed of much wealth, of gold and grain, of horses and elephants, and is charitable and famous.',
        literalMeaning:
          'Horses and elephants were capital goods, not luxuries - the classical measure of liquid wealth held in productive assets.',
        modernReading:
          `The ${ordinal(a)} and ${ordinal(b)} lords are connected by ${rel}. ` +
          (a === 2 && b === 11
            ? 'Earnings convert into holdings rather than being spent. The likely shape is repeat or network income rather than a single windfall.'
            : 'Money arrives through the significations of both houses at once, and the periods of these two planets are when it moves.'),
        participants: [la, lb],
        houses: [a, b],
        strength: rel === 'exchange' ? 'Strong' : 'Moderate',
        topicIds: [2, 15],
      });
    }
  }

  return out;
}

/* ------------------------------- vipareeta -------------------------------- */

const VIPAREETA: Record<number, { name: string; note: string; reading: string }> = {
  6: {
    name: 'Harsha',
    note: 'enemies, debt and illness defeat themselves',
    reading:
      'Opposition tends to collapse without being fought. Useful to say to someone currently in a dispute: outlasting is the strategy here, not confrontation. Health and debt follow the same pattern - they resolve slowly rather than dramatically.',
  },
  8: {
    name: 'Sarala',
    note: 'upheaval arrives but does not destroy',
    reading:
      'Genuine crises happen and are survived. The person tends to come out of them structurally better off, which is not the same as enjoying them. Worth naming because people with this often assume the difficulty means they are doing something wrong.',
  },
  12: {
    name: 'Vimala',
    note: 'loss and expenditure stay contained',
    reading:
      'Money does not leak. Expenses stay proportionate and the person is rarely caught out by them - unusual enough to be worth mentioning, since most charts are not this contained. It also supports a private, independent working life.',
  },
};

function vipareetaYogas(chart: ChartData): Yoga[] {
  const out: Yoga[] = [];

  for (const h of DUSTHANA_HOUSES) {
    const lord = lordOfHouse(h, chart.ascendantSign);
    const place = at(chart, lord);
    if (!place || !DUSTHANA_HOUSES.includes(place.house)) continue;

    const v = VIPAREETA[h];
    out.push({
      id: `vipareeta.${h}`,
      name: `${v.name} Yoga`,
      sanskrit: 'Vipareeta Raja Yoga',
      category: 'Vipareeta',
      source: 'Brihat Parashara Hora Shastra, chapter on vipareeta raja yoga',
      provenance: 'classical',
      classicalClaim:
        'The native rises through the fall of his rivals, gains by the misfortune of others, and prospers where others are ruined.',
      literalMeaning:
        'A house of harm, confined to another house of harm, cannot reach the functioning parts of the chart - so the damage turns inward and the native is spared.',
      modernReading: `The ${ordinal(h)} lord sits in the ${ordinal(place.house)}, so ${v.note}. ${v.reading}`,
      participants: [lord],
      houses: [...new Set([h, place.house])] as HouseNumber[],
      strength: 'Moderate',
      topicIds: [13, 17, 15],
    });
  }

  return out;
}

/* --------------------------- lunar and solar ------------------------------ */

function lunarYogas(chart: ChartData): Yoga[] {
  const out: Yoga[] = [];
  const moon = at(chart, 'Moon');
  if (!moon) return out;

  const companions = (distance: number) =>
    chart.placements.filter(
      (p) => !['Moon', 'Sun', 'Rahu', 'Ketu'].includes(p.planet) &&
        houseDistance(moon.house, p.house) === distance,
    );

  const second = companions(2);
  const twelfth = companions(12);
  const withMoon = chart.placements.filter(
    (p) => p.planet !== 'Moon' && !['Rahu', 'Ketu'].includes(p.planet) && p.house === moon.house,
  );

  if (second.length === 0 && twelfth.length === 0 && withMoon.length === 0) {
    out.push({
      id: 'lunar.kemadruma',
      name: 'Kemadruma Yoga',
      sanskrit: 'Kemadruma Yoga',
      category: 'Lunar',
      source: 'Brihat Parashara Hora Shastra; Saravali',
      provenance: 'classical',
      classicalClaim:
        'The native is destitute, dependent on others for food, of sorrowful mind, wandering and without support, though born in a good family.',
      literalMeaning:
        'The harshest of the common lunar yogas. The Moon standing entirely alone was read as a person without kin or patron - social isolation in a society where that meant material destitution.',
      modernReading:
        'The Moon has no planetary company on either side. Reads as emotional self-reliance rather than poverty: support has to be built deliberately because it does not arrive by default. Most authorities cancel this if the Moon is in a kendra from the lagna or aspected by a benefic, so check that before giving it any weight.',
      participants: ['Moon'],
      houses: [moon.house],
      strength: inKendra(moon.house) ? 'Weak' : 'Moderate',
      caveat: inKendra(moon.house)
        ? 'The Moon is in a kendra, which the standard cancellation rules treat as neutralising this.'
        : undefined,
      topicIds: [19, 20, 11],
    });
  }

  if (second.length > 0 && twelfth.length > 0) {
    out.push({
      id: 'lunar.durudhura',
      name: 'Durudhura Yoga',
      sanskrit: 'Durudhura Yoga',
      category: 'Lunar',
      source: 'Saravali; Brihat Jataka',
      provenance: 'classical',
      classicalClaim: 'The native is wealthy, possessed of vehicles and servants, generous, and enjoys comforts throughout life.',
      literalMeaning: 'The Moon flanked on both sides was read as a person surrounded by support and resources.',
      modernReading: 'The Moon has planets on both sides. Support tends to be present when needed, and this person is rarely without options. A steadying factor across the whole chart.',
      participants: ['Moon', ...second.map((p) => p.planet), ...twelfth.map((p) => p.planet)],
      houses: [moon.house],
      strength: 'Moderate',
      topicIds: [2, 6, 15],
    });
  }

  const jupiter = at(chart, 'Jupiter');
  if (jupiter && [1, 4, 7, 10].includes(houseDistance(moon.house, jupiter.house))) {
    out.push({
      id: 'lunar.gajakesari',
      name: 'Gajakesari Yoga',
      sanskrit: 'Gajakesari Yoga',
      category: 'Lunar',
      source: 'Phaladeepika, chapter on yogas; Saravali',
      provenance: 'classical',
      classicalClaim:
        'The native is renowned, of steady intellect, favoured by kings, and his fame endures long after his death.',
      literalMeaning:
        'The elephant-and-lion combination: Jupiter\u2019s counsel supporting the Moon\u2019s mind. Read as durable reputation rather than sudden fortune.',
      modernReading:
        `Jupiter is ${ordinal(houseDistance(moon.house, jupiter.house))} from the Moon. Judgement that people trust, and a reputation that compounds slowly. This is a genuinely common yoga - roughly one chart in three - so it is worth mentioning but not worth leading with.`,
      participants: ['Moon', 'Jupiter'],
      houses: [moon.house, jupiter.house],
      strength: isStrong(chart, 'Jupiter') ? 'Moderate' : 'Weak',
      caveat: 'Occurs in about a third of all charts. Weight accordingly.',
      topicIds: [12, 15, 11],
    });
  }

  return out;
}

function solarYogas(chart: ChartData): Yoga[] {
  const sun = at(chart, 'Sun');
  const mercury = at(chart, 'Mercury');
  if (!sun || !mercury || sun.house !== mercury.house) return [];

  const combust = isCombust(chart, 'Mercury');

  return [{
    id: 'solar.budha-aditya',
    name: 'Budha-Aditya Yoga',
    sanskrit: 'Budha-Aditya Yoga',
    category: 'Solar',
    source: 'Saravali; Phaladeepika',
    provenance: 'classical',
    classicalClaim: 'The native is skilled in all branches of learning, of great intelligence, respected in assemblies, and wealthy.',
    literalMeaning: 'Intellect joined to authority - the learned man with the ear of power, which in a court society was the highest professional attainment available.',
    modernReading:
      `Sun and Mercury together in the ${ordinal(sun.house)}. Fast, confident thinking and an identity built on being right. Excellent analyst; the question worth asking is whether they can hear disagreement.` +
      (combust ? ' Mercury is combust here, which many authorities hold cancels the yoga outright.' : ''),
    participants: ['Sun', 'Mercury'],
    houses: [sun.house],
    strength: combust ? 'Weak' : 'Moderate',
    caveat: combust
      ? `Mercury is within the combustion orb of the Sun. Schools split on whether this destroys the yoga or merely weakens it.`
      : undefined,
    topicIds: [3, 12, 14],
  }];
}

/* ------------------------------ afflictions ------------------------------- */

function afflictionYogas(chart: ChartData): Yoga[] {
  const out: Yoga[] = [];

  const eleventh = lordOfHouse(11, chart.ascendantSign);
  const place = at(chart, eleventh);
  if (place && DUSTHANA_HOUSES.includes(place.house)) {
    out.push({
      id: 'affliction.daridra',
      name: 'Daridra Yoga',
      sanskrit: 'Daridra Yoga',
      category: 'Affliction',
      source: 'Brihat Parashara Hora Shastra, chapter on nabhasa and arishta yogas',
      provenance: 'classical',
      classicalClaim: 'The native suffers poverty, is burdened by debt, performs mean work, and is despised even by his own people.',
      literalMeaning:
        'Written for a society with no social mobility and no safety net, where the loss of gains meant actual destitution. The severity of the language reflects the stakes of the period, not the stakes now.',
      modernReading:
        `The 11th lord sits in the ${ordinal(place.house)}, so gains leak into a house of difficulty. Read as income that struggles to convert into savings - money arrives and goes somewhere. Practical rather than fated: the fix is structural, and this is worth raising as a planning conversation, not a prophecy.`,
      participants: [eleventh],
      houses: [11, place.house],
      strength: 'Moderate',
      caveat: 'The classical phrasing is far harsher than the observable effect. Do not deliver it literally.',
      topicIds: [2, 16],
    });
  }

  /* Kuja dosha: absent from BPHS. Later, and strongly regional in application. */
  const mars = at(chart, 'Mars');
  if (mars && [1, 2, 4, 7, 8, 12].includes(mars.house)) {
    out.push({
      id: 'affliction.kuja-dosha',
      name: 'Kuja Dosha',
      sanskrit: 'Kuja Dosha / Mangal Dosha',
      category: 'Affliction',
      source: 'Later compendia and regional practice; not found in Brihat Parashara Hora Shastra',
      provenance: 'medieval',
      classicalClaim: 'Where Mars occupies these houses, the union is destroyed and the partner does not survive it.',
      literalMeaning:
        'A marriage-broking rule from a period of arranged matches and high mortality, used to reject prospective alliances rather than to describe a person.',
      modernReading:
        `Mars in the ${ordinal(mars.house)}. Reads as friction and heat in close partnership - arguments that flare and cool fast. Useful as a conversation about conflict style. Not useful as a verdict on compatibility, and the classical remedy culture around it causes more distress than the placement does.`,
      participants: ['Mars'],
      houses: [mars.house],
      strength: 'Weak',
      caveat: 'Not classical. Absent from BPHS, and applied very differently between north and south Indian practice.',
      topicIds: [4],
    });
  }

  /* Kalasarpa: twentieth century. Included because clients ask about it. */
  const rahu = at(chart, 'Rahu');
  const ketu = at(chart, 'Ketu');
  if (rahu && ketu) {
    const rl = rahu.longitude;
    const arc = (lon: number) => (((lon - rl) % 360) + 360) % 360;
    const others = chart.placements.filter((p) => !['Rahu', 'Ketu'].includes(p.planet));
    const allOneSide = others.every((p) => arc(p.longitude) < 180) || others.every((p) => arc(p.longitude) > 180);

    if (allOneSide) {
      out.push({
        id: 'affliction.kalasarpa',
        name: 'Kalasarpa Yoga',
        category: 'Affliction',
        source: 'Twentieth-century popular astrology. No classical source.',
        provenance: 'modern',
        classicalClaim: 'None. This combination does not appear in any pre-modern text.',
        literalMeaning:
          'A modern invention, popularised through print astrology and remedial services. Its prominence is commercial rather than textual.',
        modernReading:
          'Every planet falls on one side of the nodal axis. Clients will have read alarming things about this online, so it is worth being able to say plainly that it has no classical basis and that the chart should be judged on its actual yogas. Naming it and dismissing it is usually more reassuring than not mentioning it.',
        participants: ['Rahu', 'Ketu'],
        houses: [rahu.house, ketu.house],
        strength: 'Weak',
        caveat: 'No classical basis. Listed so you can address it if the client raises it.',
        topicIds: [16, 18],
      });
    }
  }

  return out;
}

/* -------------------------------- learning -------------------------------- */

function learningYogas(chart: ChartData): Yoga[] {
  const good: HouseNumber[] = [...KENDRA_HOUSES, ...TRIKONA_HOUSES, 2 as HouseNumber];
  const trio: PlanetName[] = ['Jupiter', 'Venus', 'Mercury'];
  const placed = trio.map((p) => at(chart, p));

  if (!placed.every((p) => p && good.includes(p.house))) return [];

  return [{
    id: 'learning.saraswati',
    name: 'Saraswati Yoga',
    sanskrit: 'Saraswati Yoga',
    category: 'Learning',
    source: 'Phaladeepika, chapter on yogas',
    provenance: 'classical',
    classicalClaim:
      'The native is skilled in poetry and drama, learned in grammar and the sciences, celebrated among the learned, and honoured by kings.',
    literalMeaning: 'The complete scholarly education of the period: language, logic, and the arts, held together.',
    modernReading:
      'Jupiter, Venus and Mercury all fall in kendras, trikonas or the 2nd. Broad intellectual and expressive capacity - the combination shows in people who write, teach and create rather than in narrow specialists.',
    participants: trio,
    houses: placed.map((p) => p!.house),
    strength: 'Strong',
    topicIds: [3, 12, 14],
  }];
}

/* --------------------------------- entry ---------------------------------- */

export function detectYogas(chart: ChartData): Yoga[] {
  const all = [
    ...mahapurushaYogas(chart),
    ...rajaYogas(chart),
    ...dhanaYogas(chart),
    ...parivartanaYogas(chart),
    ...vipareetaYogas(chart),
    ...lunarYogas(chart),
    ...solarYogas(chart),
    ...learningYogas(chart),
    ...afflictionYogas(chart),
  ];

  const order = { Strong: 0, Moderate: 1, Weak: 2 } as const;
  return all.sort((a, b) => order[a.strength] - order[b.strength]);
}

export function yogasForTopic(yogas: Yoga[], topicId: number): Yoga[] {
  return yogas.filter((y) => y.topicIds.includes(topicId));
}

export function yogasTouchingHouse(yogas: Yoga[], house: HouseNumber): Yoga[] {
  return yogas.filter((y) => y.houses.includes(house));
}
