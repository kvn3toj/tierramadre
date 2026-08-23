/**
 * Mercado Pago Checkout Preferences + payment fetch.
 *
 * `create-order` builds a preference whose `external_reference` is our
 * `saleId` and whose `notification_url` points at `api/mp-webhook`; the
 * customer is redirected to the returned `init_point`. After payment, the
 * webhook re-fetches the real payment from MP (never trusting the body) and
 * treats only `status === "approved"` as paid.
 *
 * `buildPreference` is pure (unit-tested in tests/mpPreference.test.ts);
 * `createPreference`/`fetchPayment` take an injectable `fetchImpl`.
 */

type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

const MP_BASE = 'https://api.mercadopago.com';

export interface MpPreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

export interface BuildPreferenceInput {
  items: MpPreferenceItem[];
  payer?: { name?: string; email?: string; phone?: { number?: string } };
  orderId: string;
  notificationUrl: string;
  backUrls?: { success?: string; pending?: string; failure?: string };
  /**
   * ISO8601 (e.g. `2026-08-19T12:30:00.000Z`, `Date#toISOString()`'s
   * output) — the instant the reservation expires. Converted to MP's
   * documented offset form before it reaches `expiration_date_to`; see
   * `toMpExpirationFormat` below. Optional so existing callers (and their
   * tests) are unaffected.
   */
  expirationTime?: string;
}

/**
 * MP's own `expiration_date_to` example is offset-bearing
 * (`2016-02-28T17:00:00.000-04:00`), and a bare `Z` suffix is reported to be
 * rejected — which would make `createPreference` throw on every order, since
 * `PAYMENT_PROVIDER` is unset in production and MercadoPago is the live rail.
 * `Z` and `+00:00` denote the identical UTC instant, so this swaps the
 * suffix `Date#toISOString()` produces for the offset form MP's example
 * uses — no timezone is invented, `+00:00` IS UTC. Built by trimming the
 * trailing `Z` off the ISO string (not by re-deriving date fields), so the
 * output can never drift from the instant it was given.
 */
export function toMpExpirationFormat(iso: string): string {
  return iso.endsWith('Z') ? `${iso.slice(0, -1)}+00:00` : iso;
}

/** Build the MP `/checkout/preferences` request body (currency defaults to COP). */
export function buildPreference(
  input: BuildPreferenceInput,
): Record<string, unknown> {
  return {
    items: input.items.map((i) => ({ currency_id: 'COP', ...i })),
    payer: input.payer,
    external_reference: input.orderId,
    notification_url: input.notificationUrl,
    back_urls: input.backUrls,
    auto_return: 'approved',
    ...(input.expirationTime
      ? {
          expires: true,
          expiration_date_to: toMpExpirationFormat(input.expirationTime),
        }
      : {}),
  };
}

export async function createPreference(
  body: Record<string, unknown>,
  accessToken: string,
  fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike,
): Promise<{ id: string; init_point: string }> {
  const res = await fetchImpl(`${MP_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`MP createPreference failed: ${res.status}`);
  const data = await res.json();
  return { id: data.id, init_point: data.init_point };
}

export interface MpPayment {
  id: string;
  status: string;
  statusDetail?: string;
  externalReference?: string;
  transactionAmount?: number;
  currencyId?: string;
}

export async function fetchPayment(
  paymentId: string,
  accessToken: string,
  fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike,
): Promise<MpPayment> {
  const res = await fetchImpl(`${MP_BASE}/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`MP fetchPayment failed: ${res.status}`);
  const p = await res.json();
  return {
    id: String(p.id),
    status: p.status,
    statusDetail: p.status_detail,
    externalReference: p.external_reference,
    transactionAmount: p.transaction_amount,
    currencyId: p.currency_id,
  };
}
