import { NextResponse } from 'next/server';
import { requireSession, denyUpgrade } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase';
import { rectify } from '@/lib/rectification';
import type { Client } from '@/types/astrology';

/**
 * Search for the birth time the chart actually fits.
 *
 * Practitioner work: it needs recorded life events, it takes seconds of compute,
 * and the result is a judgement to weigh rather than an answer to accept. It
 * sits behind the plan that expects both.
 */
export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;

  const { session, deny } = await requireSession();
  if (deny) return deny;

  if (session.entitlements.depth !== 'technical') {
    return denyUpgrade('Birth time rectification', 'max');
  }

  const { windowMinutes, stepMinutes } = (await req.json().catch(() => ({}))) as {
    windowMinutes?: number;
    stepMinutes?: number;
  };

  try {
    const db = await supabaseServer();

    const { data: row, error } = await db.from('clients').select('*').eq('id', clientId).single();
    if (error || !row) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });

    const { data: events } = await db
      .from('life_events')
      .select('kind, occurred_on, precision, note')
      .eq('client_id', clientId)
      .order('occurred_on');

    const client: Client = {
      id: row.id,
      fullName: row.full_name,
      dob: row.dob,
      birthTime: row.birth_time,
      birthPlace: row.birth_place,
      latitude: row.latitude,
      longitude: row.longitude,
      timezone: row.timezone,
      createdAt: row.created_at,
    };

    const result = await rectify(
      client,
      (events ?? []).map((e) => ({
        kind: e.kind,
        occurredOn: e.occurred_on,
        precision: e.precision,
        note: e.note,
      })),
      {
        /* Bounded server-side. A wide window at a fine step is thousands of
           ephemeris calls, and the caller does not pay for that. */
        windowMinutes: Math.min(Math.max(windowMinutes ?? 60, 10), 240),
        stepMinutes: Math.min(Math.max(stepMinutes ?? 2, 1), 15),
      },
    );

    return NextResponse.json(result);
  } catch (e) {
    console.error('[api/rectify]', e);
    const message = e instanceof Error ? e.message : 'The search failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
