import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { bumpInventoryTotal } from "./products";
import { preponderanciaSum, balancesTo100 } from "./_lib/lotMath";
import { withPublishStamp } from "./_lib/publishState";

const tipoItemValidator = v.union(
  v.literal("gema"),
  v.literal("joya"),
  v.literal("insumo"),
  v.literal("lote"),
  v.literal("bruto"),
);

export const listByLote = query({
  args: { loteId: v.string() },
  handler: async (ctx, { loteId }) => {
    const items = await ctx.db
      .query("lotItems")
      .withIndex("by_loteId", (q) => q.eq("loteId", loteId))
      .collect();
    const sorted = items.sort((a, b) => a.ordenEnLote - b.ordenEnLote);
    // Enrich each join row with the human-readable `nombre` (and `tipo`) from
    // its productInventory mirror so the capture bandeja can show the name the
    // operator typed — not just the sequential itemId. Keeps the field additive
    // for other consumers (LoteResumenPage) that ignore it.
    return await Promise.all(
      sorted.map(async (item) => {
        const product = await ctx.db
          .query("productInventory")
          .withIndex("by_itemId", (q) => q.eq("itemId", item.itemId))
          .first();
        return {
          ...item,
          nombre: product?.nombre,
          tipoEsmeralda: product?.tipoEsmeralda,
        };
      }),
    );
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
  // NOTE: itemId allocation relies on Convex OCC serializing this table scan. clientToken (above) closes the AI-retry replay path; a concurrency test should prove the distinct-create path before any allocator change.
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
    procedencia: v.optional(v.string()),
    precioPublicoCOP: v.optional(v.number()),
    mostrarEnCatalogo: v.optional(v.boolean()),
    nivelRareza: v.optional(v.number()),
    calificacion: v.optional(v.number()),
    tipoEsmeralda: v.optional(v.string()),
    subtipoForm: v.optional(v.string()),
    tipoJoya: v.optional(v.string()),
    tecnicaJoya: v.optional(v.string()),
    minerales: v.optional(v.array(v.string())),
    complementos: v.optional(v.array(v.string())),
    fotoUrl: v.optional(v.string()),
    certificadoUrl: v.optional(v.string()),
    formulaGema: v.optional(v.string()),
    formulaJoya: v.optional(v.string()),
    rangoDescuento: v.optional(v.string()),
    precioEmbajadorCOP: v.optional(v.number()),
    precioConscienteCOP: v.optional(v.number()),
    // Bruto-only — informational fields about an unworked parcel.
    rendimientoEsperado: v.optional(v.number()),
    cantidadEstimada: v.optional(v.number()),
    clientToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Idempotency guard (money-critical): replay of the same clientToken
    // returns the prior result instead of allocating a second itemId / inserting
    // a duplicate productInventory + lotItems row. The created lotItems row is
    // existence-checked — if it was since removed (orphaned + deleted), the stale
    // token is dropped and the create runs again (C7).
    if (args.clientToken) {
      const prior = await ctx.db
        .query("commitTokens")
        .withIndex("by_token", (q) => q.eq("token", args.clientToken!))
        .unique();
      if (prior) {
        const stillThere = await ctx.db.get(prior.primaryId as Id<"lotItems">);
        if (stillThere) {
          return JSON.parse(prior.result) as {
            lotItemId: Id<"lotItems">;
            productId: Id<"productInventory">;
            itemId: string;
            costoBaseCOP: number;
          };
        }
        await ctx.db.delete(prior._id);
      }
    }

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
      precioCOP: args.precioPublicoCOP,
      estado: "DISPONIBLE" as const,
      loteId: args.loteId,
      preponderancia: args.preponderancia,
      costoBaseCOP,
      ...withPublishStamp(null, args.mostrarEnCatalogo ?? false),
      tipo: args.tipo,
      procedencia: args.procedencia,
      observacion: args.observacion,
      rendimientoEsperado: args.rendimientoEsperado,
      cantidadEstimada: args.cantidadEstimada,
      nivelRareza: args.nivelRareza,
      calificacion: args.calificacion,
      tipoEsmeralda: args.tipoEsmeralda,
      subtipoForm: args.subtipoForm,
      tipoJoya: args.tipoJoya,
      tecnicaJoya: args.tecnicaJoya,
      minerales: args.minerales,
      complementos: args.complementos,
      fotoUrl: args.fotoUrl,
      certificadoUrl: args.certificadoUrl,
      formulaGema: args.formulaGema,
      formulaJoya: args.formulaJoya,
      rangoDescuento: args.rangoDescuento,
      precioEmbajadorCOP: args.precioEmbajadorCOP,
      precioConscienteCOP: args.precioConscienteCOP,
      lastPulledAt: now,
      syncStatus: "pending" as const,
    });

    // BANDWIDTH: keep the inventoryStats counter in sync (+1) so
    // products.syncStats reads ONE singleton doc instead of reactively
    // scanning up to 1000 full productInventory documents. total is
    // monotonic — a new lot item only ever adds to it.
    await bumpInventoryTotal(ctx, 1);

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

    const result = { lotItemId, productId, itemId, costoBaseCOP };
    if (args.clientToken) {
      await ctx.db.insert("commitTokens", {
        token: args.clientToken,
        kind: "item.create",
        primaryId: lotItemId,
        result: JSON.stringify(result),
        createdAt: new Date().toISOString(),
      });
    }
    return result;
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
    // Editing is allowed in any lot estado — the studio needs to fix
    // preponderancia after a lot has been closed/published when a
    // mis-keyed split is discovered. Preponderancia overflow is still
    // re-validated below.

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

/**
 * Patch a lot item's gema metadata. Accepts any subset of editable
 * fields and writes them to the linked productInventory row. If
 * `preponderancia` is in the patch, the lotItems row and the product's
 * `costoBaseCOP` are recomputed and updated atomically (BR-2 + BR-5).
 *
 * A single productEdits audit row captures every changed field with
 * before/after values. Sheets push is scheduled once at the end so a
 * multi-field edit is one network round-trip.
 *
 * Only fields actually different from the existing values produce
 * patches/audit entries — a no-op call returns early.
 */
export const updateGemaFields = mutation({
  args: {
    lotItemId: v.id("lotItems"),
    patch: v.object({
      nombre: v.optional(v.string()),
      peso: v.optional(v.string()),
      color: v.optional(v.string()),
      calidad: v.optional(v.string()),
      procedencia: v.optional(v.string()),
      observacion: v.optional(v.string()),
      talla: v.optional(v.string()),
      medidas: v.optional(v.string()),
      cantidad: v.optional(v.number()),
      categoria: v.optional(v.string()),
      nivelRareza: v.optional(v.number()),
      calificacion: v.optional(v.number()),
      tipoEsmeralda: v.optional(v.string()),
      subtipoForm: v.optional(v.string()),
      tipoJoya: v.optional(v.string()),
      tecnicaJoya: v.optional(v.string()),
      minerales: v.optional(v.array(v.string())),
      complementos: v.optional(v.array(v.string())),
      fotoUrl: v.optional(v.string()),
      certificadoUrl: v.optional(v.string()),
      formulaGema: v.optional(v.string()),
      formulaJoya: v.optional(v.string()),
      rangoDescuento: v.optional(v.string()),
      precioEmbajadorCOP: v.optional(v.number()),
      precioConscienteCOP: v.optional(v.number()),
      precioPublicoCOP: v.optional(v.number()),
      mostrarEnCatalogo: v.optional(v.boolean()),
      preponderancia: v.optional(v.number()),
      // Bruto-only informational fields — editable like any other captured
      // value once the parcel is in the lot.
      cantidadEstimada: v.optional(v.number()),
      rendimientoEsperado: v.optional(v.number()),
    }),
    editorEmail: v.optional(v.string()),
  },
  handler: async (ctx, { lotItemId, patch, editorEmail }) => {
    const lotItem = await ctx.db.get(lotItemId);
    if (!lotItem) throw new Error(`lotItem ${lotItemId} no encontrado`);

    const lot = await ctx.db
      .query("lots")
      .withIndex("by_loteId", (q) => q.eq("loteId", lotItem.loteId))
      .first();
    if (!lot) throw new Error(`Lote ${lotItem.loteId} no encontrado`);
    // Editing is allowed in any lot estado. The studio needs to fix
    // gem details (e.g. a wrongly-keyed peso or color) after a lot has
    // been closed or even published. Preponderancia overflow and the
    // BR-2 invariant are still re-validated below before any writes.

    const product = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", lotItem.itemId))
      .first();
    if (!product) {
      throw new Error(`productInventory para ${lotItem.itemId} no encontrado`);
    }

    // Validate nombre — productInventory mirror cannot have an empty name.
    if (patch.nombre !== undefined && patch.nombre.trim().length === 0) {
      throw new Error("Nombre es obligatorio");
    }

    // Re-validate preponderancia against siblings (BR-2) before any writes.
    let nextPreponderancia: number | undefined;
    let nextCostoBaseCOP: number | undefined;
    if (patch.preponderancia !== undefined) {
      const p = patch.preponderancia;
      if (p <= 0 || p > 100) {
        throw new Error("preponderancia debe estar en (0, 100]");
      }
      const siblings = await ctx.db
        .query("lotItems")
        .withIndex("by_loteId", (q) => q.eq("loteId", lotItem.loteId))
        .collect();
      const sumOthers = siblings
        .filter((s) => s._id !== lotItemId)
        .reduce((s, it) => s + it.preponderancia, 0);
      if (sumOthers + p > 100.01) {
        throw new Error(
          `La preponderancia ${p}% excede el 100% del lote ` +
            `(otros ítems suman ${sumOthers}%).`,
        );
      }
      nextPreponderancia = p;
      nextCostoBaseCOP = Math.round(lot.costoTotalCOP * (p / 100));
    }

    // Compute the diff vs current product/lotItem state so we audit only
    // real changes. `precioPublicoCOP` from the UI maps to productInventory.precioCOP.
    type Change = {
      field: string;
      before: string | number | null;
      after: string | number | null;
    };
    const changes: Change[] = [];
    const productPatch: Record<string, unknown> = {};

    const compareString = (
      field: string,
      next: string | undefined,
      current: string | undefined,
      targetField?: string,
    ) => {
      if (next === undefined) return;
      const normalized = next.trim();
      const finalValue = normalized.length === 0 ? undefined : normalized;
      if (finalValue === current) return;
      productPatch[targetField ?? field] = finalValue;
      changes.push({
        field,
        before: current ?? null,
        after: finalValue ?? null,
      });
    };

    compareString("nombre", patch.nombre, product.nombre);
    compareString("peso", patch.peso, product.peso);
    compareString("color", patch.color, product.color);
    compareString("calidad", patch.calidad, product.calidad);
    compareString("procedencia", patch.procedencia, product.procedencia);
    compareString("observacion", patch.observacion, product.observacion);
    compareString("talla", patch.talla, product.talla);
    compareString("medidas", patch.medidas, product.medidas);
    compareString("categoria", patch.categoria, product.categoria);
    compareString("tipoEsmeralda", patch.tipoEsmeralda, product.tipoEsmeralda);
    compareString("subtipoForm", patch.subtipoForm, product.subtipoForm);
    compareString("tipoJoya", patch.tipoJoya, product.tipoJoya);
    compareString("tecnicaJoya", patch.tecnicaJoya, product.tecnicaJoya);
    compareString("formulaGema", patch.formulaGema, product.formulaGema);
    compareString("formulaJoya", patch.formulaJoya, product.formulaJoya);
    compareString(
      "rangoDescuento",
      patch.rangoDescuento,
      product.rangoDescuento,
    );
    compareString("fotoUrl", patch.fotoUrl, product.fotoUrl);
    compareString(
      "certificadoUrl",
      patch.certificadoUrl,
      product.certificadoUrl,
    );

    const compareNumber = (
      field: string,
      next: number | undefined,
      current: number | undefined,
    ) => {
      if (next === undefined) return;
      if (next === current) return;
      productPatch[field] = next;
      changes.push({ field, before: current ?? null, after: next });
    };

    compareNumber("cantidad", patch.cantidad, product.cantidad);
    compareNumber("nivelRareza", patch.nivelRareza, product.nivelRareza);
    compareNumber("calificacion", patch.calificacion, product.calificacion);
    compareNumber(
      "cantidadEstimada",
      patch.cantidadEstimada,
      product.cantidadEstimada,
    );
    compareNumber(
      "rendimientoEsperado",
      patch.rendimientoEsperado,
      product.rendimientoEsperado,
    );
    compareNumber(
      "precioEmbajadorCOP",
      patch.precioEmbajadorCOP,
      product.precioEmbajadorCOP,
    );
    compareNumber(
      "precioConscienteCOP",
      patch.precioConscienteCOP,
      product.precioConscienteCOP,
    );

    if (patch.minerales !== undefined) {
      const prev = product.minerales ?? [];
      const next = patch.minerales;
      const same =
        prev.length === next.length && prev.every((v, i) => v === next[i]);
      if (!same) {
        productPatch.minerales = next;
        changes.push({
          field: "minerales",
          before: prev.join(", ") || null,
          after: next.join(", ") || null,
        });
      }
    }

    if (patch.complementos !== undefined) {
      const prev = product.complementos ?? [];
      const next = patch.complementos;
      const same =
        prev.length === next.length && prev.every((v, i) => v === next[i]);
      if (!same) {
        productPatch.complementos = next;
        changes.push({
          field: "complementos",
          before: prev.join(", ") || null,
          after: next.join(", ") || null,
        });
      }
    }

    if (patch.precioPublicoCOP !== undefined) {
      // F13 — a literal 0 is a real price (e.g. free / canje tier), NOT a
      // "clear" sentinel. Blank inputs arrive as undefined (the *PatchFromDraft
      // builders omit them) and are skipped by the guard above, so zero-handling
      // is now consistent with the precioEmbajador/Consciente tier fields.
      const next = patch.precioPublicoCOP;
      if (next !== product.precioCOP) {
        productPatch.precioCOP = next;
        changes.push({
          field: "precioCOP",
          before: product.precioCOP ?? null,
          after: next ?? null,
        });
      }
    }

    if (patch.mostrarEnCatalogo !== undefined) {
      if (patch.mostrarEnCatalogo !== (product.mostrarEnCatalogo ?? false)) {
        Object.assign(
          productPatch,
          withPublishStamp(product, patch.mostrarEnCatalogo),
        );
        changes.push({
          field: "mostrarEnCatalogo",
          before: product.mostrarEnCatalogo ? 1 : 0,
          after: patch.mostrarEnCatalogo ? 1 : 0,
        });
      }
    }

    if (
      nextPreponderancia !== undefined &&
      nextCostoBaseCOP !== undefined &&
      (nextPreponderancia !== lotItem.preponderancia ||
        nextCostoBaseCOP !== lotItem.costoBaseCOP)
    ) {
      productPatch.preponderancia = nextPreponderancia;
      productPatch.costoBaseCOP = nextCostoBaseCOP;
      changes.push({
        field: "preponderancia",
        before: lotItem.preponderancia,
        after: nextPreponderancia,
      });
      changes.push({
        field: "costoBaseCOP",
        before: lotItem.costoBaseCOP,
        after: nextCostoBaseCOP,
      });
    }

    if (changes.length === 0) {
      return { lotItemId, changed: false };
    }

    // 1. Mirror writes (productInventory + lotItems if preponderancia changed).
    await ctx.db.patch(product._id, {
      ...productPatch,
      syncStatus: "pending" as const,
      syncError: undefined,
    });
    if (nextPreponderancia !== undefined && nextCostoBaseCOP !== undefined) {
      await ctx.db.patch(lotItemId, {
        preponderancia: nextPreponderancia,
        costoBaseCOP: nextCostoBaseCOP,
      });
    }

    // 2. Audit + scheduled sheet push.
    const now = new Date().toISOString();
    const auditId = await ctx.db.insert("productEdits", {
      itemId: product.itemId,
      editorEmail: editorEmail ?? "fotosintesis-edit",
      editedAt: now,
      changes,
      status: "pending" as const,
    });
    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId: product.itemId,
      auditId,
      mode: "patch",
    });

    return {
      lotItemId,
      changed: true,
      changedFields: changes.map((c) => c.field),
      costoBaseCOP: nextCostoBaseCOP ?? lotItem.costoBaseCOP,
    };
  },
});

