import { NextResponse } from 'next/server';
import { computeNatalChart } from '@/lib/astro-api';
import { supabaseAdmin } from '@/lib/supabase';
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

  try {
    const { data, error } = await supabaseAdmin().from('clients').select('*').eq('id', clientId).single();

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
    return NextResponse.json(natal, { headers: { 'Cache-Control': 'private, max-age=3600' } });
  } catch (e) {
    console.error('[api/chart] compute:', e);
    const message = e instanceof Error ? e.message : 'Chart calculation failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
