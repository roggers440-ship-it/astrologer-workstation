# Deploying

## Two things to settle before choosing a host

**The ephemeris is a native module.** `@swisseph/node` ships compiled N-API
binaries. It has to be in `serverExternalPackages` in `next.config.ts` — it is —
and the host has to keep `node_modules` intact rather than bundling everything
into one file. Vercel usually manages this; test it before committing, because
if it fails there is no workaround short of moving hosts.

The check, once deployed: load a client and confirm the lagna matches what you
see locally. If the module failed to load, positions will be wrong or the chart
route will 500 — either way you will know immediately.

**A VPS avoids the question entirely.** Railway, Render, Fly or a plain Ubuntu
box running `npm run build && npm start` runs a normal Node process with a real
filesystem. Slightly more setup, no native-module risk, and no cold starts on a
route that does a dozen ephemeris calls.

## Environment

```
NEXT_PUBLIC_APP_URL=https://your-domain

NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

GEMINI_API_KEY=AIza...
ANALYSIS_MODEL=gemini-3.7-flash

ESEWA_ENV=live
ESEWA_PRODUCT_CODE=your-merchant-code
ESEWA_SECRET_KEY=your-secret
ESEWA_PRICE_BASIC=499
ESEWA_PRICE_PRO=1499
ESEWA_PRICE_MAX=14999

GEOCODER_CONTACT=you@your-domain
```

`NEXT_PUBLIC_APP_URL` is new and matters. Payment return URLs were derived from
the incoming request, which works on localhost and breaks behind a proxy: the
platform rewrites the request to an internal hostname, so the customer is
redirected somewhere their browser cannot reach after paying.

`GEOCODER_CONTACT` goes into the User-Agent sent to Nominatim, which their usage
policy asks for. Without it you are an anonymous script and they may block you.

## Supabase

Authentication → URL Configuration:

- Site URL: `https://your-domain`
- Redirect URLs: `https://your-domain/**`

Without this, sign-in redirects to localhost.

Confirm all ten migrations have run, then make yourself admin:

```sql
update profiles set role = 'admin', tier = 'max' where email = 'you@example.com';
```

## eSewa

Live needs a merchant account. The sandbox credentials in `lib/esewa.ts` are
defaults for test mode only, and `ESEWA_ENV=live` switches both the gateway and
the verification endpoint.

**No payment has completed end to end yet.** Take one real low-value payment on
the live account before announcing anything.

## Known, and deliberate

**The confidential gate is a privacy screen, not access control.** It uses a
`NEXT_PUBLIC_` variable, so the passphrase is readable in the bundle. That is
what it is for — stopping a client reading the screen over the practitioner's
shoulder — and it should not be described to anyone as security.

**Longevity is computed in the browser** from the positions every tier receives,
so the ayurdaya gate is cosmetic in the same way. If it ever becomes something
you sell, it has to move server-side like the rest of the reading.

## After deploying, in order

1. Load a client. Confirm the lagna matches your local copy — that is the
   ephemeris test.
2. Sign up on a second account, leave it free, and look at what it shows.
3. Take one live eSewa payment.
4. Generate one written analysis, to confirm the Gemini key and model.
5. Search a place in the intake form, to confirm Nominatim is not blocking you.
