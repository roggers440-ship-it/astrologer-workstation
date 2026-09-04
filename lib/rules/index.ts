import type { Rule } from '@/types/astrology';

/**
 * Starter rule corpus. Every entry is data - add, edit or delete freely without
 * touching the evaluator. Conditions within a rule are ANDed; write two rules for OR.
 *
 * Writing guidance for `interpretiveGuideline`: it is read aloud in a session, so it
 * should describe a tendency the client can recognise and push back on, not a verdict.
 */

/* ------------------- physical & personality indicators (P2) ------------------ */

export const PHYSICAL_RULES: Rule[] = [
  {
    id: 'phys.mars.asc',
    topicIds: [11, 17],
    category: 'PhysicalIndicator',
    when: [{ planet: 'Mars', house: 1 }],
    title: 'Mars in the 1st',
    interpretiveGuideline:
      'Look for a mark, scar or old injury around the head or face, and a direct physical presence. Ask rather than assert - "any old scar above the eyebrow?" gets a better session than a pronouncement.',
    cheatSheetNote:
      'Mars in lagna: the fiery karaka of blood, cuts and burns colours the body indicated by the 1st house. Classical texts read it for marks on the head and a sharp, restless constitution.',
    strength: 'Strong',
  },
  {
    id: 'phys.ketu.asc',
    topicIds: [11, 18],
    category: 'PhysicalIndicator',
    when: [{ planet: 'Ketu', house: 1 }],
    title: 'Ketu in the 1st',
    interpretiveGuideline:
      'Often a distinguishing mark on the face or head, and a self-image that never quite settles - the client may say they feel unseen or hard to pin down.',
    cheatSheetNote:
      'Ketu in lagna: the chaya graha of detachment on the body house. Read for birthmarks, a sense of separateness from the physical self, and inherited themes carried into this life.',
    strength: 'Moderate',
  },
  {
    id: 'phys.moon.scorpio',
    topicIds: [11, 19, 20],
    category: 'Psychological',
    when: [{ planet: 'Moon', sign: 'Scorpio' }],
    title: 'Debilitated Moon in Scorpio',
    interpretiveGuideline:
      'Emotionally deep-running rather than fragile. Feelings arrive at full volume and get kept private. Ask how they process a bad week - the answer is usually "alone, then all at once".',
    cheatSheetNote:
      'Moon is debilitated at 3 degrees Scorpio, the sign of its fall. Neechabhanga can cancel the weakness if the dispositor Mars is strong or in a kendra from the lagna or Moon - check before reading it as a hard affliction.',
    strength: 'Strong',
  },
  {
    id: 'phys.sun.asc',
    topicIds: [11, 17],
    category: 'Psychological',
    when: [{ planet: 'Sun', house: 1 }],
    title: 'Sun in the 1st',
    interpretiveGuideline:
      'Natural authority and a need to be recognised. Works well when leading, chafes badly when managed closely.',
    cheatSheetNote:
      'Atmakaraka Sun on the lagna: the self-house takes the signification of the soul, status and the father. Strong in Leo or Aries, strained in Libra.',
    strength: 'Moderate',
  },
  {
    id: 'phys.sat.asc',
    topicIds: [11, 17, 16],
    category: 'Psychological',
    when: [{ planet: 'Saturn', house: 1 }],
    title: 'Saturn in the 1st',
    interpretiveGuideline:
      'Slow starter, long finisher. Early life usually asked more of them than of their peers, and the payoff arrives later than they expect.',
    cheatSheetNote:
      'Saturn in lagna: karma karaka on the body house. Reads for delay, endurance, a serious bearing and responsibility taken on young.',
    strength: 'Strong',
  },
  {
    id: 'phys.jup.kendra',
    topicIds: [11, 15, 17],
    category: 'Psychological',
    when: [{ planet: 'Jupiter', dignity: 'Exalted' }],
    title: 'Exalted Jupiter',
    interpretiveGuideline:
      'Genuine optimism and good instincts about people. Watch for overcommitment - saying yes is cheap for this client.',
    cheatSheetNote:
      'Jupiter exalted in Cancer, deepest at 5 degrees. Guru karaka for wisdom, wealth and children functions at full strength.',
    strength: 'Strong',
  },
];

/* ------------------------- tab 1: life directions -------------------------- */

