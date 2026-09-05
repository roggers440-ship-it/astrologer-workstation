import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
import { esewaConfig, newTransactionId, priceFor, signRequest } from '@/lib/esewa';
import { planChange, type CurrentPlan } from '@/lib/upgrade';
import type { Tier } from '@/lib/entitlements';

/**
 * Begin a payment.
 *
 * The plan comes from the request but the price comes from the server, so a
 * tampered call can only choose a different real plan - never a price of its
 * own. Unused time on a running plan is credited here rather than discarded,
 * because charging full price for an upgrade means the subscriber forfeits days
 * they already paid for.
 */
export async function POST(req: Request) {
  const { session, deny } = await requireSession();
  if (deny) return deny;

  const { tier } = (await req.json()) as { tier: Tier };

  if (!['basic', 'pro', 'max'].includes(tier)) {
    return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });
  }

  try {
    const { gateway, productCode, secret } = esewaConfig();
    const { amount, months } = priceFor(tier);
    const admin = supabaseAdmin();

    const { data: profile } = await admin
      .from('profiles')
      .select('tier, current_period_end, last_paid_amount, last_paid_months')
      .eq('id', session.userId)
      .single();

    const current: CurrentPlan = {
      tier: profile?.tier ?? 'free',
      periodEnd: profile?.current_period_end ?? null,
      paidAmount: profile?.last_paid_amount ?? null,
      paidMonths: profile?.last_paid_months ?? null,
    };

    const change = planChange(current, tier, amount);

    if (!change.allowed) {
      return NextResponse.json({ error: change.explanation }, { status: 400 });
    }

    /* eSewa will not take a zero-rupee payment, so a fully credited upgrade is
       applied directly rather than sent to the gateway. */
    if (change.charge < 1) {
      const end = new Date();
      end.setMonth(end.getMonth() + months);

      await admin
        .from('profiles')
        .update({
          tier,
          current_period_end: end.toISOString(),
          last_paid_amount: amount,
          last_paid_months: months,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.userId);

      return NextResponse.json({ applied: true, tier });
    }

    const transactionId = newTransactionId();
    const total = Math.round(change.charge).toFixed(0);

    /* Recorded as pending before the customer leaves. The callback verifies
       against this row, and without it a forged receipt has nothing to fail. */
    const { error } = await admin.from('payments').insert({
      user_id: session.userId,
      transaction_id: transactionId,
      tier,
      /* What is actually being charged after credit, not the list price - the
         callback checks the receipt against this figure. */
      amount: Number(total),
      months,
      status: 'pending',
    });

    if (error) throw error;

    const origin = new URL(req.url).origin;

    return NextResponse.json({
      gateway,
      quote: { charge: Number(total), credit: Math.round(change.credit), kind: change.kind },
      fields: {
        amount: total,
        tax_amount: '0',
        total_amount: total,
        transaction_uuid: transactionId,
        product_code: productCode,
        product_service_charge: '0',
        product_delivery_charge: '0',
        success_url: `${origin}/api/payments/esewa/verify`,
        failure_url: `${origin}/settings?payment=failed`,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature: signRequest(total, transactionId, productCode, secret),
      },
    });
  } catch (e) {
    console.error('[payments/esewa/start]', e);
    const message = e instanceof Error ? e.message : 'The payment could not be started.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
