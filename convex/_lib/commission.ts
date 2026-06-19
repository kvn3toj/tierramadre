/**
 * Pure commerce arithmetic for the GHL funnel, kept free of Convex IO so it is
 * unit-testable (there is no convex-test infra in this repo — see
 * tests/commission.test.ts). The `ghl.createOrder` / `ghl.markOrderPaid`
 * mutations pre-fetch rows then delegate these decisions here.
 *
 *  - `isOverLimit` — the ≤2M COP server-side gate (GHL/06-FLUJOS golden rule #3).
 *    The bot mirrors it in its prompt, but the server is the backstop:
 *    `create-order` rejects a total over the limit and hands off to a human.
 *  - `computeCommissionCOP` — a stone's commission = total × the ambassador's
 *    tier percent, rounded to the nearest peso. Single derivation so the
 *    markOrderPaid trigger and any UI preview can never drift.
 *  - `commissionPercentForNivel` — the default commission by tier, applied when
 *    an ambassador is created without an explicit percent.
 */

/** ≤2M COP gate threshold. A total STRICTLY greater than this is blocked. */
export const OVER_LIMIT_COP = 2_000_000;

/** True when a sale total exceeds the ≤2M gate (exactly 2,000,000 passes). */
export function isOverLimit(totalCOP: number): boolean {
  return totalCOP > OVER_LIMIT_COP;
}

/** An ambassador's commission for a sale, rounded to the nearest peso. */
export function computeCommissionCOP(
  totalCOP: number,
  percent: number,
): number {
  return Math.round((totalCOP * percent) / 100);
}

/** Default commission percent per ambassador tier (spec `invite-ambassador`). */
export const COMISION_POR_NIVEL = {
  bronce: 8,
  plata: 10,
  oro: 12,
  diamante: 15,
} as const;

export type AmbassadorNivel = keyof typeof COMISION_POR_NIVEL;

/** The default commission percent for a tier. */
export function commissionPercentForNivel(nivel: AmbassadorNivel): number {
  return COMISION_POR_NIVEL[nivel];
}
