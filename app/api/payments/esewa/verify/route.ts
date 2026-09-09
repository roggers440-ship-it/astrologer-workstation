import { NextResponse } from 'next/server';
import { appOrigin } from '@/lib/app-url';
import { supabaseAdmin } from '@/lib/supabase';
import { confirmWithEsewa, esewaConfig, parseAmount, verifyResponse } from '@/lib/esewa';

/**
 * The customer comes back from eSewa.
 *
 * Four checks, all required, because this arrives as a browser redirect and a
 * browser is not a trustworthy narrator:
 *
 *   1. the receipt's own signature verifies against our secret
 *   2. a pending payment with that id exists
 *   3. the amount matches what we recorded, not what the receipt claims
 *   4. eSewa confirms the transaction server to server
 *
 * Only then is the plan granted. Any single check passing alone would be enough
 * for someone to upgrade themselves for free.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = appOrigin(req);
  const encoded = url.searchParams.get('data');
  const fail = (why: string) =>
    NextResponse.redirect(`${origin}/settings?payment=failed&reason=${encodeURIComponent(why)}`);

  if (!encoded) return fail('no receipt');

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as Record<string, string>;
    const { secret } = esewaConfig();

    if (payload.status !== 'COMPLETE') return fail(payload.status ?? 'not complete');
    if (!verifyResponse(payload, secret)) return fail('signature');

    const db = supabaseAdmin();

    /*
     * Only columns that exist. Selecting an absent one makes PostgREST reject
     * the whole query, and a rejected query returns null data - which the code
     * below would otherwise read as "no such payment" and report as an unknown
     * transaction, after the customer has already been charged.
     */
    const { data: payment, error: lookupError } = await db
      .from('payments')
      .select('id, user_id, tier, amount, months, status')
      .eq('transaction_id', payload.transaction_uuid)
      .maybeSingle();

    /* A failed query and a missing row are different problems and must not share
       a message. One is a bug in this file; the other is a forged callback. */
    if (lookupError) {
      console.error('[payments/esewa/verify] lookup failed:', lookupError);
      return fail('lookup failed');
    }

    if (!payment) {
      console.error('[payments/esewa/verify] no payment row for', payload.transaction_uuid);
      return fail('unknown transaction');
    }

    /* Already settled: a refresh or a replayed link, not a second payment. */
    if (payment.status === 'paid') {
      return NextResponse.redirect(`${origin}/dashboard?payment=already`);
    }

    if (Math.abs(parseAmount(payload.total_amount) - Number(payment.amount)) > 0.5) {
      console.error('[payments/esewa/verify] amount mismatch', payload.total_amount, 'vs', payment.amount);
      return fail('amount mismatch');
    }

    const confirmed = await confirmWithEsewa(payload.transaction_uuid, Number(payment.amount));
    if (!confirmed.ok) return fail(`eSewa says ${confirmed.status}`);

    /*
     * Renewing the same plan adds to the remaining period rather than replacing
     * it. Someone who pays early should not lose the days they already had.
     */
    const { data: profile } = await db
      .from('profiles')
      .select('tier, current_period_end')
      .eq('id', payment.user_id)
      .maybeSingle();

    const existing = profile?.current_period_end ? Date.parse(profile.current_period_end) : 0;
    const sameTier = profile?.tier === payment.tier;
    const base = sameTier && existing > Date.now() ? new Date(existing) : new Date();

    const periodEnd = new Date(base);
    periodEnd.setMonth(periodEnd.getMonth() + payment.months);

    const { error: settleError } = await db
      .from('payments')
      .update({
        status: 'paid',
        esewa_ref: confirmed.reference ?? payload.transaction_code,
        settled_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (settleError) {
      console.error('[payments/esewa/verify] could not settle:', settleError);
      return fail('could not record the payment');
    }

    const { error: planError } = await db
      .from('profiles')
      .update({
        tier: payment.tier,
        current_period_end: periodEnd.toISOString(),
        /* Kept so a later upgrade can credit what is unused. */
        last_paid_amount: payment.amount,
        last_paid_months: payment.months,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.user_id);

    if (planError) {
      /* The money is taken and the payment is marked paid, so this must be
         visible rather than swallowed - it is the one failure that leaves a
         customer out of pocket and on the wrong plan. */
      console.error('[payments/esewa/verify] PAID BUT PLAN NOT APPLIED:', payment.id, planError);
      return fail('paid, but the plan could not be applied - contact support');
    }

    return NextResponse.redirect(`${origin}/dashboard?upgraded=${payment.tier}`);
  } catch (e) {
    console.error('[payments/esewa/verify]', e);
    return fail('verification error');
  }
}