export const LIFE_RULES: Rule[] = [
  {
    id: 'life.10lord.6',
    topicIds: [1],
    category: 'Psychological',
    when: [{ lordOfHouse: 10, house: 6 }],
    title: '10th lord in the 6th',
    interpretiveGuideline:
      'Thrives in service, competition and problem-solving roles - health, law, defence, audit, operations. Career progress comes through handling other people\u2019s difficulties.',
    cheatSheetNote:
      '10th lord in an upachaya house grows with time and struggle. The 6/10 link is the classical marker for service professions and litigation.',
    strength: 'Strong',
  },
  {
    id: 'life.10lord.10',
    topicIds: [1, 15],
    category: 'Psychological',
    when: [{ lordOfHouse: 10, house: 10 }],
    title: '10th lord in its own house',
    interpretiveGuideline:
      'A clear professional identity. This client usually knows what they do and says it in one sentence. Reputation is the asset to protect.',
    cheatSheetNote:
      'Lord in own bhava forms a strong positional yoga for the karmasthana. Read alongside the 10th from the Moon and the D10 for confirmation.',
    strength: 'Strong',
  },
  {
    id: 'life.sat.10',
    topicIds: [1, 16],
    category: 'Psychological',
    when: [{ planet: 'Saturn', house: 10 }],
    title: 'Saturn in the 10th',
    interpretiveGuideline:
      'Career built the long way. Structure, systems, land, labour, engineering, government. Recognition arrives after the work is already done.',
    cheatSheetNote:
      'Saturn is digbala-strong in the 10th. Karma karaka in the karma bhava: duty, delay and durable standing.',
    strength: 'Strong',
  },
  {
    id: 'life.2lord.11',
    topicIds: [2],
    category: 'Psychological',
    when: [{ lordOfHouse: 2, house: 11 }],
    title: '2nd lord in the 11th',
    interpretiveGuideline:
      'Money accumulates through networks and repeat income rather than a single windfall. Good indicator for partnership income, commissions, community-driven work.',
    cheatSheetNote:
      'Dhana bhava lord in the labha bhava is a standard dhana yoga - the house of savings linked to the house of gains.',
    strength: 'Strong',
  },
  {
    id: 'life.11lord.2',
    topicIds: [2],
    category: 'Psychological',
    when: [{ lordOfHouse: 11, house: 2 }],
    title: '11th lord in the 2nd',
    interpretiveGuideline:
      'Gains convert into holdings. This client keeps what they earn; the risk is illiquidity, not overspending.',
    cheatSheetNote:
      'Mutual exchange of 2nd and 11th lords (parivartana when reciprocal) intensifies both dhana significations.',
    strength: 'Moderate',
  },
  {
    id: 'life.12lord.9',
    topicIds: [7, 16],
    category: 'Psychological',
    when: [{ lordOfHouse: 12, house: 9 }],
    title: '12th lord in the 9th',
    interpretiveGuideline:
      'Strong signature for study or long residence abroad, or for work tied to another country. Timing follows the dasha of the planets involved.',
    cheatSheetNote:
      'The 12th is distant lands and the 9th is higher learning and long journeys. Their connection is the primary foreign-education combination.',
    strength: 'Strong',
  },
  {
    id: 'life.rahu.9',
    topicIds: [7, 3, 15],
    category: 'Psychological',
    when: [{ planet: 'Rahu', house: 9 }],
    title: 'Rahu in the 9th',
    interpretiveGuideline:
      'Unconventional beliefs and an appetite for foreign or unfamiliar systems of knowledge. Often a break from the family\u2019s tradition.',
    cheatSheetNote:
      'Rahu in the dharma bhava: the outsider planet on the house of inherited belief. Reads for expatriation and for questioning received teaching.',
    strength: 'Moderate',
  },
  {
    id: 'life.4lord.4',
    topicIds: [3, 10, 6],
    category: 'Psychological',
    when: [{ lordOfHouse: 4, house: 4 }],
    title: '4th lord in the 4th',
    interpretiveGuideline:
      'Stable base - home, schooling and mother\u2019s support tend to be assets rather than problems. Good foundation to build the rest of the reading on.',
    cheatSheetNote:
      'Sukha bhava lord in own house strengthens home, vehicles, formal education and inner contentment.',
    strength: 'Moderate',
  },
  {
    id: 'life.merc.5',
    topicIds: [3, 12, 14],
    category: 'Psychological',
    when: [{ planet: 'Mercury', house: 5 }],
    title: 'Mercury in the 5th',
    interpretiveGuideline:
      'Learns fast and enjoys it. Analytical, playful with ideas, good at teaching. Struggles with rote work that has no puzzle in it.',
    cheatSheetNote:
      'Mercury, karaka of intellect, in the purva punya bhava of intelligence and creative merit.',
    strength: 'Moderate',
  },
  {
    id: 'life.ketu.12',
    topicIds: [16, 18],
    category: 'Psychological',
    when: [{ planet: 'Ketu', house: 12 }],
    title: 'Ketu in the 12th',
    interpretiveGuideline:
      'A pull toward solitude, retreat and inner work that predates any decision to seek it. Often reads as needing more alone time than the people around them accept.',
    cheatSheetNote:
      'Ketu in the moksha bhava is the classical marker of a mature spiritual account carried forward - the strongest single past-life indicator in the chart.',
    strength: 'Strong',
  },
  {
    id: 'life.9lord.10',
    topicIds: [15, 1, 16],
    category: 'Psychological',
    when: [{ lordOfHouse: 9, house: 10 }],
    title: '9th lord in the 10th',
    interpretiveGuideline:
      'Luck shows up through work. Opportunities arrive from mentors, teachers and senior figures rather than from chance.',
    cheatSheetNote:
      'Dharma-karmadhipati yoga: the trine lord of fortune joined to the angular lord of action. One of the strongest raja yogas.',
    strength: 'Strong',
  },
];

