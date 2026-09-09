import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
import { priceFor } from '@/lib/esewa';
import type { Tier } from '@/lib/entitlements';

/**
 * Admin: every account, and granting a plan by hand.
 *
 * Manual grants matter more than they look. Cash changes hands, a bank transfer
 * arrives, a webhook fails, someone is comped - all of those need a control that
 * does not go through the gateway. Without one the only option is editing the
 * database mid-support-call, which leaves no record of who did what or why.
 *
 * Every grant writes a row to the same payments ledger as eSewa, so the customer
 * sees it in their own history and a later upgrade credits it correctly.
 */

async function requireAdmin() {
  const { session, deny } = await requireSession();
  if (deny) return { session: null, deny };
  if (session.entitlements.role !== 'admin') {
    return { session: null, deny: NextResponse.json({ error: 'Not permitted.' }, { status: 403 }) };
  }
  return { session, deny: null };
}

export async function GET() {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  try {
    const db = supabaseAdmin();

    const { data: profiles, error } = await db
      .from('profiles')
      .select('id, email, display_name, tier, role, current_period_end, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    /* Chart counts and payment totals in two queries rather than two per user. */
    const { data: clients } = await db.from('clients').select('practitioner_id');
    const counts = new Map<string, number>();
    for (const row of clients ?? []) {
      counts.set(row.practitioner_id, (counts.get(row.practitioner_id) ?? 0) + 1);
    }

    const { data: paid } = await db
      .from('payments')
      .select('user_id, amount, method')
      .eq('status', 'paid');

    const totals = new Map<string, number>();
    for (const row of paid ?? []) {
      if (row.method === 'comp') continue; // comped accounts have not paid anything
      totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + Number(row.amount));
    }

    return NextResponse.json(
      (profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        displayName: p.display_name,
        tier: p.tier as Tier,
        role: p.role,
        periodEnd: p.current_period_end,
        createdAt: p.created_at,
        charts: counts.get(p.id) ?? 0,
        paidTotal: totals.get(p.id) ?? 0,
      })),
    );
  } catch (e) {
    console.error('[api/admin/users]', e);
    return NextResponse.json({ error: 'Could not load accounts.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { session, deny } = await requireAdmin();
  if (deny) return deny;

  const body = (await req.json()) as {
    userId: string;
    tier: Tier;
    months?: number;
    amount?: number;
    method?: 'cash' | 'bank' | 'comp';
    note?: string;
  };

  const { userId, tier } = body;

  if (!userId || !['free', 'basic', 'pro', 'max'].includes(tier)) {
    return NextResponse.json({ error: 'A user and a valid plan are required.' }, { status: 400 });
  }

  if (userId === session.userId) {
    return NextResponse.json(
      { error: 'Change your own plan in the database, not here. Locking yourself out mid-support is avoidable.' },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();

  try {
    /* Dropping someone to Free is a revocation, not a payment. No ledger entry,
       and the period is cleared so nothing lingers. */
    if (tier === 'free') {
      const { error } = await db
        .from('profiles')
        .update({ tier: 'free', current_period_end: null, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      return NextResponse.json({ ok: true, tier: 'free' });
    }

    const listPrice = priceFor(tier);
    const months = body.months ?? listPrice.months;
    const method = body.method ?? 'cash';
    const amount = method === 'comp' ? 0 : (body.amount ?? listPrice.amount);

    /* Renewing the same plan adds to whatever is left rather than replacing it,
       exactly as a gateway payment would. */
    const { data: profile } = await db
      .from('profiles')
      .select('tier, current_period_end')
      .eq('id', userId)
      .maybeSingle();

    const existing = profile?.current_period_end ? Date.parse(profile.current_period_end) : 0;
    const base = profile?.tier === tier && existing > Date.now() ? new Date(existing) : new Date();
    const periodEnd = new Date(base);
    periodEnd.setMonth(periodEnd.getMonth() + months);

    const { error: ledgerError } = await db.from('payments').insert({
      user_id: userId,
      transaction_id: `MANUAL-${Date.now().toString(36).toUpperCase()}`,
      tier,
      amount,
      months,
      status: 'paid',
      method,
      recorded_by: session.userId,
      note: body.note ?? null,
      settled_at: new Date().toISOString(),
    });

    if (ledgerError) throw ledgerError;

    const { error: planError } = await db
      .from('profiles')
      .update({
        tier,
        current_period_end: periodEnd.toISOString(),
        last_paid_amount: amount,
        last_paid_months: months,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (planError) throw planError;

    return NextResponse.json({ ok: true, tier, periodEnd: periodEnd.toISOString() });
  } catch (e) {
    console.error('[api/admin/users] grant', e);
    return NextResponse.json({ error: 'Could not record that.' }, { status: 500 });
  }
}
