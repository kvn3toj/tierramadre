import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { computeInsumoTotals, wouldOverflowHundred } from "./_lib/lotItemMath";

const tipoItemValidator = v.union(
  v.literal("gema"),
  v.literal("joya"),
  v.literal("insumo"),
  v.literal("lote"),
);

export const listByLote = query({
  args: { loteId: v.string() },
  handler: async (ctx, { loteId }) => {
    const items = await ctx.db
      .query("lotItems")
      .withIndex("by_loteId", (q) => q.eq("loteId", loteId))
      .collect();
    return items.sort((a, b) => a.ordenEnLote - b.ordenEnLote);
  },
});

/**
 * Cumulative preponderancia for a given lot. Reactive — the wizard
 * subscribes to this so the PreponderanciaTracker updates as items are
 * created/edited.
 */
export const sumPreponderancia = query({
  args: { loteId: v.string() },
  handler: async (ctx, { loteId }) => {
    const items = await ctx.db
      .query("lotItems")
      .withIndex("by_loteId", (q) => q.eq("loteId", loteId))
      .collect();
    const sum = items.reduce((s, it) => s + it.preponderancia, 0);
    return {
      sum,
      count: items.length,
      remaining: Math.max(0, 100 - sum),
      overflow: Math.max(0, sum - 100),
    };
  },
});

/**
 * Allocate the next sequential itemId in productInventory.
 *
 * Mirrors createProduct's approach but as a server-side numeric pick
 * rather than a user-supplied ID. We scan productInventory for the
 * highest numeric itemId and return next + 1 as a string.
 */
