import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

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
 *   3. Computes costoBaseCOP = lot.costoTotalCOP × (preponderancia / 100).
 *   4. Inserts the productInventory row directly (mostrarEnCatalogo:false).
 *   5. Inserts the lotItems row.
 *   6. Schedules the productInventory push (mode: append).
 *
 * BR-5 (costoBaseCOP calculated, never user-editable) is enforced here.
 */
export const create = mutation({
  args: {
    loteId: v.string(),
    tipo: tipoItemValidator,
    nombre: v.string(),
    preponderancia: v.number(),
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
  },
  handler: async (ctx, args) => {
    if (args.preponderancia <= 0 || args.preponderancia > 100) {
      throw new Error("preponderancia debe estar en (0, 100]");
    }
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

    const sumExisting = existing.reduce((s, it) => s + it.preponderancia, 0);
    if (sumExisting + args.preponderancia > 100.01) {
      throw new Error(
        `La preponderancia ${args.preponderancia}% excede el 100% del lote ` +
          `(actual ${sumExisting}%, intento ${args.preponderancia}%).`,
      );
    }

    const costoBaseCOP = Math.round(
      lot.costoTotalCOP * (args.preponderancia / 100),
    );

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
      preponderancia: args.preponderancia,
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
      preponderancia: args.preponderancia,
      costoBaseCOP,
      ordenEnLote: existing.length + 1,
    });

    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId,
      auditId,
      mode: "append",
    });

    return { lotItemId, productId, itemId, costoBaseCOP };
  },
});

/**
 * Patch the preponderancia of an existing lot item. The linked
 * productInventory row's `costoBaseCOP` is recomputed from the lot's
 * current `costoTotalCOP` so the Sheets row stays consistent, and a
 * push is scheduled with an audit row.
 *
 * BR-2 (sum ≤ 100) is re-validated server-side against the *other*
 * items in the lot so the operator can drop one ítem's share and
 * raise another without tripping the overflow guard.
 */
export const updatePreponderancia = mutation({
  args: {
    lotItemId: v.id("lotItems"),
    preponderancia: v.number(),
    editorEmail: v.optional(v.string()),
  },
  handler: async (ctx, { lotItemId, preponderancia, editorEmail }) => {
    if (preponderancia <= 0 || preponderancia > 100) {
      throw new Error("preponderancia debe estar en (0, 100]");
    }
    const existing = await ctx.db.get(lotItemId);
    if (!existing) throw new Error(`lotItem ${lotItemId} no encontrado`);

    const lot = await ctx.db
      .query("lots")
      .withIndex("by_loteId", (q) => q.eq("loteId", existing.loteId))
      .first();
    if (!lot) throw new Error(`Lote ${existing.loteId} no encontrado`);
    if (lot.estado !== "abierto") {
      throw new Error("Sólo se pueden editar ítems de un lote abierto");
    }

    const siblings = await ctx.db
      .query("lotItems")
      .withIndex("by_loteId", (q) => q.eq("loteId", existing.loteId))
      .collect();
    const sumOthers = siblings
      .filter((s) => s._id !== lotItemId)
      .reduce((s, it) => s + it.preponderancia, 0);
    if (sumOthers + preponderancia > 100.01) {
      throw new Error(
        `La preponderancia ${preponderancia}% excede el 100% del lote ` +
          `(otros ítems suman ${sumOthers}%).`,
      );
    }

    const costoBaseCOP = Math.round(lot.costoTotalCOP * (preponderancia / 100));
    await ctx.db.patch(lotItemId, { preponderancia, costoBaseCOP });

    const product = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", existing.itemId))
      .first();
    if (product) {
      const now = new Date().toISOString();
      await ctx.db.patch(product._id, {
        preponderancia,
        costoBaseCOP,
        syncStatus: "pending" as const,
      });
      const auditId = await ctx.db.insert("productEdits", {
        itemId: product.itemId,
        editorEmail: editorEmail ?? "fotosintesis-edit",
        editedAt: now,
        changes: [
          {
            field: "preponderancia",
            before: existing.preponderancia,
            after: preponderancia,
          },
          {
            field: "costoBaseCOP",
            before: existing.costoBaseCOP,
            after: costoBaseCOP,
          },
        ],
        status: "pending" as const,
      });
      await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
        itemId: product.itemId,
        auditId,
        mode: "patch",
      });
    }

    return { lotItemId, preponderancia, costoBaseCOP };
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
