/**
 * Wompi Web Checkout + transaction read.
 *
 * `buildCheckoutUrl` is the mirror of `mp-preference.ts`'s `buildPreference`:
 * pure, and the `reference` it embeds is our Convex `saleId`, exactly as MP's
 * `external_reference` is. The customer is redirected to the returned URL.
 * After payment, `api/wompi-webhook.ts` calls `fetchTransaction` to read the
 * REAL transaction from Wompi and treats only `status === "APPROVED"` as paid
 * — the webhook body is never trusted, same rule as the MP rail.
 *
 * We use the hosted Web Checkout (redirect) rather than the embedded Widget:
 * it replicates MP's `init_point` flow exactly, adds no third-party script or
 * CSP work, and behaves identically on iOS Safari. The server half — signature
 * and webhook, where the risk lives — is the same either way.
 *
 * `fetchImpl` is injectable so the whole module is unit-testable without IO.
 */

import { buildIntegritySignature } from './wompi-signature.js';

type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

const CHECKOUT_URL = 'https://checkout.wompi.co/p/';
const CURRENCY = 'COP';

/** The only Wompi transaction status that means "paid". */
export const WOMPI_APPROVED = 'APPROVED';

export interface WompiConfig {
  publicKey: string;
  integritySecret: string;
}

export interface CheckoutInput {
  /** Our Convex saleId — Wompi echoes it back on the webhook. */
  reference: string;
  /** Whole Colombian pesos; converted to cents here, once. */
  amountCOP: number;
  redirectUrl: string;
  customer?: { email?: string; fullName?: string; phoneNumber?: string };
  /** ISO8601; signed too when present. */
  expirationTime?: string;
}

export interface WompiTransaction {
  id: string;
  status: string;
  reference: string;
  amountInCents: number;
  currency: string;
  paymentMethodType?: string;
}

/**
 * Build the signed Web Checkout URL. Throws rather than signing an amount
 * Wompi would round differently than we did — a mismatch between the signed
 * amount and the charged amount is exactly what the signature exists to
 * prevent, so a bad amount must fail loudly here, not quietly there.
 */
export function buildCheckoutUrl(
  input: CheckoutInput,
  config: WompiConfig,
): string {
  if (!Number.isInteger(input.amountCOP)) {
    throw new Error(
      `Wompi amountCOP must be an integer number of pesos, got ${input.amountCOP}`,
    );
  }
  if (input.amountCOP <= 0) {
    throw new Error(`Wompi amountCOP must be positive, got ${input.amountCOP}`);
  }

  const amountInCents = input.amountCOP * 100;
  const signature = buildIntegritySignature(
    {
      reference: input.reference,
      amountInCents,
      currency: CURRENCY,
      expirationTime: input.expirationTime,
    },
    config.integritySecret,
  );

  const params = new URLSearchParams({
    'public-key': config.publicKey,
    currency: CURRENCY,
    'amount-in-cents': String(amountInCents),
    reference: input.reference,
    'signature:integrity': signature,
    'redirect-url': input.redirectUrl,
  });
  if (input.expirationTime) {
    params.set('expiration-time', input.expirationTime);
  }
  if (input.customer?.email) {
    params.set('customer-data:email', input.customer.email);
  }
  if (input.customer?.fullName) {
    params.set('customer-data:full-name', input.customer.fullName);
  }
  if (input.customer?.phoneNumber) {
    params.set('customer-data:phone-number', input.customer.phoneNumber);
  }

  return `${CHECKOUT_URL}?${params.toString()}`;
}

/**
 * Read the real transaction from Wompi. Throws on a non-ok response so the
 * webhook handler can answer 500 and let Wompi retry (up to 3 times / 24h).
 */
export async function fetchTransaction(
  transactionId: string,
  privateKey: string,
  baseUrl: string,
  fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike,
): Promise<WompiTransaction> {
  const res = await fetchImpl(`${baseUrl}/transactions/${transactionId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${privateKey}` },
  });
  if (!res.ok) {
    throw new Error(`Wompi fetchTransaction failed: ${res.status}`);
  }
  const body = await res.json();
  const t = body?.data ?? {};
  return {
    id: String(t.id),
    status: t.status,
    reference: t.reference,
    amountInCents: t.amount_in_cents,
    currency: t.currency,
    paymentMethodType: t.payment_method_type,
  };
}