async function nextItemId(ctx: {
  db: { query: (table: "productInventory") => any };
}): Promise<string> {
  const all = await ctx.db.query("productInventory").collect();
  let max = 0;
  for (const p of all) {
    const n = Number(p.itemId);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}

/**
 * Create one item in a lot. This:
 *   1. Reads the lot to obtain costoTotalCOP and validate state.
 *   2. Allocates the next itemId in productInventory.
 *   3. Computes costoBaseCOP (BR-5):
 *        gema/joya/lote → lot.costoTotalCOP × (preponderancia / 100)
 *        insumo         → cantidad × costoUnitarioCOP (preponderancia
 *                          back-derived for analytics).
 *   4. Inserts the productInventory row directly (mostrarEnCatalogo:false).
 *   5. Inserts the lotItems row with discriminator + type-specific extras.
 *   6. Schedules the productInventory push (mode: append).
 *
 * BR-5 (costoBaseCOP calculated, never user-editable) is enforced here.
 */
export const create = mutation({
  args: {
    loteId: v.string(),
    tipo: tipoItemValidator,
    nombre: v.string(),
    /**
     * For gema/joya/lote: required, in (0, 100].
     * For insumo: optional — if omitted, the server derives it from
     * `cantidad × costoUnitarioCOP / lot.costoTotalCOP × 100`.
     */
    preponderancia: v.optional(v.number()),
    // Type-specific fields are passed flat; the wizard validates per-type.
    color: v.optional(v.string()),
    calidad: v.optional(v.string()),
    peso: v.optional(v.string()),
    medidas: v.optional(v.string()),
    talla: v.optional(v.string()),
    categoria: v.optional(v.string()),
    coleccion: v.optional(v.string()),
    caja: v.optional(v.string()),
    cantidad: v.optional(v.number()),
    ubicacion: v.optional(v.string()),
    observacion: v.optional(v.string()),
    mostrarEnCatalogo: v.optional(v.boolean()),
    // Joya extras (Slice 2)
    tecnica: v.optional(v.string()),
    materiales: v.optional(v.array(v.string())),
    // Insumo extras (Slice 2) — see preponderancia note above.
    costoUnitarioCOP: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.nombre.trim().length === 0) {
      throw new Error("Nombre es obligatorio");
    }

    const lot = await ctx.db
      .query("lots")
      .withIndex("by_loteId", (q) => q.eq("loteId", args.loteId))
      .first();
    if (!lot) throw new Error(`Lote ${args.loteId} no encontrado`);
    if (lot.estado !== "abierto") {
      throw new Error("Sólo se pueden añadir ítems a un lote abierto");
    }

    const existing = await ctx.db
      .query("lotItems")
      .withIndex("by_loteId", (q) => q.eq("loteId", args.loteId))
      .collect();

    if (existing.length >= lot.unidadesDeclaradas) {
      throw new Error(
        `El lote ya tiene ${existing.length} ítems (declaradas: ${lot.unidadesDeclaradas})`,
      );
    }

    // Slice 2: branch BR-5 by tipo. Insumo computes costo from
    // cantidad × costoUnitario; everything else uses the preponderancia
    // proportion of the lot total. The math lives in `_lib/lotItemMath`
    // so the same rules are exercised by unit tests.
    let preponderancia: number;
    let costoBaseCOP: number;
    if (args.tipo === "insumo") {
      const totals = computeInsumoTotals({
        cantidad: args.cantidad ?? 0,
        costoUnitarioCOP: args.costoUnitarioCOP ?? 0,
        lotCostoTotalCOP: lot.costoTotalCOP,
      });
      preponderancia = totals.preponderancia;
      costoBaseCOP = totals.costoBaseCOP;
    } else {
      if (
        typeof args.preponderancia !== "number" ||
        args.preponderancia <= 0 ||
        args.preponderancia > 100
      ) {
        throw new Error("preponderancia debe estar en (0, 100]");
      }
      preponderancia = args.preponderancia;
      costoBaseCOP = Math.round(lot.costoTotalCOP * (preponderancia / 100));
    }

    // For mixed lots BR-2 still rules — guard the over-100 case at insert
    // time so the cumulative drift is caught before the close-lot step.
    // For all-insumo lots, `wouldOverflowHundred` silently allows the
    // insert because `close()` skips BR-2 entirely.
    if (
      wouldOverflowHundred({
        existing,
        candidate: { tipo: args.tipo, preponderancia },
      })
    ) {
      const sumExisting = existing.reduce((s, it) => s + it.preponderancia, 0);
      throw new Error(
        `La preponderancia ${preponderancia.toFixed(2)}% excede el 100% del lote ` +
          `(actual ${sumExisting.toFixed(2)}%, intento ${preponderancia.toFixed(2)}%).`,
      );
    }

    const itemId = await nextItemId(ctx);
    const now = new Date().toISOString();

    const allInv = await ctx.db.query("productInventory").collect();
    const maxRow = allInv.reduce((m, p) => Math.max(m, p.rowIndex), 1);
    const productId = await ctx.db.insert("productInventory", {
      itemId,
      rowIndex: maxRow + 1,
      nombre: args.nombre,
      peso: args.peso,
      color: args.color,
      calidad: args.calidad,
      cantidad: args.cantidad,
      talla: args.talla,
      medidas: args.medidas,
      categoria: args.categoria,
      ubicacion: args.ubicacion,
      coleccion: args.coleccion,
      caja: args.caja,
      estado: "DISPONIBLE" as const,
      loteId: args.loteId,
      preponderancia,
      costoBaseCOP,
      mostrarEnCatalogo: args.mostrarEnCatalogo ?? false,
      lastPulledAt: now,
      syncStatus: "pending" as const,
    });

    // Single audit row captures the wizard creation. The same auditId
    // feeds api.products.pushToSheet so the audit moves from "pending"
    // to "saved" once Sheets confirms the row.
    const auditId = await ctx.db.insert("productEdits", {
      itemId,
      editorEmail: "fotosintesis-wizard",
      editedAt: now,
      changes: [{ field: "tipo", before: null, after: args.tipo }],
      status: "pending" as const,
    });

    const lotItemId = await ctx.db.insert("lotItems", {
      loteId: args.loteId,
      itemId,
      preponderancia,
      costoBaseCOP,
      ordenEnLote: existing.length + 1,
      tipo: args.tipo,
      tecnica: args.tecnica,
      materiales:
        args.materiales && args.materiales.length > 0
          ? args.materiales
          : undefined,
      cantidad: args.tipo === "insumo" ? args.cantidad : undefined,
      costoUnitarioCOP:
        args.tipo === "insumo" ? args.costoUnitarioCOP : undefined,
    });

    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId,
      auditId,
      mode: "append",
    });

    return { lotItemId, productId, itemId, costoBaseCOP, preponderancia };
  },
});

export const remove = mutation({
  args: { lotItemId: v.id("lotItems") },
  handler: async (ctx, { lotItemId }) => {
    const item = await ctx.db.get(lotItemId);
    if (!item) return { removed: false };
    const lot = await ctx.db
      .query("lots")
      .withIndex("by_loteId", (q) => q.eq("loteId", item.loteId))
      .first();
    if (lot && lot.estado !== "abierto") {
      throw new Error("No se puede borrar ítems de un lote no abierto");
    }
    await ctx.db.delete(lotItemId);
    // We leave productInventory row in place — the user may want to
    // re-link it to a new lot, and deleting the row would cascade
    // problems with sales referencing it. Mark the orphan optional
    // fields as undefined so the audit script can spot it.
    const product = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", item.itemId))
      .first();
    if (product) {
      await ctx.db.patch(product._id, {
        loteId: undefined,
        preponderancia: undefined,
        costoBaseCOP: undefined,
      });
    }
    return { removed: true };
  },
});
