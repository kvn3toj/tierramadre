import { query, mutation, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { isStaffSession } from './_lib/requireStaffSession';

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
    await ctx.db.insert('productViews', {
      ...args,
      timestamp: new Date().toISOString(),
    });
    return { success: true, tracked: true, itemId: args.itemId };
  },
});

/**
 * Insert a product view preserving its original timestamp (migration only).
 * NOT for production use — use track() instead.
 *
 * internalMutation: zero app callers (only scripts/migrate-sheets-to-convex.ts).
 * Re-run via `npx convex run productViews:_migrateInsert '{...}'` if needed.
 */
export const _migrateInsert = internalMutation({
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
    await ctx.db.insert('productViews', args);
    return { success: true, itemId: args.itemId };
  },
});

/**
 * Rename all productViews matching an old inviterName to the canonical name.
 * Migration-only — fixes historical data where creatorName was set from the
 * Google profile name instead of the canonical Asesor name.
 *
 * internalMutation: zero app callers (only scripts/normalize-inviter-names.ts).
 * Re-run via `npx convex run productViews:_normalizeInviterName '{...}'` if needed.
 */
export const _normalizeInviterName = internalMutation({
  args: { oldName: v.string(), newName: v.string() },
  handler: async (ctx, { oldName, newName }) => {
    const docs = await ctx.db
      .query('productViews')
      .withIndex('by_inviterName', (q) => q.eq('inviterName', oldName))
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
 *
 * Staff-session gated (2026-08-06, PII lockdown item 1): returns whole
 * `productViews` rows — `userEmail`/`userName`/`userRole`/`browser`/
 * `country`/`deviceType`/`sessionId`/`referrer` — keyed only on
 * `inviterName`, an advisor's DISPLAY NAME, not a secret. Every one of this
 * query's three browser callers (MyProfilePage.tsx, AllActivityPage.tsx,
 * GuestDetailPage.tsx) sources `inviterName` from `useCurrentAsesor()`, which
 * resolves the signed-in Google email against the Asesores sheet
 * (useCurrentAsesor.ts) — the exact roster `/api/validate?action=mint-session`
 * checks before minting a `tms1` token. So every caller who can render these
 * screens already holds a valid session token; guests never call this query.
 * `isStaffSession` gate, empty-form ([]) on failure — same pattern as the 49
 * queries F7/F7b/Round 3 already closed.
 */
export const guestActivity = query({
  args: {
    inviterName: v.string(),
    limit: v.optional(v.number()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { inviterName, limit, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return [];
    return await ctx.db
      .query('productViews')
      .withIndex('by_inviterName', (q) => q.eq('inviterName', inviterName))
      .order('desc')
      .take(limit ?? 50);
  },
});

/**
 * Get all views for a specific guest of a specific inviter.
 * Used by useGuestDetail hook for the guest detail page.
 *
 * Staff-session gated (2026-08-06, PII lockdown item 1) — same rationale and
 * gate as `guestActivity` above; its one browser caller (GuestDetailPage.tsx)
 * sources `inviterName` from the same `useCurrentAsesor()` roster check, plus
 * this returns per-guest `sessionId`/`referrer` on top of the same PII shape.
 */
export const byInviterAndGuest = query({
  args: {
    inviterName: v.string(),
    guestName: v.string(),
    limit: v.optional(v.number()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { inviterName, guestName, limit, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return [];
    return await ctx.db
      .query('productViews')
      .withIndex('by_inviterName', (q) => q.eq('inviterName', inviterName))
      .filter((q) => q.eq(q.field('userName'), guestName))
      .order('desc')
      .take(limit ?? 500);
  },
});
