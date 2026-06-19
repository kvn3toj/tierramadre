import { describe, it, expect } from "vitest";
import { dataUrlByteLength } from "../src/pages/admin/Fotosintesis/captureNodeToPdf";

/**
 * `dataUrlByteLength` is what `encodeJpegWithinBudget` uses to decide whether a
 * JPEG fits under Vercel's ~4.5 MB body limit (the cause of the 413 when the
 * Kardex embedded a lossless PNG). The base64→bytes math must be exact, so we
 * pin known encodings.
 */
describe("dataUrlByteLength", () => {
  it("decodes a 3-byte payload (no padding)", () => {
    // [1,2,3] → "AQID" (4 chars, no '='), 3 bytes.
    expect(dataUrlByteLength("data:image/jpeg;base64,AQID")).toBe(3);
  });

  it("accounts for single '=' padding (2 bytes)", () => {
    // [1,2] → "AQI=", 2 bytes.
    expect(dataUrlByteLength("data:image/jpeg;base64,AQI=")).toBe(2);
  });

  it("accounts for double '==' padding (1 byte)", () => {
    // [1] → "AQ==", 1 byte.
    expect(dataUrlByteLength("data:image/jpeg;base64,AQ==")).toBe(1);
  });

  it("handles a raw base64 string with no data-URL prefix", () => {
    expect(dataUrlByteLength("AQID")).toBe(3);
  });

  it("scales linearly for larger payloads (1 KB of base64)", () => {
    // 1024 base64 chars, no padding → 768 bytes.
    const base64 = "A".repeat(1024);
    expect(dataUrlByteLength(`data:image/jpeg;base64,${base64}`)).toBe(768);
  });
});
