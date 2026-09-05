import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

const toNote = (r: any) => ({
  id: r.id,
  clientId: r.client_id,
  sessionDate: r.session_date,
  topicIds: r.topic_ids ?? [],
  summary: r.summary,
  clientConfirmed: r.client_confirmed ?? undefined,
  followUpAt: r.follow_up_at ?? undefined,
  createdBy: r.created_by,
});

function fail(where: string, error: unknown, friendly: string) {
  console.error(`[api/notes] ${where}:`, error);
  const detail = error instanceof Error ? error.message : JSON.stringify(error);
  return NextResponse.json(
    { error: friendly, detail: process.env.NODE_ENV === 'development' ? detail : undefined },
    { status: 500 },
  );
}

/** `params` is a promise from Next 15 onwards and must be awaited. */
export async function GET(_req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;

  try {
    const db = await supabaseServer();

    const { data, error } = await db
      .from('consultation_notes')
      .select('*')
      .eq('client_id', clientId)
      .order('session_date', { ascending: false });

    if (error) return fail('select', error, 'Could not load session notes.');
    return NextResponse.json((data ?? []).map(toNote));
  } catch (e) {
    return fail('connect', e, 'Could not reach the database.');
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const body = await req.json();
  const db = await supabaseServer();

  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const { data, error } = await db
      .from('consultation_notes')
      .insert({
        client_id: clientId,
        session_date: body.sessionDate ?? new Date().toISOString(),
        topic_ids: body.topicIds ?? [],
        summary: body.summary,
        client_confirmed: body.clientConfirmed ?? null,
        follow_up_at: body.followUpAt ?? null,
      })
      .select()
      .single();

    if (error) return fail('insert', error, 'Could not save the note.');
    return NextResponse.json(toNote(data), { status: 201 });
  } catch (e) {
    return fail('connect', e, 'Could not reach the database.');
  }
}
