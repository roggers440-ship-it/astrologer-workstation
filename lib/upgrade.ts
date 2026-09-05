import type { Tier } from '@/lib/entitlements';

/**
 * Moving between plans.
 *
 * eSewa has no proration, so it is computed here. Without it a subscriber who
 * upgrades mid-period pays full price and silently forfeits the days they had
 * already bought - which produces one complaint and no second purchase.
 */

export const TIER_RANK: Record<Tier, number> = { free: 0, basic: 1, pro: 2, max: 3 };

export type ChangeKind = 'new' | 'upgrade' | 'extend' | 'downgrade' | 'same';

export interface PlanChange {
  kind: ChangeKind;
  /** What to charge now, in rupees. Zero for a downgrade. */
  charge: number;
  /** Value of the unused part of the current plan, applied to the new one. */
  credit: number;
  /** Full price of the target plan, before credit. */
  listPrice: number;
  /** Said to the customer. */
  explanation: string;
  /** False when the change cannot happen now. */
  allowed: boolean;
}

export interface CurrentPlan {
  tier: Tier;
  periodEnd: string | null;
  /** What they paid for the running period, and over how many months. */
  paidAmount: number | null;
  paidMonths: number | null;
}

const rupees = (n: number) => `Rs ${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Unused value of the running plan.
 *
 * Straight-line by day. A subscriber halfway through a month gets half of what
 * they paid back as credit - simple enough to explain in one sentence, which
 * matters more here than precision.
 */
export function unusedCredit(current: CurrentPlan, now = new Date()): number {
  if (current.tier === 'free' || !current.periodEnd || !current.paidAmount || !current.paidMonths) {
    return 0;
  }

  const end = Date.parse(current.periodEnd);
  if (end <= now.getTime()) return 0;

  const totalDays = current.paidMonths * 30.44;
  const daysLeft = (end - now.getTime()) / 86_400_000;

  return Math.max(0, Math.min(current.paidAmount, (daysLeft / totalDays) * current.paidAmount));
}

export function planChange(
  current: CurrentPlan,
  target: Tier,
  listPrice: number,
  now = new Date(),
): PlanChange {
  const from = TIER_RANK[current.tier];
  const to = TIER_RANK[target];
  const credit = unusedCredit(current, now);

  if (target === 'free') {
    return {
      kind: 'downgrade',
      charge: 0,
      credit: 0,
      listPrice: 0,
      allowed: false,
      explanation: 'Cancelling is not something to pay for. Let the current period run out and the account returns to Free on its own.',
    };
  }

  if (from === 0) {
    return {
      kind: 'new',
      charge: listPrice,
      credit: 0,
      listPrice,
      allowed: true,
      explanation: `${rupees(listPrice)} for the full period.`,
    };
  }

  if (to === from) {
    /*
     * A paid plan with no end date was granted by hand rather than bought, and
     * it does not expire. Selling an extension of it would take money and hand
     * back an expiry date the account did not have - strictly worse than doing
     * nothing, which is not something to charge for.
     */
    if (!current.periodEnd) {
      return {
        kind: 'extend',
        charge: 0,
        credit: 0,
        listPrice,
        allowed: false,
        explanation:
          'Your plan has no end date, so there is nothing to extend. Paying for another period would replace an open-ended plan with one that expires.',
      };
    }

    /* Otherwise a renewal, and the remaining days are added to the new period
       rather than thrown away. */
    return {
      kind: 'extend',
      charge: listPrice,
      credit: 0,
      listPrice,
      allowed: true,
      explanation: `${rupees(listPrice)}. Any days left on the current period are added to the new one.`,
    };
  }

  if (to > from) {
    const charge = Math.max(0, listPrice - credit);
    return {
      kind: 'upgrade',
      charge,
      credit,
      listPrice,
      allowed: true,
      explanation:
        credit > 0
          ? `${rupees(listPrice)} less ${rupees(credit)} for the unused part of your current plan. You pay ${rupees(charge)}.`
          : `${rupees(charge)} for the full period.`,
    };
  }

  /*
   * Downgrades wait. Charging for a smaller plan while a larger one is still
   * paid for is indefensible, and silently removing access they have paid for is
   * worse. The change happens when the period ends.
   */
  return {
    kind: 'downgrade',
    charge: 0,
    credit: 0,
    listPrice,
    allowed: false,
    explanation: current.periodEnd
      ? `You are on a larger plan until ${new Date(current.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Move down after that and nothing is wasted.`
      : 'Move down when the current period ends.',
  };
}
