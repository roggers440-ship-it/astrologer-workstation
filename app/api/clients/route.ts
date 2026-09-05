import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { requireSession, denyUpgrade } from '@/lib/session';
import { TIER_CHARTS } from '@/lib/entitlements';

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
 * Failures print the real Postgres error to the terminal. The browser gets a
 * plain sentence in production and the detail in development - debugging a save
 * failure through a generic message wastes an afternoon.
 */
function fail(where: string, error: unknown, friendly: string) {
  console.error(`[api/clients] ${where}:`, error);
  const detail = error instanceof Error ? error.message : JSON.stringify(error);
  return NextResponse.json(
    { error: friendly, detail: process.env.NODE_ENV === 'development' ? detail : undefined },
    { status: 500 },
  );
}

export async function GET() {
  const { session, deny } = await requireSession();
  if (deny) return deny;

  try {
    const db = await supabaseServer();
    /* No practitioner filter here on purpose: row level security applies it, and
       duplicating the rule in application code is how the two drift apart. */
    const { data, error } = await db
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return fail('select', error, 'Could not load clients.');
    return NextResponse.json((data ?? []).map(toClient));
  } catch (e) {
    return fail('connect', e, 'Could not reach the database.');
  }
}

export async function POST(req: Request) {
  const { session, deny } = await requireSession();
  if (deny) return deny;

  const body = await req.json();

  if (!body.fullName || !body.dob || !body.birthTime || !body.timezone) {
    return NextResponse.json({ error: 'Name, date, time and time zone are all required.' }, { status: 400 });
  }

  try {
    const db = await supabaseServer();

    /*
     * The chart limit is counted server-side against rows this account owns.
     * Counting in the browser would be a suggestion; counting here is the rule.
     */
    const { count } = await db
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('practitioner_id', session.userId);

    if ((count ?? 0) >= session.entitlements.chartLimit) {
      return denyUpgrade(
        `Your plan includes ${TIER_CHARTS[session.entitlements.tier].toLowerCase()}`,
        session.entitlements.tier === 'free' || session.entitlements.tier === 'basic' ? 'pro' : 'max',
      );
    }

    const user = { id: session.userId };

    const { data, error } = await db
      .from('clients')
      .insert({
        practitioner_id: user.id,
        full_name: body.fullName,
        dob: body.dob,
        birth_time: body.birthTime,
        birth_place: body.birthPlace,
        latitude: body.latitude,
        longitude: body.longitude,
        timezone: body.timezone,
        time_confidence: body.timeConfidence ?? 'exact',
      })
      .select()
      .single();

    if (error) return fail('insert', error, 'Could not save the client.');
    return NextResponse.json(toClient(data), { status: 201 });
  } catch (e) {
    return fail('connect', e, 'Could not reach the database.');
  }
}
