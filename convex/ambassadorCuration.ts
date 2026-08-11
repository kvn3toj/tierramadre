/**
 * ambassadorCuration — an ambassador's favourites and per-product overrides.
 *
 * These used to live in localStorage, one key per concern, which meant the
 * curation an ambassador built never left the browser they built it in. This
 * module is the store; `api/ambassador-curation.ts` is the only thing that
 * should call it.
 *
 * NO AUTHORIZATION HAPPENS HERE. Convex mutations are reachable by anyone
 * holding the deployment URL, so these functions must be treated as the
 * storage layer, not the door. The door is the API route, which verifies a
 * `tms1` session and resolves it against the Sheets roster — a check that
 * needs Sheets and therefore cannot live in Convex. Mirrors how
 * `vitrinas.create` is only ever reached through `/api/vitrina`.
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/** Everything an ambassador has said about their own pieces. */
export const listBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query('ambassadorCuration')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .collect();
  },
});

/**
 * Creates or updates one piece's curation.
 *
 * Undefined fields are LEFT ALONE rather than cleared, so setting a price does
 * not silently unfavourite the piece. Clearing is explicit: pass `null`.
 */
export const upsert = mutation({
  args: {
    slug: v.string(),
    itemId: v.string(),
    isFavorite: v.optional(v.boolean()),
    sortOrder: v.optional(v.union(v.float64(), v.null())),
    customName: v.optional(v.union(v.string(), v.null())),
    customPriceCOP: v.optional(v.union(v.float64(), v.null())),
    updatedByEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { slug, itemId } = args;
    const existing = await ctx.db
      .query('ambassadorCuration')
      .withIndex('by_slug_item', (q) => q.eq('slug', slug).eq('itemId', itemId))
      .unique();

    // `null` clears, `undefined` leaves as-is.
    const resolve = <T>(next: T | null | undefined, prev: T | undefined) =>
      next === null ? undefined : next === undefined ? prev : next;

    const patch = {
      isFavorite: args.isFavorite ?? existing?.isFavorite ?? false,
      sortOrder: resolve(args.sortOrder, existing?.sortOrder),
      customName: resolve(args.customName, existing?.customName),
      customPriceCOP: resolve(args.customPriceCOP, existing?.customPriceCOP),
      updatedAt: new Date().toISOString(),
      updatedByEmail: args.updatedByEmail ?? existing?.updatedByEmail,
    };

    if (existing) {
      // A row that no longer says anything is deleted rather than kept as an
      // empty record, so `listBySlug` stays the set of real statements.
      if (
        !patch.isFavorite &&
        patch.customName === undefined &&
        patch.customPriceCOP === undefined
      ) {
        await ctx.db.delete(existing._id);
        return null;
      }
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    if (
      !patch.isFavorite &&
      patch.customName === undefined &&
      patch.customPriceCOP === undefined
    ) {
      return null;
    }
    return await ctx.db.insert('ambassadorCuration', {
      slug,
      itemId,
      ...patch,
    });
  },
});

/** Drops one piece's curation entirely (favourite and overrides together). */
export const remove = mutation({
  args: { slug: v.string(), itemId: v.string() },
  handler: async (ctx, { slug, itemId }) => {
    const existing = await ctx.db
      .query('ambassadorCuration')
      .withIndex('by_slug_item', (q) => q.eq('slug', slug).eq('itemId', itemId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/**
 * Rewrites the favourites row in one shot.
 *
 * Reordering is a single statement about the whole row, so it is one mutation:
 * a per-item loop from the client would leave the order half-applied if the
 * network dropped between calls. Pieces missing from `itemIds` lose their
 * favourite flag but keep any name/price override.
 */
export const setFavorites = mutation({
  args: {
    slug: v.string(),
    itemIds: v.array(v.string()),
    updatedByEmail: v.optional(v.string()),
  },
  handler: async (ctx, { slug, itemIds, updatedByEmail }) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query('ambassadorCuration')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .collect();
    const byItem = new Map(existing.map((row) => [row.itemId, row]));

    for (const [index, itemId] of itemIds.entries()) {
      const row = byItem.get(itemId);
      if (row) {
        await ctx.db.patch(row._id, {
          isFavorite: true,
          sortOrder: index,
          updatedAt: now,
          updatedByEmail: updatedByEmail ?? row.updatedByEmail,
        });
        byItem.delete(itemId);
      } else {
        await ctx.db.insert('ambassadorCuration', {
          slug,
          itemId,
          isFavorite: true,
          sortOrder: index,
          updatedAt: now,
          updatedByEmail,
        });
      }
    }

    // Whatever is left was a favourite and no longer is.
    for (const row of byItem.values()) {
      if (!row.isFavorite) continue;
      if (row.customName === undefined && row.customPriceCOP === undefined) {
        await ctx.db.delete(row._id);
      } else {
        await ctx.db.patch(row._id, {
          isFavorite: false,
          sortOrder: undefined,
          updatedAt: now,
        });
      }
    }
  },
});
