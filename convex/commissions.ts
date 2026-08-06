/**
 * Commissions ledger reads. The WRITE (one row per attributed sale) is inlined
 * in `ghl.markOrderPaid` so the sale flip, client-total bump, and commission
 * insert share ONE Convex transaction — the same reason `sequences.allocateNext`
 * is called inline rather than via `ctx.runMutation` (a cross-transaction call
 * could leak a half-applied payment). The `by_saleId` guard there makes the
 * insert idempotent (emulates the spec's UNIQUE(order_id)); these queries expose
 * the ledger to the ambassador panel / admin.
 */

import { query } from './_generated/server';
import { v } from 'convex/values';
import { isStaffSession } from './_lib/requireStaffSession';

/**
 * GATED (2026-08-05, I3): `amountCOP`/`percentApplied` for any ambassador,
 * to anyone holding an `ambassadorId` — and `getBySale` below was reachable
 * with nothing more than an enumerable `VO-NNNN` sale id. Both now require a
 * verified staff session. `isStaffSession` covers the "ambassador panel"
 * self-service case in the header comment too: a session token is minted
 * for anyone on the Asesores/Proveedores roster (see
 * `_lib/requireStaffSession.ts`), which includes ambassadors viewing their
 * own commissions, not only admin staff — so this doesn't narrow who can
 * legitimately see this ledger, only whether an anonymous caller can.
 */
export const listByAmbassador = query({
  args: {
    ambassadorId: v.id('ambassadors'),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { ambassadorId, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return [];
    return ctx.db
      .query('commissions')
      .withIndex('by_ambassador', (q) => q.eq('ambassadorId', ambassadorId))
      .collect();
  },
});

export const getBySale = query({
  args: { saleId: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, { saleId, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return null;
    return ctx.db
      .query('commissions')
      .withIndex('by_saleId', (q) => q.eq('saleId', saleId))
      .first();
  },
});
