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

export function applyAmbassadorOverride(
  product: TreasureItem,
  override: AmbassadorProductOverride | undefined,
): TreasureItem {
  if (!override) return product;

  const next: TreasureItem = { ...product };

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
export function applyAmbassadorOverrides(
  products: TreasureItem[],
  overrides: Record<string, AmbassadorProductOverride>,
): TreasureItem[] {
  if (!products.length || Object.keys(overrides).length === 0) return products;
  return products.map((p) => applyAmbassadorOverride(p, overrides[String(p.item)]));
}
