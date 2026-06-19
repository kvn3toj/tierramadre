/**
 * Commissions ledger reads. The WRITE (one row per attributed sale) is inlined
 * in `ghl.markOrderPaid` so the sale flip, client-total bump, and commission
 * insert share ONE Convex transaction — the same reason `sequences.allocateNext`
 * is called inline rather than via `ctx.runMutation` (a cross-transaction call
 * could leak a half-applied payment). The `by_saleId` guard there makes the
 * insert idempotent (emulates the spec's UNIQUE(order_id)); these queries expose
 * the ledger to the ambassador panel / admin.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

export const listByAmbassador = query({
  args: { ambassadorId: v.id("ambassadors") },
  handler: async (ctx, { ambassadorId }) =>
    ctx.db
      .query("commissions")
      .withIndex("by_ambassador", (q) => q.eq("ambassadorId", ambassadorId))
      .collect(),
});

export const getBySale = query({
  args: { saleId: v.string() },
  handler: async (ctx, { saleId }) =>
    ctx.db
      .query("commissions")
      .withIndex("by_saleId", (q) => q.eq("saleId", saleId))
      .first(),
});
