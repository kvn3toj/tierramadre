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
import { allocateNext, formatSaleId, saleSequenceName } from "./sequences";

const sedeValidator = v.union(v.literal("B"), v.literal("C"));

const formaPagoValidator = v.union(
  v.literal("contado"),
  v.literal("credito"),
  v.literal("esmereogenesis"),
  v.literal("bajo_pedido"),
  v.literal("consignacion"),
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
  args: { sede: sedeValidator },
  handler: async (ctx, { sede }) => {
    const seq = await ctx.db
      .query("sequences")
      .withIndex("by_name", (q) => q.eq("name", saleSequenceName(sede)))
      .first();
    const next = seq?.nextValue ?? 1;
    return { nextValue: next, preview: formatSaleId(next, sede) };
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
    sede: sedeValidator,
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
    if (new Set(args.itemIds).size !== args.itemIds.length) {
      throw new Error("itemIds duplicados en la venta");
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

    const seqValue = await allocateNext(ctx, saleSequenceName(args.sede));
    const saleId = formatSaleId(seqValue, args.sede);

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

/**
 * Cancel a sale. Restores every itemId to estado "DISPONIBLE" and records
 * an audit trail on both the sale (cancelledAt/By/Reason) and each affected
 * productEdits row (with the real operator email instead of the previous
 * "fotosintesis-sale-cancel" sentinel).
 *
 * `operatorEmail` is required so we can attribute the action. `reason` is
 * optional at the schema level but the Slice 3 UI requires it (CancelVentaDialog).
 */
export const cancel = mutation({
  args: {
    id: v.id("sales"),
    operatorEmail: v.string(),
    operatorName: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { id, operatorEmail, operatorName, reason }) => {
    const sale = await ctx.db.get(id);
    if (!sale) throw new Error(`Sale ${id} not found`);
    if (sale.estado === "cancelada") return { id, alreadyCancelled: true };

    const now = new Date().toISOString();

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
        editorEmail: operatorEmail,
        editorName: operatorName,
        editedAt: now,
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
      cancelledAt: now,
      cancelledBy: operatorName
        ? `${operatorName} <${operatorEmail}>`
        : operatorEmail,
      ...(reason ? { cancellationReason: reason } : {}),
    });
    await ctx.scheduler.runAfter(0, api.sales._pushToSheet, {
      id,
      mode: "patch",
    });
    return { id };
  },
});

/**
 * Edit the precio acordado / total of a sale after the fact. Common when
 * Maritza miskeys the price or the embajador renegotiates. Only allowed
 * while the sale is still confirmed/reservada — cancelled sales are
 * read-only by design.
 *
 * `totalCOP` defaults to the new `precioAcordadoCOP` if omitted (matches
 * the Slice 1 placeholder where comision = 0).
 */
export const updatePrice = mutation({
  args: {
    id: v.id("sales"),
    precioAcordadoCOP: v.number(),
    totalCOP: v.optional(v.number()),
    descuentoCOP: v.optional(v.number()),
  },
  handler: async (ctx, { id, precioAcordadoCOP, totalCOP, descuentoCOP }) => {
    if (precioAcordadoCOP <= 0) {
      throw new Error("precioAcordadoCOP debe ser > 0");
    }
    const sale = await ctx.db.get(id);
    if (!sale) throw new Error(`Sale ${id} not found`);
    if (sale.estado === "cancelada") {
      throw new Error("No se puede editar una venta cancelada");
    }
    const nextTotal = totalCOP ?? precioAcordadoCOP;
    if (nextTotal <= 0) throw new Error("totalCOP debe ser > 0");

    await ctx.db.patch(id, {
      precioAcordadoCOP,
      totalCOP: nextTotal,
      ...(descuentoCOP !== undefined ? { descuentoCOP } : {}),
      syncStatus: "pending" as const,
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, api.sales._pushToSheet, {
      id,
      mode: "patch",
    });
    return { id, precioAcordadoCOP, totalCOP: nextTotal };
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
