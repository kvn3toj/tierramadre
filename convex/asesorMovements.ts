/**
 * Kardex de movimientos con asesores.
 *
 * Registers the "entrega" (handoff) and "devolución" (return) of a
 * `productInventory` item to/from an asesor or external comercializador
 * carrying it on consignment. This is intentionally NOT the sale flow
 * (`convex/sales.ts` / VentaDetailPage's "Kardex" comprobante) — a handoff
 * never moves the item to `VENDIDA`, it only flips it between `DISPONIBLE`
 * and `ASESOR`/`CONSIGNACION` (2026-07-09: split so an internal asesor and
 * an external dealer with no system account are distinguishable in the
 * catalog — see the `destino` arg below). An item held by either can be
 * sold directly — `sales.create`'s BR-6 already accepts both — so
 * "graduating" a consignment to a real sale needs no new backend entrypoint,
 * just a VentaPage prefill (see AsesorMovementPanel's "Vender esta pieza").
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
import { isStaffSession } from './_lib/requireStaffSession';

const registerArgs = {
  itemId: v.string(),
  /** Recipient name — an internal asesor OR an external comercializador
   *  (e.g. a consignment dealer with no system account). Free text by
   *  design: this ledger doesn't require the recipient to exist in any
   *  directory. */
  asesorNombre: v.string(),
  /** id from the asesores directory (get-asesores), when the recipient
   *  resolves to one. Left empty for external recipients. */
  asesorId: v.optional(v.string()),
  /**
   * Which `productInventory.estado` a handoff should land on: "asesor" →
   * "ASESOR" (internal asesor), "consignacion" → "CONSIGNACION" (external
   * comercializador with no system account). Optional — when the caller
   * doesn't know/care, `_registerHandoff` infers it from `asesorId`:
   * present (the UI resolved the typed name against the asesores
   * directory) ⇒ "asesor"; absent (free-text name, no directory match) ⇒
   * "consignacion". This heuristic CAN be wrong (a typo'd asesor name, or
   * an asesor missing from the directory) — the UI should let the operator
   * override it explicitly rather than relying on inference alone.
   * `_registerReturn` ignores this arg entirely: a return always restores
   * "DISPONIBLE" regardless of which of the two the item came from.
   */
  destino: v.optional(v.union(v.literal('asesor'), v.literal('consignacion'))),
  cantidad: v.optional(v.number()),
  /** Item price at movement time (COP) — feeds the comprobante total. */
  precio: v.optional(v.number()),
  /** ISO date (yyyy-mm-dd); defaults to "today" (server clock) when omitted. */
  fecha: v.optional(v.string()),
  notas: v.optional(v.string()),
  /** Shared condition text for a multi-item event, e.g. "Devolución
   *  obligatoria si no se vende". */
  condicion: v.optional(v.string()),
  /** Person who physically handed over / received the item(s), if
   *  different from whoever operates the digital form. */
  entregadoPorNombre: v.optional(v.string()),
};

/** One kardex event groups every item movement created from a single
 *  multi-item form submission — mirrors a hoja manuscrita with one
 *  signature covering several items. */
