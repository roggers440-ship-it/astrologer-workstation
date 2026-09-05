import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

const toClient = (r: any) => ({
  id: r.id,
  fullName: r.full_name,
  dob: r.dob,
  birthTime: r.birth_time,
  birthPlace: r.birth_place,
  latitude: r.latitude,
  longitude: r.longitude,
  timezone: r.timezone,
  timeConfidence: r.time_confidence ?? 'exact',
  contact: r.contact ?? undefined,
  createdAt: r.created_at,
});

/**
 * Partial update for a single client.
 *
 * Deliberately narrow: only the fields that are editable after intake. Birth
 * data is not among them - changing a birth time silently invalidates every
 * cached chart, dasha tree and reading derived from it, so that belongs behind a
 * deliberate recalculation flow rather than an inline edit.
 */
const EDITABLE: Record<string, string> = {
  contact: 'contact',
  fullName: 'full_name',
  birthPlace: 'birth_place',
  timeConfidence: 'time_confidence',
};

export async function PATCH(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const body = await req.json();

  const patch: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(EDITABLE)) {
    if (key in body) patch[column] = body[key] === '' ? null : body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  try {
    const db = await supabaseServer();

    const { data, error } = await db
      .from('clients')
      .update(patch)
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      console.error('[api/clients PATCH]', error);
      return NextResponse.json(
        { error: 'Could not save the change.', detail: process.env.NODE_ENV === 'development' ? error.message : undefined },
        { status: 500 },
      );
    }

    return NextResponse.json(toClient(data));
  } catch (e) {
    console.error('[api/clients PATCH] connect', e);
    return NextResponse.json({ error: 'Could not reach the database.' }, { status: 500 });
  }
}
