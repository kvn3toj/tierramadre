import { describe, it, expect } from "vitest";
import {
  MIN_MULTIPLIER,
  MAX_MULTIPLIER,
  clampMultiplier,
  priceFromMultiplier,
  multiplierFromPrice,
  formatMultiplier,
} from "../src/pages/admin/Fotosintesis/utils/priceMultiplier";

describe("clampMultiplier", () => {
  it("keeps in-range values untouched", () => {
    expect(clampMultiplier(1)).toBe(1);
    expect(clampMultiplier(2.5)).toBe(2.5);
    expect(clampMultiplier(4)).toBe(4);
  });

  it("clamps below the floor and above the ceiling", () => {
    expect(clampMultiplier(0.2)).toBe(MIN_MULTIPLIER);
    expect(clampMultiplier(6)).toBe(MAX_MULTIPLIER);
  });

  it("falls back to the floor for NaN/Infinity", () => {
    expect(clampMultiplier(Number.NaN)).toBe(MIN_MULTIPLIER);
    expect(clampMultiplier(Number.POSITIVE_INFINITY)).toBe(MAX_MULTIPLIER);
  });
});

describe("priceFromMultiplier", () => {
  it("multiplies the base cost", () => {
    // Luna in the screenshot: base 540.000 × 3 → 1.620.000.
    expect(priceFromMultiplier(540_000, 3)).toBe(1_620_000);
  });

  it("rounds to the nearest 1.000 COP", () => {
    expect(priceFromMultiplier(333, 1)).toBe(0);
    expect(priceFromMultiplier(333_333, 1)).toBe(333_000);
  });

  it("returns 0 when the base cost is missing or non-positive", () => {
    expect(priceFromMultiplier(0, 3)).toBe(0);
    expect(priceFromMultiplier(-100, 3)).toBe(0);
  });
});

describe("multiplierFromPrice", () => {
  it("derives the true (unclamped) ratio", () => {
    expect(multiplierFromPrice(540_000, 1_620_000)).toBe(3);
    // Aura consciente legacy value reads above the x4 cap — kept honest here.
    expect(multiplierFromPrice(660_000, 3_960_000)).toBe(6);
  });

  it("returns null when it cannot be derived", () => {
    expect(multiplierFromPrice(0, 1_000)).toBeNull();
    expect(multiplierFromPrice(540_000, "")).toBeNull();
  });
});

describe("formatMultiplier", () => {
  it("drops the decimal for whole numbers", () => {
    expect(formatMultiplier(3)).toBe("x3");
    expect(formatMultiplier(4)).toBe("x4");
  });

  it("uses an es-CO comma for fractions", () => {
    expect(formatMultiplier(2.5)).toBe("x2,5");
  });

  it("rounds a legacy ratio to one decimal", () => {
    expect(formatMultiplier(5.995)).toBe("x6");
    expect(formatMultiplier(2.74)).toBe("x2,7");
  });
});
