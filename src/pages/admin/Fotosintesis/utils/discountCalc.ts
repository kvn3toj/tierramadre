/**
 * Discount math for the venta (Kardex) form.
 *
 * The `subtotal` is the pre-discount base — the Σ of the selected items'
 * suggested prices (inventory tier prices + any manual line items). The
 * operator can drive a discount two ways, and each derives the other:
 *
 *   • type a discount PERCENTAGE  → the final total is computed, or
 *   • type the final TOTAL (already discounted) → the percentage is computed.
 *
 * Keeping the arithmetic here (free of React/Convex) lets `tests/discountCalc`
 * pin the contract and lets both directions stay perfectly inverse.
 */

/** Clamp a percentage into [0, 100]. NaN / non-finite → 0. */
export function clampPct(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return pct;
}

/**
 * Final total after applying a discount `pct` to a `subtotal`.
 * Rounds to whole COP; never returns a negative number.
 */
export function totalFromPct(subtotal: number, pct: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  const p = clampPct(pct);
  return Math.max(0, Math.round(subtotal * (1 - p / 100)));
}

/**
 * Discount percentage implied by a `subtotal` and a final `total`.
 * Returns 0 when there is no base to discount against (subtotal ≤ 0) or when
 * the total meets/exceeds the subtotal. Clamps the total into [0, subtotal]
 * and rounds the percentage to two decimals so the displayed value stays tidy.
 */
export function pctFromTotal(subtotal: number, total: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  if (!Number.isFinite(total)) return 0;
  const clamped = Math.min(subtotal, Math.max(0, total));
  const pct = ((subtotal - clamped) / subtotal) * 100;
  return Math.round(pct * 100) / 100;
}

/**
 * Discount amount (COP) = max(0, subtotal − total). Whole-COP, NaN-safe.
 * Returns 0 when there is no base (subtotal ≤ 0).
 */
export function discountAmount(subtotal: number, total: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  if (!Number.isFinite(total)) return 0;
  return Math.max(0, Math.round(subtotal - total));
}
