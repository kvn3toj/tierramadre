import { describe, it, expect } from "vitest";
import { recordsEqual } from "../src/pages/admin/Fotosintesis/utils/dirtySnapshot";

describe("recordsEqual", () => {
  it("treats identical flat records as equal", () => {
    expect(
      recordsEqual({ a: "x", n: 1, b: true }, { a: "x", n: 1, b: true }),
    ).toBe(true);
  });

  it("detects a changed value", () => {
    expect(recordsEqual({ a: "x" }, { a: "y" })).toBe(false);
  });

  it("distinguishes empty string from undefined (so seeded blanks aren't dirty)", () => {
    expect(recordsEqual({ a: "" }, { a: "" })).toBe(true);
    expect(recordsEqual({ a: "" }, { a: undefined })).toBe(false);
  });

  it("ignores key order", () => {
    expect(recordsEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("detects a differing set of keys", () => {
    expect(recordsEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });
});
