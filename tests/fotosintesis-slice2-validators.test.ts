import { describe, it, expect } from "vitest";
import {
  isInsumoOnlyLot,
  computeInsumoTotals,
  wouldOverflowHundred,
  type CloseValidationItem,
} from "../convex/_lib/lotItemMath";

describe("isInsumoOnlyLot", () => {
  it("returns false for an empty list", () => {
    expect(isInsumoOnlyLot([])).toBe(false);
  });

  it("returns true when every item is insumo", () => {
    const items: CloseValidationItem[] = [
      { preponderancia: 40, tipo: "insumo" },
      { preponderancia: 30, tipo: "insumo" },
      { preponderancia: 30, tipo: "insumo" },
    ];
    expect(isInsumoOnlyLot(items)).toBe(true);
  });

  it("returns false when any item is non-insumo (gema)", () => {
    const items: CloseValidationItem[] = [
      { preponderancia: 50, tipo: "insumo" },
      { preponderancia: 50, tipo: "gema" },
    ];
    expect(isInsumoOnlyLot(items)).toBe(false);
  });

  it("returns false when any item is non-insumo (joya)", () => {
    const items: CloseValidationItem[] = [
      { preponderancia: 60, tipo: "insumo" },
      { preponderancia: 40, tipo: "joya" },
    ];
    expect(isInsumoOnlyLot(items)).toBe(false);
  });

  it("treats undefined tipo (legacy data) as non-insumo", () => {
    const items: CloseValidationItem[] = [
      { preponderancia: 50, tipo: "insumo" },
      // No tipo — pre-Slice-2 rows.
      { preponderancia: 50 },
    ];
    expect(isInsumoOnlyLot(items)).toBe(false);
  });
});

describe("computeInsumoTotals", () => {
  it("computes costoBaseCOP as cantidad × costoUnitario, rounded", () => {
    const result = computeInsumoTotals({
      cantidad: 3,
      costoUnitarioCOP: 5000,
      lotCostoTotalCOP: 15000,
    });
    expect(result.costoBaseCOP).toBe(15000);
  });

  it("rounds non-integer multiplications", () => {
    const result = computeInsumoTotals({
      cantidad: 2.5,
      costoUnitarioCOP: 1333,
      lotCostoTotalCOP: 100000,
    });
    // 2.5 × 1333 = 3332.5 → rounded to 3333 (banker's? Math.round → 3333)
    expect(result.costoBaseCOP).toBe(3333);
  });

  it("back-derives preponderancia at two decimals when lotCostoTotalCOP > 0", () => {
    const result = computeInsumoTotals({
      cantidad: 3,
      costoUnitarioCOP: 5000,
      lotCostoTotalCOP: 15000,
    });
    expect(result.preponderancia).toBe(100);
  });

  it("derives preponderancia 50.00 for half-lot insumo", () => {
    const result = computeInsumoTotals({
      cantidad: 1,
      costoUnitarioCOP: 50000,
      lotCostoTotalCOP: 100000,
    });
    expect(result.preponderancia).toBe(50);
  });

  it("returns preponderancia 0 when lot cost is 0 (no division by zero)", () => {
    const result = computeInsumoTotals({
      cantidad: 1,
      costoUnitarioCOP: 1000,
      lotCostoTotalCOP: 0,
    });
    expect(result.preponderancia).toBe(0);
    expect(result.costoBaseCOP).toBe(1000);
  });

  it("throws for non-positive cantidad", () => {
    expect(() =>
      computeInsumoTotals({
        cantidad: 0,
        costoUnitarioCOP: 1000,
        lotCostoTotalCOP: 10000,
      }),
    ).toThrow(/cantidad/);
    expect(() =>
      computeInsumoTotals({
        cantidad: -2,
        costoUnitarioCOP: 1000,
        lotCostoTotalCOP: 10000,
      }),
    ).toThrow(/cantidad/);
  });

  it("throws for non-positive costoUnitario", () => {
    expect(() =>
      computeInsumoTotals({
        cantidad: 3,
        costoUnitarioCOP: 0,
        lotCostoTotalCOP: 10000,
      }),
    ).toThrow(/costo unitario/);
  });
});

describe("wouldOverflowHundred", () => {
  it("returns false when cumulative sum stays under 100 + tolerance", () => {
    expect(
      wouldOverflowHundred({
        existing: [
          { preponderancia: 50, tipo: "gema" },
          { preponderancia: 30, tipo: "joya" },
        ],
        candidate: { tipo: "joya", preponderancia: 20 },
      }),
    ).toBe(false);
  });

  it("returns false exactly at the 100.01 boundary", () => {
    expect(
      wouldOverflowHundred({
        existing: [{ preponderancia: 50, tipo: "gema" }],
        candidate: { tipo: "gema", preponderancia: 50.01 },
      }),
    ).toBe(false);
  });

  it("returns true when projected sum exceeds 100 by more than tolerance", () => {
    expect(
      wouldOverflowHundred({
        existing: [
          { preponderancia: 50, tipo: "gema" },
          { preponderancia: 40, tipo: "joya" },
        ],
        candidate: { tipo: "joya", preponderancia: 15 },
      }),
    ).toBe(true);
  });

  it("skips the overflow check when adding an insumo to an all-insumo lot", () => {
    expect(
      wouldOverflowHundred({
        existing: [
          { preponderancia: 60, tipo: "insumo" },
          { preponderancia: 60, tipo: "insumo" },
        ],
        candidate: { tipo: "insumo", preponderancia: 20 },
      }),
    ).toBe(false);
  });

  it("still blocks an insumo addition when any existing item is non-insumo", () => {
    expect(
      wouldOverflowHundred({
        existing: [
          { preponderancia: 50, tipo: "gema" },
          { preponderancia: 50, tipo: "insumo" },
        ],
        candidate: { tipo: "insumo", preponderancia: 5 },
      }),
    ).toBe(true);
  });

  it("blocks a gema addition into an all-insumo lot if it would overflow", () => {
    expect(
      wouldOverflowHundred({
        existing: [
          { preponderancia: 60, tipo: "insumo" },
          { preponderancia: 60, tipo: "insumo" },
        ],
        candidate: { tipo: "gema", preponderancia: 5 },
      }),
    ).toBe(true);
  });

  it("never overflows on an empty lot regardless of candidate size", () => {
    expect(
      wouldOverflowHundred({
        existing: [],
        candidate: { tipo: "gema", preponderancia: 100 },
      }),
    ).toBe(false);
  });
});
