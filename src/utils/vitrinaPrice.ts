/**
 * Vitrina pricing — the client-facing price shown on a public share.
 *
 * Mirrors `CurrencyContext.convertPrice`: the price is `precioCOP × multiplier`,
 * in COP, or `(precioCOP / TRM) × multiplier` in USD. `precioCOP` is the
 * client-facing retail figure (the GHL bot already quotes it), so this is
 * consistent with the rest of the funnel — the multiplier is the per-share
 * markup the staff member chose.
 */

import { formatCurrency } from "./formatting";

export type VitrinaCurrency = "COP" | "USD";

export interface VitrinaPricing {
  multiplier: number;
  currency: VitrinaCurrency;
}

/**
 * Default pricing for stateless / legacy links (a bare id-list or a grandfathered
 * `/product/N`): standard retail = `precioCOP` in COP, x1. Matches what the GHL
 * bot and the in-app catalog already show, so no markup is implied where none
 * was chosen.
 */
export const DEFAULT_VITRINA_PRICING: VitrinaPricing = {
  multiplier: 1,
  currency: "COP",
};

/** COP → precioCOP × multiplier; USD → (precioCOP / TRM) × multiplier. */
export function computeVitrinaPrice(
  precioCOP: number,
  { multiplier, currency }: VitrinaPricing,
  trmRate: number,
): number {
  if (!precioCOP) return 0;
  if (currency === "COP") return Math.round(precioCOP * multiplier);
  return Math.round((precioCOP / trmRate) * multiplier);
}

/**
 * Formatted client-facing label, e.g. "$1.980.000" (COP) or "$471 USD".
 * Returns "" when there is no usable price (so callers can hide the slot).
 */
export function formatVitrinaPrice(
  precioCOP: number | undefined | null,
  pricing: VitrinaPricing,
  trmRate: number,
): string {
  const base = typeof precioCOP === "number" ? precioCOP : 0;
  if (base <= 0) return "";
  const value = computeVitrinaPrice(base, pricing, trmRate);
  if (value <= 0) return "";
  return pricing.currency === "USD"
    ? `${formatCurrency(value, "USD")} USD`
    : formatCurrency(value, "COP");
}
