import {
  query,
  mutation,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { pushTableRowToVercel } from "./_lib/sheetSync";
import { COLUMN_MAPS } from "./_lib/columnMaps";
import { formatLotId } from "./sequences";

const formaPagoValidator = v.union(
  v.literal("contado"),
  v.literal("credito"),
  v.literal("esmereogenesis"),
);

const metodoContadoValidator = v.union(
  v.literal("efectivo"),
  v.literal("transferencia"),
);

const lotPatchValidator = v.object({
  fechaRecepcion: v.optional(v.string()),
  pesoTotalQuilates: v.optional(v.number()),
  costoTotalCOP: v.optional(v.number()),
  unidadesDeclaradas: v.optional(v.number()),
  formaPago: v.optional(formaPagoValidator),
  metodoContado: v.optional(metodoContadoValidator),
  fechaVencimiento: v.optional(v.string()),
  numeroCuotas: v.optional(v.number()),
  numeroFactura: v.optional(v.string()),
  urlFactura: v.optional(v.string()),
  notas: v.optional(v.string()),
});

export const list = query({
  args: {
    estado: v.optional(
      v.union(
        v.literal("abierto"),
        v.literal("cerrado"),
        v.literal("publicado"),
      ),
    ),
  },
  handler: async (ctx, { estado }) => {
    const rows = estado
      ? await ctx.db
          .query("lots")
          .withIndex("by_estado", (q) => q.eq("estado", estado))
          .collect()
      : await ctx.db.query("lots").collect();
    return rows.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const get = query({
  args: { id: v.id("lots") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const getByLoteId = query({
  args: { loteId: v.string() },
  handler: async (ctx, { loteId }) =>
    ctx.db
      .query("lots")
      .withIndex("by_loteId", (q) => q.eq("loteId", loteId))
      .first(),
});

/**
 * Read-only peek at the next lot ID. Lets the form preview "B-008"
 * before submit. Does NOT consume the sequence.
 */
export const peekNextLoteId = query({
  args: {},
  handler: async (ctx) => {
    const seq = await ctx.db
      .query("sequences")
      .withIndex("by_name", (q) => q.eq("name", "lot"))
      .first();
    const next = seq?.nextValue ?? 1;
    return { nextValue: next, preview: formatLotId(next) };
  },
});

export const create = mutation({
  args: {
    providerId: v.id("providers"),
    fechaRecepcion: v.string(),
    pesoTotalQuilates: v.optional(v.number()),
    costoTotalCOP: v.number(),
    unidadesDeclaradas: v.number(),
    formaPago: formaPagoValidator,
    metodoContado: v.optional(metodoContadoValidator),
    fechaVencimiento: v.optional(v.string()),
    numeroCuotas: v.optional(v.number()),
    numeroFactura: v.optional(v.string()),
    urlFactura: v.optional(v.string()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.unidadesDeclaradas < 1)
      throw new Error("unidadesDeclaradas debe ser ≥ 1");
    if (args.costoTotalCOP <= 0) throw new Error("costoTotalCOP debe ser > 0");
    if (args.formaPago === "credito" && !args.fechaVencimiento)
      throw new Error("Crédito requiere fechaVencimiento");
    if (args.formaPago === "contado" && !args.metodoContado)
      throw new Error("Contado requiere metodoContado");

    const provider = await ctx.db.get(args.providerId);
    if (!provider) throw new Error("Proveedor no encontrado");

    const seq = await ctx.runMutation(internal.sequences.allocate, {
      name: "lot",
    });
    const loteId = formatLotId(seq.value);

    const now = new Date().toISOString();
    const all = await ctx.db.query("lots").collect();
    const maxRow = all.reduce((m, l) => Math.max(m, l.rowIndex), 1);

    const id = await ctx.db.insert("lots", {
      loteId,
      ...args,
      estado: "abierto" as const,
      rowIndex: maxRow + 1,
      lastPulledAt: now,
      syncStatus: "pending" as const,
    });

    await ctx.scheduler.runAfter(0, api.lots._pushToSheet, {
      id,
      mode: "append",
    });
    return { id, loteId };
  },
});

export const update = mutation({
  args: { id: v.id("lots"), patch: lotPatchValidator },
  handler: async (ctx, { id, patch }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error(`Lot ${id} not found`);
    if (existing.estado !== "abierto")
      throw new Error("Sólo se pueden editar lotes abiertos");
    await ctx.db.patch(id, {
      ...patch,
      syncStatus: "pending" as const,
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, api.lots._pushToSheet, {
      id,
      mode: "patch",
    });
    return { id };
  },
});

/**
 * BR-2: suma preponderancia ≡ 100 ± 0.01.
 * BR-3: count(lotItems where loteId === L) === unidadesDeclaradas.
 *
 * Both validated here on the server — the UI mirrors but cannot be the
 * sole authority.
 */
export const close = mutation({
  args: { id: v.id("lots") },
  handler: async (ctx, { id }) => {
    const lot = await ctx.db.get(id);
    if (!lot) throw new Error(`Lot ${id} not found`);
    if (lot.estado !== "abierto")
      throw new Error("El lote ya está cerrado o publicado");

    const items = await ctx.db
      .query("lotItems")
      .withIndex("by_loteId", (q) => q.eq("loteId", lot.loteId))
      .collect();

    if (items.length !== lot.unidadesDeclaradas) {
      throw new Error(
        `Faltan ítems: el lote declara ${lot.unidadesDeclaradas} unidades, ` +
          `hay ${items.length} creadas.`,
      );
    }

    const sum = items.reduce((s, it) => s + it.preponderancia, 0);
    if (Math.abs(sum - 100) > 0.01) {
      throw new Error(
        `Preponderancia ${sum.toFixed(2)}% ≠ 100%. Ajusta los ítems antes de cerrar.`,
      );
    }

    await ctx.db.patch(id, {
      estado: "cerrado" as const,
      syncStatus: "pending" as const,
    });
    await ctx.scheduler.runAfter(0, api.lots._pushToSheet, {
      id,
      mode: "patch",
    });
    return { id, loteId: lot.loteId };
  },
});

/**
 * Bulk-flip every productInventory row owned by this lot to
 * `mostrarEnCatalogo: true`, then mark the lot as published.
 */
export const publish = mutation({
  args: { id: v.id("lots") },
  handler: async (ctx, { id }) => {
    const lot = await ctx.db.get(id);
    if (!lot) throw new Error(`Lot ${id} not found`);
    if (lot.estado !== "cerrado")
      throw new Error("Sólo lotes cerrados pueden publicarse");

    const items = await ctx.db
      .query("lotItems")
      .withIndex("by_loteId", (q) => q.eq("loteId", lot.loteId))
      .collect();

    let flipped = 0;
    for (const item of items) {
      const product = await ctx.db
        .query("productInventory")
        .withIndex("by_itemId", (q) => q.eq("itemId", item.itemId))
        .first();
      if (product && product.mostrarEnCatalogo !== true) {
        await ctx.db.patch(product._id, { mostrarEnCatalogo: true });
        flipped++;
      }
    }

    await ctx.db.patch(id, {
      estado: "publicado" as const,
      syncStatus: "pending" as const,
    });
    await ctx.scheduler.runAfter(0, api.lots._pushToSheet, {
      id,
      mode: "patch",
    });
    return { id, loteId: lot.loteId, flipped };
  },
});

export const _getInternal = internalQuery({
  args: { id: v.id("lots") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const _markPushed = internalMutation({
  args: { id: v.id("lots") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      syncStatus: "synced" as const,
      lastPushedAt: new Date().toISOString(),
      syncError: undefined,
    });
  },
});

export const _markPushFailed = internalMutation({
  args: { id: v.id("lots"), error: v.string() },
  handler: async (ctx, { id, error }) => {
    await ctx.db.patch(id, {
      syncStatus: "error" as const,
      syncError: error.slice(0, 500),
    });
  },
});

export const _pushToSheet = action({
  args: {
    id: v.id("lots"),
    mode: v.union(v.literal("patch"), v.literal("append")),
  },
  handler: async (
    ctx,
    { id, mode },
  ): Promise<{ ok: boolean; message: string }> => {
    const lot = await ctx.runQuery(internal.lots._getInternal, { id });
    if (!lot) {
      const msg = `Lot ${id} not found`;
      await ctx.runMutation(internal.lots._markPushFailed, { id, error: msg });
      return { ok: false, message: msg };
    }

    const provider = await ctx.runQuery(internal.providers._getInternal, {
      id: lot.providerId,
    });

    const fieldSource: Record<string, unknown> = {
      ...lot,
      providerNombre: provider?.nombreORazonSocial ?? "",
    };
    const fields: Record<string, string> = {};
    for (const col of COLUMN_MAPS.lots) {
      const val = fieldSource[col];
      fields[col] = val === null || val === undefined ? "" : String(val);
    }

    const result = await pushTableRowToVercel({
      table: "lots",
      rowIndex: lot.rowIndex,
      mode,
      idValue: lot.loteId,
      fields,
    });
    if (result.ok) {
      await ctx.runMutation(internal.lots._markPushed, { id });
    } else {
      await ctx.runMutation(internal.lots._markPushFailed, {
        id,
        error: result.message,
      });
    }
    return result;
  },
});

export const retryPush = action({
  args: { id: v.id("lots") },
  handler: async (ctx, { id }): Promise<{ ok: boolean; message: string }> => {
    const row = await ctx.runQuery(internal.lots._getInternal, { id });
    if (!row) return { ok: false, message: "Lot not found" };
    return await ctx.runAction(api.lots._pushToSheet, { id, mode: "patch" });
  },
});
