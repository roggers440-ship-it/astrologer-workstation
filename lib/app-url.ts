import 'server-only';

/**
 * The public address of this deployment.
 *
 * Payment routes build return URLs that a gateway redirects the customer back
 * to. Deriving those from the incoming request works on localhost and fails
 * behind a proxy: a platform rewrites the request to an internal hostname, so
 * `new URL(req.url).origin` becomes something the customer's browser cannot
 * reach, and they are sent nowhere after paying.
 *
 * Configured explicitly, with the request as a fallback for local development.
 */
export function appOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;

  /* Behind a proxy these carry the address the browser actually used. */
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;

  return new URL(req.url).origin;
}
