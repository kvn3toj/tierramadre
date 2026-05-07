import { useConvexQuery, convexApi, convexReady } from "../lib/convex-safe";

export interface PatronCombo {
  key: string;
  label: string;
  count: number;
  medianPriceCOP: number | null;
}

export interface PatronResult {
  combos: PatronCombo[];
  total: number;
}

export function usePatrones(itemId: string | null): PatronResult | undefined {
  return useConvexQuery(
    convexApi.products.patronesFor,
    convexReady && itemId ? { itemId } : "skip",
  ) as PatronResult | undefined;
}

export function usePatronesGlobalTop(): PatronResult | undefined {
  return useConvexQuery(
    convexApi.products.patronesGlobalTop,
    convexReady ? {} : "skip",
  ) as PatronResult | undefined;
}
