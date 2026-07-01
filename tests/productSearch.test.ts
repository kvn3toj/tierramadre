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

  // ── Graceful degradation ────────────────────────────────────────────────
  // The GHL bot passes `categoria = {{contact.tipo_interes}}` — a customer
  // intent value (e.g. "inversion", "anillo", "regalo"). The live catalog's
  // `categoria` field holds internal collection names ("Gema Facetada",
  // "Muralla", "Gola"…), so a real tipo_interes strict-matches NOTHING. Rather
  // than answer with an empty list while 59 emeralds sit in stock, the bot must
  // degrade to in-budget options.

  it("falls back to in-budget options when NO product matches the categoria (never empty when eligible pieces exist)", () => {
    const out = rankProducts(
      [
        prod({
          itemId: "gema",
          categoria: "Gema Facetada",
          precioCOP: 1_980_000,
        }),
        prod({ itemId: "muralla", categoria: "Muralla", precioCOP: 1_620_000 }),
      ],
      { categoria: "inversion", presupuesto: 3_000_000 },
    );
    // "inversion" matches neither internal collection name → degrade instead of
    // returning [], pricier-in-budget first.
    expect(out.map((p) => p.itemId)).toEqual(["gema", "muralla"]);
  });

  it("degradation still respects the budget margin (never recommends a wildly over-budget piece)", () => {
    const out = rankProducts(
      [
        prod({
          itemId: "inBudget",
          categoria: "Muralla",
          precioCOP: 2_000_000,
        }),
        prod({ itemId: "tooDear", categoria: "Gola", precioCOP: 50_000_000 }),
      ],
      { categoria: "anillo", presupuesto: 3_000_000 },
    );
    expect(out.map((p) => p.itemId)).toEqual(["inBudget"]);
  });

  it("degradation still excludes unpublished / not-DISPONIBLE pieces", () => {
    const out = rankProducts(
      [
        prod({ itemId: "sold", categoria: "Muralla", estado: "VENDIDA" }),
        prod({ itemId: "hidden", categoria: "Gola", mostrarEnCatalogo: false }),
        prod({ itemId: "live", categoria: "Raíz", precioCOP: 900_000 }),
      ],
      { categoria: "anillo" },
    );
    expect(out.map((p) => p.itemId)).toEqual(["live"]);
  });

  it("prefers strict category matches over the fallback when at least one matches", () => {
    const out = rankProducts(
      [
        prod({ itemId: "ring", categoria: "anillos", precioCOP: 1_000_000 }),
        prod({
          itemId: "gema",
          categoria: "Gema Facetada",
          precioCOP: 2_000_000,
        }),
      ],
      { categoria: "anillo" },
    );
    // A real match exists → do NOT dilute it with off-category pieces.
    expect(out.map((p) => p.itemId)).toEqual(["ring"]);
  });
});
