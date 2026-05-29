/**
 * Pure truth-table for the Mercado Pago webhook handler (api/mp-webhook.ts),
 * extracted so the branch semantics are unit-testable (tests/mpWebhookLogic.test.ts)
 * without spinning up the handler or mocking IO.
 *
 * The handler performs IO between steps (validate signature → fetch payment →
 * markOrderPaid) and short-circuits inline, but every branch maps 1:1 to a row
 * here. MP retries on non-2xx, so only genuine "retry me" cases (signature OK
 * but our own infra failed) return 5xx — handled separately in the handler;
 * this function covers the validated-input decision space.
 */

export type WebhookOutcome =
  | "invalid-signature"
  | "ignored"
  | "already-paid"
  | "fan-out";

export interface WebhookDecisionInput {
  /** Result of validateMpSignature. */
  signatureValid: boolean;
  /** Notification topic — only "payment" is actionable. */
  type?: string;
  /** The MP resource id (data.id) — required to fetch the payment. */
  dataId?: string | null;
  /** Whether the fetched payment is approved (status === "approved"). */
  paymentApproved?: boolean;
  /** payment.external_reference — our saleId. */
  externalReference?: string | null;
  /** markOrderPaid result: true = flipped to paid, false = was already paid. */
  saleUpdated?: boolean;
}

/**
 * Map a (validated) webhook to its outcome + HTTP status. `reason` explains an
 * `ignored` result. `fanOut` is true only when a sale actually transitioned to
 * paid and the GHL fan-out should run.
 */
export function decideWebhookOutcome(input: WebhookDecisionInput): {
  httpStatus: number;
  outcome: WebhookOutcome;
  fanOut: boolean;
  reason?: string;
} {
  if (!input.signatureValid) {
    return { httpStatus: 401, outcome: "invalid-signature", fanOut: false };
  }
  if (input.type !== "payment" || !input.dataId) {
    return {
      httpStatus: 200,
      outcome: "ignored",
      fanOut: false,
      reason: "not-payment-notification",
    };
  }
  if (!input.paymentApproved) {
    return {
      httpStatus: 200,
      outcome: "ignored",
      fanOut: false,
      reason: "payment-not-approved",
    };
  }
  if (!input.externalReference) {
    return {
      httpStatus: 200,
      outcome: "ignored",
      fanOut: false,
      reason: "no-external-reference",
    };
  }
  if (input.saleUpdated === false) {
    return { httpStatus: 200, outcome: "already-paid", fanOut: false };
  }
  return { httpStatus: 200, outcome: "fan-out", fanOut: true };
}
