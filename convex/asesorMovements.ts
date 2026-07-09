/**
 * Kardex de movimientos con asesores.
 *
 * Registers the "entrega" (handoff) and "devolución" (return) of a
 * `productInventory` item to/from an asesor who is carrying it on
 * consignment. This is intentionally NOT the sale flow (`convex/sales.ts` /
 * VentaDetailPage's "Kardex" comprobante) — a handoff never moves the item
 * to `VENDIDA`, it only flips it between `DISPONIBLE` and `ASESOR`.
 *
 * Closes the gap found in the 2026-07-09 audit (see project memory
 * `tm-fotosintesis-asesor-consignment-gap`): `productInventory.estado` could
 * already be flipped to "ASESOR" from the edit drawer, but nothing recorded
 * WHO held the item or kept a history — `asesorActual`/`estadoAsesor` were
 * only ever settable by editing the Google Sheet directly. This module:
 *
 *   1. Lets the app set `asesorActual`/`estadoAsesor` (previously sheet-only
 *      fields) via a real mutation, auditing the change the same way
 *      `products._saveEdit` does (a `productEdits` row) and re-using the
 *      EXISTING `products.pushToSheet` action so the "Inventario" tab columns
 *      P/V/W stay in sync exactly as before.
 *   2. ALSO appends an immutable row to a brand-new `asesorMovements` table —
 *      the actual kardex — which mirrors to a new "Movimientos Asesor" tab on
 *      the Fotosíntesis SOT spreadsheet via the same generic
 *      `pushTableRowToVercel` transport every other Fotosíntesis v2 table
 *      (lots/sales/clients/providers/subLotes) already uses.
 *
 * Row-index allocation follows the same convention as `lots._create`
 * (maxRow + 1 over the Convex mirror) rather than the `sequences` table,
 * since this ledger has no human-facing natural-key format to preserve —
 * `movimientoId` is a synthetic, never-patched column A value.
 */

import { v } from 'convex/values';
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from './_generated/server';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { pushTableRowToVercel } from './_lib/sheetSync';
import { COLUMN_MAPS } from './_lib/columnMaps';
import { requireAccessLevel } from './_lib/authz';

const registerArgs = {
  itemId: v.string(),
  asesorNombre: v.string(),
  asesorId: v.optional(v.string()),
  cantidad: v.optional(v.number()),
  /** ISO date (yyyy-mm-dd); defaults to "today" (server clock) when omitted. */
  fecha: v.optional(v.string()),
  notas: v.optional(v.string()),
};

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

// =============================================================================
// QUERIES
// =============================================================================

/** Last N movements for one item — powers the drawer's "Historial" panel. */
export const listByItem = query({
  args: { itemId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { itemId, limit }) => {
    const rows = await ctx.db
      .query('asesorMovements')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .order('desc')
      .take(limit ?? 20);
    return rows;
  },
});

/** Full history for one asesor — that asesor's own kardex. */
export const listByAsesor = query({
  args: { asesorNombre: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { asesorNombre, limit }) => {
    const rows = await ctx.db
      .query('asesorMovements')
      .withIndex('by_asesorNombre', (q) => q.eq('asesorNombre', asesorNombre))
      .order('desc')
      .take(limit ?? 100);
    return rows;
  },
});

/** Most recent movements across every asesor — for a global ledger view. */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query('asesorMovements')
      .order('desc')
      .take(limit ?? 100);
  },
});

// =============================================================================
// MUTATIONS — internal (the real writes; reached only via the actions below)
// =============================================================================

