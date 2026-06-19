import { describe, it, expect } from "vitest";
import {
  rankProducts,
  type SearchableProduct,
} from "../convex/_lib/productSearch";

/** Helper: a published, available product with sensible defaults. */
function prod(
  p: Partial<SearchableProduct> & { itemId: string },
): SearchableProduct {
  return {
    nombre: p.itemId,
    categoria: "anillos",
    precioCOP: 1_000_000,
    estado: "DISPONIBLE",
    mostrarEnCatalogo: true,
    ...p,
  };
}

describe("rankProducts", () => {
  it("returns [] for empty input", () => {
    expect(rankProducts([], {})).toEqual([]);
  });

  it("excludes unpublished products (mostrarEnCatalogo !== true)", () => {
    const out = rankProducts(
      [prod({ itemId: "A", mostrarEnCatalogo: false }), prod({ itemId: "B" })],
      {},
    );
    expect(out.map((p) => p.itemId)).toEqual(["B"]);
  });

  it("excludes products that are not DISPONIBLE", () => {
    const out = rankProducts(
      [prod({ itemId: "A", estado: "VENDIDA" }), prod({ itemId: "B" })],
      {},
    );
    expect(out.map((p) => p.itemId)).toEqual(["B"]);
  });

  it("applies the 20% budget margin (1M budget admits 1.2M, rejects 1.3M)", () => {
    const out = rankProducts(
      [
        prod({ itemId: "in", precioCOP: 1_200_000 }),
        prod({ itemId: "out", precioCOP: 1_300_000 }),
      ],
      { presupuesto: 1_000_000 },
    );
    expect(out.map((p) => p.itemId)).toEqual(["in"]);
  });

  it("filters by categoria (substring/exact, case-insensitive)", () => {
    const out = rankProducts(
      [
        prod({ itemId: "ring", categoria: "Anillos" }),
        prod({ itemId: "neck", categoria: "Collares" }),
      ],
      { categoria: "anillo" },
    );
    expect(out.map((p) => p.itemId)).toEqual(["ring"]);
  });

  it("returns at most 3 results", () => {
    const items = Array.from({ length: 6 }, (_, i) =>
      prod({ itemId: `P${i}`, precioCOP: 100_000 + i }),
    );
    expect(rankProducts(items, {}).length).toBe(3);
  });

  it("ranks a categoria match above non-matching, then pricier-in-budget first", () => {
    const out = rankProducts(
      [
        prod({ itemId: "cheapRing", categoria: "anillos", precioCOP: 500_000 }),
        prod({
          itemId: "dearRing",
          categoria: "anillos",
          precioCOP: 1_500_000,
        }),
        prod({
          itemId: "necklace",
          categoria: "collares",
          precioCOP: 1_800_000,
        }),
      ],
      { categoria: "anillos", presupuesto: 2_000_000 },
    );
    // category matches come first (necklace excluded by the categoria filter),
    // and among them the pricier-in-budget ranks first.
    expect(out.map((p) => p.itemId)).toEqual(["dearRing", "cheapRing"]);
  });
});