/**
 * Update only an item's media (foto + certificado) on the linked
 * productInventory row. Unlike `updateGemaFields`, this is intentionally
 * **state-agnostic**: media is presentation metadata, not financial data, so
 * an operator can refresh / replace an item's photo after the lot has been
 * `cerrado` or `publicado` (e.g. a better studio shot arrives days later)
 * without reopening the lot.
 *
 * Pass an empty string to clear a field. Only fields that actually change
 * produce an audit entry + Sheets push; a no-op returns early.
 */
export const updateMedia = mutation({
  args: {
    lotItemId: v.id("lotItems"),
    fotoUrl: v.optional(v.string()),
    certificadoUrl: v.optional(v.string()),
    editorEmail: v.optional(v.string()),
  },
  handler: async (ctx, { lotItemId, fotoUrl, certificadoUrl, editorEmail }) => {
    const lotItem = await ctx.db.get(lotItemId);
    if (!lotItem) throw new Error(`lotItem ${lotItemId} no encontrado`);

    const product = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", lotItem.itemId))
      .first();
    if (!product) {
      throw new Error(`productInventory para ${lotItem.itemId} no encontrado`);
    }

    type Change = {
      field: string;
      before: string | number | null;
      after: string | number | null;
    };
    const changes: Change[] = [];
    const productPatch: Record<string, unknown> = {};

    const applyMedia = (
      field: "fotoUrl" | "certificadoUrl",
      next: string | undefined,
      current: string | undefined,
    ) => {
      if (next === undefined) return;
      const normalized = next.trim();
      const finalValue = normalized.length === 0 ? undefined : normalized;
      if (finalValue === current) return;
      productPatch[field] = finalValue;
      changes.push({
        field,
        before: current ?? null,
        after: finalValue ?? null,
      });
    };

    applyMedia("fotoUrl", fotoUrl, product.fotoUrl);
    applyMedia("certificadoUrl", certificadoUrl, product.certificadoUrl);

    if (changes.length === 0) {
      return { lotItemId, changed: false };
    }

    await ctx.db.patch(product._id, {
      ...productPatch,
      syncStatus: "pending" as const,
      syncError: undefined,
    });

    const now = new Date().toISOString();
    const auditId = await ctx.db.insert("productEdits", {
      itemId: product.itemId,
      editorEmail: editorEmail ?? "fotosintesis-media",
      editedAt: now,
      changes,
      status: "pending" as const,
    });
    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId: product.itemId,
      auditId,
      mode: "patch",
    });

    return {
      lotItemId,
      changed: true,
      changedFields: changes.map((c) => c.field),
    };
  },
});