export const _registerHandoff = internalMutation({
  args: {
    ...registerArgs,
    editorEmail: v.string(),
    editorName: v.optional(v.string()),
  },
  handler: async (
    ctx,
    {
      itemId,
      asesorNombre,
      asesorId,
      cantidad,
      fecha,
      notas,
      editorEmail,
      editorName,
    },
  ) => {
    const product = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!product) throw new Error(`Producto ${itemId} no está en el espejo`);
    if (product.estado !== 'DISPONIBLE') {
      throw new Error(
        `El ítem ${itemId} está "${product.estado}", no "DISPONIBLE". ` +
          `Sólo se puede entregar a un asesor un ítem disponible — si ya está ` +
          `con otro asesor, registrá primero su devolución.`,
      );
    }
    const trimmedAsesor = asesorNombre.trim();
    if (!trimmedAsesor) throw new Error('El nombre del asesor es obligatorio');

    const now = new Date().toISOString();
    const estadoAnterior = product.estado;

    // Same audit convention as products._saveEdit — one productEdits row per
    // field actually changing, then reuse the EXISTING push so the Inventario
    // tab (columns P/V/W) stays in sync exactly as a manual drawer edit would.
    const auditId = await ctx.db.insert('productEdits', {
      itemId,
      editorEmail,
      editorName,
      editedAt: now,
      changes: [
        { field: 'estado', before: estadoAnterior, after: 'ASESOR' },
        {
          field: 'asesorActual',
          before: product.asesorActual ?? null,
          after: trimmedAsesor,
        },
        {
          field: 'estadoAsesor',
          before: product.estadoAsesor ?? null,
          after: 'ASESOR',
        },
      ],
      status: 'pending' as const,
    });

    await ctx.db.patch(product._id, {
      estado: 'ASESOR' as const,
      asesorActual: trimmedAsesor,
      estadoAsesor: 'ASESOR',
      syncStatus: 'pending' as const,
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId,
      auditId,
    });

    // The actual kardex row — append-only, mirrors to "Movimientos Asesor".
    const all = await ctx.db.query('asesorMovements').collect();
    const maxRow = all.reduce((m, r) => Math.max(m, r.rowIndex), 1);
    const movimientoId = `MOV-${itemId}-${Date.now()}`;

    const movementId = await ctx.db.insert('asesorMovements', {
      itemId,
      itemNombre: product.nombre,
      tipo: 'entrega' as const,
      asesorNombre: trimmedAsesor,
      asesorId,
      cantidad,
      fecha: fecha ?? todayISODate(),
      notas,
      registradoPorEmail: editorEmail,
      registradoPorNombre: editorName,
      estadoAnterior,
      estadoNuevo: 'ASESOR',
      movimientoId,
      rowIndex: maxRow + 1,
      lastPulledAt: now,
      syncStatus: 'pending' as const,
    });
    await ctx.scheduler.runAfter(0, internal.asesorMovements._pushToSheet, {
      id: movementId,
      mode: 'append',
    });

    return { movementId, movimientoId };
  },
});

export const _registerReturn = internalMutation({
  args: {
    ...registerArgs,
    editorEmail: v.string(),
    editorName: v.optional(v.string()),
  },
  handler: async (
    ctx,
    {
      itemId,
      asesorNombre,
      asesorId,
      cantidad,
      fecha,
      notas,
      editorEmail,
      editorName,
    },
  ) => {
    const product = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!product) throw new Error(`Producto ${itemId} no está en el espejo`);
    if (product.estado !== 'ASESOR') {
      throw new Error(
        `El ítem ${itemId} está "${product.estado}", no "ASESOR" — no hay ` +
          `una consignación activa que devolver.`,
      );
    }

    const resolvedAsesor = asesorNombre.trim() || product.asesorActual || '';
    const now = new Date().toISOString();
    const estadoAnterior = product.estado;

    const auditId = await ctx.db.insert('productEdits', {
      itemId,
      editorEmail,
      editorName,
      editedAt: now,
      changes: [
        { field: 'estado', before: estadoAnterior, after: 'DISPONIBLE' },
        {
          field: 'asesorActual',
          before: product.asesorActual ?? null,
          after: null,
        },
        {
          field: 'estadoAsesor',
          before: product.estadoAsesor ?? null,
          after: null,
        },
      ],
      status: 'pending' as const,
    });

    await ctx.db.patch(product._id, {
      estado: 'DISPONIBLE' as const,
      asesorActual: undefined,
      estadoAsesor: undefined,
      syncStatus: 'pending' as const,
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId,
      auditId,
    });

    const all = await ctx.db.query('asesorMovements').collect();
    const maxRow = all.reduce((m, r) => Math.max(m, r.rowIndex), 1);
    const movimientoId = `MOV-${itemId}-${Date.now()}`;

    const movementId = await ctx.db.insert('asesorMovements', {
      itemId,
      itemNombre: product.nombre,
      tipo: 'devolucion' as const,
      asesorNombre: resolvedAsesor,
      asesorId,
      cantidad,
      fecha: fecha ?? todayISODate(),
      notas,
      registradoPorEmail: editorEmail,
      registradoPorNombre: editorName,
      estadoAnterior,
      estadoNuevo: 'DISPONIBLE',
      movimientoId,
      rowIndex: maxRow + 1,
      lastPulledAt: now,
      syncStatus: 'pending' as const,
    });
    await ctx.scheduler.runAfter(0, internal.asesorMovements._pushToSheet, {
      id: movementId,
      mode: 'append',
    });

    return { movementId, movimientoId };
  },
});

