import { describe, it, expect } from "vitest";
import {
  buildSaleLineItems,
  resolveKardexPrices,
  sumSuggested,
} from "../src/pages/admin/Fotosintesis/utils/saleItemSelection";

/**
 * Coherence guard for the Kardex comprobante: a sale must render the price it
 * was STRUCK at, frozen, immune to later inventory re-pricing or buyer-tier
 * flips. `buildSaleLineItems` captures the snapshot at sale time;
 * `resolveKardexPrices` reads it back (with a live fallback for legacy sales).
 */
describe("buildSaleLineItems — freezes per-line price at sale time", () => {
  const priceByItemId = new Map<string, number | undefined>([
    ["G-1", 1000],
    ["G-2", 2000],
    ["G-3", undefined], // unpriced item
  ]);

  it("snapshots each itemId with its tier-resolved price + the buyer tier", () => {
    const lines = buildSaleLineItems(
      ["G-1", "G-2"],
      priceByItemId,
      "embajador",
    );
    expect(lines).toEqual([
      { itemId: "G-1", precioCOP: 1000, tier: "embajador" },
      { itemId: "G-2", precioCOP: 2000, tier: "embajador" },
    ]);
  });

  it("missing prices snapshot as 0 so Σ snapshot === inventory subtotal", () => {
    const lines = buildSaleLineItems(["G-1", "G-3"], priceByItemId, "final");
    expect(lines).toEqual([
      { itemId: "G-1", precioCOP: 1000, tier: "final" },
      { itemId: "G-3", precioCOP: 0, tier: "final" },
    ]);
    const snapshotSum = lines.reduce((a, l) => a + l.precioCOP, 0);
    const subtotal = sumSuggested(
      ["G-1", "G-3"].map((itemId) => ({
        itemId,
        precioCop: priceByItemId.get(itemId),
      })),
    );
    expect(snapshotSum).toBe(subtotal);
  });

  it("returns an empty array for a manual-only sale (no inventory items)", () => {
    expect(buildSaleLineItems([], priceByItemId, "final")).toEqual([]);
  });
});

describe("resolveKardexPrices — faithful comprobante, immune to re-pricing", () => {
  const tier = "final" as const;
  // Live inventory rows whose prices changed AFTER the sale was struck.
  const liveItems = [
    { itemId: "G-1", precioConscienteCOP: 9999 },
    { itemId: "G-2", precioConscienteCOP: 8888 },
  ];

  it("prefers the frozen snapshot over current inventory prices", () => {
    const snapshot = [
      { itemId: "G-1", precioCOP: 1000 },
      { itemId: "G-2", precioCOP: 2000 },
    ];
    const map = resolveKardexPrices(snapshot, liveItems, tier);
    expect(map.get("G-1")).toBe(1000); // NOT 9999
    expect(map.get("G-2")).toBe(2000); // NOT 8888
  });

  it("falls back to a live tier recompute for legacy sales (no snapshot)", () => {
    expect(resolveKardexPrices(undefined, liveItems, tier).get("G-1")).toBe(
      9999,
    );
    // An empty snapshot is treated as "no snapshot" → live fallback.
    expect(resolveKardexPrices([], liveItems, tier).get("G-2")).toBe(8888);
  });
});
