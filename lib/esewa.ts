import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';
import type { Tier } from '@/lib/entitlements';

/**
 * eSewa ePay v2.
 *
 * A form-redirect gateway rather than an API-first one: we sign a set of fields,
 * the browser posts them to eSewa, and eSewa redirects back with a signed,
 * base64-encoded receipt.
 *
 * eSewa has no recurring billing, so a subscription here is a fixed period paid
 * up front. That is not a limitation to work around - the entitlement layer
 * already drops an account to free once `current_period_end` passes, so an
 * unrenewed plan lapses on its own.
 */

const TEST_GATEWAY = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
const LIVE_GATEWAY = 'https://epay.esewa.com.np/api/epay/main/v2/form';

const TEST_STATUS = 'https://rc.esewa.com.np/api/epay/transaction/status/';
const LIVE_STATUS = 'https://epay.esewa.com.np/api/epay/transaction/status/';

/* eSewa's published sandbox credentials. Overridden by the environment in live. */
const TEST_PRODUCT_CODE = 'EPAYTEST';
const TEST_SECRET = '8gBm/:&EnhH.1/q';

export function esewaConfig() {
  const live = process.env.ESEWA_ENV === 'live';
  return {
    live,
    gateway: live ? LIVE_GATEWAY : TEST_GATEWAY,
    statusUrl: live ? LIVE_STATUS : TEST_STATUS,
    productCode: process.env.ESEWA_PRODUCT_CODE ?? TEST_PRODUCT_CODE,
    secret: process.env.ESEWA_SECRET_KEY ?? TEST_SECRET,
  };
}

/** Price in rupees per plan, and how long the payment buys. */
export interface PlanPrice {
  amount: number;
  months: number;
}

export function priceFor(tier: Tier): PlanPrice {
  const read = (key: string, fallback: number) => Number(process.env[key] ?? fallback);

  switch (tier) {
    case 'basic':
      return { amount: read('ESEWA_PRICE_BASIC', 499), months: 1 };
    case 'pro':
      return { amount: read('ESEWA_PRICE_PRO', 1499), months: 1 };
    case 'max':
      /* The practitioner plan is annual: it is priced for someone whose living
         depends on it, and a yearly commitment suits both sides. */
      return { amount: read('ESEWA_PRICE_MAX', 14999), months: 12 };
    default:
      throw new Error('The free plan has no price.');
  }
}

/**
 * Signature over the three mandatory fields, in the order eSewa specifies.
 * Order matters: the same values concatenated differently produce a different
 * MAC and the gateway rejects it.
 */
export function signRequest(totalAmount: string, transactionUuid: string, productCode: string, secret: string): string {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return createHmac('sha256', secret).update(message).digest('base64');
}

/**
 * Verify the receipt eSewa redirects back with.
 *
 * The response names its own signed fields, so the message is rebuilt from
 * `signed_field_names` in the order given rather than from a fixed list - eSewa
 * has changed that set before, and a hardcoded order silently fails when it
 * changes again.
 */
export function verifyResponse(payload: Record<string, string>, secret: string): boolean {
  const names = payload.signed_field_names?.split(',') ?? [];
  if (names.length === 0 || !payload.signature) return false;

  const message = names.map((name) => `${name}=${payload[name] ?? ''}`).join(',');
  const expected = createHmac('sha256', secret).update(message).digest('base64');

  /* Length-safe comparison. Timing is not the threat here - a mismatched length
     throwing inside timingSafeEqual is. */
  return expected.length === payload.signature.length && expected === payload.signature;
}

/**
 * Ask eSewa directly whether the payment happened.
 *
 * The redirect is a claim made by a browser we do not control. This is the
 * confirmation, and it is the check that actually decides whether an account is
 * upgraded.
 */
export async function confirmWithEsewa(
  transactionUuid: string,
  totalAmount: number,
): Promise<{ ok: boolean; status: string; reference?: string }> {
  const { statusUrl, productCode } = esewaConfig();

  const url =
    `${statusUrl}?product_code=${encodeURIComponent(productCode)}` +
    `&total_amount=${totalAmount}&transaction_uuid=${encodeURIComponent(transactionUuid)}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return { ok: false, status: `lookup failed (${res.status})` };

  const data = (await res.json()) as { status?: string; ref_id?: string };
  return {
    ok: data.status === 'COMPLETE',
    status: data.status ?? 'unknown',
    reference: data.ref_id,
  };
}

/** eSewa accepts alphanumerics and hyphens; short ids travel better through the form. */
export function newTransactionId(): string {
  return `AW-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`.toUpperCase();
}

/** eSewa returns amounts with thousands separators. */
export function parseAmount(value: string): number {
  return Number(String(value).replace(/,/g, ''));
}
