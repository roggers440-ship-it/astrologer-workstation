import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase';

/**
 * Record whether a claim landed.
 *
 * Deliberately cheap: one call, no dialog, no required note. Feedback that costs
 * effort does not get given, and a calibration record with three entries is
 * worth nothing.
 */
export async function POST(req: Request) {
  const { session, deny } = await requireSession();
  if (deny) return deny;

  const { clientId, source, scope, claim, verdict, note } = (await req.json()) as {
    clientId: string;
    source: string;
    scope?: string;
    claim: string;
    verdict: 'yes' | 'partly' | 'no';
    note?: string;
  };

  if (!clientId || !source || !claim || !['yes', 'partly', 'no'].includes(verdict)) {
    return NextResponse.json({ error: 'Incomplete feedback.' }, { status: 400 });
  }

  try {
    const db = await supabaseServer();

    const { error } = await db.from('chart_feedback').upsert(
      {
        client_id: clientId,
        practitioner_id: session.userId,
        source,
        scope: scope ?? '',
        /* Stored verbatim. If the generator is later reworded, the record still
           shows what was actually said when the verdict was given. */
        claim,
        verdict,
        note: note ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,source,scope' },
    );

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/feedback]', e);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }
}

/** Existing verdicts for a client, so the controls show what was already said. */
export async function GET(req: Request) {
  const { deny } = await requireSession();
  if (deny) return deny;

  const clientId = new URL(req.url).searchParams.get('clientId');
  if (!clientId) return NextResponse.json({ error: 'clientId is required.' }, { status: 400 });

  const db = await supabaseServer();
  const { data } = await db
    .from('chart_feedback')
    .select('source, scope, verdict')
    .eq('client_id', clientId);

  return NextResponse.json(data ?? []);
}