/* ---------------------- tab 2: relationships & family ---------------------- */

export const RELATIONSHIP_RULES: Rule[] = [
  {
    id: 'rel.sat.7',
    topicIds: [4],
    category: 'Timeline',
    when: [{ planet: 'Saturn', house: 7 }],
    title: 'Saturn in the 7th',
    interpretiveGuideline:
      'Marriage tends to come later, or to a partner who is older, serious or carrying responsibility. Durable once formed. Delay is the theme, not denial.',
    cheatSheetNote:
      'Saturn on the kalatra bhava: the planet of delay on the house of partnership. Check the 7th lord and Venus before reading severity.',
    strength: 'Strong',
  },
  {
    id: 'rel.ven.deb',
    topicIds: [4, 11],
    category: 'Psychological',
    when: [{ planet: 'Venus', dignity: 'Debilitated' }],
    title: 'Debilitated Venus',
    interpretiveGuideline:
      'Undervalues their own worth in relationships - stays too long, or asks for too little. Check the chart signature panel for neechabhanga before leaning on this: if the cancellation applies, the pattern is real but it corrects with age rather than persisting.',
    cheatSheetNote:
      'Venus is debilitated in Virgo, deepest at 27 degrees. Analysis overrides enjoyment. Check for neechabhanga via Mercury.',
    strength: 'Strong',
  },
  {
    id: 'rel.7lord.12',
    topicIds: [4, 7],
    category: 'Psychological',
    when: [{ lordOfHouse: 7, house: 12 }],
    title: '7th lord in the 12th',
    interpretiveGuideline:
      'Partner is often met far from home, or the relationship involves distance. Also reads for a private, low-visibility partnership.',
    cheatSheetNote:
      'Kalatra lord in the vyaya bhava links partnership to foreign places, seclusion and expenditure.',
    strength: 'Moderate',
  },
  {
    id: 'rel.jup.5',
    topicIds: [5, 15],
    category: 'Psychological',
    when: [{ planet: 'Jupiter', house: 5 }],
    title: 'Jupiter in the 5th',
    interpretiveGuideline:
      'Warm indicator for children and for a generous, teaching instinct. Safe and pleasant to deliver.',
    cheatSheetNote:
      'Putra karaka Jupiter in the putra bhava. Strengthens progeny, creative output and accumulated merit.',
    strength: 'Strong',
  },
  {
    id: 'rel.mars.aspects7',
    topicIds: [4, 13],
    category: 'Psychological',
    when: [{ planet: 'Mars', aspectsHouse: 7 }],
    title: 'Mars aspecting the 7th',
    interpretiveGuideline:
      'Friction in close partnership - arguments flare fast and cool fast. Useful to talk through conflict style rather than compatibility.',
    cheatSheetNote:
      'Kuja dosha territory. Mars aspects the 4th, 7th and 8th from itself. Assess from the Moon and Venus too before calling it a dosha.',
    strength: 'Moderate',
  },
  {
    id: 'rel.6lord.6',
    topicIds: [13],
    category: 'Psychological',
    when: [{ lordOfHouse: 6, house: 6 }],
    title: '6th lord in the 6th',
    interpretiveGuideline:
      'Opposition tends to defeat itself. This client outlasts rivals rather than beating them - a useful thing to say to someone in a dispute.',
    cheatSheetNote:
      'Harsha yoga: the lord of enemies confined to its own dusthana neutralises the house\u2019s harm.',
    strength: 'Strong',
  },
  {
    id: 'rel.moon.4',
    topicIds: [6, 19],
    category: 'Psychological',
    when: [{ planet: 'Moon', house: 4 }],
    title: 'Moon in the 4th',
    interpretiveGuideline:
      'Home and mother are the emotional centre of gravity. Mood tracks the state of the household closely.',
    cheatSheetNote:
      'Moon is digbala-strong in the 4th and shares its signification of mother, home and inner peace.',
    strength: 'Moderate',
  },
];

