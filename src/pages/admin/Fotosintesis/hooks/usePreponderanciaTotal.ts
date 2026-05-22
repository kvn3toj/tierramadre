import { useConvexQuery, convexApi } from "../../../../lib/convex-safe";

export interface PreponderanciaTotal {
  /** Cumulative `preponderancia` across all items in the lot. */
  sum: number;
  /** How many items have been created so far. */
  count: number;
  /** `100 - sum` clamped at 0 — used to seed the last item's prefill. */
  remaining: number;
  /** `sum - 100` clamped at 0 — used to colour the ring red. */
  overflow: number;
}

/**
 * Reactive subscription to `lotItems.sumPreponderancia`. Frontend uses this
 * to keep `<PreponderanceRing>` in sync with every server mutation — even
 * those triggered by another admin editing the same lot.
 *
 * Returns a stable zeroed object while the query is loading so consumers
 * don't have to null-guard every field.
 */
export function usePreponderanciaTotal(loteId: string): PreponderanciaTotal {
  const result = useConvexQuery(convexApi.lotItems.sumPreponderancia, {
    loteId,
  });
  if (!result) {
    return { sum: 0, count: 0, remaining: 100, overflow: 0 };
  }
  return result;
}

export default usePreponderanciaTotal;
