import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase';

/**
 * Life events: what actually happened, and when.
 *
 * The calibration record on one side and the input to birth time rectification
 * on the other. A chart can be tested against known dates only if the known
 * dates are written down, and `precision` matters as much as the date itself -
 * a rectification that treats "some time in 2019" as a precise day will fit
 * noise and produce a confident wrong answer.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const { deny } = await requireSession();
  if (deny) return deny;

  const db = await supabaseServer();
  const { data, error } = await db
    .from('life_events')
    .select('id, kind, occurred_on, precision, note')
    .eq('client_id', clientId)
    .order('occurred_on', { ascending: false });

  if (error) {
    console.error('[api/events]', error);
    return NextResponse.json({ error: 'Could not load events.' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const { session, deny } = await requireSession();
  if (deny) return deny;

  const body = (await req.json()) as {
    kind: string;
    occurredOn: string;
    precision?: 'day' | 'month' | 'year';
    note?: string;
  };

  if (!body.kind || !body.occurredOn) {
    return NextResponse.json({ error: 'A kind and a date are required.' }, { status: 400 });
  }

  const db = await supabaseServer();
  const { data, error } = await db
    .from('life_events')
    .insert({
      client_id: clientId,
      practitioner_id: session.userId,
      kind: body.kind,
      occurred_on: body.occurredOn,
      precision: body.precision ?? 'day',
      note: body.note ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[api/events] insert', error);
    return NextResponse.json({ error: 'Could not save that event.' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const { deny } = await requireSession();
  if (deny) return deny;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'An event id is required.' }, { status: 400 });

  const db = await supabaseServer();
  const { error } = await db.from('life_events').delete().eq('id', id).eq('client_id', clientId);

  if (error) return NextResponse.json({ error: 'Could not remove that.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
