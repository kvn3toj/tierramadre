/**
 * Pure payment→sale reducer for the payment webhook paths, kept free of
 * Convex IO so it is unit-testable (see tests/applyPayment.test.ts). The
 * `ghl.markOrderPaid` mutation pre-fetches the sale, then delegates the
 * idempotency + state-transition decision here.
 *
 * Idempotency (GHL/04-INTEGRACIONES + golden rule #4): a sale flips to
 * `confirmada` (= paid) only from `reservada`, and only for an `approved`
 * payment. A replayed webhook for an already-`confirmada` sale returns
 * `changed:false` so the caller skips the GHL fan-out and never double-pays a
 * commission. A `cancelada` sale is never silently revived by a late webhook.
 */

export type SaleEstado = 'reservada' | 'confirmada' | 'cancelada';

/** Every rail that can mark a sale paid. `breb-manual` lands in phase 4. */
export type PaymentProvider = 'mercadopago' | 'wompi' | 'breb-manual';

const KNOWN_PAYMENT_PROVIDERS: readonly PaymentProvider[] = [
  'mercadopago',
  'wompi',
  'breb-manual',
];

/**
 * Narrow an untyped value (e.g. `args.provider: v.optional(v.string())`) to
 * `PaymentProvider`. Callers must branch on the `false` case rather than
 * casting — an unrecognized string must be rejected, not silently trusted,
 * since phase 4 adds a fourth rail (`breb-manual`) here.
 */
export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return (
    typeof value === 'string' &&
    (KNOWN_PAYMENT_PROVIDERS as readonly string[]).includes(value)
  );
}

export interface PaymentInfo {
  provider: PaymentProvider;
  /** The provider's payment/transaction id, as a string. */
  id: string;
  /**
   * The provider's raw status, stored verbatim for audit — "approved" in
   * MercadoPago, "APPROVED" in Wompi. Never compared here.
   */
  status: string;
  /**
   * Normalized by the adapter, because each provider spells success
   * differently. Keeping the comparison out of this reducer is what lets one
   * function serve every rail.
   */
  approved: boolean;
}

export interface SaleLike {
  estado: SaleEstado;
}

export interface SalePaymentPatch {
  estado: 'confirmada';
  paidAt: string;
  paymentProvider: PaymentProvider;
  providerTxId: string;
  providerStatus: string;
  /** Legacy MercadoPago mirror — written only for that provider. */
  mpPaymentId?: string;
  mpStatus?: string;
}

export type ApplyPaymentResult =
  | { changed: false; reason: 'not-approved' | 'already-paid' | 'cancelled' }
  | { changed: true; patch: SalePaymentPatch };

/**
 * Decide how a payment transitions a sale. `now` is injected (ISO string) to
 * keep the function pure/deterministic — the mutation passes
 * `new Date().toISOString()`.
 */
export function applyPaymentToSale(
  sale: SaleLike,
  payment: PaymentInfo,
  now: string,
): ApplyPaymentResult {
  if (!payment.approved) return { changed: false, reason: 'not-approved' };
  if (sale.estado === 'confirmada') {
    return { changed: false, reason: 'already-paid' };
  }
  if (sale.estado === 'cancelada') {
    return { changed: false, reason: 'cancelled' };
  }

  const patch: SalePaymentPatch = {
    estado: 'confirmada',
    paidAt: now,
    paymentProvider: payment.provider,
    providerTxId: payment.id,
    providerStatus: payment.status,
  };
  // Keep the historical MP columns populated so nothing that reads them
  // regresses; other providers leave them untouched.
  if (payment.provider === 'mercadopago') {
    patch.mpPaymentId = payment.id;
    patch.mpStatus = payment.status;
  }
  return { changed: true, patch };
}

/**
 * Guard against paying a real commission on money never actually received.
 * `markOrderPaid` computes the sale's expected charge as `totalCOP * 100`
 * (Wompi/most gateways bill in cents) and compares it to what the provider
 * actually reports having charged — never trusting `sale.totalCOP` alone for
 * that comparison, and never trusting the webhook body either (the caller is
 * expected to have re-fetched the real transaction first, same rule as
 * `applyPaymentToSale`).
 *
 * Pure so it is unit-testable without Convex IO — see
 * `tests/applyPayment.test.ts`.
 *
 * Optional: a caller that omits BOTH `receivedAmountInCents` and
 * `receivedCurrency` (e.g. the live `mp-webhook.ts` rail, which does not yet
 * send them) skips the check entirely rather than failing closed — adding
 * this guard must not regress the MercadoPago path that doesn't verify
 * amount yet.
 */
export function amountsMatch(
  expectedTotalCOP: number,
  receivedAmountInCents: number | undefined,
  receivedCurrency: string | undefined,
): boolean {
  if (receivedAmountInCents == null && receivedCurrency == null) return true;
  if (receivedCurrency !== 'COP') return false;
  return receivedAmountInCents === expectedTotalCOP * 100;
}
