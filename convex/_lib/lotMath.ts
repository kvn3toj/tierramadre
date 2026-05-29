/**
 * Pure lot arithmetic, kept free of Convex IO so it is unit-testable (there is
 * no convex-test infra in this repo — see tests/lotMath.test.ts). The lots /
 * lotItems mutations pre-fetch rows then delegate the branchy decisions here.
 *
 * Two rules live here:
 *  - `canReopenLot` — a cerrado/publicado lot may return to `abierto` ONLY when
 *    no member item has been sold (estado VENDIDA). Reopening a lot whose stone
 *    is already on a sale would let an operator edit accounting data the sale
 *    already depends on. (ISO-audit C1.)
 *  - BR-2 balance — every lot's member `preponderancia` must sum to 100 (±0.01).
 *    `lotItems.remove` uses these to flag a closed/published lot that no longer
 *    balances after a removal. (ISO-audit C7.)
 *  - `deriveCostoBaseCOP` — the single derivation of a stone's share of the lot
 *    cost, deduplicated from lotItems.create / updatePreponderancia / the new
 *    lots.update re-fan so they can never drift apart.
 */

/** BR-2 tolerance: a lot balances when |sum − 100| ≤ this. Matches lots.close. */
export const PREPONDERANCIA_TOLERANCE = 0.01;

export type ReopenVerdict =
  | { ok: true; soldItemIds: [] }
  | { ok: false; reason: "not-closeable" | "has-sold"; soldItemIds: string[] };

/**
 * Decide whether a lot may be reopened. `estado` must be cerrado/publicado and
 * no member may be VENDIDA. The estado gate is checked first, so an already-open
 * or cancelled lot reports `not-closeable` without scanning members.
 */
export function canReopenLot(input: {
  estado: string;
  members: { itemId: string; estado?: string }[];
}): ReopenVerdict {
  const closeable = input.estado === "cerrado" || input.estado === "publicado";
  if (!closeable)
    return { ok: false, reason: "not-closeable", soldItemIds: [] };
  const soldItemIds = input.members
    .filter((m) => m.estado === "VENDIDA")
    .map((m) => m.itemId);
  if (soldItemIds.length) return { ok: false, reason: "has-sold", soldItemIds };
  return { ok: true, soldItemIds: [] };
}

/** Sum of `preponderancia` across the given items (caller filters first). */
export function preponderanciaSum(items: { preponderancia: number }[]): number {
  return items.reduce((acc, it) => acc + it.preponderancia, 0);
}

/** True when a preponderancia sum is within tolerance of 100. */
export function balancesTo100(sum: number): boolean {
  return Math.abs(sum - 100) <= PREPONDERANCIA_TOLERANCE;
}

/** A stone's share of the lot cost, rounded to the nearest peso. */
export function deriveCostoBaseCOP(
  costoTotalCOP: number,
  preponderancia: number,
): number {
  return Math.round((costoTotalCOP * preponderancia) / 100);
}