/* ------------------------ tab 3: psychology & mindset ---------------------- */

export const PSYCHOLOGY_RULES: Rule[] = [
  {
    id: 'psy.moon.rahu',
    topicIds: [19, 20, 12],
    category: 'Psychological',
    when: [{ planet: 'Moon', conjunctionWith: 'Rahu' }],
    title: 'Moon with Rahu',
    interpretiveGuideline:
      'Restless mind, vivid imagination, and a tendency to spiral at night. Talk about sleep, screen time and racing thoughts - concrete and useful. If they describe something heavier than restlessness, that is a conversation for a clinician, not a chart.',
    cheatSheetNote:
      'Grahana yoga. The mind karaka eclipsed by the shadow planet: amplification and distortion of emotional signal.',
    strength: 'Strong',
  },
  {
    id: 'psy.moon.sat',
    topicIds: [19, 20],
    category: 'Psychological',
    when: [{ planet: 'Moon', conjunctionWith: 'Saturn' }],
    title: 'Moon with Saturn',
    interpretiveGuideline:
      'A heavy, serious emotional register - low-grade weight rather than dramatic swings. Responds well to structure, routine and small realistic goals.',
    cheatSheetNote:
      'Punarphoo yoga. Saturn contracts what the Moon expands; classically read for melancholy, delay and emotional caution.',
    strength: 'Strong',
  },
  {
    id: 'psy.merc.3',
    topicIds: [14, 12],
    category: 'Psychological',
    when: [{ planet: 'Mercury', house: 3 }],
    title: 'Mercury in the 3rd',
    interpretiveGuideline:
      'Strong communicator - writing, negotiating, explaining. Point them at roles where the talking is the work.',
    cheatSheetNote:
      'Mercury in the sahaja bhava of speech, effort and siblings. Own-house-like strength for communication.',
    strength: 'Moderate',
  },
  {
    id: 'psy.moon.12',
    topicIds: [20, 18],
    category: 'Psychological',
    when: [{ planet: 'Moon', house: 12 }],
    title: 'Moon in the 12th',
    interpretiveGuideline:
      'Needs solitude to recover and often feels drained by crowds. Frame it as an energy budget, not a weakness.',
    cheatSheetNote:
      'Mind karaka in the vyaya bhava of withdrawal, sleep and foreign places. Read with the 4th lord for overall emotional stability.',
    strength: 'Moderate',
  },
  {
    id: 'psy.sun.merc',
    topicIds: [11, 14, 12],
    category: 'Psychological',
    when: [{ planet: 'Mercury', conjunctionWith: 'Sun' }],
    title: 'Mercury with the Sun',
    interpretiveGuideline:
      'Quick, confident thinker who identifies with being right. Excellent analyst; check whether they can hear disagreement.',
    cheatSheetNote:
      'Budha-Aditya yoga when uncombust. Within roughly 12 degrees Mercury combusts and the yoga weakens - check the degree gap.',
    strength: 'Moderate',
  },
  {
    id: 'psy.mars.3',
    topicIds: [14, 17],
    category: 'Psychological',
    when: [{ planet: 'Mars', house: 3 }],
    title: 'Mars in the 3rd',
    interpretiveGuideline:
      'High initiative and physical courage. Starts things easily; the coaching conversation is about finishing them.',
    cheatSheetNote:
      'Mars in the parakrama bhava of valour and self-effort - an upachaya placement that improves with age.',
    strength: 'Moderate',
  },
];

