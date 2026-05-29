/**
 * Pure payment→sale reducer for the Mercado Pago webhook path, kept free of
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

export type SaleEstado = "reservada" | "confirmada" | "cancelada";

export interface PaymentInfo {
  /** Mercado Pago payment id (payment.id, as a string). */
  id: string;
  /** Mercado Pago payment status — only "approved" is treated as paid. */
  status: string;
}

export interface SaleLike {
  estado: SaleEstado;
}

export type ApplyPaymentResult =
  | { changed: false; reason: "not-approved" | "already-paid" | "cancelled" }
  | {
      changed: true;
      patch: {
        estado: "confirmada";
        paidAt: string;
        mpPaymentId: string;
        mpStatus: string;
      };
    };

/**
 * Decide how an MP payment transitions a sale. `now` is injected (ISO string)
 * to keep the function pure/deterministic — the mutation passes
 * `new Date().toISOString()`.
 */
export function applyPaymentToSale(
  sale: SaleLike,
  payment: PaymentInfo,
  now: string,
): ApplyPaymentResult {
  if (payment.status !== "approved") {
    return { changed: false, reason: "not-approved" };
  }
  if (sale.estado === "confirmada") {
    return { changed: false, reason: "already-paid" };
  }
  if (sale.estado === "cancelada") {
    return { changed: false, reason: "cancelled" };
  }
  return {
    changed: true,
    patch: {
      estado: "confirmada",
      paidAt: now,
      mpPaymentId: payment.id,
      mpStatus: payment.status,
    },
  };
}
