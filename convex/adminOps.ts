/**
 * adminOps — one-off admin/ops mutations kept OUT of migrations.ts so they can
 * be deployed/edited without colliding with concurrent migration work.
 */
import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * deleteProductByItemId — hard-delete a STANDALONE productInventory row.
 *
 * The app has no product-delete mutation (lot members are orphaned via
 * `lotItems.remove`), so removing a duplicate standalone row — e.g. #441 "Vida",
 * a dup of the real #311 — needs this. Guards keep it money-safe:
 *   - refuses lot members (loteId set) → use `lotItems.remove` instead;
 *   - refuses sold items (VENDIDA) → cancel the sale first.
 *
 * IMPORTANT: this deletes the CONVEX mirror row only. If the item also has a
 * row in the legacy sheet, the 15-min `products._pullFromSheet` cron RE-CREATES
 * it — so delete the SHEET row FIRST (scripts/delete-inventory-items.mjs), then
 * run this. That script does both in the correct order.
 *
 *   npx convex run --prod adminOps:deleteProductByItemId '{"itemId":"441"}'
 */
export const deleteProductByItemId = internalMutation({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    const row = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!row) {
      return { deleted: false, itemId, reason: 'not-found' };
    }
    if (row.loteId) {
      return {
        deleted: false,
        itemId,
        reason: `belongs to lote ${row.loteId} — remove via lotItems.remove`,
      };
    }
    if (row.estado === 'VENDIDA') {
      return {
        deleted: false,
        itemId,
        reason: 'VENDIDA — cancel the sale first',
      };
    }
    const nombre = row.nombre;
    await ctx.db.delete(row._id);
    return { deleted: true, itemId, nombre };
  },
});
