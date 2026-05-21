import { describe, it, expect } from "vitest";
import { computeNitCheckDigit, verifyNit } from "../src/utils/nitVerify";

describe("computeNitCheckDigit", () => {
  it("computes DV for 900100123 as 1", () => {
    // 3*3 + 2*7 + 1*13 + 0*17 + 0*19 + 1*23 + 0*29 + 0*37 + 9*41 = 428
    // 428 % 11 = 10 → 11 - 10 = 1
    expect(computeNitCheckDigit("900100123")).toBe(1);
  });

  it("computes DV for 901234567 as 7", () => {
    expect(computeNitCheckDigit("901234567")).toBe(7);
  });

  it("computes DV for 800197268 as 4", () => {
    expect(computeNitCheckDigit("800197268")).toBe(4);
  });

  it("strips non-digit characters before computing", () => {
    expect(computeNitCheckDigit("900.100.123")).toBe(1);
    expect(computeNitCheckDigit("900 100 123")).toBe(1);
  });

  it("throws for too-short input", () => {
    expect(() => computeNitCheckDigit("12345")).toThrow();
  });

  it("throws for too-long input", () => {
    expect(() => computeNitCheckDigit("1".repeat(16))).toThrow();
  });
});

describe("verifyNit", () => {
  it("accepts a correctly-formatted NIT with matching DV", () => {
    expect(verifyNit("900100123-1")).toEqual({
      valid: true,
      suggested: "900100123-1",
    });
  });

  it("rejects a NIT with the wrong DV but still suggests the correct one", () => {
    const result = verifyNit("900100123-3");
    expect(result.valid).toBe(false);
    expect(result.suggested).toBe("900100123-1");
  });

  it("accepts the dotted Colombian format", () => {
    expect(verifyNit("900.100.123-1")).toMatchObject({ valid: true });
  });

  it("accepts the space-separated format", () => {
    expect(verifyNit("900100123 1")).toMatchObject({ valid: true });
  });

  it("returns valid:false with a suggested formatting when body has no DV", () => {
    const result = verifyNit("900100123");
    expect(result.valid).toBe(false);
    expect(result.suggested).toBe("900100123-1");
  });

  it("returns valid:false for empty input", () => {
    expect(verifyNit("")).toEqual({ valid: false });
  });

  it("returns valid:false for purely non-digit input", () => {
    expect(verifyNit("abc-def")).toEqual({ valid: false });
    expect(verifyNit("---")).toEqual({ valid: false });
  });

  it("returns valid:false for input that is too short", () => {
    expect(verifyNit("12-3")).toEqual({ valid: false });
    expect(verifyNit("12345")).toEqual({ valid: false });
  });

  it("returns valid:false for input that is absurdly long", () => {
    expect(verifyNit("1".repeat(20))).toEqual({ valid: false });
  });

  it("handles the second known-valid sample (901234567-7)", () => {
    expect(verifyNit("901234567-7")).toMatchObject({ valid: true });
    expect(verifyNit("901234567-0")).toMatchObject({
      valid: false,
      suggested: "901234567-7",
    });
  });

  it("handles the third known-valid sample (800197268-4)", () => {
    expect(verifyNit("800197268-4")).toMatchObject({ valid: true });
  });

  it("treats undefined-ish input as invalid", () => {
    // @ts-expect-error — exercising the runtime guard
    expect(verifyNit(undefined)).toEqual({ valid: false });
    // @ts-expect-error — exercising the runtime guard
    expect(verifyNit(null)).toEqual({ valid: false });
  });
});
