/**
 * Wompi signatures — the two halves of the trust boundary.
 *
 * OUTBOUND (`buildIntegritySignature`): proves to Wompi that the amount and
 * reference in a Web Checkout URL were set by us and not edited in the
 * customer's address bar. SHA256 of
 *   <reference><amountInCents><currency>[<expirationTime>]<integritySecret>
 * The `expirationTime` segment is omitted entirely when absent. Verified
 * against the worked example published in Wompi's docs
 * (tests/wompiSignature.test.ts) — that vector is the spec.
 *
 * INBOUND (`validateWompiChecksum`): proves an incoming webhook really came
 * from Wompi. The event names, in `signature.properties`, the dot-paths whose
 * values were signed; we resolve them against `event.data` IN ORDER, append
 * `event.timestamp` and the events secret, and SHA256. Mirrors
 * `validateMpSignature`: pure, never throws, returns false on anything
 * missing or malformed, and the handler turns false into a 401.
 *
 * Both secrets are server-only and never reach the browser.
 */

import crypto from 'node:crypto';

export interface IntegrityInput {
  reference: string;
  amountInCents: number;
  currency: string;
  /** ISO8601. When present, Wompi signs it too — before the secret. */
  expirationTime?: string;
}

export interface WompiEvent {
  event?: string;
  /** Left `unknown`: resolvePath narrows it, and this accepts the handler's inline body type without an index-signature error. */
  data?: unknown;
  signature?: { properties?: string[]; checksum?: string };
  timestamp?: number;
}

const sha256Hex = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

/** Build the `signature:integrity` value for a Web Checkout URL. */
export function buildIntegritySignature(
  input: IntegrityInput,
  integritySecret: string,
): string {
  const parts = [input.reference, String(input.amountInCents), input.currency];
  if (input.expirationTime) parts.push(input.expirationTime);
  parts.push(integritySecret);
  return sha256Hex(parts.join(''));
}

/** Resolve a dot-path ("transaction.status") against a nested object. */
function resolvePath(root: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      root,
    );
}

/**
 * Validate a Wompi webhook against `eventsSecret`. `headerChecksum` is the
 * `X-Event-Checksum` header and takes precedence over the in-body copy — a
 * body-only check would let an attacker supply both the payload and the
 * checksum that "confirms" it.
 */
export function validateWompiChecksum(
  event: WompiEvent,
  eventsSecret: string,
  headerChecksum?: string,
): boolean {
  if (!eventsSecret) return false;

  const properties = event?.signature?.properties;
  if (!Array.isArray(properties) || properties.length === 0) return false;
  if (event.timestamp == null) return false;

  const expected = headerChecksum ?? event.signature?.checksum;
  if (!expected) return false;

  let concatenated = '';
  for (const path of properties) {
    const value = resolvePath(event.data, path);
    if (value == null) return false;
    concatenated += String(value);
  }
  concatenated += String(event.timestamp) + eventsSecret;

  // Wompi sends the checksum uppercased; digest() is lowercase.
  const computed = sha256Hex(concatenated);
  const received = expected.toLowerCase();

  // Length guard — timingSafeEqual throws on differing buffer lengths.
  if (computed.length !== received.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(received));
  } catch {
    return false;
  }
}
