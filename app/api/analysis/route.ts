import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { requireSession, denyUpgrade } from '@/lib/session';
import { computeNatalChart } from '@/lib/astro-api';
import { getLanguageModel } from '@/lib/llm/provider';
import { buildBrief, factHash, instructionFor, type AnalysisMode } from '@/lib/llm/brief';
import type { Client } from '@/types/astrology';

/**
 * Written analysis, generated once per chart and cached.
 *
 * The model is expensive relative to everything else in this application and
 * deterministic in its inputs, so a result is stored against the client and the
 * hash of the facts that produced it. It regenerates only when the facts change -
 * which is to say when the birth data is corrected.
 */
export async function POST(req: Request) {
  const { clientId, mode, scope, force } = (await req.json()) as {
    clientId: string;
    mode: AnalysisMode;
    scope?: number;
    /** Set by the refresh control. Without it, refresh returns the stored copy
        and no amount of fixing upstream ever becomes visible. */
    force?: boolean;
  };

  if (!clientId || !mode) {
    return NextResponse.json({ error: 'clientId and mode are required.' }, { status: 400 });
  }

  const { session, deny } = await requireSession();
  if (deny) return deny;

  /* Generated analysis is the only per-user cost in the application, so it is
     also the cleanest thing to put behind the first paid tier. */
  if (!session.entitlements.analysis) {
    return denyUpgrade('The written analysis', 'basic');
  }

  const model = getLanguageModel();
  if (!model) {
    return NextResponse.json(
      { error: 'Written analysis is not configured. Set GEMINI_API_KEY in .env.local and restart.' },
      { status: 501 },
    );
  }

  const db = await supabaseServer();

  try {
    const { data: row, error } = await db.from('clients').select('*').eq('id', clientId).single();
    if (error || !row) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });

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

    const natal = await computeNatalChart(client);
    const facts = buildBrief(natal, mode, scope);
    const hash = factHash(facts);

    const { data: cached } = force
      ? { data: null }
      : await db
      .from('chart_analyses')
      .select('content, model, created_at')
      .eq('client_id', clientId)
      .eq('mode', mode)
      .eq('scope', scope ?? 0)
      .eq('fact_hash', hash)
      .maybeSingle();

    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    const content = await model.generate({ instruction: instructionFor(mode), facts });

    /* Upsert rather than insert: a corrected birth time produces a new hash for
       the same client, mode and scope, and the stale row should be replaced. */
    await db
      .from('chart_analyses')
      .upsert(
        {
          client_id: clientId,
          mode,
          scope: scope ?? 0,
          fact_hash: hash,
          content,
          model: model.name,
        },
        { onConflict: 'client_id,mode,scope' },
      );

    return NextResponse.json({ content, model: model.name, cached: false });
  } catch (e) {
    console.error('[api/analysis]', e);
    const message = e instanceof Error ? e.message : 'The analysis could not be generated.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
