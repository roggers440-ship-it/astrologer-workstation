import { NextResponse } from 'next/server';

/**
 * Place lookup, proxied through the server.
 *
 * Nominatim is OpenStreetMap's geocoder: free, no key, and it asks for a
 * User-Agent identifying the application plus no more than one request a second.
 * Going through a route rather than calling it from the browser lets us set that
 * header, keeps the policy in one place, and sidesteps CORS.
 */

const CONTACT = process.env.GEOCODER_CONTACT ?? 'astrologer-workstation';

/**
 * Single-timezone countries, by ISO code. Nominatim returns the country
 * reliably, so for these the zone can be filled in with confidence.
 *
 * Countries spanning several zones are deliberately absent - guessing a zone for
 * the United States or Australia from a country code would be wrong often enough
 * to matter, and a wrong zone silently shifts the ascendant by hours. Those fall
 * through to the picker.
 */
const COUNTRY_TIMEZONE: Record<string, string> = {
  np: 'Asia/Kathmandu', in: 'Asia/Kolkata', bd: 'Asia/Dhaka', lk: 'Asia/Colombo',
  pk: 'Asia/Karachi', bt: 'Asia/Thimphu', mm: 'Asia/Yangon', th: 'Asia/Bangkok',
  vn: 'Asia/Ho_Chi_Minh', sg: 'Asia/Singapore', my: 'Asia/Kuala_Lumpur',
  ph: 'Asia/Manila', jp: 'Asia/Tokyo', kr: 'Asia/Seoul', hk: 'Asia/Hong_Kong',
  tw: 'Asia/Taipei', ae: 'Asia/Dubai', sa: 'Asia/Riyadh', qa: 'Asia/Qatar',
  kw: 'Asia/Kuwait', om: 'Asia/Muscat', bh: 'Asia/Bahrain', il: 'Asia/Jerusalem',
  tr: 'Europe/Istanbul', ir: 'Asia/Tehran', iq: 'Asia/Baghdad', af: 'Asia/Kabul',
  gb: 'Europe/London', ie: 'Europe/Dublin', fr: 'Europe/Paris', de: 'Europe/Berlin',
  nl: 'Europe/Amsterdam', be: 'Europe/Brussels', ch: 'Europe/Zurich', at: 'Europe/Vienna',
  it: 'Europe/Rome', es: 'Europe/Madrid', pt: 'Europe/Lisbon', se: 'Europe/Stockholm',
  no: 'Europe/Oslo', dk: 'Europe/Copenhagen', fi: 'Europe/Helsinki', pl: 'Europe/Warsaw',
  cz: 'Europe/Prague', hu: 'Europe/Budapest', ro: 'Europe/Bucharest', gr: 'Europe/Athens',
  ua: 'Europe/Kyiv', za: 'Africa/Johannesburg', ke: 'Africa/Nairobi', ng: 'Africa/Lagos',
  eg: 'Africa/Cairo', ma: 'Africa/Casablanca', gh: 'Africa/Accra', tz: 'Africa/Dar_es_Salaam',
  ug: 'Africa/Kampala', et: 'Africa/Addis_Ababa', nz: 'Pacific/Auckland',
  fj: 'Pacific/Fiji', ar: 'America/Argentina/Buenos_Aires', cl: 'America/Santiago',
  pe: 'America/Lima', co: 'America/Bogota', ve: 'America/Caracas', cu: 'America/Havana',
  jm: 'America/Jamaica', tt: 'America/Port_of_Spain', mu: 'Indian/Mauritius',
  mv: 'Indian/Maldives', np_: 'Asia/Kathmandu',
};

export interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
  countryCode: string | null;
  /** Null when the country spans several zones - the picker decides. */
  timezone: string | null;
}

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.get('q')?.trim();
  if (!query || query.length < 3) return NextResponse.json([]);

  const url =
    'https://nominatim.openstreetmap.org/search' +
    `?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&limit=6`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': `AstrologerWorkstation/1.0 (${CONTACT})`,
        'Accept-Language': 'en',
      },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });

    if (!res.ok) throw new Error(`Nominatim returned ${res.status}`);

    const raw = (await res.json()) as any[];

    const results: GeocodeResult[] = raw.map((r) => {
      const code = (r.address?.country_code ?? null) as string | null;
      return {
        label: r.display_name,
        latitude: Number(r.lat),
        longitude: Number(r.lon),
        countryCode: code,
        timezone: code ? COUNTRY_TIMEZONE[code] ?? null : null,
      };
    });

    return NextResponse.json(results);
  } catch (e) {
    console.error('[api/geocode]', e);
    return NextResponse.json({ error: 'Place lookup is unavailable. Enter coordinates by hand.' }, { status: 502 });
  }
}
