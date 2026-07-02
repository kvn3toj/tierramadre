/**
 * One-off data migrations. Run with `npx convex run --prod migrations:<name>`.
 * Safe to delete a migration once it has run in prod.
 */
import { internalMutation } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Merge the duplicated "Agua Marina" stone.
 *
 * The same 18.8 ct stone was catalogued twice:
 *   - item 340 "Aguamarina"  — the SOLD record (VENDIDA · Alvaro Pelaez ·
 *                              OFI.CALI), but that sale lives only in the SOT
 *                              sheet; Convex still shows it DISPONIBLE/empty.
 *                              (KEEP — surviving number, holds the sale.)
 *   - item 368 "Agua Marina" — the 20% member of lot C-007, marked DISPONIBLE
 *                              even though the stone was sold.  (DUPLICATE — delete.)
 *
 * We move C-007's membership onto item 340, re-assert 340's sold-state, and
 * delete 368, atomically, so the lot invariant is preserved (C-007 keeps 6
 * members summing 100%, just via 340 instead of 368) and the lot's member now
 * correctly reads VENDIDA. An audit row is written and item 340 is re-pushed to
 * the SOT Inventario tab. `itemId`s are NOT renumbered — they key Drive folders
 * + QR tags, so the retired number 368 simply becomes an (invisible) gap.
 *
 * NOTE: this collapses two records into one physical stone. It does NOT create a
 * formal `sales` row (we don't have the client / amount / date) — it only mirrors
 * the sheet's VENDIDA status. Record the actual sale separately if you need it
 * for commissions/analytics.
 *
 * Idempotent-ish: re-running after success aborts (340 already in C-007 / 368 gone).
 *
 *   npx convex run --prod migrations:mergeAguaMarina '{}'
 */
export const mergeAguaMarina = internalMutation({
  args: {},
  handler: async (ctx) => {
    const KEEP = "340";
    const DROP = "368";
    const LOTE = "C-007";

    const keep = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", KEEP))
      .first();
    const drop = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", DROP))
      .first();

    if (!keep) throw new Error(`Aborting: item ${KEEP} not found`);
    if (!drop)
      return { ok: true, note: `item ${DROP} already gone — nothing to do` };
    if (keep.loteId && keep.loteId !== LOTE)
      throw new Error(
        `Aborting: item ${KEEP} already belongs to lote ${keep.loteId}`,
      );
    if (drop.loteId !== LOTE)
      throw new Error(
        `Aborting: item ${DROP} is not in ${LOTE} (loteId=${drop.loteId})`,
      );

    const joins = await ctx.db
      .query("lotItems")
      .withIndex("by_loteId", (q) => q.eq("loteId", LOTE))
      .collect();
    const dropJoin = joins.find((j) => j.itemId === DROP);
    if (!dropJoin)
      throw new Error(`Aborting: no ${LOTE} join for item ${DROP}`);
    if (joins.some((j) => j.itemId === KEEP))
      throw new Error(`Aborting: ${LOTE} already has a join for item ${KEEP}`);

    const now = new Date().toISOString();

    // Item 340's real sold-state lives ONLY in the SOT sheet (row 341) — it was
    // never mirrored into Convex (Convex shows it DISPONIBLE/empty, and item
    // 368's own record is DISPONIBLE too). Verified from the sheet 2026-07-01:
    //   ESTADO=VENDIDA · ASESOR=Alvaro Pelaez · UBICACIÓN=OFI.CALI
    // We MUST re-assert these on 340 before the push, or pushToSheet — which
    // writes the full field set from the Convex mirror (estado ?? "DISPONIBLE",
    // asesor ?? "", ubicacion ?? "") — would rewrite row 341 back to DISPONIBLE
    // and blank the ambassador + location, destroying the sale record.
    const SOLD = {
      estado: "VENDIDA" as const,
      asesor: "Alvaro Pelaez",
      ubicacion: "OFI.CALI",
    };

    // 1. Copy the lot membership + lot pricing onto the surviving item 340,
    //    and preserve its sold-state (see SOLD above).
    await ctx.db.patch(keep._id, {
      loteId: LOTE,
      preponderancia: drop.preponderancia,
      costoBaseCOP: drop.costoBaseCOP,
      precioEmbajadorCOP: drop.precioEmbajadorCOP,
      precioConscienteCOP: drop.precioConscienteCOP,
      tipo: drop.tipo,
      estado: SOLD.estado,
      asesor: SOLD.asesor,
      ubicacion: SOLD.ubicacion,
      syncStatus: "pending" as const,
      syncError: undefined,
    });

    // 2. Repoint the lot join → C-007 now counts item 340 at the same 20%.
    await ctx.db.patch(dropJoin._id, { itemId: KEEP });

    // 3. Delete the duplicate product row.
    await ctx.db.delete(drop._id);

    // 4. Keep the maintained inventory counter honest (-1).
    const stats = await ctx.db.query("inventoryStats").first();
    if (stats && stats.total > 0)
      await ctx.db.patch(stats._id, { total: stats.total - 1 });

    // 5. Audit on the surviving item, then push it to the SOT sheet (row 341).
    const auditId = await ctx.db.insert("productEdits", {
      itemId: KEEP,
      editorEmail: "migration:mergeAguaMarina",
      editedAt: now,
      changes: [
        { field: "loteId", before: keep.loteId ?? null, after: LOTE },
        { field: "estado", before: keep.estado ?? null, after: SOLD.estado },
        { field: "asesor", before: keep.asesor ?? null, after: SOLD.asesor },
        {
          field: "ubicacion",
          before: keep.ubicacion ?? null,
          after: SOLD.ubicacion,
        },
        {
          field: "preponderancia",
          before: keep.preponderancia ?? null,
          after: drop.preponderancia ?? null,
        },
        {
          field: "costoBaseCOP",
          before: keep.costoBaseCOP ?? null,
          after: drop.costoBaseCOP ?? null,
        },
      ],
      status: "pending" as const,
    });
    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId: KEEP,
      auditId,
      mode: "patch",
    });

    return { ok: true, keptItemId: KEEP, deletedItemId: DROP, lote: LOTE };
  },
});