export const remove = mutation({
  args: { lotItemId: v.id("lotItems"), editorEmail: v.optional(v.string()) },
  handler: async (ctx, { lotItemId, editorEmail }) => {
    const item = await ctx.db.get(lotItemId);
    if (!item) return { removed: false as const };
    // Item removal is allowed in any lot estado — operators may need to
    // pull a mis-captured stone out of a published lot. Sales referencing
    // the productInventory row stay safe because we orphan that row
    // (see below) rather than deleting it.
    const lot = await ctx.db
      .query("lots")
      .withIndex("by_loteId", (q) => q.eq("loteId", item.loteId))
      .first();

    // BR-2: after removing this item the remaining siblings must still sum to
    // 100% on a closed/published lot. Compute the post-removal sum BEFORE the
    // delete so we can warn the operator — previously this invariant broke
    // silently with no signal. (ISO-audit C7.)
    const siblings = await ctx.db
      .query("lotItems")
      .withIndex("by_loteId", (q) => q.eq("loteId", item.loteId))
      .collect();
    const sumAfter = preponderanciaSum(
      siblings.filter((s) => s._id !== lotItemId),
    );
    const balances = balancesTo100(sumAfter);

    await ctx.db.delete(lotItemId);
    // We leave the productInventory row in place — the user may want to
    // re-link it to a new lot, and deleting the row would cascade problems
    // with sales referencing it. Orphan it by clearing the lot-derived fields.
    // We deliberately do NOT push this orphaning to Sheets (pushToSheet routes
    // by loteId, which is now cleared → it would misroute to the legacy tab);
    // this matches lots.cancel's orphan path.
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
      // Audit row so the removal is traceable in the item's history — the old
      // remove left no record at all. (ISO-audit C7.) Stays "pending" because
      // the orphan intentionally isn't synced to Sheets (see above).
      await ctx.db.insert("productEdits", {
        itemId: product.itemId,
        editorEmail: editorEmail ?? "fotosintesis-remove",
        editedAt: new Date().toISOString(),
        changes: [
          { field: "loteId", before: item.loteId, after: null },
          { field: "preponderancia", before: item.preponderancia, after: null },
          {
            field: "costoBaseCOP",
            before: product.costoBaseCOP ?? null,
            after: null,
          },
        ],
        status: "pending" as const,
      });
    }

    const warning =
      lot && lot.estado !== "abierto" && !balances
        ? `El lote ${lot.loteId} (${lot.estado}) ya no suma 100% ` +
          `(ahora ${sumAfter.toFixed(2)}%). Ajustá la preponderancia de los ` +
          `ítems restantes.`
        : null;

    return {
      removed: true as const,
      lotEstado: lot?.estado ?? null,
      sumAfter,
      balances,
      warning,
    };
  },
});
