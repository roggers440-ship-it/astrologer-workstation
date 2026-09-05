import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { requireSession } from '@/lib/session';
import { computeNatalChart } from '@/lib/astro-api';
import { buildReading } from '@/lib/reading';
import type { Client } from '@/types/astrology';

/**
 * The gated reading.
 *
 * This is now the only route that returns interpretive content. Everything is
 * computed here and filtered against the caller's plan before it is serialised,
 * so a locked house is absent from the response rather than hidden in it.
 *
 * Row level security decides whether the client can be read at all; entitlements
 * decide how much of the reading comes back. Both, not either.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;

  const { session, deny } = await requireSession();
  if (deny) return deny;

  try {
    const db = await supabaseServer();

    /* No practitioner filter: row level security applies it. A row this account
       may not read simply does not come back. */
    const { data, error } = await db.from('clients').select('*').eq('id', clientId).single();

    if (error || !data) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    const client: Client = {
      id: data.id,
      fullName: data.full_name,
      dob: data.dob,
      birthTime: data.birth_time,
      birthPlace: data.birth_place,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      timeConfidence: data.time_confidence ?? 'exact',
      createdAt: data.created_at,
    };

    const natal = await computeNatalChart(client);
    const reading = buildReading(natal, session.entitlements);

    return NextResponse.json(reading, {
      /* Private: the response differs per account, and a shared cache serving one
         user's paid reading to another would undo the whole gate. */
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    console.error('[api/reading]', e);
    const message = e instanceof Error ? e.message : 'The reading could not be built.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
