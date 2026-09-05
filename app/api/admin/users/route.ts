import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
import type { Tier } from '@/lib/entitlements';

/**
 * Admin: read every account, and change a plan by hand.
 *
 * Manual tier changes matter more than they look. Comping a friend, fixing a
 * failed webhook, or reversing a bad charge all need a control that does not go
 * through Stripe, and without one the only option is editing the database
 * directly during a support conversation.
 */

async function requireAdmin() {
  const { session, deny } = await requireSession();
  if (deny) return { session: null, deny };
  if (session.entitlements.role !== 'admin') {
    return { session: null, deny: NextResponse.json({ error: 'Not permitted.' }, { status: 403 }) };
  }
  return { session, deny: null };
}

export async function GET() {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  try {
    const db = supabaseAdmin();

    const { data: profiles, error } = await db
      .from('profiles')
      .select('id, email, display_name, tier, role, current_period_end, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    /* Chart counts in one query rather than one per user. */
    const { data: clients } = await db.from('clients').select('practitioner_id');
    const counts = new Map<string, number>();
    for (const row of clients ?? []) {
      counts.set(row.practitioner_id, (counts.get(row.practitioner_id) ?? 0) + 1);
    }

    return NextResponse.json(
      (profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        displayName: p.display_name,
        tier: p.tier as Tier,
        role: p.role,
        periodEnd: p.current_period_end,
        createdAt: p.created_at,
        charts: counts.get(p.id) ?? 0,
      })),
    );
  } catch (e) {
    console.error('[api/admin/users]', e);
    return NextResponse.json({ error: 'Could not load accounts.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { session, deny } = await requireAdmin();
  if (deny) return deny;

  const { userId, tier } = (await req.json()) as { userId: string; tier: Tier };

  if (!userId || !['free', 'basic', 'pro', 'max'].includes(tier)) {
    return NextResponse.json({ error: 'A user and a valid plan are required.' }, { status: 400 });
  }

  if (userId === session.userId) {
    return NextResponse.json(
      { error: 'Change your own plan in the database, not here. Locking yourself out mid-support is avoidable.' },
      { status: 400 },
    );
  }

  try {
    const { error } = await supabaseAdmin()
      .from('profiles')
      .update({
        tier,
        /* A manual grant has no billing period, so clear it - otherwise an old
           expiry from a lapsed subscription would immediately undo the change. */
        current_period_end: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/admin/users] patch', e);
    return NextResponse.json({ error: 'Could not change the plan.' }, { status: 500 });
  }
}
