import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase';
import { PLANS } from '@/lib/entitlements';
import { priceFor } from '@/lib/esewa';
import { planChange, TIER_RANK, type CurrentPlan } from '@/lib/upgrade';
import type { Tier } from '@/lib/entitlements';

/**
 * The account: who you are, what you are on, and what changing costs.
 *
 * Prices are quoted here rather than in the browser so the figure shown and the
 * figure charged come from the same place.
 */
export async function GET() {
  const { session, deny } = await requireSession();
  if (deny) return deny;

  const db = await supabaseServer();

  const { data: profile } = await db
    .from('profiles')
    .select('email, display_name, tier, role, theme, current_period_end, last_paid_amount, last_paid_months')
    .eq('id', session.userId)
    .single();

  const { count: charts } = await db
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('practitioner_id', session.userId);

  const current: CurrentPlan = {
    tier: session.entitlements.tier,
    periodEnd: profile?.current_period_end ?? null,
    paidAmount: profile?.last_paid_amount ?? null,
    paidMonths: profile?.last_paid_months ?? null,
  };

  /* Every plan quoted against the one they are on, so the page never offers
     someone the plan they already have at full price. */
  const options = (['basic', 'pro', 'max'] as Tier[]).map((tier) => ({
    tier,
    label: PLANS[tier].label,
    months: priceFor(tier).months,
    ...planChange(current, tier, priceFor(tier).amount),
  }));

  const { data: rawPayments } = await db
    .from('payments')
    .select('transaction_id, tier, amount, status, created_at')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(10);

  /*
   * A payment that was started and never completed stays pending forever, and a
   * customer looking at an indefinite "pending" reasonably assumes money is in
   * limbo somewhere. Anything older than an hour was abandoned at the gateway -
   * eSewa has already released it - so it is shown as such.
   */
  const HOUR = 60 * 60 * 1000;
  const payments = (rawPayments ?? []).map((p) => ({
    ...p,
    status:
      p.status === 'pending' && Date.now() - Date.parse(p.created_at) > HOUR
        ? 'abandoned'
        : p.status,
  }));

  return NextResponse.json({
    email: profile?.email ?? session.profile.email,
    displayName: profile?.display_name ?? null,
    theme: profile?.theme ?? 'dark',
    role: profile?.role ?? 'user',
    tier: session.entitlements.tier,
    periodEnd: current.periodEnd,
    chartLimit: Number.isFinite(session.entitlements.chartLimit) ? session.entitlements.chartLimit : null,
    chartsUsed: charts ?? 0,
    currentRank: TIER_RANK[session.entitlements.tier],
    options,
    payments,
  });
}

/** Display name and theme only. Everything else about an account is not the account's to set. */
export async function PATCH(req: Request) {
  const { session, deny } = await requireSession();
  if (deny) return deny;

  const body = (await req.json()) as { displayName?: string; theme?: 'dark' | 'light' };
  const patch: Record<string, unknown> = {};

  if (typeof body.displayName === 'string') patch.display_name = body.displayName.trim() || null;
  if (body.theme === 'dark' || body.theme === 'light') patch.theme = body.theme;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const db = await supabaseServer();
  const { error } = await db.from('profiles').update(patch).eq('id', session.userId);

  if (error) {
    console.error('[api/account]', error);
    return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
