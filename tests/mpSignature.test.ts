import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { validateMpSignature } from "../api/_lib/mp-signature";

const SECRET = "test-webhook-secret";

/** Build a valid x-signature header for the given parts. */
function sign(dataId: string, requestId: string | null, ts: string): string {
  const manifest = requestId
    ? `id:${dataId};request-id:${requestId};ts:${ts};`
    : `id:${dataId};ts:${ts};`;
  const v1 = crypto.createHmac("sha256", SECRET).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("validateMpSignature", () => {
  it("returns false when x-signature is missing", () => {
    expect(
      validateMpSignature(
        { headers: { "x-request-id": "req-1" }, query: { "data.id": "123" } },
        SECRET,
      ),
    ).toBe(false);
  });

  it("returns false on a malformed x-signature (no ts/v1)", () => {
    expect(
      validateMpSignature(
        {
          headers: { "x-signature": "garbage", "x-request-id": "req-1" },
          query: { "data.id": "123" },
        },
        SECRET,
      ),
    ).toBe(false);
  });

  it("validates a known-good signature (data.id from query)", () => {
    const ts = "1704908010";
    const xSignature = sign("123", "req-1", ts);
    expect(
      validateMpSignature(
        {
          headers: { "x-signature": xSignature, "x-request-id": "req-1" },
          query: { "data.id": "123" },
        },
        SECRET,
      ),
    ).toBe(true);
  });

  it("rejects a tampered v1", () => {
    const ts = "1704908010";
    const good = sign("123", "req-1", ts);
    const tampered = good.slice(0, -1) + (good.slice(-1) === "0" ? "1" : "0");
    expect(
      validateMpSignature(
        {
          headers: { "x-signature": tampered, "x-request-id": "req-1" },
          query: { "data.id": "123" },
        },
        SECRET,
      ),
    ).toBe(false);
  });

  it("omits the request-id segment when x-request-id is absent and still matches", () => {
    const ts = "1704908010";
    const xSignature = sign("123", null, ts); // manifest WITHOUT request-id
    expect(
      validateMpSignature(
        { headers: { "x-signature": xSignature }, query: { "data.id": "123" } },
        SECRET,
      ),
    ).toBe(true);
  });

  it("falls back to body data.id when the query param is absent", () => {
    const ts = "1704908010";
    const xSignature = sign("999", "req-9", ts);
    expect(
      validateMpSignature(
        {
          headers: { "x-signature": xSignature, "x-request-id": "req-9" },
          query: {},
          bodyDataId: 999,
        },
        SECRET,
      ),
    ).toBe(true);
  });
});
