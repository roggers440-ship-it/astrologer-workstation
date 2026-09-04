import type { PlanetPlacement } from '@/types/astrology';
import { NAKSHATRAS, NAKSHATRA_ARC } from './vedic-constants';

/**
 * Jaatak Panchaanga - the five limbs of the birth moment.
 *
 * All five fall out of the Sun and Moon longitudes, so they are only as good as
 * the ephemeris. With Swiss Ephemeris behind them these are exact; with the old
 * mean-element approximation the tithi could be a full day out.
 */

const TITHI_NAMES = [
  'Pratipada', 'Dvitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami',
  'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dvadashi', 'Trayodashi', 'Chaturdashi',
];

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma',
  'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyana', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha',
  'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
];

const MOVABLE_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'];

const VARA_NAMES = ['Ravivara', 'Somavara', 'Mangalavara', 'Budhavara', 'Guruvara', 'Shukravara', 'Shanivara'];
const VARA_ENGLISH = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const VARA_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;

export interface Panchanga {
  tithi: { index: number; name: string; paksha: 'Shukla' | 'Krishna'; percentElapsed: number; note: string };
  vara: { name: string; english: string; lord: string; note: string; beforeSunrise: boolean };
  nakshatra: { name: string; pada: 1 | 2 | 3 | 4; lord: string; note: string };
  yoga: { index: number; name: string; note: string };
  karana: { index: number; name: string; note: string };
}

const norm360 = (x: number) => ((x % 360) + 360) % 360;

/** Vimshottari lord of each nakshatra, repeating every nine. */
const NAK_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

const TITHI_NOTES: Record<string, string> = {
  Pratipada: 'Beginnings. Starts things easily, finishes them less easily.',
  Dvitiya: 'Pairing and negotiation. Works better with someone than alone.',
  Tritiya: 'Effort and push. Gets there by force of will.',
  Chaturthi: 'Obstacle-clearing. Life presents blockages that turn out to be the training.',
  Panchami: 'Learning and abundance. Absorbs quickly.',
  Shashthi: 'Contest. Competitive, and often healthier for having something to push against.',
  Saptami: 'Movement and hospitality. Comfortable among people.',
  Ashtami: 'Intensity. Nothing is done at half strength.',
  Navami: 'Force and completion. Endings arrive sharply.',
  Dashami: 'Duty and public conduct. Cares how things look.',
  Ekadashi: 'Restraint and discipline. Does well with a practice to keep.',
  Dvadashi: 'Giving away. Generous, sometimes past their own interest.',
  Trayodashi: 'Attraction and persuasion. Wins people over.',
  Chaturdashi: 'Sharpness. Cuts through, and can cut too far.',
  Purnima: 'Fullness. Emotionally visible, hard to hide feelings.',
  Amavasya: 'Inwardness. Private, and recharges alone.',
};

const YOGA_NOTES: Record<string, string> = {
  Vishkambha: 'Support against obstacles - endures where others stop.',
  Priti: 'Warmth. Easy to like, and knows it.',
  Ayushman: 'Vitality and staying power.',
  Saubhagya: 'Good fortune arrives without much chasing.',
  Shobhana: 'Attractive presence, cares about beauty.',
  Atiganda: 'Obstruction early, ease later. A late bloomer signature.',
  Sukarma: 'Good works. Effort tends to be recognised.',
  Dhriti: 'Steadiness. Holds a course.',
  Shula: 'Sharp edge. Direct to the point of friction.',
  Ganda: 'Knots. Things tangle before they resolve.',
  Vriddhi: 'Growth. Improves steadily with age.',
  Dhruva: 'Fixed. Reliable, and hard to move once decided.',
  Vyaghata: 'Impact. Meets resistance head-on.',
  Harshana: 'Delight. Lifts a room.',
  Vajra: 'Hard and unbreakable, occasionally inflexible.',
  Siddhi: 'Accomplishment. Things tend to complete.',
  Vyatipata: 'Reversal. Plans change course - adaptability matters more than planning.',
  Variyana: 'Comfort-seeking. Chooses the pleasant path.',
  Parigha: 'Barrier. Guards the gate, slow to let people in.',
  Shiva: 'Auspicious, inward, drawn to the sacred.',
  Siddha: 'Things fall into place with less effort than expected.',
  Sadhya: 'Achievable. Goals are realistic and get met.',
  Shubha: 'Fortunate and pleasant-natured.',
  Shukla: 'Bright and open.',
  Brahma: 'Creative and generative.',
  Indra: 'Leadership and command.',
  Vaidhriti: 'Divided. Pulled between two directions.',
};

