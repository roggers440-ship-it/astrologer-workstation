'use client';

import { createBrowserClient } from '@supabase/ssr';

/** Browser client. Used only for signing in and out; all data goes through routes. */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/+$/, ''),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
