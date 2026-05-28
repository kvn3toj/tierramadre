import { describe, it, expect } from "vitest";
import {
  canReopenLot,
  preponderanciaSum,
  balancesTo100,
  deriveCostoBaseCOP,
  PREPONDERANCIA_TOLERANCE,
} from "../convex/_lib/lotMath";

describe("canReopenLot", () => {
  it("refuses an abierto lot (already open)", () => {
    const v = canReopenLot({ estado: "abierto", members: [] });
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("not-closeable");
    expect(v.soldItemIds).toEqual([]);
  });

  it("refuses a cancelado lot", () => {
    const v = canReopenLot({
      estado: "cancelado",
      members: [{ itemId: "TM-1" }],
    });
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("not-closeable");
  });

  it("allows a cerrado lot with no sold items", () => {
    const v = canReopenLot({
      estado: "cerrado",
      members: [{ itemId: "TM-1", estado: "DISPONIBLE" }, { itemId: "TM-2" }],
    });
    expect(v.ok).toBe(true);
    expect(v.soldItemIds).toEqual([]);
  });

  it("allows a publicado lot with no sold items", () => {
    const v = canReopenLot({
      estado: "publicado",
      members: [{ itemId: "TM-1", estado: "DISPONIBLE" }],
    });
    expect(v.ok).toBe(true);
  });

  it("blocks a cerrado lot when one item is VENDIDA, naming it", () => {
    const v = canReopenLot({
      estado: "cerrado",
      members: [
        { itemId: "TM-1", estado: "DISPONIBLE" },
        { itemId: "TM-2", estado: "VENDIDA" },
      ],
    });
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("has-sold");
    expect(v.soldItemIds).toEqual(["TM-2"]);
  });

  it("blocks a publicado lot listing every VENDIDA item", () => {
    const v = canReopenLot({
      estado: "publicado",
      members: [
        { itemId: "TM-1", estado: "VENDIDA" },
        { itemId: "TM-2", estado: "DISPONIBLE" },
        { itemId: "TM-3", estado: "VENDIDA" },
      ],
    });
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("has-sold");
    expect(v.soldItemIds).toEqual(["TM-1", "TM-3"]);
  });

  it("reports not-closeable before sold (estado gate wins)", () => {
    const v = canReopenLot({
      estado: "abierto",
      members: [{ itemId: "TM-1", estado: "VENDIDA" }],
    });
    expect(v.reason).toBe("not-closeable");
    expect(v.soldItemIds).toEqual([]);
  });
});

describe("preponderanciaSum", () => {
  it("sums an empty list to 0", () => {
    expect(preponderanciaSum([])).toBe(0);
  });

  it("sums two halves to 100", () => {
    expect(
      preponderanciaSum([{ preponderancia: 50 }, { preponderancia: 50 }]),
    ).toBe(100);
  });

  it("sums three thirds to ~100", () => {
    expect(
      preponderanciaSum([
        { preponderancia: 33.33 },
        { preponderancia: 33.33 },
        { preponderancia: 33.34 },
      ]),
    ).toBeCloseTo(100, 5);
  });
});

describe("balancesTo100", () => {
  it("accepts exactly 100", () => {
    expect(balancesTo100(100)).toBe(true);
  });

  it("accepts within tolerance on both sides", () => {
    // Half the tolerance, so float representation can't tip it over the edge.
    expect(balancesTo100(100 + PREPONDERANCIA_TOLERANCE / 2)).toBe(true);
    expect(balancesTo100(100 - PREPONDERANCIA_TOLERANCE / 2)).toBe(true);
  });

  it("rejects beyond tolerance", () => {
    expect(balancesTo100(100.02)).toBe(false);
    expect(balancesTo100(50)).toBe(false);
    expect(balancesTo100(0)).toBe(false);
  });
});

describe("deriveCostoBaseCOP", () => {
  it("splits the lot cost by preponderancia and rounds", () => {
    expect(deriveCostoBaseCOP(1_000_000, 50)).toBe(500_000);
    expect(deriveCostoBaseCOP(1_000_000, 33.33)).toBe(333_300);
  });

  it("rounds to the nearest peso", () => {
    expect(deriveCostoBaseCOP(100, 33.33)).toBe(33);
    expect(deriveCostoBaseCOP(100, 66.67)).toBe(67);
  });

  it("returns 0 for a zero lot cost", () => {
    expect(deriveCostoBaseCOP(0, 50)).toBe(0);
  });
});