function newKardexEventId(): string {
  return `KDX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

// =============================================================================
// QUERIES
// =============================================================================

/** Last N movements for one item — powers the drawer's "Historial" panel. */
export const listByItem = query({
  args: {
    itemId: v.string(),
    limit: v.optional(v.number()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, limit, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return [];
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
  args: {
    asesorNombre: v.string(),
    limit: v.optional(v.number()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { asesorNombre, limit, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return [];
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
  args: {
    limit: v.optional(v.number()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { limit, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return [];
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
    kardexEventId: v.optional(v.string()),
    editorEmail: v.string(),
    editorName: v.optional(v.string()),
  },
  handler: async (
    ctx,
    {
      itemId,
      asesorNombre,
      asesorId,
      destino,
      cantidad,
      precio,
      fecha,
      notas,
      condicion,
      entregadoPorNombre,
      kardexEventId,
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

    // Destino heuristic (see registerArgs.destino doc): an explicit caller
    // choice always wins; absent that, a resolved asesorId means the UI
    // matched the typed name against the asesores directory (⇒ internal
    // asesor), and no match means an external comercializador (⇒
    // consignación).
    const resolvedDestino: 'asesor' | 'consignacion' =
      destino ?? (asesorId ? 'asesor' : 'consignacion');
    const targetEstado: 'ASESOR' | 'CONSIGNACION' =
      resolvedDestino === 'consignacion' ? 'CONSIGNACION' : 'ASESOR';

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
        { field: 'estado', before: estadoAnterior, after: targetEstado },
        {
          field: 'asesorActual',
          before: product.asesorActual ?? null,
          after: trimmedAsesor,
        },
        {
          field: 'estadoAsesor',
          before: product.estadoAsesor ?? null,
          after: targetEstado,
        },
      ],
      status: 'pending' as const,
    });

    await ctx.db.patch(product._id, {
      estado: targetEstado,
      asesorActual: trimmedAsesor,
      estadoAsesor: targetEstado,
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
      precio,
      fecha: fecha ?? todayISODate(),
      notas,
      condicion,
      entregadoPorNombre,
      kardexEventId,
      registradoPorEmail: editorEmail,
      registradoPorNombre: editorName,
      estadoAnterior,
      estadoNuevo: targetEstado,
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
    kardexEventId: v.optional(v.string()),
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
      precio,
      fecha,
      notas,
      condicion,
      entregadoPorNombre,
      kardexEventId,
      editorEmail,
      editorName,
    },
  ) => {
    const product = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!product) throw new Error(`Producto ${itemId} no está en el espejo`);
    if (product.estado !== 'ASESOR' && product.estado !== 'CONSIGNACION') {
      throw new Error(
        `El ítem ${itemId} está "${product.estado}", no "ASESOR" ni ` +
          `"CONSIGNACION" — no hay una consignación activa que devolver.`,
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
      precio,
      fecha: fecha ?? todayISODate(),
      notas,
      condicion,
      entregadoPorNombre,
      kardexEventId,
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

/**
 * BACKFILL (one-off) — reconstruct historical kardex movement records lost in
 * the 2026-07-22 SOT v3 cutover (the asesorMovements rows did not migrate to the
 * new Convex deployment, so the ledger came up empty even though the items were
 * already in their post-movement estado).
 *
 * UNLIKE _registerHandoff/_registerReturn this does NOT enforce the forward-only
 * estado guard and does NOT patch productInventory.estado — the estado is
 * already correct (pulled from the sheet); we only re-create the audit rows so
 * the ledger + comprobante lookup work again. `estadoAnterior/estadoNuevo` are
 * passed in from the historical record (the signed hoja). Idempotent by
 * `movimientoId`: re-running skips rows already present. Not pushed to Sheets
 * (syncStatus 'synced') — these are historical, the paper/PDF is the origin.
 */
export const _backfillMovements = internalMutation({
  args: {
    editorEmail: v.string(),
    movements: v.array(
      v.object({
        itemId: v.string(),
        tipo: v.union(v.literal('entrega'), v.literal('devolucion')),
        asesorNombre: v.string(),
        asesorId: v.optional(v.string()),
        cantidad: v.optional(v.number()),
        precio: v.optional(v.number()),
        fecha: v.string(),
        notas: v.optional(v.string()),
        condicion: v.optional(v.string()),
        kardexEventId: v.optional(v.string()),
        entregadoPorNombre: v.optional(v.string()),
        estadoAnterior: v.string(),
        estadoNuevo: v.string(),
        comprobanteUrl: v.optional(v.string()),
        movimientoId: v.string(),
      }),
    ),
  },
  handler: async (ctx, { editorEmail, movements }) => {
    const all = await ctx.db.query('asesorMovements').collect();
    const seen = new Set(all.map((r) => r.movimientoId));
    let maxRow = all.reduce((m, r) => Math.max(m, r.rowIndex), 1);
    const now = new Date().toISOString();
    const out: Array<{
      itemId: string;
      movimientoId: string;
      skipped: boolean;
    }> = [];
    for (const m of movements) {
      if (seen.has(m.movimientoId)) {
        out.push({
          itemId: m.itemId,
          movimientoId: m.movimientoId,
          skipped: true,
        });
        continue;
      }
      const product = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', m.itemId))
        .first();
      maxRow += 1;
      await ctx.db.insert('asesorMovements', {
        itemId: m.itemId,
        itemNombre: product?.nombre,
        tipo: m.tipo,
        asesorNombre: m.asesorNombre,
        asesorId: m.asesorId,
        cantidad: m.cantidad,
        precio: m.precio,
        fecha: m.fecha,
        notas: m.notas,
        condicion: m.condicion,
        kardexEventId: m.kardexEventId,
        entregadoPorNombre: m.entregadoPorNombre,
        registradoPorEmail: editorEmail,
        registradoPorNombre: 'backfill-kardex',
        estadoAnterior: m.estadoAnterior,
        estadoNuevo: m.estadoNuevo,
        movimientoId: m.movimientoId,
        comprobanteUrl: m.comprobanteUrl,
        rowIndex: maxRow,
        lastPulledAt: now,
        syncStatus: 'synced' as const,
      });
      seen.add(m.movimientoId);
      out.push({
        itemId: m.itemId,
        movimientoId: m.movimientoId,
        skipped: false,
      });
    }
    return {
      inserted: out.filter((o) => !o.skipped).length,
      skipped: out.filter((o) => o.skipped).length,
      out,
    };
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

/** One item within a multi-item entrega/devolución — the shared recipient,
 *  date, condición and entregadoPor live on the batch call, not per item. */
const batchItemArgs = v.object({
  itemId: v.string(),
  cantidad: v.optional(v.number()),
  precio: v.optional(v.number()),
  notas: v.optional(v.string()),
});

const batchSharedArgs = {
  idToken: v.string(),
  asesorNombre: v.string(),
  asesorId: v.optional(v.string()),
  /** See registerArgs.destino — shared across every item in the event, same
   *  as asesorNombre/asesorId. Ignored by registerReturnBatch. */
  destino: v.optional(v.union(v.literal('asesor'), v.literal('consignacion'))),
  fecha: v.optional(v.string()),
  condicion: v.optional(v.string()),
  entregadoPorNombre: v.optional(v.string()),
  items: v.array(batchItemArgs),
};

type BatchResult = {
  kardexEventId: string;
  ok: Array<{
    itemId: string;
    movementId: Id<'asesorMovements'>;
    movimientoId: string;
  }>;
  failed: Array<{ itemId: string; error: string }>;
};

/**
 * Register one multi-item entrega (one form, one recipient, one printed
 * comprobante, N items) as N linked `asesorMovements` rows sharing a
 * `kardexEventId`. Items are processed sequentially (not parallel) so each
 * mutation's `maxRow` scan sees the previous insert — matches the existing
 * single-item row-index convention. A per-item failure (e.g. an item that's
 * already with another asesor) does NOT abort the batch — it's collected in
 * `failed` so the operator can see exactly which items went through.
 */
export const registerHandoffBatch = action({
  args: batchSharedArgs,
  handler: async (ctx, { idToken, items, ...shared }): Promise<BatchResult> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    const kardexEventId = newKardexEventId();
    const ok: BatchResult['ok'] = [];
    const failed: BatchResult['failed'] = [];
    for (const item of items) {
      try {
        const result = await ctx.runMutation(
          internal.asesorMovements._registerHandoff,
          {
            ...shared,
            ...item,
            kardexEventId,
            editorEmail: caller.email,
            editorName: caller.name,
          },
        );
        ok.push({ itemId: item.itemId, ...result });
      } catch (e) {
        failed.push({
          itemId: item.itemId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return { kardexEventId, ok, failed };
  },
});

/** Return counterpart of {@link registerHandoffBatch} — same semantics. */
export const registerReturnBatch = action({
  args: batchSharedArgs,
  handler: async (ctx, { idToken, items, ...shared }): Promise<BatchResult> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    const kardexEventId = newKardexEventId();
    const ok: BatchResult['ok'] = [];
    const failed: BatchResult['failed'] = [];
    for (const item of items) {
      try {
        const result = await ctx.runMutation(
          internal.asesorMovements._registerReturn,
          {
            ...shared,
            ...item,
            kardexEventId,
            editorEmail: caller.email,
            editorName: caller.name,
          },
        );
        ok.push({ itemId: item.itemId, ...result });
      } catch (e) {
        failed.push({
          itemId: item.itemId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return { kardexEventId, ok, failed };
  },
});

/** All movements from one multi-item event — powers the PDF comprobante. */
export const listByKardexEventId = query({
  args: {
    kardexEventId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { kardexEventId, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return [];
    return await ctx.db
      .query('asesorMovements')
      .withIndex('by_kardexEventId', (q) =>
        q.eq('kardexEventId', kardexEventId),
      )
      .collect();
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

/** Stamp the comprobante URL onto every row of one kardex event. Idempotent —
 *  regenerating the PDF overwrites with the newer Drive URL. */
export const _setComprobanteUrl = internalMutation({
  args: { kardexEventId: v.string(), comprobanteUrl: v.string() },
  handler: async (ctx, { kardexEventId, comprobanteUrl }) => {
    const rows = await ctx.db
      .query('asesorMovements')
      .withIndex('by_kardexEventId', (q) =>
        q.eq('kardexEventId', kardexEventId),
      )
      .collect();
    if (rows.length === 0) {
      throw new Error(`No hay movimientos para el evento ${kardexEventId}`);
    }
    for (const row of rows) {
      await ctx.db.patch(row._id, { comprobanteUrl });
    }
    return { patched: rows.length };
  },
});

export const setComprobanteUrl = action({
  args: {
    idToken: v.string(),
    kardexEventId: v.string(),
    comprobanteUrl: v.string(),
  },
  handler: async (
    ctx,
    { idToken, kardexEventId, comprobanteUrl },
  ): Promise<{ patched: number }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.asesorMovements._setComprobanteUrl, {
      kardexEventId,
      comprobanteUrl,
    });
  },
});

/** Comprobante + event summary for one kardex event.
 *
 * GATED (2026-08-05, F7): was "plain read, no auth gate — mirrors
 * `lots:list` / `lotItems:search`, the queries the anima-bot already calls
 * unauthenticated" — that was the vulnerability, not a design to preserve.
 * Now requires a verified staff session (see `_lib/requireStaffSession.ts`);
 * anima-bot's unauthenticated calls to this (see
 * anima-bot/src/fotosintesis/client.ts) now get `null` back until it has a
 * way to prove staff (out of scope here — flagged, not fixed).
 *
 * Returns null when the event doesn't exist OR the caller isn't staff;
 * `comprobanteUrl` is undefined when the PDF was never generated. */
export const getComprobante = query({
  args: { kardexEventId: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, { kardexEventId, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return null;
    const rows = await ctx.db
      .query('asesorMovements')
      .withIndex('by_kardexEventId', (q) =>
        q.eq('kardexEventId', kardexEventId),
      )
      .collect();
    if (rows.length === 0) return null;
    return {
      kardexEventId,
      comprobanteUrl: rows[0].comprobanteUrl,
      asesorNombre: rows[0].asesorNombre,
      fecha: rows[0].fecha,
      tipo: rows[0].tipo,
      itemCount: rows.length,
    };
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
