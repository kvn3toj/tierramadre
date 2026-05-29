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
