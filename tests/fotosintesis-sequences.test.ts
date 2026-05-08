import { describe, it, expect } from "vitest";
import { formatLotId, formatSaleId } from "../convex/sequences";

describe("formatLotId", () => {
  it("pads single digits to 3", () => {
    expect(formatLotId(1)).toBe("B-001");
    expect(formatLotId(7)).toBe("B-007");
  });

  it("pads double and triple digits", () => {
    expect(formatLotId(42)).toBe("B-042");
    expect(formatLotId(999)).toBe("B-999");
  });

  it("does not truncate beyond 3 digits", () => {
    expect(formatLotId(1000)).toBe("B-1000");
    expect(formatLotId(12345)).toBe("B-12345");
  });
});

describe("formatSaleId", () => {
  it("pads to 4 digits", () => {
    expect(formatSaleId(1)).toBe("V-0001");
    expect(formatSaleId(42)).toBe("V-0042");
    expect(formatSaleId(9999)).toBe("V-9999");
  });

  it("does not truncate beyond 4 digits", () => {
    expect(formatSaleId(10000)).toBe("V-10000");
  });
});
