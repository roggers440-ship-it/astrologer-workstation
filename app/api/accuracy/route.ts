import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase';

/**
 * How often the software was right.
 *
 * Derived from the votes every time it is asked rather than kept as a running
 * total. A stale accuracy figure is worse than none - it would be quoted with
 * the same confidence and be wrong.
 */
export async function GET() {
  const { session, deny } = await requireSession();
  if (deny) return deny;

  const db = await supabaseServer();

  const { data, error } = await db
    .from('chart_feedback')
    .select('source, verdict, claim, created_at, client_id')
    .eq('practitioner_id', session.userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api/accuracy]', error);
    return NextResponse.json({ error: 'Could not load the record.' }, { status: 500 });
  }

  const rows = data ?? [];
  const bySource = new Map<string, { landed: number; partly: number; missed: number }>();

  for (const row of rows) {
    const tally = bySource.get(row.source) ?? { landed: 0, partly: 0, missed: 0 };
    if (row.verdict === 'yes') tally.landed++;
    else if (row.verdict === 'partly') tally.partly++;
    else tally.missed++;
    bySource.set(row.source, tally);
  }

  /* A partial counts as half. Treating it as a hit flatters the software;
     treating it as a miss throws away the most common honest answer. */
  const scoreOf = (landed: number, partly: number, total: number) =>
    total > 0 ? Math.round(((landed + partly * 0.5) / total) * 100) : null;

  const sources = [...bySource.entries()]
    .map(([source, t]) => {
      const total = t.landed + t.partly + t.missed;
      return { source, ...t, total, score: scoreOf(t.landed, t.partly, total) };
    })
    .sort((a, b) => b.total - a.total);

  const totals = sources.reduce(
    (acc, s) => ({
      landed: acc.landed + s.landed,
      partly: acc.partly + s.partly,
      missed: acc.missed + s.missed,
      total: acc.total + s.total,
    }),
    { landed: 0, partly: 0, missed: 0, total: 0 },
  );

  return NextResponse.json({
    sources,
    totals: { ...totals, score: scoreOf(totals.landed, totals.partly, totals.total) },
    /* The misses, in full. They are the only entries that can teach anything,
       and burying them under a percentage is how software stays wrong. */
    misses: rows.filter((r) => r.verdict === 'no').slice(0, 25),
  });
}
