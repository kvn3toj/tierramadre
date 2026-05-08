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
import { allocateNext, formatSaleId } from "./sequences";

const formaPagoValidator = v.union(
  v.literal("contado"),
  v.literal("credito"),
  v.literal("esmereogenesis"),
);

const metodoContadoValidator = v.union(
  v.literal("efectivo"),
  v.literal("transferencia"),
);

export const list = query({
  args: {
    estado: v.optional(
      v.union(
        v.literal("reservada"),
        v.literal("confirmada"),
        v.literal("cancelada"),
      ),
    ),
  },
  handler: async (ctx, { estado }) => {
    const rows = estado
      ? await ctx.db
          .query("sales")
          .withIndex("by_estado", (q) => q.eq("estado", estado))
          .collect()
      : await ctx.db.query("sales").collect();
    return rows.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const get = query({
  args: { id: v.id("sales") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const peekNextSaleId = query({
  args: {},
  handler: async (ctx) => {
    const seq = await ctx.db
      .query("sequences")
      .withIndex("by_name", (q) => q.eq("name", "sale"))
      .first();
    const next = seq?.nextValue ?? 1;
    return { nextValue: next, preview: formatSaleId(next) };
  },
});

/**
 * Create a sale.
 *
 * BR-6: every itemId in `itemIds` must be in productInventory with
 * estado in {DISPONIBLE, ASESOR}. A VENDIDA item cannot be re-sold.
 *
 * Side effect: each item flips to estado "VENDIDA" and a push is
 * scheduled per item (so the Inventario sheet reflects the change).
 */
export const create = mutation({
  args: {
    itemIds: v.array(v.string()),
    clientId: v.id("clients"),
    fechaVenta: v.string(),
    precioAcordadoCOP: v.number(),
    descuentoCOP: v.optional(v.number()),
    totalCOP: v.number(),
    comisionCOP: v.optional(v.number()),
    formaPago: formaPagoValidator,
    metodoContado: v.optional(metodoContadoValidator),
    fechaVencimiento: v.optional(v.string()),
    numeroCuotas: v.optional(v.number()),
    estado: v.optional(
      v.union(
        v.literal("reservada"),
        v.literal("confirmada"),
        v.literal("cancelada"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    if (args.itemIds.length === 0) {
      throw new Error("Una venta debe incluir al menos un ítem");
    }
    if (args.totalCOP <= 0) throw new Error("totalCOP debe ser > 0");
    if (args.formaPago === "credito" && !args.fechaVencimiento) {
      throw new Error("Crédito requiere fechaVencimiento");
    }
    if (args.formaPago === "contado" && !args.metodoContado) {
      throw new Error("Contado requiere metodoContado");
    }

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Cliente no encontrado");

    // BR-6 — fail loudly if any item is unavailable.
    const products = [];
    for (const itemId of args.itemIds) {
      const product = await ctx.db
        .query("productInventory")
        .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
        .first();
      if (!product) {
        throw new Error(`Ítem ${itemId} no existe en inventario`);
      }
      if (product.estado === "VENDIDA") {
        throw new Error(`Ítem ${itemId} ya está vendido`);
      }
      products.push(product);
    }

    const seqValue = await allocateNext(ctx, "sale");
    const saleId = formatSaleId(seqValue);

    const now = new Date().toISOString();
    const all = await ctx.db.query("sales").collect();
    const maxRow = all.reduce((m, s) => Math.max(m, s.rowIndex), 1);

    const id = await ctx.db.insert("sales", {
      saleId,
      ...args,
      estado: args.estado ?? "confirmada",
      rowIndex: maxRow + 1,
      lastPulledAt: now,
      syncStatus: "pending" as const,
    });

    // Flip each product to VENDIDA + schedule its push.
    for (const product of products) {
      await ctx.db.patch(product._id, {
        estado: "VENDIDA" as const,
        syncStatus: "pending" as const,
      });
      const auditId = await ctx.db.insert("productEdits", {
        itemId: product.itemId,
        editorEmail: "fotosintesis-sale",
        editedAt: now,
        changes: [
          { field: "estado", before: product.estado, after: "VENDIDA" },
        ],
        status: "pending" as const,
      });
      await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
        itemId: product.itemId,
        auditId,
        mode: "patch",
      });
    }

    await ctx.scheduler.runAfter(0, api.sales._pushToSheet, {
      id,
      mode: "append",
    });
    return { id, saleId };
  },
});

export const cancel = mutation({
  args: { id: v.id("sales") },
  handler: async (ctx, { id }) => {
    const sale = await ctx.db.get(id);
    if (!sale) throw new Error(`Sale ${id} not found`);
    if (sale.estado === "cancelada") return { id, alreadyCancelled: true };

    // Q-8 deferred: confirm with user before F4 ships. Default behavior
    // here is yes — cancel restores items to DISPONIBLE.
    for (const itemId of sale.itemIds) {
      const product = await ctx.db
        .query("productInventory")
        .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
        .first();
      if (!product) continue;
      await ctx.db.patch(product._id, {
        estado: "DISPONIBLE" as const,
        syncStatus: "pending" as const,
      });
      const auditId = await ctx.db.insert("productEdits", {
        itemId,
        editorEmail: "fotosintesis-sale-cancel",
        editedAt: new Date().toISOString(),
        changes: [{ field: "estado", before: "VENDIDA", after: "DISPONIBLE" }],
        status: "pending" as const,
      });
      await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
        itemId,
        auditId,
        mode: "patch",
      });
    }

    await ctx.db.patch(id, {
      estado: "cancelada" as const,
      syncStatus: "pending" as const,
    });
    await ctx.scheduler.runAfter(0, api.sales._pushToSheet, {
      id,
      mode: "patch",
    });
    return { id };
  },
});

export const setCarnetUrl = mutation({
  args: { id: v.id("sales"), carnetUrl: v.string() },
  handler: async (ctx, { id, carnetUrl }) => {
    await ctx.db.patch(id, { carnetUrl, syncStatus: "pending" as const });
    await ctx.scheduler.runAfter(0, api.sales._pushToSheet, {
      id,
      mode: "patch",
    });
    return { id };
  },
});

export const setCertificadoUrl = mutation({
  args: { id: v.id("sales"), certificadoUrl: v.string() },
  handler: async (ctx, { id, certificadoUrl }) => {
    await ctx.db.patch(id, {
      certificadoUrl,
      syncStatus: "pending" as const,
    });
    await ctx.scheduler.runAfter(0, api.sales._pushToSheet, {
      id,
      mode: "patch",
    });
    return { id };
  },
});

export const _getInternal = internalQuery({
  args: { id: v.id("sales") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const _markPushed = internalMutation({
  args: { id: v.id("sales") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      syncStatus: "synced" as const,
      lastPushedAt: new Date().toISOString(),
      syncError: undefined,
    });
  },
});

export const _markPushFailed = internalMutation({
  args: { id: v.id("sales"), error: v.string() },
  handler: async (ctx, { id, error }) => {
    await ctx.db.patch(id, {
      syncStatus: "error" as const,
      syncError: error.slice(0, 500),
    });
  },
});

export const _pushToSheet = action({
  args: {
    id: v.id("sales"),
    mode: v.union(v.literal("patch"), v.literal("append")),
  },
  handler: async (
    ctx,
    { id, mode },
  ): Promise<{ ok: boolean; message: string }> => {
    const sale = await ctx.runQuery(internal.sales._getInternal, { id });
    if (!sale) {
      const msg = `Sale ${id} not found`;
      await ctx.runMutation(internal.sales._markPushFailed, {
        id,
        error: msg,
      });
      return { ok: false, message: msg };
    }

    const client = await ctx.runQuery(internal.clients._getInternal, {
      id: sale.clientId,
    });

    const fieldSource: Record<string, unknown> = {
      ...sale,
      itemIdsJoined: sale.itemIds.join(", "),
      clientNombre: client?.nombre ?? "",
    };
    const fields: Record<string, string> = {};
    for (const col of COLUMN_MAPS.sales) {
      const val = fieldSource[col];
      fields[col] = val === null || val === undefined ? "" : String(val);
    }

    const result = await pushTableRowToVercel({
      table: "sales",
      rowIndex: sale.rowIndex,
      mode,
      idValue: sale.saleId,
      fields,
    });
    if (result.ok) {
      await ctx.runMutation(internal.sales._markPushed, { id });
    } else {
      await ctx.runMutation(internal.sales._markPushFailed, {
        id,
        error: result.message,
      });
    }
    return result;
  },
});

export const retryPush = action({
  args: { id: v.id("sales") },
  handler: async (ctx, { id }): Promise<{ ok: boolean; message: string }> => {
    const row = await ctx.runQuery(internal.sales._getInternal, { id });
    if (!row) return { ok: false, message: "Sale not found" };
    return await ctx.runAction(api.sales._pushToSheet, { id, mode: "patch" });
  },
});
