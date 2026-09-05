import 'server-only';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { entitlementsFor, type Entitlements, type Profile } from '@/lib/entitlements';

/**
 * The signed-in user and what they are allowed to do.
 *
 * Every route that touches data calls `requireSession` first. There is no path
 * that reads a profile or decides an entitlement anywhere else - a second
 * implementation is how the two drift apart and how a gap opens.
 */

export interface Session {
  userId: string;
  profile: Profile;
  entitlements: Entitlements;
}

export async function getSession(): Promise<Session | null> {
  const db = await supabaseServer();

  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;

  const { data } = await db
    .from('profiles')
    .select('id, email, tier, role, current_period_end')
    .eq('id', user.id)
    .single();

  /* A missing profile row means the signup trigger did not fire. Treating that
     as free rather than throwing keeps someone locked out of nothing but their
     paid features, which is the safer failure. */
  const profile: Profile = {
    id: user.id,
    email: data?.email ?? user.email ?? null,
    tier: data?.tier ?? 'free',
    role: data?.role ?? 'user',
    currentPeriodEnd: data?.current_period_end ?? null,
  };

  return { userId: user.id, profile, entitlements: entitlementsFor(profile) };
}

/** Guard for route handlers. Returns either a session or the response to send. */
export async function requireSession(): Promise<
  { session: Session; deny: null } | { session: null; deny: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { session: null, deny: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }) };
  }
  return { session, deny: null };
}

export function denyUpgrade(what: string, needs: string) {
  return NextResponse.json(
    {
      error: `${what} is not included in your plan.`,
      upgrade: { needs },
    },
    { status: 402 },
  );
}
