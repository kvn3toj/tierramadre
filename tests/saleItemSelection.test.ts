import { describe, it, expect } from "vitest";
import {
  toggleSelection,
  removeSelection,
  dedupeSelection,
  isSelected,
  sumSuggested,
  pickTierPrice,
  type SelectableItem,
  type TierPricedCop,
} from "../src/pages/admin/Fotosintesis/utils/saleItemSelection";

/**
 * Contract for the multi-item venta selection logic.
 *
 * The create-sale flow used to hold a single `itemId`; it now holds an ordered
 * list of chosen products that the operator builds via the multi-select
 * spotlight (toggle in/out) and trims on the page (per-row remove). These pure
 * helpers back both surfaces, plus the "Usar suma sugerida" price affordance.
 */
const item = (itemId: string, precioCop?: number): SelectableItem => ({
  itemId,
  precioCop,
});

describe("toggleSelection", () => {
  it("appends an absent item, preserving order", () => {
    const list = [item("10"), item("11")];
    expect(toggleSelection(list, item("12")).map((x) => x.itemId)).toEqual([
      "10",
      "11",
      "12",
    ]);
  });

  it("removes an already-present item", () => {
    const list = [item("10"), item("11"), item("12")];
    expect(toggleSelection(list, item("11")).map((x) => x.itemId)).toEqual([
      "10",
      "12",
    ]);
  });

  it("matches on itemId regardless of other fields", () => {
    const list = [item("10", 500_000)];
    // Same id, different price object → still treated as the same selection.
    expect(toggleSelection(list, item("10", 999_999))).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const list = [item("10")];
    toggleSelection(list, item("11"));
    expect(list.map((x) => x.itemId)).toEqual(["10"]);
  });
});

describe("removeSelection", () => {
  it("drops the matching id", () => {
    const list = [item("10"), item("11")];
    expect(removeSelection(list, "10").map((x) => x.itemId)).toEqual(["11"]);
  });

  it("is a no-op when the id is absent", () => {
    const list = [item("10"), item("11")];
    expect(removeSelection(list, "99").map((x) => x.itemId)).toEqual([
      "10",
      "11",
    ]);
  });
});

describe("dedupeSelection", () => {
  it("keeps the first occurrence of each id", () => {
    const list = [item("10", 1), item("11"), item("10", 2)];
    const out = dedupeSelection(list);
    expect(out.map((x) => x.itemId)).toEqual(["10", "11"]);
    expect(out[0].precioCop).toBe(1); // first wins
  });
});

describe("isSelected", () => {
  it("reports membership by id", () => {
    const list = [item("10"), item("11")];
    expect(isSelected(list, "10")).toBe(true);
    expect(isSelected(list, "99")).toBe(false);
  });
});

describe("sumSuggested", () => {
  it("sums numeric prices", () => {
    expect(sumSuggested([item("a", 500_000), item("b", 250_000)])).toBe(
      750_000,
    );
  });

  it("treats missing / NaN prices as zero", () => {
    expect(sumSuggested([item("a", 500_000), item("b"), item("c", NaN)])).toBe(
      500_000,
    );
  });

  it("is zero for an empty selection", () => {
    expect(sumSuggested([])).toBe(0);
  });
});

/**
 * Contract for tier-aware price resolution. The buyer's tier picks which COP
 * field to suggest, with symmetric fallbacks so a partially-priced item still
 * yields a number. Legacy `precioCOP` is the last resort (Sheets column retired
 * 2026-05-29, empty for ~82% of items).
 */
const priced = (p: TierPricedCop): TierPricedCop => p;

describe("pickTierPrice", () => {
  it("embajador picks precioEmbajadorCOP", () => {
    const row = priced({
      precioEmbajadorCOP: 800_000,
      precioConscienteCOP: 1_200_000,
      precioCOP: 999_999,
    });
    expect(pickTierPrice(row, "embajador")).toBe(800_000);
  });

  it("final picks precioConscienteCOP", () => {
    const row = priced({
      precioEmbajadorCOP: 800_000,
      precioConscienteCOP: 1_200_000,
      precioCOP: 999_999,
    });
    expect(pickTierPrice(row, "final")).toBe(1_200_000);
  });

  it("embajador falls back to precioConscienteCOP then precioCOP", () => {
    expect(
      pickTierPrice(
        priced({ precioConscienteCOP: 1_200_000, precioCOP: 500_000 }),
        "embajador",
      ),
    ).toBe(1_200_000);
    expect(pickTierPrice(priced({ precioCOP: 500_000 }), "embajador")).toBe(
      500_000,
    );
  });

  it("final falls back to precioEmbajadorCOP then precioCOP", () => {
    expect(
      pickTierPrice(
        priced({ precioEmbajadorCOP: 800_000, precioCOP: 500_000 }),
        "final",
      ),
    ).toBe(800_000);
    expect(pickTierPrice(priced({ precioCOP: 500_000 }), "final")).toBe(
      500_000,
    );
  });

  it("returns undefined when the item carries no price at all", () => {
    expect(pickTierPrice(priced({}), "embajador")).toBeUndefined();
    expect(pickTierPrice(priced({}), "final")).toBeUndefined();
  });

  it("ignores NaN and resolves the next valid field", () => {
    expect(
      pickTierPrice(
        priced({ precioEmbajadorCOP: NaN, precioConscienteCOP: 1_200_000 }),
        "embajador",
      ),
    ).toBe(1_200_000);
    // NaN across every field → no usable price.
    expect(
      pickTierPrice(
        priced({
          precioEmbajadorCOP: NaN,
          precioConscienteCOP: NaN,
          precioCOP: NaN,
        }),
        "final",
      ),
    ).toBeUndefined();
  });
});
