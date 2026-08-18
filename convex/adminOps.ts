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
/**
 * clearStalePendingSync — apaga un `syncStatus: 'pending'` que es residuo, no
 * un push en vuelo.
 *
 * Caso que lo motivó (2026-08-18): 93A "Romeo" y 93B "Julieta" quedaron
 * `pending` desde su alta del 12-ago — un riel que estampó el flag sin crear
 * fila de audit en `productEdits`. Sin audit, `products.retryPush` no tiene
 * qué reintentar ("Sin historial de ediciones"), así que el flag no se limpia
 * solo y el badge "2 pending" de la toolbar queda encendido para siempre.
 * Sus filas en la hoja (525/526) se verificaron completas y correctas a mano
 * antes de escribir esta mutación.
 *
 * La firma del residuo es doble, y las DOS guardas se exigen:
 *   - `syncStatus === 'pending'` — un 'error' tiene reintento propio
 *     (products.retryPush) y un 'synced' no necesita nada;
 *   - CERO filas en `productEdits` — si hay historial, el pending puede ser
 *     un push real a medio camino y el remedio es retryPush, no este borrón.
 *
 * La mutación NO lee la hoja (las mutations no hacen fetch): verificar que la
 * fila del ítem existe y está bien en el Inventario es prerrequisito del
 * operador, no efecto de esta función. Dry-run por defecto.
 *
 *   npx convex run --prod adminOps:clearStalePendingSync '{"itemIds":["93A","93B"]}'
 *   npx convex run --prod adminOps:clearStalePendingSync '{"itemIds":["93A","93B"],"apply":true}'
 */
export const clearStalePendingSync = internalMutation({
  args: {
    itemIds: v.array(v.string()),
    apply: v.optional(v.boolean()),
  },
  handler: async (ctx, { itemIds, apply }) => {
    const resultados = [];
    for (const itemId of itemIds) {
      const row = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
        .first();
      if (!row) {
        resultados.push({ itemId, accion: 'saltado', motivo: 'no existe' });
        continue;
      }
      if (row.syncStatus !== 'pending') {
        resultados.push({
          itemId,
          accion: 'saltado',
          motivo: `syncStatus es '${row.syncStatus}' — sólo limpia 'pending'`,
        });
        continue;
      }
      const audit = await ctx.db
        .query('productEdits')
        .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
        .first();
      if (audit) {
        resultados.push({
          itemId,
          accion: 'saltado',
          motivo: 'tiene historial de ediciones — usa products.retryPush',
        });
        continue;
      }
      if (!apply) {
        resultados.push({ itemId, accion: 'limpiaría', nombre: row.nombre });
        continue;
      }
      await ctx.db.patch(row._id, {
        syncStatus: 'synced' as const,
        syncError: undefined,
      });
      resultados.push({ itemId, accion: 'limpiado', nombre: row.nombre });
    }
    return { dryRun: !apply, resultados };
  },
});

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
