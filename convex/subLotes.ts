import {
  query,
  mutation,
  action,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { pushTableRowToVercel } from "./_lib/sheetSync";
import { COLUMN_MAPS } from "./_lib/columnMaps";
import {
  allocateNext,
  formatSubLoteId,
  subLoteSequenceName,
  parseLoteId,
} from "./sequences";

const estadoValidator = v.union(v.literal("activa"), v.literal("archivada"));

/**
 * Parent-gating rule (BR-S4): sub-lotes group FINALIZED items, so the parent
 * lote must be `cerrado` or `publicado`. An `abierto` lote can still gain/lose
 * items (preponderancia not yet locked) and a `cancelado` lote has orphaned its
 * items — neither is a stable base for a sale-bundle.
 */
function assertParentGate(estado: string): void {
  if (estado === "cancelado")
    throw new Error("No se pueden agrupar sub-lotes de un lote cancelado");
  if (estado === "abierto")
    throw new Error(
      "Cierra o publica el lote antes de agrupar sub-lotes " +
        "(debe estar cerrado o publicado)",
    );
}

/**
 * Recompute the derived membership figures from a raw itemId list:
 *   - de-duplicate (BR-S5),
 *   - sum member `costoBaseCOP` → `totalCostoCOP` (BR-S3, never client-set),
 *   - count → `unidades`.
 *
 * With `validate: true` (create / addItems) every id must resolve to a
 * productInventory row whose `loteId === parentLoteId` (BR-S1: same-parent
 * only). With `validate: false` (removeItems) missing/stale ids are skipped so
 * a member can always be pulled out even if its parent link changed.
 */
async function computeDerived(
  ctx: MutationCtx,
  parentLoteId: string,
  rawItemIds: string[],
  opts: { validate: boolean },
): Promise<{ itemIds: string[]; unidades: number; totalCostoCOP: number }> {
  const seen = new Set<string>();
  const itemIds: string[] = [];
  for (const id of rawItemIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    itemIds.push(id);
  }

  let total = 0;
  for (const itemId of itemIds) {
    const product = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .first();
    if (!product) {
      if (opts.validate) throw new Error(`Ítem ${itemId} no existe`);
      continue;
    }
    if (product.loteId !== parentLoteId) {
      if (opts.validate)
        throw new Error(
          `Ítem ${itemId} no pertenece al lote ${parentLoteId} (BR-S1)`,
        );
      continue;
    }
    total += product.costoBaseCOP ?? 0;
  }

  return {
    itemIds,
    unidades: itemIds.length,
    totalCostoCOP: Math.round(total),
  };
}

async function requireSubLote(ctx: MutationCtx, subLoteId: string) {
  const sub = await ctx.db
    .query("subLotes")
    .withIndex("by_subLoteId", (q) => q.eq("subLoteId", subLoteId))
    .first();
  if (!sub) throw new Error(`Sub-lote ${subLoteId} no encontrado`);
  return sub;
}

// ─── Queries ─────────────────────────────────────────────────────

/** Every sub-lote of a parent lote, newest first. UI filters archived. */
export const listByParent = query({
  args: { parentLoteId: v.string() },
  handler: async (ctx, { parentLoteId }) => {
    const rows = await ctx.db
      .query("subLotes")
      .withIndex("by_parentLote", (q) => q.eq("parentLoteId", parentLoteId))
      .collect();
    return rows.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const get = query({
  args: { subLoteId: v.string() },
  handler: async (ctx, { subLoteId }) =>
    ctx.db
      .query("subLotes")
      .withIndex("by_subLoteId", (q) => q.eq("subLoteId", subLoteId))
      .first(),
});

/** Count of active sub-lotes per parent — for the HomePage badge. */
export const countByParent = query({
  args: { parentLoteId: v.string() },
  handler: async (ctx, { parentLoteId }) => {
    const rows = await ctx.db
      .query("subLotes")
      .withIndex("by_parentLote", (q) => q.eq("parentLoteId", parentLoteId))
      .collect();
    return rows.filter((r) => r.estado === "activa").length;
  },
});

// ─── Mutations ───────────────────────────────────────────────────

export const create = mutation({
  args: {
    parentLoteId: v.string(),
    nombre: v.string(),
    notas: v.optional(v.string()),
    itemIds: v.optional(v.array(v.string())),
    clientToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Idempotency guard (money-critical): replay of the same clientToken returns
    // the prior result instead of allocating a second sub-lote sequence +
    // inserting a duplicate row. The created sub-lote row is existence-checked —
    // if it was since deleted, the stale token is dropped and the create runs
    // again (C7).
    if (args.clientToken) {
      const prior = await ctx.db
        .query("commitTokens")
        .withIndex("by_token", (q) => q.eq("token", args.clientToken!))
        .unique();
      if (prior) {
        const stillThere = await ctx.db.get(prior.primaryId as Id<"subLotes">);
        if (stillThere) {
          return JSON.parse(prior.result) as {
            id: Id<"subLotes">;
            subLoteId: string;
          };
        }
        await ctx.db.delete(prior._id);
      }
    }

    const nombre = args.nombre.trim();
    if (!nombre) throw new Error("El sub-lote necesita un nombre");

    const lot = await ctx.db
      .query("lots")
      .withIndex("by_loteId", (q) => q.eq("loteId", args.parentLoteId))
      .first();
    if (!lot) throw new Error(`Lote ${args.parentLoteId} no encontrado`);
    assertParentGate(lot.estado);

    const derived = await computeDerived(
      ctx,
      args.parentLoteId,
      args.itemIds ?? [],
      { validate: true },
    );

    const seqValue = await allocateNext(
      ctx,
      subLoteSequenceName(args.parentLoteId),
    );
    const subLoteId = formatSubLoteId(args.parentLoteId, seqValue);

    const now = new Date().toISOString();
    const all = await ctx.db.query("subLotes").collect();
    const maxRow = all.reduce((m, s) => Math.max(m, s.rowIndex), 1);

    const id = await ctx.db.insert("subLotes", {
      subLoteId,
      parentLoteId: args.parentLoteId,
      sede: lot.sede ?? parseLoteId(args.parentLoteId).sede,
      nombre,
      itemIds: derived.itemIds,
      unidades: derived.unidades,
      totalCostoCOP: derived.totalCostoCOP,
      notas: args.notas?.trim() || undefined,
      estado: "activa" as const,
      createdAt: now,
      rowIndex: maxRow + 1,
      lastPulledAt: now,
      syncStatus: "pending" as const,
    });

    await ctx.scheduler.runAfter(0, api.subLotes._pushToSheet, {
      id,
      mode: "append",
    });

    const result = { id, subLoteId };
    if (args.clientToken) {
      await ctx.db.insert("commitTokens", {
        token: args.clientToken,
        kind: "sublote.create",
        primaryId: id,
        result: JSON.stringify(result),
        createdAt: new Date().toISOString(),
      });
    }
    return result;
  },
});

export const addItems = mutation({
  args: { subLoteId: v.string(), itemIds: v.array(v.string()) },
  handler: async (ctx, { subLoteId, itemIds }) => {
    const sub = await requireSubLote(ctx, subLoteId);
    const lot = await ctx.db
      .query("lots")
      .withIndex("by_loteId", (q) => q.eq("loteId", sub.parentLoteId))
      .first();
    if (lot) assertParentGate(lot.estado);

    const derived = await computeDerived(
      ctx,
      sub.parentLoteId,
      [...sub.itemIds, ...itemIds],
      { validate: true },
    );
    await ctx.db.patch(sub._id, {
      itemIds: derived.itemIds,
      unidades: derived.unidades,
      totalCostoCOP: derived.totalCostoCOP,
      syncStatus: "pending" as const,
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, api.subLotes._pushToSheet, {
      id: sub._id,
      mode: "patch",
    });
    return { subLoteId, unidades: derived.unidades };
  },
});

export const removeItems = mutation({
  args: { subLoteId: v.string(), itemIds: v.array(v.string()) },
  handler: async (ctx, { subLoteId, itemIds }) => {
    const sub = await requireSubLote(ctx, subLoteId);
    const toRemove = new Set(itemIds);
    const remaining = sub.itemIds.filter((id) => !toRemove.has(id));
    const derived = await computeDerived(ctx, sub.parentLoteId, remaining, {
      validate: false,
    });
    await ctx.db.patch(sub._id, {
      itemIds: derived.itemIds,
      unidades: derived.unidades,
      totalCostoCOP: derived.totalCostoCOP,
      syncStatus: "pending" as const,
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, api.subLotes._pushToSheet, {
      id: sub._id,
      mode: "patch",
    });
    return { subLoteId, unidades: derived.unidades };
  },
});

export const updateMeta = mutation({
  args: {
    subLoteId: v.string(),
    nombre: v.optional(v.string()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, { subLoteId, nombre, notas }) => {
    const sub = await requireSubLote(ctx, subLoteId);
    let nombreNext: string | undefined;
    if (nombre !== undefined) {
      nombreNext = nombre.trim();
      if (!nombreNext) throw new Error("El nombre no puede quedar vacío");
    }
    await ctx.db.patch(sub._id, {
      ...(nombreNext !== undefined ? { nombre: nombreNext } : {}),
      ...(notas !== undefined ? { notas: notas.trim() || undefined } : {}),
      syncStatus: "pending" as const,
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, api.subLotes._pushToSheet, {
      id: sub._id,
      mode: "patch",
    });
    return { subLoteId };
  },
});

/** Archive or reactivate. Membership/cost untouched. */
export const setEstado = mutation({
  args: { subLoteId: v.string(), estado: estadoValidator },
  handler: async (ctx, { subLoteId, estado }) => {
    const sub = await requireSubLote(ctx, subLoteId);
    await ctx.db.patch(sub._id, {
      estado,
      syncStatus: "pending" as const,
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, api.subLotes._pushToSheet, {
      id: sub._id,
      mode: "patch",
    });
    return { subLoteId, estado };
  },
});

/**
 * Set the catalog-grouping fields (`fotoUrl`, `mostrarComoLote`). These are
 * Convex-only display fields (NOT in COLUMN_MAPS.subLotes), so this does NOT
 * flip syncStatus or push to Sheets. When `mostrarComoLote` is true and the
 * sublote is `activa`, the customer catalog shows it as one grouped card.
 * Omitting a field leaves it unchanged; pass `fotoUrl: ""` to clear it.
 */
export const setDisplay = mutation({
  args: {
    subLoteId: v.string(),
    fotoUrl: v.optional(v.string()),
    mostrarComoLote: v.optional(v.boolean()),
  },
  handler: async (ctx, { subLoteId, fotoUrl, mostrarComoLote }) => {
    const sub = await requireSubLote(ctx, subLoteId);
    const patch: Record<string, unknown> = {};
    if (fotoUrl !== undefined) patch.fotoUrl = fotoUrl;
    if (mostrarComoLote !== undefined) patch.mostrarComoLote = mostrarComoLote;
    if (Object.keys(patch).length === 0) return { subLoteId, changed: false };
    await ctx.db.patch(sub._id, patch);
    return { subLoteId, changed: true };
  },
});

// ─── Sheets sync (push-only, mirrors lots/sales) ─────────────────

export const _getInternal = internalQuery({
  args: { id: v.id("subLotes") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const _markPushed = internalMutation({
  args: { id: v.id("subLotes") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      syncStatus: "synced" as const,
      lastPushedAt: new Date().toISOString(),
      syncError: undefined,
    });
  },
});

export const _markPushFailed = internalMutation({
  args: { id: v.id("subLotes"), error: v.string() },
  handler: async (ctx, { id, error }) => {
    await ctx.db.patch(id, {
      syncStatus: "error" as const,
      syncError: error.slice(0, 500),
    });
  },
});

export const _pushToSheet = action({
  args: {
    id: v.id("subLotes"),
    mode: v.union(v.literal("patch"), v.literal("append")),
  },
  handler: async (
    ctx,
    { id, mode },
  ): Promise<{ ok: boolean; message: string }> => {
    const sub = await ctx.runQuery(internal.subLotes._getInternal, { id });
    if (!sub) {
      const msg = `Sub-lote ${id} not found`;
      await ctx.runMutation(internal.subLotes._markPushFailed, {
        id,
        error: msg,
      });
      return { ok: false, message: msg };
    }

    const fieldSource: Record<string, unknown> = {
      ...sub,
      itemIdsJoined: sub.itemIds.join(", "),
    };
    const fields: Record<string, string> = {};
    for (const col of COLUMN_MAPS.subLotes) {
      const val = fieldSource[col];
      fields[col] = val === null || val === undefined ? "" : String(val);
    }

    const result = await pushTableRowToVercel({
      table: "subLotes",
      rowIndex: sub.rowIndex,
      mode,
      idValue: sub.subLoteId,
      fields,
    });
    if (result.ok) {
      await ctx.runMutation(internal.subLotes._markPushed, { id });
    } else {
      await ctx.runMutation(internal.subLotes._markPushFailed, {
        id,
        error: result.message,
      });
    }
    return result;
  },
});

export const retryPush = action({
  args: { id: v.id("subLotes") },
  handler: async (ctx, { id }): Promise<{ ok: boolean; message: string }> => {
    const row = await ctx.runQuery(internal.subLotes._getInternal, { id });
    if (!row) return { ok: false, message: "Sub-lote not found" };
    return await ctx.runAction(api.subLotes._pushToSheet, {
      id,
      mode: "patch",
    });
  },
});
