/**
 * Core domain types for the Astrologer Diagnostic Workstation.
 * Extends the spec's baseline interfaces with the fields the rule engine
 * and dasha math actually need (absolute longitude, house lordship, varga).
 */

export type PlanetName =
  | 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter'
  | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu';

export type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type SignName =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo'
  | 'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type Dignity = 'Exalted' | 'Debilitated' | 'OwnSign' | 'Moolatrikona' | 'Neutral';

export type Varga = 'D1' | 'D6' | 'D9' | 'D10' | 'D30' | 'D60';

/** How much the recorded birth time can be trusted. Drives the D60 warning. */
export type TimeConfidence = 'exact' | 'approximate' | 'unknown';

/** Spec interface, plus longitude/nakshatra so dasha + navamsha are computable locally. */
export interface PlanetPlacement {
  planet: PlanetName;
  house: HouseNumber;
  sign: SignName;
  /** Degrees within the sign, 0-30. */
  degree: number;
  /** Absolute sidereal longitude, 0-360. Required for dasha and varga math. */
  longitude: number;
  isDebilitated: boolean;
  isExalted: boolean;
  isRetrograde: boolean;
  isCombust?: boolean;
  nakshatra?: string;
  nakshatraPada?: 1 | 2 | 3 | 4;
}

export interface ChartData {
  varga: Varga;
  ascendantSign: SignName;
  ascendantDegree: number;
  placements: PlanetPlacement[];
  /** House number -> sign occupying it. Whole-sign, ascendant-anchored. */
  houseSigns: Record<HouseNumber, SignName>;
}

export type DashaLevel = 'Maha' | 'Antar' | 'Pratyantar';

export interface DashaPeriod {
  lord: PlanetName;
  level: DashaLevel;
  /** ISO date strings. */
  start: string;
  end: string;
  children?: DashaPeriod[];
}

export interface NatalChart {
  clientId: string;
  computedAt: string;
  /** e.g. 'Lahiri'. Surfaced in the UI because it changes every placement. */
  ayanamsha: string;
  /** True when positions came from a local approximation rather than the ephemeris API. */
  isApproximate: boolean;
  charts: Record<Varga, ChartData>;
  /** Mahadasha with antardasha children. Pratyantardashas are expanded on demand. */
  dashaTree: DashaPeriod[];
  /**
   * Slow-planet sign positions per year across the timeline window, computed on
   * the server from the ephemeris. Sign-level is all the timeline needs, and 40
   * numbers travel to the browser far more cheaply than a transit engine.
   */
  transits: YearlyTransit[];
  /** The five limbs of the birth moment. Computed server-side; needs the birth zone. */
  panchanga: PanchangaData;
  /**
   * Degrees the ascendant moves per minute of clock time at this birth moment.
   * Above roughly 0.5 the lagna is on a knife edge and D60 is not determinable.
   */
  ascendantDriftPerMinute: number;
}

/** Mirrors the return shape of computePanchanga; kept here so NatalChart stays self-describing. */
export interface PanchangaData {
  tithi: { index: number; name: string; paksha: 'Shukla' | 'Krishna'; percentElapsed: number; note: string };
  vara: { name: string; english: string; lord: string; note: string; beforeSunrise: boolean };
  nakshatra: { name: string; pada: 1 | 2 | 3 | 4; lord: string; note: string };
  yoga: { index: number; name: string; note: string };
  karana: { index: number; name: string; note: string };
}

export interface YearlyTransit {
  year: number;
  saturnSign: SignName;
  jupiterSign: SignName;
  rahuSign: SignName;
}

export interface Client {
  id: string;
  fullName: string;
  /** ISO date, birth-local. */
  dob: string;
  /** 24h 'HH:mm'. */
  birthTime: string;
  birthPlace: string;
  latitude: number;
  longitude: number;
  /** IANA zone, e.g. 'Asia/Kathmandu'. */
  timezone: string;
  timeConfidence?: TimeConfidence;
  /** Phone or email. Added from the client table, never from the intake form. */
  contact?: string;
  createdAt: string;
}

