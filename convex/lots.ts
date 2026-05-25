import {
  query,
  mutation,
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { pushTableRowToVercel } from "./_lib/sheetSync";
import { COLUMN_MAPS } from "./_lib/columnMaps";
import {
  allocateNext,
  formatLotId,
  lotSequenceName,
  parseLoteId,
  reclaimIfTail,
} from "./sequences";

// Free text (canonical: B | C | S | M). The capture UI sanitizes a custom
// write-in to an uppercase, dash-free token before it reaches here, so it stays
// valid as the loteId prefix (`formatLotId`) and its own `sequences` key.
const sedeValidator = v.string();

// Free text (canonical: contado | credito | esmereogenesis | bajo_pedido |
// consignacion) so the capture UI can submit an operator write-in. The
// conditional logic in `create` only special-cases the known "credito"/
// "contado" strings, so a custom value is stored verbatim and harmless.
const formaPagoValidator = v.string();

// Free text (canonical: efectivo | transferencia) for write-in parity.
const metodoContadoValidator = v.string();

const lotPatchValidator = v.object({
  fechaRecepcion: v.optional(v.string()),
  renombreLote: v.optional(v.string()),
  tratamiento: v.optional(v.string()),
  mina: v.optional(v.string()),
  operadorNombre: v.optional(v.string()),
  operadorRol: v.optional(v.string()),
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
        v.literal("cancelado"),
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
 * Read-only peek at the next lot ID for the chosen sede. Lets the form
 * preview "B-008" / "C-001" before submit. Does NOT consume the sequence.
 */
export const peekNextLoteId = query({
  args: { sede: sedeValidator },
  handler: async (ctx, { sede }) => {
    const seq = await ctx.db
      .query("sequences")
      .withIndex("by_name", (q) => q.eq("name", lotSequenceName(sede)))
      .first();
    const next = seq?.nextValue ?? 1;
    return { nextValue: next, preview: formatLotId(next, sede) };
  },
});

export const create = mutation({
  args: {
    sede: sedeValidator,
    providerId: v.id("providers"),
    fechaRecepcion: v.string(),
    renombreLote: v.optional(v.string()),
    tratamiento: v.optional(v.string()),
    mina: v.optional(v.string()),
    operadorNombre: v.optional(v.string()),
    operadorRol: v.optional(v.string()),
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

    const seqValue = await allocateNext(ctx, lotSequenceName(args.sede));
    const loteId = formatLotId(seqValue, args.sede);

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
 * Set the catalog-grouping fields (`fotoLoteUrl`, `mostrarComoLote`). These
 * are Convex-only display fields, so unlike `update` this:
 *   - works regardless of lot estado (grouping is decided at/after close), and
 *   - does NOT flip syncStatus or push to Sheets (the fields aren't synced).
 * Omitting a field leaves it unchanged; pass `fotoLoteUrl: ""` to clear it.
 */
export const setLoteDisplay = mutation({
  args: {
    id: v.id("lots"),
    fotoLoteUrl: v.optional(v.string()),
    mostrarComoLote: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, fotoLoteUrl, mostrarComoLote }) => {
    const lot = await ctx.db.get(id);
    if (!lot) throw new Error(`Lot ${id} not found`);
    if (lot.estado === "cancelado")
      throw new Error("No se puede configurar un lote cancelado");
    const patch: Record<string, unknown> = {};
    if (fotoLoteUrl !== undefined) patch.fotoLoteUrl = fotoLoteUrl;
    if (mostrarComoLote !== undefined) patch.mostrarComoLote = mostrarComoLote;
    if (Object.keys(patch).length === 0) return { id, changed: false };
    await ctx.db.patch(id, patch);
    return { id, changed: true };
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
 * Cancel an open lot: orphan every linked productInventory row (same
 * pattern as `lotItems.remove`), delete every `lotItems` join row, and
 * flip the lot estado to `cancelado`. We keep the lot row so historical
 * references survive (Sheets, audit trails), but it no longer appears in
 * the active queue.
 *
 * Only `abierto` lots can be cancelled — closed or published lots have
 * downstream effects (sales, catalog) that need their own undo flow.
 */
export const cancel = mutation({
  args: {
    id: v.id("lots"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { id, reason }) => {
    const lot = await ctx.db.get(id);
    if (!lot) throw new Error(`Lot ${id} not found`);
    if (lot.estado !== "abierto")
      throw new Error("Sólo se pueden cancelar lotes abiertos");

    const lotItemRows = await ctx.db
      .query("lotItems")
      .withIndex("by_loteId", (q) => q.eq("loteId", lot.loteId))
      .collect();

    // True abort: a lot with NOTHING captured yet, holding the tail of its
    // sede's sequence, is reclaimed in full. We roll the sequence back so the
    // next lot reuses this number (BR-1 "sin saltos") and DELETE the row so the
    // reused loteId stays globally unique — `getByLoteId` relies on `.first()`,
    // and a tombstone keeping the same id would shadow the new lot. Lots that
    // already have items, or sit mid-sequence (a newer number exists), keep the
    // cancelado tombstone below: their number can't be renumbered safely.
    if (lotItemRows.length === 0) {
      const { sede, value } = parseLoteId(lot.loteId);
      const reclaimed = await reclaimIfTail(ctx, lotSequenceName(sede), value);
      if (reclaimed) {
        await ctx.db.delete(id);
        // Best-effort: void the row we appended to Sheets at create time so the
        // push-only mirror keeps no stale "abierto" row and the reused number
        // doesn't surface as a duplicate. A failure here never blocks cancel.
        await ctx.scheduler.runAfter(0, internal.lots._voidSheetRow, {
          rowIndex: lot.rowIndex,
          loteId: lot.loteId,
        });
        return { id, loteId: lot.loteId, orphanedItems: 0, reclaimed: true };
      }
    }

    for (const li of lotItemRows) {
      const product = await ctx.db
        .query("productInventory")
        .withIndex("by_itemId", (q) => q.eq("itemId", li.itemId))
        .first();
      if (product) {
        await ctx.db.patch(product._id, {
          loteId: undefined,
          preponderancia: undefined,
          costoBaseCOP: undefined,
          mostrarEnCatalogo: false,
        });
      }
      await ctx.db.delete(li._id);
    }

    const trimmedReason = reason?.trim();
    const notasNext = trimmedReason
      ? `${lot.notas ? `${lot.notas} | ` : ""}Cancelado: ${trimmedReason}`
      : lot.notas;

    await ctx.db.patch(id, {
      estado: "cancelado" as const,
      notas: notasNext,
      syncStatus: "pending" as const,
      syncError: undefined,
    });

    await ctx.scheduler.runAfter(0, api.lots._pushToSheet, {
      id,
      mode: "patch",
    });

    return {
      id,
      loteId: lot.loteId,
      orphanedItems: lotItemRows.length,
      reclaimed: false,
    };
  },
});

/**
 * Best-effort cleanup of the Sheets mirror after `cancel` reclaims a lot
 * number (see `lots.cancel`). The lot's Convex row is already gone, so we
 * can't reuse `_pushToSheet`; instead we rename column A of the appended row
 * away from the reclaimed id (so the upcoming reuse of that number doesn't
 * read as two `C-001` rows) and flag it `cancelado`. The mirror is push-only
 * with no pull-back (see crons.ts), so a transient failure is harmless.
 */
export const _voidSheetRow = internalAction({
  args: { rowIndex: v.number(), loteId: v.string() },
  handler: async (_ctx, { rowIndex, loteId }) => {
    const voidId = `${loteId}·anulado`;
    await pushTableRowToVercel({
      table: "lots",
      rowIndex,
      mode: "patch",
      idValue: voidId,
      previousIdValue: loteId,
      fields: { loteId: voidId, estado: "cancelado" },
    });
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
