import { describe, it, expect } from "vitest";
import {
  OVER_LIMIT_COP,
  isOverLimit,
  computeCommissionCOP,
  commissionPercentForNivel,
} from "../convex/_lib/commission";

describe("isOverLimit (≤2M COP gate)", () => {
  it("passes a sale exactly at the 2,000,000 boundary", () => {
    expect(isOverLimit(2_000_000)).toBe(false);
    expect(OVER_LIMIT_COP).toBe(2_000_000);
  });

  it("blocks one peso over the limit", () => {
    expect(isOverLimit(2_000_001)).toBe(true);
  });

  it("passes well under the limit", () => {
    expect(isOverLimit(1_999_999)).toBe(false);
    expect(isOverLimit(0)).toBe(false);
  });
});

describe("computeCommissionCOP", () => {
  it("computes 8% of 1.5M as 120000", () => {
    expect(computeCommissionCOP(1_500_000, 8)).toBe(120_000);
  });

  it("rounds to the nearest peso", () => {
    // 333,333 * 12% = 39,999.96 → 40000
    expect(computeCommissionCOP(333_333, 12)).toBe(40_000);
  });

  it("returns 0 for a zero total", () => {
    expect(computeCommissionCOP(0, 10)).toBe(0);
  });
});

describe("commissionPercentForNivel", () => {
  it("maps each tier to its default percent", () => {
    expect(commissionPercentForNivel("bronce")).toBe(8);
    expect(commissionPercentForNivel("plata")).toBe(10);
    expect(commissionPercentForNivel("oro")).toBe(12);
    expect(commissionPercentForNivel("diamante")).toBe(15);
  });
});
