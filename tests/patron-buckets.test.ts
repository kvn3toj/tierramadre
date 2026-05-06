import { describe, it, expect } from "vitest";
import {
  qualityBucket,
  caratBucket,
  procedenciaBucket,
  comboKey,
} from "../src/utils/patron-buckets";

describe("qualityBucket", () => {
  it("returns 'AAA' / 'AA' / 'A' for valid input", () => {
    expect(qualityBucket("AAA")).toBe("AAA");
    expect(qualityBucket("AA")).toBe("AA");
    expect(qualityBucket("A")).toBe("A");
  });
  it("normalizes whitespace and case", () => {
    expect(qualityBucket("  aaa ")).toBe("AAA");
    expect(qualityBucket("aA")).toBe("AA");
  });
  it("returns null for unknown values", () => {
    expect(qualityBucket("")).toBeNull();
    expect(qualityBucket("XX")).toBeNull();
  });
});

describe("caratBucket", () => {
  it("buckets to 0.5-ct windows centered on the input", () => {
    expect(caratBucket(2.4)).toEqual([2.15, 2.65]);
    expect(caratBucket(3.0)).toEqual([2.75, 3.25]);
    expect(caratBucket(3.12)).toEqual([2.87, 3.37]);
  });
  it("returns null for non-finite peso", () => {
    expect(caratBucket(NaN)).toBeNull();
    expect(caratBucket(0)).toBeNull();
    expect(caratBucket(-1)).toBeNull();
  });
});

describe("procedenciaBucket", () => {
  it("returns the first word of coleccion when known", () => {
    expect(procedenciaBucket("Muzo Imperial 2024")).toBe("Muzo");
    expect(procedenciaBucket("Cosquez")).toBe("Cosquez");
  });
  it("normalizes case", () => {
    expect(procedenciaBucket("muzo imperial")).toBe("Muzo");
  });
  it("returns null when no recognized procedencia", () => {
    expect(procedenciaBucket("")).toBeNull();
    expect(procedenciaBucket("Foo Bar")).toBeNull();
  });
});

describe("comboKey", () => {
  it("joins procedencia · quality · carat-bucket", () => {
    expect(
      comboKey({
        procedencia: "Cosquez",
        quality: "AA",
        caratLo: 3.0,
        caratHi: 3.5,
      }),
    ).toBe("Cosquez·AA·3.00–3.50");
  });
  it("formats carats to 2 decimals", () => {
    expect(
      comboKey({
        procedencia: "Muzo",
        quality: "AAA",
        caratLo: 2,
        caratHi: 2.5,
      }),
    ).toBe("Muzo·AAA·2.00–2.50");
  });
});