const KARANA_NOTES: Record<string, string> = {
  Bava: 'Movement and beginnings.',
  Balava: 'Strength applied steadily.',
  Kaulava: 'Bonds and relationships.',
  Taitila: 'Friendliness, sociability.',
  Gara: 'Rootedness, agriculture, patience.',
  Vanija: 'Trade and exchange - a merchant instinct.',
  Vishti: 'Bhadra. Obstructive, best not used for beginnings.',
  Shakuni: 'Omen-reading, intuition, watchfulness.',
  Chatushpada: 'Stability on four legs, animals, land.',
  Naga: 'Hidden knowledge, sharp instinct.',
  Kimstughna: 'Destroys obstacles at the start.',
};

export function computePanchanga(
  sun: PlanetPlacement,
  moon: PlanetPlacement,
  birthUTC: Date,
  timezone: string,
): Panchanga {
  const diff = norm360(moon.longitude - sun.longitude);

  /* --- tithi: 12 degrees of Moon-Sun separation each, 30 to a lunar month --- */
  const tithiIndex = Math.floor(diff / 12);
  const paksha = tithiIndex < 15 ? 'Shukla' : 'Krishna';
  const withinPaksha = tithiIndex % 15;
  const tithiName =
    tithiIndex === 14 ? 'Purnima' : tithiIndex === 29 ? 'Amavasya' : TITHI_NAMES[withinPaksha];

  /*
   * Vara: the weekday at the birth place, not in UTC.
   *
   * Strictly the vara runs sunrise to sunrise, so a birth in the small hours
   * belongs to the previous weekday. Sunrise needs a rise/transit calculation
   * this function has no access to, so a pre-dawn birth is flagged rather than
   * silently assigned - the practitioner can resolve it.
   */
  const local = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
    })
      .formatToParts(birthUTC)
      .map((x) => [x.type, x.value]),
  );
  const localWeekday = new Date(`${local.year}-${local.month}-${local.day}T00:00:00Z`).getUTCDay();
  const beforeSunrise = Number(local.hour) % 24 < 6;

  /* --- nakshatra: the Moon's, which also seeds the whole dasha sequence --- */
  const nakIndex = Math.floor(moon.longitude / NAKSHATRA_ARC);
  const pada = (Math.floor((moon.longitude % NAKSHATRA_ARC) / (NAKSHATRA_ARC / 4)) + 1) as 1 | 2 | 3 | 4;

  /* --- yoga: the sum of the luminaries, 27 divisions --- */
  const yogaIndex = Math.floor(norm360(sun.longitude + moon.longitude) / NAKSHATRA_ARC);

  /* --- karana: half a tithi. Sixty per month: one fixed, then eight cycles of
         seven movable, then three more fixed at the dark of the Moon. --- */
  const kIndex = Math.floor(diff / 6);
  const karanaName =
    kIndex === 0 ? 'Kimstughna'
    : kIndex === 57 ? 'Shakuni'
    : kIndex === 58 ? 'Chatushpada'
    : kIndex === 59 ? 'Naga'
    : MOVABLE_KARANAS[(kIndex - 1) % 7];

  return {
    tithi: {
      index: tithiIndex + 1,
      name: tithiName,
      paksha,
      percentElapsed: ((diff % 12) / 12) * 100,
      note: TITHI_NOTES[tithiName] ?? '',
    },
    vara: {
      name: VARA_NAMES[localWeekday],
      english: VARA_ENGLISH[localWeekday],
      lord: VARA_LORD[localWeekday],
      beforeSunrise,
      note:
        `Born on ${VARA_LORD[localWeekday]}'s day - that planet carries extra weight in remedies and in choosing timing.` +
        (beforeSunrise
          ? ' Birth was before dawn, so by the sunrise-to-sunrise reckoning the vara may belong to the previous day. Confirm against local sunrise.'
          : ''),
    },
    nakshatra: {
      name: NAKSHATRAS[nakIndex],
      pada,
      lord: NAK_LORDS[nakIndex % 9],
      note: `Seeds the Vimshottari sequence: the first mahadasha is ${NAK_LORDS[nakIndex % 9]}'s.`,
    },
    yoga: {
      index: yogaIndex + 1,
      name: YOGA_NAMES[yogaIndex],
      note: YOGA_NOTES[YOGA_NAMES[yogaIndex]] ?? '',
    },
    karana: {
      index: kIndex + 1,
      name: karanaName,
      note: KARANA_NOTES[karanaName] ?? '',
    },
  };
}
