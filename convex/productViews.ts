import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Track a product view.
 * Replaces: POST /api/product-views?action=track
 */
export const track = mutation({
  args: {
    itemId: v.string(),
    productName: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    referrer: v.optional(v.string()),
    deviceType: v.optional(v.string()),
    browser: v.optional(v.string()),
    country: v.optional(v.string()),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userRole: v.optional(v.string()),
    inviterName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("productViews", {
      ...args,
      timestamp: new Date().toISOString(),
    });
    return { success: true, tracked: true, itemId: args.itemId };
  },
});

/**
 * Insert a product view preserving its original timestamp (migration only).
 * NOT for production use — use track() instead.
 */
export const _migrateInsert = mutation({
  args: {
    timestamp: v.string(),
    itemId: v.string(),
    productName: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    referrer: v.optional(v.string()),
    deviceType: v.optional(v.string()),
    browser: v.optional(v.string()),
    country: v.optional(v.string()),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userRole: v.optional(v.string()),
    inviterName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("productViews", args);
    return { success: true, itemId: args.itemId };
  },
});

/**
 * Rename all productViews matching an old inviterName to the canonical name.
 * Migration-only — fixes historical data where creatorName was set from the
 * Google profile name instead of the canonical Asesor name.
 */
export const _normalizeInviterName = mutation({
  args: { oldName: v.string(), newName: v.string() },
  handler: async (ctx, { oldName, newName }) => {
    const docs = await ctx.db
      .query("productViews")
      .withIndex("by_inviterName", (q) => q.eq("inviterName", oldName))
      .collect();
    for (const doc of docs) {
      await ctx.db.patch(doc._id, { inviterName: newName });
    }
    return { patched: docs.length };
  },
});

/**
 * Get recent guest activity for a specific inviter.
 * Replaces: GET /api/product-views?action=recent filtered by inviterName
 * Used by useGuestActivity hook in /mi-perfil.
 */
export const guestActivity = query({
  args: {
    inviterName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { inviterName, limit }) => {
    return await ctx.db
      .query("productViews")
      .withIndex("by_inviterName", (q) => q.eq("inviterName", inviterName))
      .order("desc")
      .take(limit ?? 50);
  },
});
