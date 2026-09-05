import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Session refresh and route protection.
 *
 * Supabase access tokens are short-lived. Without a middleware refresh the
 * session expires mid-consultation and the next save fails silently, which is
 * the worst possible moment to discover it.
 *
 * The redirect is the second job: anything under /dashboard or /api that is not
 * authentication itself requires a signed-in practitioner.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/+$/, ''),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );

  /* getUser rather than getSession: it revalidates against Supabase instead of
     trusting a cookie the browser could have been given by anyone. */
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/auth');

  if (!user && !isAuthRoute) {
    if (path.startsWith('/api')) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.searchParams.set('next', path);
    return NextResponse.redirect(login);
  }

  if (user && isAuthRoute) {
    const dashboard = request.nextUrl.clone();
    dashboard.pathname = '/dashboard';
    dashboard.search = '';
    return NextResponse.redirect(dashboard);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