/* ---------------------------------- rules --------------------------------- */

/**
 * A rule condition.
 *
 * The relational fields matter more than the positional ones. Real interpretive
 * statements are almost always about how two significators relate - "the 5th lord
 * conjunct the 9th lord in a kendra" - and a language that can only say "Mars in
 * the 7th" is limited to generic output no matter how many rules are written in
 * it. Lord-referenced conditions are also lagna-independent: one rule covers all
 * twelve rising signs instead of needing a hundred and forty-four.
 */
export interface RuleCondition {
  planet?: PlanetName;
  house?: HouseNumber;
  sign?: SignName;
  dignity?: 'Debilitated' | 'Exalted' | 'OwnSign';
  aspectsHouse?: HouseNumber;
  conjunctionWith?: PlanetName;
  /** "The lord of house N ..." - pairs with `house` to express lord-placement rules. */
  lordOfHouse?: HouseNumber;
  isRetrograde?: boolean;

  /* ------------------------------ relational ------------------------------ */

  /** Subject shares a house with the lord of house N. */
  conjunctWithLordOf?: HouseNumber;
  /** Subject and the lord of house N aspect each other. */
  mutualAspectWithLordOf?: HouseNumber;
  /** Subject is aspected by the lord of house N. */
  aspectedByLordOf?: HouseNumber;
  /** Parivartana: subject sits in the sign of house N's lord, and that lord sits in the subject's. */
  exchangeWith?: HouseNumber;
  /** Subject occupies any of these houses. Use for kendra, trikona, dusthana sets. */
  inHouses?: HouseNumber[];
  /** Distance in houses from the Moon, counted forward. Used for lunar yogas. */
  housesFromMoon?: number[];
  /** Subject is within `combustOrb` of the Sun, or explicitly not. */
  isCombust?: boolean;

  /** Negates the whole condition. */
  not?: boolean;
}

export type HookCategory = 'PhysicalIndicator' | 'Psychological' | 'Timeline' | 'Remedy';

export interface ConsultationHook {
  id: string;
  topicId: number; // 1-20
  category: HookCategory;
  title: string;
  /** Plain-English guideline the astrologer can say out loud. */
  interpretiveGuideline: string;
  /** Technical classical explanation, shown in the cheat-sheet tooltip. */
  cheatSheetNote: string;
  confidential?: boolean;
  /** Which placements fired the rule, for "show your working" in the UI. */
  evidence?: string[];
  strength?: 'Strong' | 'Moderate' | 'Supporting';
}

export interface Rule {
  id: string;
  topicIds: number[];
  category: HookCategory;
  /** All conditions must match (logical AND). Use separate rules for OR. */
  when: RuleCondition[];
  title: string;
  interpretiveGuideline: string;
  cheatSheetNote: string;
  confidential?: boolean;
  strength?: 'Strong' | 'Moderate' | 'Supporting';
}

/* -------------------------------- timeline -------------------------------- */

export interface TimelineMarker {
  year: number;
  /** Short label for the axis, e.g. "8th house trigger". */
  label: string;
  house?: HouseNumber;
  lord?: PlanetName;
  description: string;
  source: 'Dasha' | 'SaturnTransit' | 'JupiterTransit' | 'Rule';
}

/* ----------------------------------- CRM ---------------------------------- */

export interface ConsultationNote {
  id: string;
  clientId: string;
  sessionDate: string;
  topicIds: number[];
  summary: string;
  /** Astrologer's record of what the client confirmed - the verification loop. */
  clientConfirmed?: string;
  followUpAt?: string;
  createdBy: string;
}

export interface Topic {
  id: number;
  name: string;
  tab: 'life' | 'relationships' | 'psychology' | 'health';
  /** Houses classically read for this topic. */
  houses: HouseNumber[];
  karaka: PlanetName[];
  confidential?: boolean;
  /** Shown above results when the topic needs care in delivery. */
  handlingNote?: string;
}
