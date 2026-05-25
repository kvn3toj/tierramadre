/**
 * Pure helpers behind the per-item price multiplier sliders on the
 * "Cerrar lote" resumen (LoteResumenPage). Each remaining price tier
 * (embajador, consciente) gets its own x1–x4 slider that multiplies the
 * item's `costoBaseCOP` to auto-fill the price field.
 *
 * Kept framework-free so the rounding/clamping math is unit-testable without
 * mounting MUI.
 */

export const MIN_MULTIPLIER = 1;
export const MAX_MULTIPLIER = 4;
/** Slider granularity — 0.5 gives clean stops at x1, x1.5 … x4. */
export const MULTIPLIER_STEP = 0.5;

/** Prices snap to the nearest 1.000 COP, matching the number field's step. */
const PRICE_ROUND = 1000;

/** Clamp a raw multiplier into the slider's [1, 4] range. */
export function clampMultiplier(multiplier: number): number {
  if (Number.isNaN(multiplier)) return MIN_MULTIPLIER;
  return Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, multiplier));
}

/**
 * Price (COP) for a base cost at a given multiplier, rounded to the nearest
 * 1.000. Returns 0 when the base cost is missing/non-positive.
 */
export function priceFromMultiplier(
  baseCOP: number,
  multiplier: number,
): number {
  if (!(baseCOP > 0) || !Number.isFinite(multiplier)) return 0;
  return Math.round((baseCOP * multiplier) / PRICE_ROUND) * PRICE_ROUND;
}

/**
 * The true (unclamped) ratio price ÷ base — what the readout shows. Returns
 * `null` when it can't be derived (no base cost, empty/invalid price), so the
 * caller can fall back to a default slider position.
 */
export function multiplierFromPrice(
  baseCOP: number,
  price: number | "",
): number | null {
  if (!(baseCOP > 0)) return null;
  if (typeof price !== "number" || !Number.isFinite(price)) return null;
  return price / baseCOP;
}

/**
 * Compact multiplier label (es-CO): whole numbers drop the decimal (`x3`),
 * fractions use a comma (`x2,5`). Rounded to one decimal so a legacy ratio
 * like 5.995 reads as `x6`.
 */
export function formatMultiplier(multiplier: number): string {
  const rounded = Math.round(multiplier * 10) / 10;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace(".", ",");
  return `x${text}`;
}
