import { describe, it, expect } from "vitest";
import { extractBearer, bearerMatches } from "../api/_lib/bearer";

describe("extractBearer", () => {
  it("pulls the token out of a Bearer header (case-insensitive scheme)", () => {
    expect(extractBearer("Bearer abc123")).toBe("abc123");
    expect(extractBearer("bearer abc123")).toBe("abc123");
  });
  it("returns null for missing / non-bearer headers", () => {
    expect(extractBearer(undefined)).toBeNull();
    expect(extractBearer("Basic xyz")).toBeNull();
    expect(extractBearer("")).toBeNull();
  });
  it("uses the first value when given an array header", () => {
    expect(extractBearer(["Bearer first", "Bearer second"])).toBe("first");
  });
});

describe("bearerMatches", () => {
  it("matches an exact secret", () => {
    expect(bearerMatches("Bearer s3cret", "s3cret")).toBe(true);
  });
  it("rejects a wrong token", () => {
    expect(bearerMatches("Bearer nope", "s3cret")).toBe(false);
  });
  it("rejects when no secret is configured (fail closed)", () => {
    expect(bearerMatches("Bearer s3cret", undefined)).toBe(false);
    expect(bearerMatches("Bearer s3cret", "")).toBe(false);
  });
  it("rejects a missing Authorization header", () => {
    expect(bearerMatches(undefined, "s3cret")).toBe(false);
  });
});