/* ---------------------- tab 4: health & deep karma ------------------------- */

export const HEALTH_RULES: Rule[] = [
  {
    id: 'health.6th.occupied',
    topicIds: [8, 17],
    category: 'PhysicalIndicator',
    when: [{ house: 6 }],
    title: 'Occupied 6th house',
    interpretiveGuideline:
      'Points to the body regions worth general care - not a diagnosis and not something to raise as one. Keep it at the level of "worth a routine check-up".',
    cheatSheetNote:
      'The 6th governs illness, digestion and the lower abdomen. Sign and occupant determine the region; the 6th lord\u2019s dasha times the theme.',
    strength: 'Moderate',
  },
  {
    id: 'health.sat.6',
    topicIds: [8, 17],
    category: 'PhysicalIndicator',
    when: [{ planet: 'Saturn', house: 6 }],
    title: 'Saturn in the 6th',
    interpretiveGuideline:
      'Chronic-slow rather than acute themes: joints, bones, teeth, posture, and stress carried in the body. Sensible framing is lifestyle and prevention.',
    cheatSheetNote:
      'Saturn in a dusthana it also rules well: strong for defeating enemies and disease, while signifying vata, skeleton and long-duration conditions.',
    strength: 'Moderate',
  },
  {
    id: 'health.6lord.8',
    topicIds: [8],
    category: 'PhysicalIndicator',
    when: [{ lordOfHouse: 6, house: 8 }],
    title: '6th lord in the 8th',
    interpretiveGuideline:
      'A classical marker for conditions that take time to identify. Practical translation for the client: do not skip routine screening.',
    cheatSheetNote:
      'Vipareeta raja yoga (harsha type) - dusthana lord in another dusthana. Paradoxically protective, though the health signification stays.',
    strength: 'Moderate',
  },
  {
    id: 'health.8lord.8',
    topicIds: [9, 18],
    category: 'PhysicalIndicator',
    when: [{ lordOfHouse: 8, house: 8 }],
    title: '8th lord in the 8th',
    interpretiveGuideline:
      'Practitioner note only. Classically read as strengthening the ayush indicator. Do not volunteer longevity readings in session.',
    cheatSheetNote:
      'Ayush bhava lord in own house. Traditional ayurdaya methods disagree with each other constantly - treat any lifespan estimate as unreliable.',
    confidential: true,
    strength: 'Moderate',
  },
  {
    id: 'health.sat.asc.longevity',
    topicIds: [9],
    category: 'PhysicalIndicator',
    when: [{ planet: 'Saturn', house: 1 }],
    title: 'Saturn on the lagna',
    interpretiveGuideline:
      'Practitioner note only. Read classically as endurance and a slow-burning constitution. Never framed as a countdown.',
    cheatSheetNote:
      'Ayush karaka Saturn on the body house is a positive longevity signature in most classical schemes.',
    confidential: true,
    strength: 'Moderate',
  },
  {
    id: 'health.ketu.5',
    topicIds: [18, 16],
    category: 'Psychological',
    when: [{ planet: 'Ketu', house: 5 }],
    title: 'Ketu in the 5th',
    interpretiveGuideline:
      'Talent that arrives already formed, and a complicated relationship with using it. Often a strong past-life story for clients who want one.',
    cheatSheetNote:
      'Ketu in the purva punya bhava: merit carried forward, alongside detachment from its rewards.',
    strength: 'Moderate',
  },
  {
    id: 'health.12lord.12',
    topicIds: [18],
    category: 'Psychological',
    when: [{ lordOfHouse: 12, house: 12 }],
    title: '12th lord in the 12th',
    interpretiveGuideline:
      'A settled inner life. Retreat, travel and private practice all read positively here.',
    cheatSheetNote:
      'Vimala yoga: the 12th lord in its own house neutralises loss and supports liberation significations.',
    strength: 'Moderate',
  },
];

export const ALL_RULES: Rule[] = [
  ...PHYSICAL_RULES,
  ...LIFE_RULES,
  ...RELATIONSHIP_RULES,
  ...PSYCHOLOGY_RULES,
  ...HEALTH_RULES,
];