// =============================================================================
// ACTIONS — public entry points (verify the caller, then delegate)
// =============================================================================

export const registerHandoff = action({
  args: { idToken: v.string(), ...registerArgs },
  handler: async (
    ctx,
    { idToken, ...args },
  ): Promise<{ movementId: Id<'asesorMovements'>; movimientoId: string }> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.asesorMovements._registerHandoff, {
      ...args,
      editorEmail: caller.email,
      editorName: caller.name,
    });
  },
});

export const registerReturn = action({
  args: { idToken: v.string(), ...registerArgs },
  handler: async (
    ctx,
    { idToken, ...args },
  ): Promise<{ movementId: Id<'asesorMovements'>; movimientoId: string }> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.asesorMovements._registerReturn, {
      ...args,
      editorEmail: caller.email,
      editorName: caller.name,
    });
  },
});

// =============================================================================
// SHEETS PUSH — mirrors the lots.ts _pushToSheet pattern
// =============================================================================

export const _markPushed = internalMutation({
  args: { id: v.id('asesorMovements') },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      syncStatus: 'synced' as const,
      lastPushedAt: new Date().toISOString(),
      syncError: undefined,
    });
  },
});

export const _markPushFailed = internalMutation({
  args: { id: v.id('asesorMovements'), error: v.string() },
  handler: async (ctx, { id, error }) => {
    await ctx.db.patch(id, {
      syncStatus: 'error' as const,
      syncError: error.slice(0, 500),
    });
  },
});

export const _getInternal = internalQuery({
  args: { id: v.id('asesorMovements') },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

/**
 * Push one movement row to the "Movimientos Asesor" tab. Always `append` in
 * practice (rows are immutable once created) — `mode` kept as an explicit
 * arg for parity with the other Fotosíntesis v2 push actions and in case a
 * future correction flow ever needs to patch a row in place.
 */
export const _pushToSheet = internalAction({
  args: {
    id: v.id('asesorMovements'),
    mode: v.union(v.literal('patch'), v.literal('append')),
  },
  handler: async (
    ctx,
    { id, mode },
  ): Promise<{ ok: boolean; message: string }> => {
    const row = await ctx.runQuery(internal.asesorMovements._getInternal, {
      id,
    });
    if (!row) {
      const msg = `Movement ${id} not found`;
      await ctx.runMutation(internal.asesorMovements._markPushFailed, {
        id,
        error: msg,
      });
      return { ok: false, message: msg };
    }

    const fieldSource: Record<string, unknown> = {
      ...row,
      registradoPor: row.registradoPorEmail,
    };
    const fields: Record<string, string> = {};
    for (const col of COLUMN_MAPS.movimientosAsesor) {
      const val = fieldSource[col];
      fields[col] = val === null || val === undefined ? '' : String(val);
    }

    const result = await pushTableRowToVercel({
      table: 'movimientosAsesor',
      rowIndex: row.rowIndex,
      mode,
      idValue: row.movimientoId,
      fields,
    });
    if (result.ok) {
      await ctx.runMutation(internal.asesorMovements._markPushed, { id });
    } else {
      await ctx.runMutation(internal.asesorMovements._markPushFailed, {
        id,
        error: result.message,
      });
    }
    return result;
  },
});

/** Manual retry from the UI when a push failed (network blip, tab renamed). */
export const retryPush = action({
  args: { id: v.id('asesorMovements') },
  handler: async (ctx, { id }): Promise<{ ok: boolean; message: string }> => {
    const row = await ctx.runQuery(internal.asesorMovements._getInternal, {
      id,
    });
    if (!row) return { ok: false, message: 'Movement not found' };
    return await ctx.runAction(internal.asesorMovements._pushToSheet, {
      id,
      mode: 'append',
    });
  },
});
