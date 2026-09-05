import type { HouseNumber } from '@/types/astrology';

/**
 * What each plan may see.
 *
 * One module, no exceptions. Entitlement scattered across routes leaks by
 * accident - one forgotten check and a free account reads a paid chart - so
 * every decision about access is made here and every caller asks this file.
 *
 * Nothing here is authority in the browser. The client uses it to decide what to
 * render; the server uses it to decide what to send. Only the second matters,
 * and locked content never reaches the browser at all.
 */

export type Tier = 'free' | 'basic' | 'pro' | 'max';
export type Role = 'user' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  tier: Tier;
  role: Role;
  currentPeriodEnd: string | null;
}

export interface Entitlements {
  tier: Tier;
  role: Role;
  /** Saved charts allowed, for the lifetime of the account. Infinity for max. */
  chartLimit: number;
  /** 'all', or the specific houses this plan may read. */
  houses: 'all' | HouseNumber[];
  /** 'all', or the specific topic ids. */
  topics: 'all' | number[];
  /**
   * Whether dates are included.
   *
   * The split that makes the free tier work: what an area of life is like is
   * given away, when it happens is not. A free reading that answers "when will I
   * marry" has sold nothing, and timing is the single thing people most want.
   */
  timing: boolean;
  /** Body map depth. Light shows regions without severity or layer reasoning. */
  medical: 'full' | 'light';
  /** Whether the written analysis may be generated. */
  analysis: boolean;
  /** The twenty-year year-impact timeline. */
  timeline: boolean;
  /** Plain reads for consumers; technical keeps the classical vocabulary. */
  depth: 'plain' | 'technical';
  /** Admin only. */
  seesEveryClient: boolean;
}

/**
 * The four houses a free account reads: self, money, fortune and career.
 *
 * These are the questions people arrive with, answered descriptively - which is
 * what convinces someone the product knows their chart. The dates, the other
 * eight houses and everything else stay behind the wall.
 *
 * The 1st is here rather than the 7th on purpose. It is where the opening line
 * comes from, so the free experience leads with the statement most likely to
 * make someone recognise themselves, and nobody has ever subscribed to be told
 * about their own personality. Marriage is the opposite: it is among the
 * strongest reasons anyone consults an astrologer at all, so the 7th stays paid.
 */
export const FREE_HOUSES: HouseNumber[] = [1, 2, 9, 10];

/** Career and Education. */
export const FREE_TOPICS = [1, 3];

const BASE: Record<Tier, Omit<Entitlements, 'tier' | 'role' | 'seesEveryClient'>> = {
  free: {
    chartLimit: 1,
    houses: FREE_HOUSES,
    topics: FREE_TOPICS,
    timing: false,
    medical: 'light',
    analysis: false,
    timeline: false,
    depth: 'plain',
  },
  basic: {
    chartLimit: 1,
    houses: 'all',
    topics: 'all',
    timing: true,
    medical: 'light',
    analysis: true,
    timeline: true,
    depth: 'plain',
  },
  pro: {
    chartLimit: 5,
    houses: 'all',
    topics: 'all',
    timing: true,
    medical: 'light',
    analysis: true,
    timeline: true,
    depth: 'plain',
  },
  /* The practitioner plan. Unlimited charts, the full body map, and the
     classical vocabulary rather than the consumer phrasing. */
  max: {
    chartLimit: Number.POSITIVE_INFINITY,
    houses: 'all',
    topics: 'all',
    timing: true,
    medical: 'full',
    analysis: true,
    timeline: true,
    depth: 'technical',
  },
};

/**
 * A profile's effective entitlements.
 *
 * An expired period is treated as free whatever the tier column says. A webhook
 * that fails to arrive should cost a subscriber nothing and should not leave a
 * lapsed account on a paid plan forever.
 */
export function entitlementsFor(profile: Profile, now = new Date()): Entitlements {
  const expired =
    profile.tier !== 'free' &&
    profile.currentPeriodEnd !== null &&
    Date.parse(profile.currentPeriodEnd) < now.getTime();

  const tier: Tier = profile.role === 'admin' ? 'max' : expired ? 'free' : profile.tier;

  return {
    ...BASE[tier],
    tier,
    role: profile.role,
    chartLimit: profile.role === 'admin' ? Number.POSITIVE_INFINITY : BASE[tier].chartLimit,
    seesEveryClient: profile.role === 'admin',
  };
}

const ALL_HOUSES = Array.from({ length: 12 }, (_, i) => (i + 1) as HouseNumber);

export function unlockedHouses(ent: Entitlements): HouseNumber[] {
  return ent.houses === 'all' ? ALL_HOUSES : ent.houses;
}

export function lockedHouses(ent: Entitlements): HouseNumber[] {
  if (ent.houses === 'all') return [];
  const allowed = ent.houses;
  return ALL_HOUSES.filter((h) => !allowed.includes(h));
}

export function canSeeHouse(ent: Entitlements, house: HouseNumber): boolean {
  return ent.houses === 'all' || ent.houses.includes(house);
}

export function canSeeTopic(ent: Entitlements, topicId: number): boolean {
  return ent.topics === 'all' || ent.topics.includes(topicId);
}

/* ------------------------------- presentation ---------------------------- */

export const TIER_LABEL: Record<Tier, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  max: 'Max',
};
export const TIER_CHARTS: Record<Tier, string> = {
  free: '1 chart',
  basic: '1 chart',
  pro: '5 charts',
  max: 'Unlimited charts',
};
 
export interface PlanCopy {
  label: string;
  charts: string;
  audience: string;
  /** What this plan adds over the one below it. */
  adds: string[];
  billing: 'none' | 'monthly' | 'yearly';
}

export const PLANS: Record<Tier, PlanCopy> = {
  free: {
    label: 'Free',
    charts: '1 chart',
    audience: 'See what your chart says about you, your money, your luck and your work.',
    adds: [
      'Four houses read in full',
      'Career and education',
      'Your opening reading',
    ],
    billing: 'none',
  },
  basic: {
    label: 'Basic',
    charts: '1 chart',
    audience: 'Your own chart, completely.',
    adds: [
      'Marriage, children, health and the rest of the twelve houses',
      'All twenty topics',
      'Dates and timing windows',
      'Twenty-year timeline',
      'Written analysis',
    ],
    billing: 'monthly',
  },
  pro: {
    label: 'Pro',
    charts: '5 charts',
    audience: 'Your chart and the people close to you.',
    adds: ['Everything in Basic', 'Up to five charts'],
    billing: 'monthly',
  },
  max: {
    label: 'Max',
    charts: 'Unlimited charts',
    audience: 'For practising astrologers.',
    adds: [
      'Unlimited charts',
      'Full medical body map',
      'Classical terminology and the working behind every reading',
      'Consultation notes and client records',
    ],
    billing: 'yearly',
  },
};
