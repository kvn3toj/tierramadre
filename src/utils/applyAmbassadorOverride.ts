/**
 * applyAmbassadorOverride
 *
 * Returns a shallow copy of the TreasureItem with the ambassador's custom
 * name and/or price applied. Does NOT mutate the input.
 *
 * Used by ambassador-context surfaces (favorites row, share text, etc.)
 * to display the curated values without touching the master inventory.
 */

import type { TreasureItem } from '../types';
import type { AmbassadorProductOverride } from '../types/ambassadorOverride';

export function applyAmbassadorOverride<T extends TreasureItem>(
  product: T,
  override: AmbassadorProductOverride | undefined,
): T {
  if (!override) return product;

  // Generic so enriched rows survive the round trip: AsesorProduct carries
  // `effectiveEstado`, and a plain TreasureItem return type would quietly
  // erase it at every call site that applies overrides to owned products.
  const next: T = { ...product };

  if (override.customName && override.customName.trim().length > 0) {
    next.nombre = override.customName.trim();
  }

  if (typeof override.customPriceCOP === 'number' && Number.isFinite(override.customPriceCOP)) {
    next.precioCOP = override.customPriceCOP;
  }

  return next;
}

/**
 * Vectorised version: applies a Map<itemId, override> to a list of products.
 */
export function applyAmbassadorOverrides<T extends TreasureItem>(
  products: T[],
  overrides: Record<string, AmbassadorProductOverride>,
): T[] {
  if (!products.length || Object.keys(overrides).length === 0) return products;
  return products.map((p) => applyAmbassadorOverride(p, overrides[String(p.item)]));
}
