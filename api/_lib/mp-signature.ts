/**
 * Mercado Pago webhook signature validation (HMAC-SHA256).
 *
 * MP signs each Webhooks-v2 notification with an `x-signature` header
 * (`ts=…,v1=…`) and an `x-request-id`. The validated manifest is
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * keyed by the per-application **webhook secret** (MP_WEBHOOK_SECRET — NOT the
 * access token). The `request-id:` segment is omitted entirely when the header
 * is absent (MP's "omit parameters not present" rule). `data.id` comes from the
 * `?data.id=` query param when present, else the body's `data.id`.
 *
 * Runs on Vercel's Node runtime, so we use Node `crypto` + `timingSafeEqual`
 * for a constant-time compare. Pure (no IO) → unit-testable; see
 * tests/mpSignature.test.ts.
 */

import crypto from "node:crypto";

type HeaderBag = Record<string, string | string[] | undefined>;
type QueryBag = Record<string, string | string[] | undefined>;

export interface MpSignatureInput {
  headers: HeaderBag;
  query: QueryBag;
  /** Fallback when `?data.id=` is absent (body.data.id), as string or number. */
  bodyDataId?: string | number | null;
}

function firstValue(bag: HeaderBag, name: string): string | undefined {
  const raw = bag[name] ?? bag[name.toLowerCase()];
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Validate the MP webhook signature against `secret`. Returns false on any
 * missing/malformed input (never throws). The caller responds 401 on false.
 */
export function validateMpSignature(
  input: MpSignatureInput,
  secret: string,
): boolean {
  if (!secret) return false;

  const xSignature = firstValue(input.headers, "x-signature");
  const xRequestId = firstValue(input.headers, "x-request-id");
  if (!xSignature) return false;

  // Parse `ts` and `v1` out of the comma-separated x-signature.
  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of xSignature.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key === "ts") ts = val;
    else if (key === "v1") v1 = val;
  }
  if (!ts || !v1) return false;

  const qDataId = input.query["data.id"];
  const rawDataId =
    (Array.isArray(qDataId) ? qDataId[0] : qDataId) ?? input.bodyDataId;
  if (rawDataId == null || rawDataId === "") return false;
  const dataId = String(rawDataId).toLowerCase();

  const manifest = xRequestId
    ? `id:${dataId};request-id:${xRequestId};ts:${ts};`
    : `id:${dataId};ts:${ts};`;

  const computed = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  // Length guard — timingSafeEqual throws on differing buffer lengths.
  if (computed.length !== v1.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
  } catch {
    return false;
  }
}
