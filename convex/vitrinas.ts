/**
 * vitrinas — public product-share links ("Vitrina").
 *
 * A staff member picks a set of products + the pricing the client should see
 * (multiplier + currency) and mints a short token. The public `/v/:token`
 * route reads it with no auth and shows only those products at that price.
 *
 * The multiplier lives in this record (not the URL) so the chosen markup is
 * tamper-proof — the recipient can neither see nor change it. Mirrors the
 * invitations `generate`/`getByShortCode` conventions (ISO `createdAt`, token
 * lookup via a named index).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Unambiguous alphabet (no I/O/0/1), matching api/_lib generateShortCode.
const TOKEN_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
// 12 chars ≈ log2(24 · 32^11) ≈ 60 bits — a capability URL (knowing the token
// reveals the client's per-share pricing), so it must be unguessable, not just
// unique. Enumeration is further bounded by Convex request limits.
const TOKEN_LENGTH = 12;

function randomToken(): string {
  // Cryptographically secure (Web Crypto is available in the Convex runtime) —
  // Math.random() is predictable and unsuitable for an access token.
  const rand = new Uint32Array(TOKEN_LENGTH);
  crypto.getRandomValues(rand);
  // The first char is ALWAYS a letter, so a token can never be all-digits and
  // be mistaken for a stateless id-list by the `/v/:code` router (which routes
  // a purely numeric code to the default-pricing id-list path).
  let code = TOKEN_LETTERS.charAt(rand[0] % TOKEN_LETTERS.length);
  for (let i = 1; i < TOKEN_LENGTH; i++) {
    code += TOKEN_ALPHABET.charAt(rand[i] % TOKEN_ALPHABET.length);
  }
  return code;
}

/** Clamp to the invitation range [1, 4] in 0.1 steps. */
function clampMultiplier(m: number): number {
  if (!Number.isFinite(m)) return 1;
  const clamped = Math.min(4, Math.max(1, m));
  return Math.round(clamped * 10) / 10;
}

export const create = mutation({
  args: {
    itemIds: v.array(v.float64()),
    currency: v.union(v.literal("COP"), v.literal("USD")),
    multiplier: v.float64(),
    senderSlug: v.optional(v.string()),
    // Shared secret proving the call came from the trusted `/api/vitrina` proxy
    // (which verifies the caller's Google identity). The Convex deployment URL
    // is public, so without this any client could mint links directly; requiring
    // a server-only secret makes this mutation effectively proxy-only. The app
    // has no Convex-native auth (ctx.auth is unused across the codebase), so this
    // mirrors the trusted-proxy model the invitation flow already uses — but adds
    // the gate that invitations lack.
    secret: v.string(),
    createdByEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Fail closed: reject unless the secret is configured AND matches.
    const expected = process.env.VITRINA_SHARED_SECRET;
    if (!expected || args.secret !== expected) {
      throw new Error("No autorizado.");
    }

    // Collision-free token: retry against the by_token index (negligible at
    // this alphabet/length, but cheap insurance).
    let token = randomToken();
    let attempts = 0;
    while (
      attempts < 5 &&
      (await ctx.db
        .query("vitrinas")
        .withIndex("by_token", (q) => q.eq("token", token))
        .first())
    ) {
      token = randomToken();
      attempts++;
    }

    await ctx.db.insert("vitrinas", {
      token,
      itemIds: args.itemIds,
      currency: args.currency,
      multiplier: clampMultiplier(args.multiplier),
      senderSlug: args.senderSlug,
      createdAt: new Date().toISOString(),
      createdByEmail: args.createdByEmail,
    });

    return { token };
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) =>
    await ctx.db
      .query("vitrinas")
      .withIndex("by_token", (q) => q.eq("token", token.toUpperCase()))
      .first(),
});
