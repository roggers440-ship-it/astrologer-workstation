import { NextResponse } from 'next/server';
import { computeNatalChart } from '@/lib/astro-api';
import { supabaseServer } from '@/lib/supabase';
import { requireSession } from '@/lib/session';
import type { Client } from '@/types/astrology';

/**
 * Chart computation stays on the server: the ephemeris key never ships to the
 * browser, and the result is cached per client so switching vargas or tabs does
 * not re-hit the provider.
 *
 * `params` is a promise from Next 15 onwards and must be awaited.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;

  const { session, deny } = await requireSession();
  if (deny) return deny;

  try {
    const db = await supabaseServer();
    const { data, error } = await db.from('clients').select('*').eq('id', clientId).single();

    if (error || !data) {
      console.error('[api/chart] client lookup:', error);
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

    /*
     * This route exists to draw the chart wheel, not to read it. Without the
     * timing entitlement the dasha tree is removed entirely - it is a complete
     * timeline of the life, and shipping it to a free account would hand over
     * the one thing that plan is paying to unlock.
     */
    const payload = session.entitlements.timing
      ? natal
      : { ...natal, dashaTree: [], transits: [] };

    return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    console.error('[api/chart] compute:', e);
    const message = e instanceof Error ? e.message : 'Chart calculation failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
