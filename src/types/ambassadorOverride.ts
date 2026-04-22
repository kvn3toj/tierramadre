/**
 * AmbassadorProductOverride
 *
 * Per-ambassador customisation of a product's display name and/or price.
 * MVP persistence: localStorage (see useAmbassadorOverrides hook).
 *
 * Rules:
 * - Overrides NEVER mutate the master inventory (Google Sheets). They are
 *   applied at render time on top of the canonical TreasureItem values.
 * - customName: max 80 chars, trimmed.
 * - customPriceCOP: must be between 1.0x and 10.0x of the canonical price
 *   (anti-devaluation lower bound, anti-typo upper bound).
 */
export interface AmbassadorProductOverride {
  /** URL-friendly slug of the ambassador (matches Asesor.slug). */
  asesorSlug: string;
  /** TreasureItem.item, stringified. */
  itemId: string;
  /** Override for the product display name. Optional. */
  customName?: string;
  /** Override for the product price in COP. Optional. */
  customPriceCOP?: number;
  /** ISO timestamp of last update. */
  updatedAt: string;
}

/** Validation limits — kept as constants so they can be reused server-side later. */
export const OVERRIDE_LIMITS = {
  NAME_MAX_LENGTH: 80,
  PRICE_MIN_MULTIPLIER: 1.0,
  PRICE_MAX_MULTIPLIER: 10.0,
} as const;

/** Result of applying an override to a base value. */
export interface AppliedOverrideValues {
  displayName: string;
  priceCOP: number | undefined;
  /** True if any field was overridden vs. the canonical product. */
  isOverridden: boolean;
}
