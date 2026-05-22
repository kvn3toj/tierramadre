import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Materials catalog (Fotosíntesis v2 · Slice 2).
 *
 * Populated inline by the inventory wizard when Maritza types a joya
 * material that doesn't exist yet (handoff §4.2 step 5). Read-mostly and
 * tiny — list returns every row so the wizard's ChipsInput can render
 * autocomplete suggestions client-side.
 *
 * Convex-only table — never synced to Sheets. Names are stored
 * case-sensitive but de-duplicated case-insensitively on create so
 * "Plata 925" and "plata 925" can't collide.
 */

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("materials").collect();
    return rows.sort((a, b) =>
      a.name.localeCompare(b.name, "es-CO", { sensitivity: "base" }),
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, { name, type }) => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new Error("El nombre del material no puede estar vacío");
    }
    if (trimmed.length > 80) {
      throw new Error("El nombre del material es demasiado largo (>80)");
    }

    // Case-insensitive duplicate check so we don't grow a catalogue of
    // "Plata 925" / "plata 925" / "PLATA 925".
    const existing = await ctx.db.query("materials").collect();
    const dup = existing.find(
      (m) => m.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (dup) {
      return { id: dup._id, name: dup.name, created: false };
    }

    const id = await ctx.db.insert("materials", {
      name: trimmed,
      type: type?.trim() || undefined,
    });
    return { id, name: trimmed, created: true };
  },
});
