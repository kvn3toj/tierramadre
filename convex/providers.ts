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
import { marshalRow } from "./_lib/columnMaps";

const tipoValidator = v.union(
  v.literal("gemas"),
  v.literal("joyas"),
  v.literal("insumos"),
  v.literal("otros"),
);

const providerPatchValidator = v.object({
  nombreORazonSocial: v.optional(v.string()),
  nit: v.optional(v.string()),
  cedula: v.optional(v.string()),
  direccion: v.optional(v.string()),
  telefono: v.optional(v.string()),
  email: v.optional(v.string()),
  tipo: v.optional(tipoValidator),
  notas: v.optional(v.string()),
});

export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, { search }) => {
    const all = await ctx.db.query("providers").collect();
    const filtered = search
      ? all.filter((row) => {
          const s = search.toLowerCase();
          return (
            row.nombreORazonSocial.toLowerCase().includes(s) ||
            (row.nit ?? "").toLowerCase().includes(s) ||
            (row.cedula ?? "").toLowerCase().includes(s) ||
            (row.email ?? "").toLowerCase().includes(s)
          );
        })
      : all;
    return filtered.sort((a, b) =>
      a.nombreORazonSocial.localeCompare(b.nombreORazonSocial),
    );
  },
});

export const get = query({
  args: { id: v.id("providers") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const create = mutation({
  args: {
    nombreORazonSocial: v.string(),
    nit: v.optional(v.string()),
    cedula: v.optional(v.string()),
    direccion: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    tipo: tipoValidator,
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const all = await ctx.db.query("providers").collect();
    const maxRow = all.reduce((m, p) => Math.max(m, p.rowIndex), 1);
    const id = await ctx.db.insert("providers", {
      ...args,
      rowIndex: maxRow + 1,
      lastPulledAt: now,
      syncStatus: "pending" as const,
    });
    await ctx.scheduler.runAfter(0, api.providers._pushToSheet, {
      id,
      mode: "append",
    });
    return { id };
  },
});

export const update = mutation({
  args: {
    id: v.id("providers"),
    patch: providerPatchValidator,
  },
  handler: async (ctx, { id, patch }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error(`Provider ${id} not found`);
    await ctx.db.patch(id, {
      ...patch,
      syncStatus: "pending" as const,
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, api.providers._pushToSheet, {
      id,
      mode: "patch",
    });
    return { id };
  },
});

export const _getInternal = internalQuery({
  args: { id: v.id("providers") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const _markPushed = internalMutation({
  args: { id: v.id("providers") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      syncStatus: "synced" as const,
      lastPushedAt: new Date().toISOString(),
      syncError: undefined,
    });
  },
});

export const _markPushFailed = internalMutation({
  args: { id: v.id("providers"), error: v.string() },
  handler: async (ctx, { id, error }) => {
    await ctx.db.patch(id, {
      syncStatus: "error" as const,
      syncError: error.slice(0, 500),
    });
  },
});

export const _pushToSheet = action({
  args: {
    id: v.id("providers"),
    mode: v.union(v.literal("patch"), v.literal("append")),
  },
  handler: async (
    ctx,
    { id, mode },
  ): Promise<{ ok: boolean; message: string }> => {
    const row = await ctx.runQuery(internal.providers._getInternal, { id });
    if (!row) {
      const msg = `Provider ${id} not found`;
      await ctx.runMutation(internal.providers._markPushFailed, {
        id,
        error: msg,
      });
      return { ok: false, message: msg };
    }
    const result = await pushTableRowToVercel({
      table: "providers",
      rowIndex: row.rowIndex,
      mode,
      idValue: row.nombreORazonSocial,
      fields: marshalRow("providers", row),
    });
    if (result.ok) {
      await ctx.runMutation(internal.providers._markPushed, { id });
    } else {
      await ctx.runMutation(internal.providers._markPushFailed, {
        id,
        error: result.message,
      });
    }
    return result;
  },
});

export const retryPush = action({
  args: { id: v.id("providers") },
  handler: async (ctx, { id }): Promise<{ ok: boolean; message: string }> => {
    const row = await ctx.runQuery(internal.providers._getInternal, { id });
    if (!row) return { ok: false, message: "Provider not found" };
    return await ctx.runAction(api.providers._pushToSheet, {
      id,
      mode: "patch",
    });
  },
});
