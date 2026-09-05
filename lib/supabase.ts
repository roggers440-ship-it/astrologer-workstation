import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Database access.
 *
 * Two clients, and the distinction is the whole security model.
 *
 * `supabaseServer` carries the signed-in practitioner's session, so every query
 * runs under row level security and can only reach their own rows. This is what
 * routes should use.
 *
 * `supabaseAdmin` uses the service role key and bypasses row level security
 * entirely. Every route in this application used it during development, which
 * meant anyone who could reach the server could read every client's birth data
 * and session notes. It remains only for operations that legitimately have no
 * user - and there are currently none.
 */

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.',
    );
  }

  const clean = url.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(clean)) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL should be just the project origin, like https://abcdefgh.supabase.co - got "${clean}". Remove any path, trailing slash or quotes.`,
    );
  }

  return { url: clean, anon };
}

/** Session-scoped client. Row level security applies. Use this. */
export async function supabaseServer() {
  const { url, anon } = config();
  const store = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        /* Route handlers can write cookies; server components cannot, and throw.
           The middleware refreshes the session either way, so swallowing here is
           correct rather than lazy. */
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          /* called from a server component */
        }
      },
    },
  });
}

/** The signed-in practitioner, or null. */
export async function currentUser() {
  const db = await supabaseServer();
  const { data } = await db.auth.getUser();
  return data.user;
}

/**
 * Service-role client. Bypasses row level security completely.
 *
 * Reach for this only when there is genuinely no user in the request. If you are
 * using it inside a route that a practitioner triggered, that route is a hole.
 */
export function supabaseAdmin() {
  const { url } = config();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  return createClient(url, key, { auth: { persistSession: false } });
}
