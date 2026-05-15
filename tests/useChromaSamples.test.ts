/**
 * Pure-helper tests for `useChromaSamples`. The React effect itself
 * (loading <img>, drawing to canvas) needs a browser; these tests
 * cover the deterministic helpers — hex extraction, cache load/save,
 * TTL pruning — so the hook's correctness has a unit-test floor.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CHROMA_CACHE_KEY,
  extractDominantHex,
  loadChromaCache,
  saveChromaCache,
} from "../src/hooks/useChromaSamples";

describe("extractDominantHex", () => {
  it("converts an rgb tuple to lowercase hex", () => {
    expect(extractDominantHex(0, 92, 66)).toBe("#005c42");
  });

  it("pads single-digit channels", () => {
    expect(extractDominantHex(1, 2, 3)).toBe("#010203");
  });

  it("clamps channels above 255", () => {
    expect(extractDominantHex(300, -10, 128)).toBe("#ff0080");
  });

  it("handles white and black at the extremes", () => {
    expect(extractDominantHex(255, 255, 255)).toBe("#ffffff");
    expect(extractDominantHex(0, 0, 0)).toBe("#000000");
  });
});

describe("loadChromaCache / saveChromaCache", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty map when nothing is stored", () => {
    expect(loadChromaCache()).toEqual({});
  });

  it("round-trips a sample map", () => {
    const now = Date.now();
    const sample = {
      32: { hex: "#005c42", url: "u1", at: now },
      45: { hex: "#7ccda9", url: "u2", at: now },
    };
    saveChromaCache(sample);
    expect(loadChromaCache()).toEqual(sample);
  });

  it("ignores corrupted JSON in localStorage", () => {
    window.localStorage.setItem(CHROMA_CACHE_KEY, "not-json{");
    expect(loadChromaCache()).toEqual({});
  });

  it("prunes entries older than 7 days on load", () => {
    const now = Date.now();
    const old = now - 8 * 24 * 60 * 60 * 1000;
    saveChromaCache({
      1: { hex: "#aaaaaa", url: "u", at: now },
      2: { hex: "#bbbbbb", url: "u", at: old },
    });
    const loaded = loadChromaCache();
    expect(loaded[1]).toBeDefined();
    expect(loaded[2]).toBeUndefined();
  });
});
