/**
 * Canonical price derivation for the Fotosíntesis inventory (2026-07-21 refactor).
 *
 * The single final price is `precioFinalCOP = round(costoBaseCOP × MARKUP)`,
 * MARKUP = 2.6. This replaces the former embajador/consciente x1–x4 tiers.
 *
 * OWNERSHIP (changed 2026-07-23) — precioFinalCOP is a SEED, not a projection.
 * `costoBaseCOP × 2.6` is applied when an item is first created; from then on
 * the SHEET owns column M. It IS pulled back (added to the WRITABLE allowlist in
 * _lib/sheetPullMaps.ts), and a pulled price stamps `precioFinalManual: true`,
 * which makes the lote re-fan in lotItems.ts skip repricing that row.
 *
 * Rationale: the official price list is not a fixed multiple of cost. The SOT's
 * own price column spans 0.74×–11.76× cost, and TM_MARKUP_DEFAULT (3.0, see
 * src/data/vocabularies.ts) is a second documented company multiplier. Forcing
 * every price through one constant silently reverted the real prices.
 *
 * costoBaseCOP and preponderancia remain one-way Convex→Sheets projections —
 * cost is the tax and commission base and is still owned by the lote.
 *
 * NOTE: this multiplier is intentionally distinct from `TM_MARKUP_DEFAULT` (3.0)
 * in src/data/vocabularies.ts, which drives the separate public retail price
 * (precioPublicoCOP → precioCOP). Different field, different multiplier.
 */
export const PRECIO_FINAL_MULTIPLIER = 2.6;

/**
 * Compute the derived final price from a base cost. Returns undefined when the
 * base cost is missing/zero so a priceless item stays priceless (no phantom 0).
 */
export function computePrecioFinal(
  costoBaseCOP: number | undefined | null,
): number | undefined {
  if (!costoBaseCOP || costoBaseCOP <= 0) return undefined;
  return Math.round(costoBaseCOP * PRECIO_FINAL_MULTIPLIER);
}

/**
 * The price half of a lote cost re-fan (lotItems: recomputePreponderancia /
 * update). Spread the result into the productInventory patch.
 *
 * Returns `{}` — i.e. patches NOTHING — once `precioFinalManual` is set, so
 * re-fanning a lote's cost updates costoBaseCOP but leaves the human-set
 * catalog price alone. Before this existed, editing a lote silently reset every
 * price in it to costoBaseCOP × 2.6.
 *
 * Kept pure (no Convex IO) so it is unit-testable — the mutations it guards
 * are not, and this branch is the one that must never regress.
 */
export function precioFinalRefanPatch(
  product: { precioFinalManual?: boolean },
  costoBaseCOP: number | undefined | null,
): { precioFinalCOP?: number } {
  if (product.precioFinalManual) return {};
  return { precioFinalCOP: computePrecioFinal(costoBaseCOP) };
}
