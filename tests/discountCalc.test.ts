import { describe, it, expect } from "vitest";
import {
  clampPct,
  totalFromPct,
  pctFromTotal,
  discountAmount,
} from "../src/pages/admin/Fotosintesis/utils/discountCalc";

describe("discountCalc — clampPct", () => {
  it("clamps into [0, 100]", () => {
    expect(clampPct(-5)).toBe(0);
    expect(clampPct(0)).toBe(0);
    expect(clampPct(37.5)).toBe(37.5);
    expect(clampPct(100)).toBe(100);
    expect(clampPct(150)).toBe(100);
  });
  it("treats NaN / non-finite as 0", () => {
    expect(clampPct(NaN)).toBe(0);
    expect(clampPct(Infinity)).toBe(0);
  });
});

describe("discountCalc — totalFromPct", () => {
  it("applies the percentage off the subtotal", () => {
    expect(totalFromPct(1_000_000, 0)).toBe(1_000_000);
    expect(totalFromPct(1_000_000, 10)).toBe(900_000);
    expect(totalFromPct(1_000_000, 100)).toBe(0);
  });
  it("rounds to whole COP", () => {
    expect(totalFromPct(999_999, 15)).toBe(Math.round(999_999 * 0.85));
  });
  it("returns 0 for a non-positive subtotal", () => {
    expect(totalFromPct(0, 10)).toBe(0);
    expect(totalFromPct(-100, 10)).toBe(0);
  });
  it("clamps out-of-range percentages", () => {
    expect(totalFromPct(1_000_000, -10)).toBe(1_000_000);
    expect(totalFromPct(1_000_000, 130)).toBe(0);
  });
});

describe("discountCalc — pctFromTotal", () => {
  it("derives the percentage from a discounted total", () => {
    expect(pctFromTotal(1_000_000, 900_000)).toBe(10);
    expect(pctFromTotal(1_000_000, 1_000_000)).toBe(0);
    expect(pctFromTotal(1_000_000, 0)).toBe(100);
  });
  it("rounds to two decimals", () => {
    // 850_000 / 1_000_001 → 14.99998..%
    expect(pctFromTotal(1_000_001, 850_001)).toBe(15);
  });
  it("returns 0 when there is no base to discount against", () => {
    expect(pctFromTotal(0, 0)).toBe(0);
    expect(pctFromTotal(-5, 10)).toBe(0);
  });
  it("never goes negative when the total exceeds the subtotal", () => {
    expect(pctFromTotal(1_000_000, 1_200_000)).toBe(0);
  });
});

describe("discountCalc — discountAmount", () => {
  it("is the COP delta between subtotal and total", () => {
    expect(discountAmount(1_000_000, 900_000)).toBe(100_000);
    expect(discountAmount(1_000_000, 1_000_000)).toBe(0);
  });
  it("never negative; 0 when no base", () => {
    expect(discountAmount(1_000_000, 1_500_000)).toBe(0);
    expect(discountAmount(0, 0)).toBe(0);
  });
});

describe("discountCalc — round-trip invariance", () => {
  it("pct → total → pct is stable", () => {
    const subtotal = 2_350_000;
    for (const pct of [5, 12.5, 33.33, 50, 90]) {
      const total = totalFromPct(subtotal, pct);
      const back = pctFromTotal(subtotal, total);
      // Within rounding tolerance (whole-COP total rounds the pct slightly).
      expect(Math.abs(back - pct)).toBeLessThan(0.05);
    }
  });
});
