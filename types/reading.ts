import type { HouseNumber, PanchangaData, SignName } from './astrology';
import type { Tier } from '@/lib/entitlements';

/**
 * What the browser is allowed to receive.
 *
 * Readings used to be computed in the browser from the raw chart, which meant
 * any lock was cosmetic - a free account could open the console and derive every
 * house itself. Everything is computed on the server now and gated before it is
 * serialised, so locked content is not hidden from the browser, it is absent.
 */

export interface PublicEntitlements {
  tier: Tier;
  isAdmin: boolean;
  chartLimit: number | null;
  unlockedHouses: HouseNumber[];
  unlockedTopics: number[] | 'all';
  timing: boolean;
  analysis: boolean;
  timeline: boolean;
  medical: 'full' | 'light';
  depth: 'plain' | 'technical';
}

/**
 * What sits behind a lock, described without revealing it.
 *
 * Counts only, never a verdict. "Three combinations and two timing windows" is
 * true, unfakeable and motivating. "Your marriage house is under strain" would
 * convert harder and is a cruel thing to put in front of someone who cannot
 * afford to find out why.
 */
export interface Teaser {
  locked: true;
  /** What this area is, in plain words. Naming it is not revealing it. */
  covers: string;
  /** True counts of what is waiting. */
  has: { label: string; count: number }[];
  /** One line of honest anticipation. */
  line: string;
  /** Which plan opens it. */
  needs: Tier;
}

export interface PublicWindow {
  from: string;
  to: string;
  label: string;
  status: 'past' | 'now' | 'future';
}

export interface PublicHouse {
  locked?: false;
  house: HouseNumber;
  sign: SignName;
  verdict: 'Strong' | 'Workable' | 'Under strain';
  hook: string;
  detail: string[];
  /** The interactions. This is the part worth reading. */
  combinations: string[];
  yogas: { name: string; strength: string; reading: string; caveat?: string }[];
  /** Absent entirely without the timing entitlement. */
  windows?: PublicWindow[];
  /** Technical depth only. */
  technical?: string[];
  bindus?: number;
  divisional?: string;
}

export interface PublicAnswer {
  question: string;
  verdict: string;
  confidence: string;
  because?: string;
  support?: number;
  window?: { from: string; to: string; label: string };
  classical?: { claim: string; source: string };
}

export interface PublicTopic {
  locked?: false;
  id: number;
  name: string;
  handlingNote?: string;
  answers: PublicAnswer[];
}

export interface PublicYear {
  year: number;
  band: string;
  tone: string;
  headline: string;
}

export interface PublicRegion {
  regionId: string;
  name: string;
  plain: string;
  screening: string;
  /** Full depth only. */
  severity?: string;
  convergence?: number;
  character?: string;
  hits?: string[];
  windows?: PublicWindow[];
}

export interface Reading {
  clientId: string;
  entitlements: PublicEntitlements;
  ascendantSign: SignName;
  panchanga: PanchangaData;
  /** One line to open with. Every tier gets this. */
  opening: { line: string; basis: string; kind: string } | null;
  /** Present only with the timing entitlement. */
  currentPeriod?: { major: string; sub?: string; subSub?: string; majorEnds: string; subEnds?: string };
  signature: { title: string; statement: string; consequence: string }[];
  yogas: {
    name: string;
    strength: string;
    provenance: string;
    reading: string;
    caveat?: string;
    participants: string[];
    /** The classical register, practitioner tiers only. */
    classicalClaim?: string;
    literalMeaning?: string;
    source?: string;
  }[];
  houses: Record<number, PublicHouse | Teaser>;
  topics: Record<number, PublicTopic | Teaser>;
  years: PublicYear[] | Teaser;
  medical: PublicRegion[];
  medicalNote: string;
}
