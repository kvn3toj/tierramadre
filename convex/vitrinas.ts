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
import { estaVencida, venceEn } from "./_lib/vencimientoVitrina";

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

/**
 * Resuelve un token de vitrina, diciendo además si ya venció.
 *
 * **Devuelve el registro aunque esté vencido.** Borrarlo de la respuesta
 * convertiría el link vencido en el 404 que la pantalla de «cotización
 * vencida» existe para evitar: sin `itemIds` no hay con qué armar el mensaje
 * que pide cotización nueva, y el cliente queda sin saber qué estaba mirando.
 *
 * Pero cuando está vencida **no devuelve el precio** — `multiplier` y
 * `currency` quedan fuera de la respuesta. Mostrar el precio viejo obliga a
 * una de dos cosas malas: honrarlo, o explicarle al cliente por qué no.
 *
 * Ojo: esta query es una de TRES vías por las que una vitrina entrega precio.
 * Las otras dos son el grant del catálogo (`api/_lib/vitrinaLookup.ts`, que
 * desbloquea `precioCOP` en la proyección) y `ghl.createOrder` (que cobra).
 * Las tres consultan `estaVencida`; si alguna se olvidara, un link vencido
 * seguiría vendiendo por esa puerta.
 */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const doc = await ctx.db
      .query("vitrinas")
      .withIndex("by_token", (q) => q.eq("token", token.toUpperCase()))
      .first();
    if (!doc) return null;

    const vencida = estaVencida(doc, Date.now());
    const base = {
      _id: doc._id,
      token: doc.token,
      itemIds: doc.itemIds,
      senderSlug: doc.senderSlug,
      createdAt: doc.createdAt,
      // Va en las DOS ramas: no es precio, es el dueño. `api/vitrina.ts` lo
      // usa para impedir que alguien repricie la vitrina de otro, y esa
      // comprobación tiene que seguir funcionando sobre una vitrina vencida
      // (si no, vencer un link abriría el agujero que ese chequeo cerró).
      createdByEmail: doc.createdByEmail,
      vencida,
      venceEn: venceEn(doc),
    };
    return vencida
      ? base
      : { ...base, multiplier: doc.multiplier, currency: doc.currency };
  },
});

/**
 * update — correct an already-shared Vitrina link in place.
 *
 * Same token/URL, new contents: lets staff fix a wrong product selection,
 * currency, or multiplier *after* the link was sent to a client, without
 * making them resend a new URL. Only fields provided are patched — omit a
 * field to leave it unchanged. Same proxy-only secret gate as `create`.
 */
export const update = mutation({
  args: {
    token: v.string(),
    itemIds: v.optional(v.array(v.float64())),
    currency: v.optional(v.union(v.literal("COP"), v.literal("USD"))),
    multiplier: v.optional(v.float64()),
    senderSlug: v.optional(v.string()),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    const expected = process.env.VITRINA_SHARED_SECRET;
    if (!expected || args.secret !== expected) {
      throw new Error("No autorizado.");
    }

    const existing = await ctx.db
      .query("vitrinas")
      .withIndex("by_token", (q) => q.eq("token", args.token.toUpperCase()))
      .first();
    if (!existing) {
      throw new Error("Enlace no encontrado.");
    }

    const patch: Record<string, unknown> = {};
    if (args.itemIds !== undefined) patch.itemIds = args.itemIds;
    if (args.currency !== undefined) patch.currency = args.currency;
    if (args.multiplier !== undefined)
      patch.multiplier = clampMultiplier(args.multiplier);
    if (args.senderSlug !== undefined) patch.senderSlug = args.senderSlug;

    await ctx.db.patch(existing._id, patch);
    return { success: true, token: existing.token };
  },
});
