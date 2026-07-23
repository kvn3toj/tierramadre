/**
 * Canonical price derivation for the Fotosíntesis inventory (2026-07-21 refactor).
 *
 * The single final price is `precioFinalCOP = round(costoBaseCOP × MARKUP)`,
 * MARKUP = 2.6. This replaces the former embajador/consciente x1–x4 tiers.
 *
 * precioFinalCOP is DERIVED — computed here wherever costoBaseCOP is computed
 * (lotItems create/update) and pushed to Sheets column M. It is NEVER pulled
 * back from the sheet (excluded from the WRITABLE allowlist), so a sheet edit
 * can't overwrite it — the mirror stays a one-way projection of Convex, exactly
 * like costoBaseCOP and preponderancia.
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
