/**
 * Pure selection helpers for the multi-item venta flow.
 *
 * The create-sale picker (ProductoSpotlight, multi-select mode) and VentaPage
 * both manipulate an ordered list of chosen products. Keeping the toggle /
 * remove / dedupe / sum logic here — free of React and of Convex — lets the UI
 * stay declarative and lets `tests/saleItemSelection.test.ts` pin the contract.
 *
 * The functions are generic over the minimal shape they need (`itemId` for
 * identity, optional `precioCop` for the suggested-total sum), so they work for
 * both `SpotlightProduct` and any future row type without a circular import on
 * the layout context.
 */
export interface SelectableItem {
  itemId: string;
  precioCop?: number;
}

/** Append `item` if absent, otherwise drop it — order is preserved. */
export function toggleSelection<T extends SelectableItem>(
  list: T[],
  item: T,
): T[] {
  const idx = list.findIndex((x) => x.itemId === item.itemId);
  if (idx >= 0) return list.filter((_, i) => i !== idx);
  return [...list, item];
}

/** Remove the entry matching `itemId` (no-op if absent). */
export function removeSelection<T extends SelectableItem>(
  list: T[],
  itemId: string,
): T[] {
  return list.filter((x) => x.itemId !== itemId);
}

/** Keep the first occurrence of each `itemId`; preserves order. */
export function dedupeSelection<T extends SelectableItem>(list: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of list) {
    if (seen.has(item.itemId)) continue;
    seen.add(item.itemId);
    out.push(item);
  }
  return out;
}

/** Whether `itemId` is already in the selection. */
export function isSelected(list: SelectableItem[], itemId: string): boolean {
  return list.some((x) => x.itemId === itemId);
}

/**
 * Sum of every item's suggested `precioCop`. Missing / NaN prices count as 0 so
 * a partially-priced selection still yields a usable suggested total instead of
 * NaN. This feeds the "Usar suma sugerida" affordance on VentaPage.
 */
export function sumSuggested(list: SelectableItem[]): number {
  return list.reduce(
    (acc, x) =>
      acc +
      (typeof x.precioCop === "number" && !Number.isNaN(x.precioCop)
        ? x.precioCop
        : 0),
    0,
  );
}

/** Buyer tier for a sale. "embajador" pays the ambassador price; everyone
 *  else ("final" / custom write-ins) pays the consumer (consciente) price. */
export type CompradorTier = "embajador" | "final";

/** Minimal price shape returned by the Convex product queries
 *  (products.list / products.getManyByItemIds) — uppercase COP fields. */
export interface TierPricedCop {
  precioCOP?: number;
  precioEmbajadorCOP?: number;
  precioConscienteCOP?: number;
}

/**
 * Resolve the per-item price to suggest for a buyer tier, with fallbacks so a
 * partially-priced item still yields a number instead of undefined:
 *   embajador -> precioEmbajadorCOP ?? precioConscienteCOP ?? precioCOP
 *   final     -> precioConscienteCOP ?? precioEmbajadorCOP ?? precioCOP
 * Returns undefined only when the item carries no price at all. Legacy
 * precioCOP is last because its Sheets column was retired (audit 2026-05-29)
 * and it is empty for ~82% of items.
 */
export function pickTierPrice(
  item: TierPricedCop,
  tier: CompradorTier,
): number | undefined {
  const order =
    tier === "embajador"
      ? [item.precioEmbajadorCOP, item.precioConscienteCOP, item.precioCOP]
      : [item.precioConscienteCOP, item.precioEmbajadorCOP, item.precioCOP];
  for (const p of order) {
    if (typeof p === "number" && !Number.isNaN(p)) return p;
  }
  return undefined;
}

/** Frozen per-line price snapshot stored on the sale (app-only, like
 *  manualItems). Captures the tier-resolved price each inventory line was sold
 *  at so the Kardex comprobante is a faithful record, immune to later inventory
 *  re-pricing or a buyer-tier flip. */
export interface SaleLineSnapshot {
  itemId: string;
  precioCOP: number;
  tier: CompradorTier;
}

/**
 * Build the per-line price snapshot at sale time from the SAME tier-resolved
 * map the subtotal uses. Missing prices snapshot as 0 (matching `sumSuggested`,
 * which treats undefined as 0), so `Σ snapshot.precioCOP === inventory subtotal`
 * exactly. Returns an empty array for a manual-only sale.
 */
export function buildSaleLineItems(
  itemIds: string[],
  priceByItemId: Map<string, number | undefined>,
  tier: CompradorTier,
): SaleLineSnapshot[] {
  return itemIds.map((itemId) => ({
    itemId,
    precioCOP: priceByItemId.get(itemId) ?? 0,
    tier,
  }));
}

/**
 * Resolve the per-item price map the Kardex should render. Prefers the sale's
 * frozen `lineItems` snapshot (faithful comprobante); falls back to a LIVE
 * tier recompute only for legacy sales captured before snapshots existed (no
 * snapshot, or an empty one). This is the read-side counterpart to
 * `buildSaleLineItems`.
 */
export function resolveKardexPrices(
  lineItems: ReadonlyArray<{ itemId: string; precioCOP: number }> | undefined,
  manyItems: ReadonlyArray<TierPricedCop & { itemId: string }> | undefined,
  tier: CompradorTier,
): Map<string, number | undefined> {
  const map = new Map<string, number | undefined>();
  if (lineItems && lineItems.length > 0) {
    for (const line of lineItems) map.set(line.itemId, line.precioCOP);
    return map;
  }
  for (const row of manyItems ?? []) {
    map.set(row.itemId, pickTierPrice(row, tier));
  }
  return map;
}
