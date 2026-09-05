import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { confirmWithEsewa, esewaConfig, parseAmount, verifyResponse } from '@/lib/esewa';

/**
 * The customer comes back from eSewa.
 *
 * Four checks, all of them required, because this arrives as a browser redirect
 * and a browser is not a trustworthy narrator:
 *
 *   1. the receipt's own signature verifies against our secret
 *   2. a pending payment with that id exists and belongs to someone
 *   3. the amount matches what we recorded, not what the receipt claims
 *   4. eSewa confirms the transaction server to server
 *
 * Only then is the plan granted. Any single check passing on its own would be
 * enough for someone to upgrade themselves for free.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const encoded = url.searchParams.get('data');
  const fail = (why: string) =>
    NextResponse.redirect(`${url.origin}/plans?payment=failed&reason=${encodeURIComponent(why)}`);

  if (!encoded) return fail('no receipt');

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as Record<string, string>;
    const { secret } = esewaConfig();

    if (payload.status !== 'COMPLETE') return fail(payload.status ?? 'not complete');
    if (!verifyResponse(payload, secret)) return fail('signature');

    const db = supabaseAdmin();

    const { data: payment } = await db
      .from('payments')
      .select('id, user_id, tier, amount, months, status, period_end')
      .eq('transaction_id', payload.transaction_uuid)
      .single();

    if (!payment) return fail('unknown transaction');

    /* Already settled: this is a refresh or a replayed link, not a second
       payment. Send them on rather than granting another period. */
    if (payment.status === 'paid') {
      return NextResponse.redirect(`${url.origin}/dashboard?payment=already`);
    }

    if (Math.abs(parseAmount(payload.total_amount) - Number(payment.amount)) > 0.5) {
      return fail('amount mismatch');
    }

    const confirmed = await confirmWithEsewa(payload.transaction_uuid, Number(payment.amount));
    if (!confirmed.ok) return fail(`eSewa says ${confirmed.status}`);

    /* The period was fixed when the quote was made. Recomputing it here would
       silently drop the credit a renewal was supposed to preserve. */
    const periodEnd = payment.period_end
      ? new Date(payment.period_end)
      : (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + payment.months);
          return d;
        })();

    await db
      .from('payments')
      .update({ status: 'paid', esewa_ref: confirmed.reference ?? payload.transaction_code, settled_at: new Date().toISOString() })
      .eq('id', payment.id);

    await db
      .from('profiles')
      .update({
        tier: payment.tier,
        current_period_end: periodEnd.toISOString(),
        /* Kept so a later upgrade can work out what is unused. */
        last_paid_amount: payment.amount,
        last_paid_months: payment.months,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.user_id);

    return NextResponse.redirect(`${url.origin}/dashboard?upgraded=${payment.tier}`);
  } catch (e) {
    console.error('[payments/esewa/verify]', e);
    return fail('verification error');
  }
}
