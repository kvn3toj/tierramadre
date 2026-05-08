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

const tipoValidator = v.union(v.literal("embajador"), v.literal("final"));

const clientPatchValidator = v.object({
  nombre: v.optional(v.string()),
  nit: v.optional(v.string()),
  cedula: v.optional(v.string()),
  direccion: v.optional(v.string()),
  telefono: v.optional(v.string()),
  email: v.optional(v.string()),
  tipo: v.optional(tipoValidator),
  asesorId: v.optional(v.string()),
});

export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, { search }) => {
    const all = await ctx.db.query("clients").collect();
    const filtered = search
      ? all.filter((row) => {
          const s = search.toLowerCase();
          return (
            row.nombre.toLowerCase().includes(s) ||
            (row.nit ?? "").toLowerCase().includes(s) ||
            (row.cedula ?? "").toLowerCase().includes(s) ||
            (row.email ?? "").toLowerCase().includes(s)
          );
        })
      : all;
    return filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
  },
});

export const get = query({
  args: { id: v.id("clients") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const create = mutation({
  args: {
    nombre: v.string(),
    nit: v.optional(v.string()),
    cedula: v.optional(v.string()),
    direccion: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    tipo: tipoValidator,
    asesorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const all = await ctx.db.query("clients").collect();
    const maxRow = all.reduce((m, c) => Math.max(m, c.rowIndex), 1);
    const id = await ctx.db.insert("clients", {
      ...args,
      rowIndex: maxRow + 1,
      lastPulledAt: now,
      syncStatus: "pending" as const,
    });
    await ctx.scheduler.runAfter(0, api.clients._pushToSheet, {
      id,
      mode: "append",
    });
    return { id };
  },
});

export const update = mutation({
  args: { id: v.id("clients"), patch: clientPatchValidator },
  handler: async (ctx, { id, patch }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error(`Client ${id} not found`);
    await ctx.db.patch(id, {
      ...patch,
      syncStatus: "pending" as const,
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, api.clients._pushToSheet, {
      id,
      mode: "patch",
    });
    return { id };
  },
});

export const _getInternal = internalQuery({
  args: { id: v.id("clients") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const _markPushed = internalMutation({
  args: { id: v.id("clients") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      syncStatus: "synced" as const,
      lastPushedAt: new Date().toISOString(),
      syncError: undefined,
    });
  },
});

export const _markPushFailed = internalMutation({
  args: { id: v.id("clients"), error: v.string() },
  handler: async (ctx, { id, error }) => {
    await ctx.db.patch(id, {
      syncStatus: "error" as const,
      syncError: error.slice(0, 500),
    });
  },
});

export const _pushToSheet = action({
  args: {
    id: v.id("clients"),
    mode: v.union(v.literal("patch"), v.literal("append")),
  },
  handler: async (
    ctx,
    { id, mode },
  ): Promise<{ ok: boolean; message: string }> => {
    const row = await ctx.runQuery(internal.clients._getInternal, { id });
    if (!row) {
      const msg = `Client ${id} not found`;
      await ctx.runMutation(internal.clients._markPushFailed, {
        id,
        error: msg,
      });
      return { ok: false, message: msg };
    }
    const result = await pushTableRowToVercel({
      table: "clients",
      rowIndex: row.rowIndex,
      mode,
      idValue: row.nombre,
      fields: marshalRow("clients", row),
    });
    if (result.ok) {
      await ctx.runMutation(internal.clients._markPushed, { id });
    } else {
      await ctx.runMutation(internal.clients._markPushFailed, {
        id,
        error: result.message,
      });
    }
    return result;
  },
});

export const retryPush = action({
  args: { id: v.id("clients") },
  handler: async (ctx, { id }): Promise<{ ok: boolean; message: string }> => {
    const row = await ctx.runQuery(internal.clients._getInternal, { id });
    if (!row) return { ok: false, message: "Client not found" };
    return await ctx.runAction(api.clients._pushToSheet, {
      id,
      mode: "patch",
    });
  },
});
