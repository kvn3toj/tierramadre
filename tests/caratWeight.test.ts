import { describe, it, expect } from "vitest";
import {
  parseCaratWeight,
  pricePerCarat,
} from "../src/pages/admin/Fotosintesis/utils/caratWeight";

describe("parseCaratWeight", () => {
  it("reads bare numbers as carats", () => {
    expect(parseCaratWeight("2.5")).toBe(2.5);
    expect(parseCaratWeight(2.5)).toBe(2.5);
  });

  it("accepts es-CO decimal commas", () => {
    expect(parseCaratWeight("2,5 ct")).toBe(2.5);
    expect(parseCaratWeight("0,80 quilates")).toBe(0.8);
  });

  it("treats ct / quilate verbatim", () => {
    expect(parseCaratWeight("2.5 ct")).toBe(2.5);
    expect(parseCaratWeight("4 quilates")).toBe(4);
  });

  it("converts grams (1 g = 5 ct)", () => {
    expect(parseCaratWeight("3 gr")).toBe(15);
    expect(parseCaratWeight("3 g")).toBe(15);
  });

  it("converts kilograms before the gram branch (1 kg = 5000 ct)", () => {
    expect(parseCaratWeight("12 kg")).toBe(60000);
  });

  it("returns null for non-numeric or empty weights", () => {
    expect(parseCaratWeight("Plata")).toBeNull();
    expect(parseCaratWeight("fragmento")).toBeNull();
    expect(parseCaratWeight("")).toBeNull();
    expect(parseCaratWeight(0)).toBeNull();
    expect(parseCaratWeight(undefined)).toBeNull();
    expect(parseCaratWeight(null)).toBeNull();
  });
});

describe("pricePerCarat", () => {
  it("divides price by carats and rounds", () => {
    expect(pricePerCarat(1_250_000, 2.5)).toBe(500_000);
    expect(pricePerCarat(1_000_000, 3)).toBe(333_333);
  });

  it("returns null when price or carats are missing/non-positive", () => {
    expect(pricePerCarat(0, 2.5)).toBeNull();
    expect(pricePerCarat(1000, null)).toBeNull();
    expect(pricePerCarat(1000, 0)).toBeNull();
    expect(pricePerCarat("", 2.5)).toBeNull();
  });
});
