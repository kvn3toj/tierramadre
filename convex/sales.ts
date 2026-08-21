import {
  query,
  action,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { pushTableRowToVercel } from './_lib/sheetSync';
import { COLUMN_MAPS } from './_lib/columnMaps';
import { allocateNext, formatSaleId, saleSequenceName } from './sequences';
import { requireAccessLevel } from './_lib/authz';
import { isStaffSession } from './_lib/requireStaffSession';
import { bumpCatalogVersion } from './_lib/catalogVersion';
import { RESERVA_TTL_MS, findReservationConflict } from './_lib/reservas';

// Free text (canonical: B | C | S | M). The venta UI sanitizes a custom
// write-in to an uppercase, dash-free token before it reaches here, so it stays
// valid as the saleId prefix (`formatSaleId`) and its own `sequences` key.
const sedeValidator = v.string();

// Free text (canonical: contado | credito | esmereogenesis | canje |
// bajo_pedido | consignacion) so the venta UI can submit an operator write-in.
// The conditional logic in `create` only special-cases known strings, so a
// custom value is stored verbatim and harmless.
const formaPagoValidator = v.string();

// Free text (canonical: efectivo | transferencia | crypto) for write-in parity.
const metodoContadoValidator = v.string();

export const list = query({
  args: {
    estado: v.optional(
      v.union(
        v.literal('reservada'),
        v.literal('confirmada'),
        v.literal('cancelada'),
      ),
    ),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { estado, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return [];
    const rows = estado
      ? await ctx.db
          .query('sales')
          .withIndex('by_estado', (q) => q.eq('estado', estado))
          .collect()
      : await ctx.db.query('sales').collect();
    return rows.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const get = query({
  args: { id: v.id('sales'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, { id, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return null;
    return ctx.db.get(id);
  },
});

/**
 * Estado de un pedido para la página de confirmación. PÚBLICA a propósito:
 * quien pagó no tiene sesión. Por eso devuelve el mínimo —estado, número y
 * total— y NUNCA el cliente, la comisión, el embajador ni los itemIds:
 * cualquiera con el link la puede llamar, y un saleId es adivinable.
 */
export const estadoPublico = query({
  args: { saleId: v.string() },
  handler: async (ctx, { saleId }) => {
    const sale = await ctx.db
      .query('sales')
      .withIndex('by_saleId', (q) => q.eq('saleId', saleId))
      .first();
    if (!sale) return null;
    return {
      saleId: sale.saleId,
      estado: sale.estado,
      totalCOP: sale.totalCOP,
    };
  },
});

export const peekNextSaleId = query({
  args: { sede: sedeValidator, sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sede, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) {
      return { nextValue: 0, preview: '' };
    }
    const seq = await ctx.db
      .query('sequences')
      .withIndex('by_name', (q) => q.eq('name', saleSequenceName(sede)))
      .first();
    const next = seq?.nextValue ?? 1;
    return { nextValue: next, preview: formatSaleId(next, sede) };
  },
});

/**
 * Create a sale.
 *
 * BR-6: every itemId in `itemIds` must be in productInventory with any
 * estado OTHER than VENDIDA — in particular DISPONIBLE, ASESOR and
 * CONSIGNACION all pass. A VENDIDA item cannot be re-sold. This is also how
 * a consignment "graduates" to a sale (2026-07-09): no separate mutation —
 * an ASESOR/CONSIGNACION item is already sellable here, so the UI just
 * prefills VentaPage with the known item/price instead of duplicating this
 * gate. See AsesorMovementPanel's "Vender esta pieza".
 *
 * Side effect: each item flips to estado "VENDIDA" and a push is
 * scheduled per item (so the Inventario sheet reflects the change).
 */
const createArgs = {
  sede: sedeValidator,
  itemIds: v.array(v.string()),
  clientId: v.id('clients'),
  fechaVenta: v.string(),
  precioAcordadoCOP: v.number(),
  descuentoCOP: v.optional(v.number()),
  totalCOP: v.number(),
  comisionCOP: v.optional(v.number()),
  // Manual (non-inventory) line items — stored on the sale, kept out of
  // `itemIds` (which is validated against inventory). Prices already folded
  // into precioAcordadoCOP / totalCOP by the venta UI.
  manualItems: v.optional(
    v.array(
      v.object({
        nombre: v.string(),
        descripcion: v.optional(v.string()),
        peso: v.optional(v.string()),
        precioCOP: v.number(),
      }),
    ),
  ),
  // Frozen per-line price snapshot (app-only). Persisted verbatim via the
  // `...args` spread; read back by the Kardex so the comprobante shows the
  // price the sale was struck at, immune to later inventory re-pricing.
  lineItems: v.optional(
    v.array(
      v.object({
        itemId: v.string(),
        precioCOP: v.number(),
        tier: v.union(v.literal('embajador'), v.literal('final')),
      }),
    ),
  ),
  formaPago: formaPagoValidator,
  metodoContado: v.optional(metodoContadoValidator),
  fechaVencimiento: v.optional(v.string()),
  numeroCuotas: v.optional(v.number()),
  adicionales: v.optional(v.string()),
  estado: v.optional(
    v.union(
      v.literal('reservada'),
      v.literal('confirmada'),
      v.literal('cancelada'),
    ),
  ),
  clientToken: v.optional(v.string()),
};

/**
 * internalMutation: the actual write. Only reachable via the `create` action
 * below, which verifies the caller's Google ID token server-side first — see
 * convex/_lib/authz.ts. (Was previously a public `mutation`, directly
 * callable by anyone with the Convex deployment URL.)
 */
export const _create = internalMutation({
  args: createArgs,
  handler: async (ctx, args) => {
    // Idempotency guard (money-critical): replay of the same clientToken returns
    // the prior result instead of recording a second sale (and re-flipping items
    // to VENDIDA). The created sale row is existence-checked — a cancel only
    // patches the sale (never deletes it), but a deleted row would mean the stale
    // token must fall through and re-create (C7).
    if (args.clientToken) {
      const prior = await ctx.db
        .query('commitTokens')
        .withIndex('by_token', (q) => q.eq('token', args.clientToken!))
        .unique();
      if (prior) {
        const stillThere = await ctx.db.get(prior.primaryId as Id<'sales'>);
        if (stillThere) {
          return JSON.parse(prior.result) as {
            id: Id<'sales'>;
            saleId: string;
          };
        }
        await ctx.db.delete(prior._id);
      }
    }

    // A sale must carry at least one line — an inventory item OR a manual one.
    // (A manual-only sale is valid: e.g. an accessory not yet in inventory.)
    if (args.itemIds.length === 0 && (args.manualItems?.length ?? 0) === 0) {
      throw new Error('Una venta debe incluir al menos un ítem');
    }
    if (new Set(args.itemIds).size !== args.itemIds.length) {
      throw new Error('itemIds duplicados en la venta');
    }
    if (args.totalCOP <= 0) throw new Error('totalCOP debe ser > 0');
    if (args.formaPago === 'credito' && !args.fechaVencimiento) {
      throw new Error('Crédito requiere fechaVencimiento');
    }
    if (args.formaPago === 'contado' && !args.metodoContado) {
      throw new Error('Contado requiere metodoContado');
    }

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error('Cliente no encontrado');

    // BR-6 — fail loudly if any item is unavailable.
    const products = [];
    for (const itemId of args.itemIds) {
      const product = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
        .first();
      if (!product) {
        throw new Error(`Ítem ${itemId} no existe en inventario`);
      }
      if (product.estado === 'VENDIDA') {
        throw new Error(`Ítem ${itemId} ya está vendido`);
      }
      products.push(product);
    }

    // BR-6 no alcanza: un pago en línea en curso NO cambia
    // `productInventory.estado`. La reserva es derivada a propósito —escribir
    // RESERVADA en la hoja lo soltaría el siguiente pull, en mitad del pago
    // (ver convex/_lib/reservas.ts)—, así que el bucle de arriba ve la piedra
    // DISPONIBLE y el mostrador la vendería encima de un checkout vivo. La
    // piedra es una sola: cerrar la carrera del lado online y dejarla abierta
    // del lado de la tienda no cierra nada.
    //
    // La salida para el vendedor no es un flag de override —que a la larga se
    // usa siempre— sino cancelar la venta que aparta: `_cancel` la pasa a
    // `cancelada` y `findReservationConflict` deja de verla en el acto. Si
    // nadie hace nada, la reserva vence sola a los 30 min.
    //
    // Misma lectura por rango de índice que el riel online: sólo las ventas
    // `reservada` de los últimos 30 min, ancladas en `_creationTime`.
    if (args.itemIds.length > 0) {
      const ahora = Date.now();
      const reservadas = await ctx.db
        .query('sales')
        .withIndex('by_estado', (q) =>
          q
            .eq('estado', 'reservada')
            .gte('_creationTime', ahora - RESERVA_TTL_MS),
        )
        .collect();
      const conflicto = findReservationConflict(
        reservadas.map((s) => ({
          clientId: s.clientId as string,
          itemIds: s.itemIds,
          creationTime: s._creationTime,
          estado: s.estado,
          saleId: s.saleId,
        })),
        args.itemIds,
        ahora,
      );
      if (conflicto) {
        throw new Error(
          `Ítem ${conflicto.itemId} está apartado por un pago en línea en curso ` +
            `(venta ${conflicto.saleId}). Cancela esa venta o espera a que venza ` +
            `la reserva.`,
        );
      }
    }

    const seqValue = await allocateNext(ctx, saleSequenceName(args.sede));
    const saleId = formatSaleId(seqValue, args.sede);

    const now = new Date().toISOString();
    const all = await ctx.db.query('sales').collect();
    const maxRow = all.reduce((m, s) => Math.max(m, s.rowIndex), 1);

    // Strip `clientToken` — it's an idempotency control arg, not a `sales` column.
    const { clientToken, ...saleFields } = args;
    const id = await ctx.db.insert('sales', {
      saleId,
      ...saleFields,
      estado: args.estado ?? 'confirmada',
      rowIndex: maxRow + 1,
      lastPulledAt: now,
      syncStatus: 'pending' as const,
    });

    // Flip each product to VENDIDA + schedule its push.
    let touchedPublished = false;
    for (const product of products) {
      if (product.mostrarEnCatalogo === true) touchedPublished = true;
      await ctx.db.patch(product._id, {
        estado: 'VENDIDA' as const,
        syncStatus: 'pending' as const,
      });
      const auditId = await ctx.db.insert('productEdits', {
        itemId: product.itemId,
        editorEmail: 'fotosintesis-sale',
        editedAt: now,
        changes: [
          { field: 'estado', before: product.estado, after: 'VENDIDA' },
        ],
        status: 'pending' as const,
      });
      await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
        itemId: product.itemId,
        auditId,
        mode: 'patch',
      });
    }

    // A sale changes what the PUBLIC catalog renders: `publishedCatalog`
    // projects `estado` and the client paints availability from it. Without
    // this bump the sold stone stays "available" in every visitor's cached
    // catalog until the TTL floor expires — and for one-of-a-kind emeralds that
    // is two customers believing they can buy the same piece. This is the exact
    // failure mode Fix 1C was chosen over Fix 1A to avoid, so the sale path is
    // the one bump that is not optional. See convex/_lib/catalogVersion.ts.
    //
    // Guarded on `mostrarEnCatalogo` (not bumped unconditionally) because every
    // bump invalidates the catalog for EVERY visitor: selling an unpublished
    // piece must not cost a full re-scan per connected client.
    if (touchedPublished) await bumpCatalogVersion(ctx);

    await ctx.scheduler.runAfter(0, api.sales._pushToSheet, {
      id,
      mode: 'append',
    });

    const result = { id, saleId };
    if (clientToken) {
      await ctx.db.insert('commitTokens', {
        token: clientToken,
        kind: 'sale.create',
        primaryId: id,
        result: JSON.stringify(result),
        createdAt: new Date().toISOString(),
      });
    }
    return result;
  },
});

/**
 * Public entry point for create. Verifies the caller's Google ID token
 * server-side and requires the `admin` role (the Fotosíntesis venta flow is
 * behind `AdminRoute` client-side, but that only hides the UI — this is the
 * real gate) before delegating to the internal mutation.
 */
export const create = action({
  args: { idToken: v.string(), ...createArgs },
  handler: async (
    ctx,
    { idToken, ...args },
  ): Promise<{ id: Id<'sales'>; saleId: string }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.sales._create, args);
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
 *
 * internalMutation: only reachable via the `cancel` action below (or the
 * `_cancelSystem` action for automated/sheet-sync-driven cancellations),
 * which supply `operatorEmail`/`operatorName` from a verified source —
 * never trust these as raw client input.
 */
export const _cancel = internalMutation({
  args: {
    id: v.id('sales'),
    operatorEmail: v.string(),
    operatorName: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { id, operatorEmail, operatorName, reason }) => {
    const sale = await ctx.db.get(id);
    if (!sale) throw new Error(`Sale ${id} not found`);
    if (sale.estado === 'cancelada')
      return {
        id,
        alreadyCancelled: true as const,
        restored: 0,
        skipped: 0,
      };

    const now = new Date().toISOString();

    // Tally how many items were actually returned to inventory vs left as-is,
    // so the UI can tell the truth instead of always claiming "stock
    // restaurado" even when nothing was restored. (ISO-audit C8.)
    let restored = 0;
    let skipped = 0;
    let touchedPublished = false;

    for (const itemId of sale.itemIds) {
      const product = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
        .first();
      if (!product) {
        skipped++;
        continue;
      }
      // Only reopen items this sale still owns. If the item moved on after
      // this sale (re-sold by another sale, re-classified to ESMEREOGENESIS /
      // ASESOR / CONSIGNACION, or already DISPONIBLE), leave it untouched — clobbering it to
      // DISPONIBLE would free stock another active sale owns and write a false
      // `before` into the audit trail.
      if (product.estado !== 'VENDIDA') {
        skipped++;
        continue;
      }
      if (product.mostrarEnCatalogo === true) touchedPublished = true;
      await ctx.db.patch(product._id, {
        estado: 'DISPONIBLE' as const,
        syncStatus: 'pending' as const,
      });
      const auditId = await ctx.db.insert('productEdits', {
        itemId,
        editorEmail: operatorEmail,
        editorName: operatorName,
        editedAt: now,
        // `before` is the item's real prior estado (guaranteed VENDIDA by the
        // guard above), not a hardcoded literal.
        changes: [
          { field: 'estado', before: product.estado, after: 'DISPONIBLE' },
        ],
        status: 'pending' as const,
      });
      await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
        itemId,
        auditId,
        mode: 'patch',
      });
      restored++;
    }

    // Mirror of the create path: a cancellation returns stock to DISPONIBLE, so
    // the piece has to reappear in the public catalog now rather than whenever
    // the TTL floor happens to expire.
    if (touchedPublished) await bumpCatalogVersion(ctx);

    await ctx.db.patch(id, {
      estado: 'cancelada' as const,
      syncStatus: 'pending' as const,
      cancelledAt: now,
      cancelledBy: operatorName
        ? `${operatorName} <${operatorEmail}>`
        : operatorEmail,
      ...(reason ? { cancellationReason: reason } : {}),
    });
    await ctx.scheduler.runAfter(0, api.sales._pushToSheet, {
      id,
      mode: 'patch',
    });
    return { id, alreadyCancelled: false as const, restored, skipped };
  },
});

/**
 * Public entry point for cancel. Verifies the caller's Google ID token and
 * requires `admin`, then delegates to the internal mutation with
 * operatorEmail/operatorName sourced from the VERIFIED token — never from
 * client-supplied strings.
 */
export const cancel = action({
  args: {
    idToken: v.string(),
    id: v.id('sales'),
    reason: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { idToken, id, reason },
  ): Promise<{
    id: Id<'sales'>;
    alreadyCancelled: boolean;
    restored: number;
    skipped: number;
  }> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.sales._cancel, {
      id,
      operatorEmail: caller.email,
      operatorName: caller.name,
      reason,
    });
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
const updatePriceArgs = {
  id: v.id('sales'),
  precioAcordadoCOP: v.number(),
  totalCOP: v.optional(v.number()),
  descuentoCOP: v.optional(v.number()),
};

export const _updatePrice = internalMutation({
  args: updatePriceArgs,
  handler: async (ctx, { id, precioAcordadoCOP, totalCOP, descuentoCOP }) => {
    if (precioAcordadoCOP <= 0) {
      throw new Error('precioAcordadoCOP debe ser > 0');
    }
    const sale = await ctx.db.get(id);
    if (!sale) throw new Error(`Sale ${id} not found`);
    if (sale.estado === 'cancelada') {
      throw new Error('No se puede editar una venta cancelada');
    }
    const nextTotal = totalCOP ?? precioAcordadoCOP;
    if (nextTotal <= 0) throw new Error('totalCOP debe ser > 0');

    await ctx.db.patch(id, {
      precioAcordadoCOP,
      totalCOP: nextTotal,
      ...(descuentoCOP !== undefined ? { descuentoCOP } : {}),
      syncStatus: 'pending' as const,
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, api.sales._pushToSheet, {
      id,
      mode: 'patch',
    });
    return { id, precioAcordadoCOP, totalCOP: nextTotal };
  },
});

export const updatePrice = action({
  args: { idToken: v.string(), ...updatePriceArgs },
  handler: async (
    ctx,
    { idToken, ...args },
  ): Promise<{
    id: Id<'sales'>;
    precioAcordadoCOP: number;
    totalCOP: number;
  }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.sales._updatePrice, args);
  },
});

const setCarnetUrlArgs = { id: v.id('sales'), carnetUrl: v.string() };

export const _setCarnetUrl = internalMutation({
  args: setCarnetUrlArgs,
  handler: async (ctx, { id, carnetUrl }) => {
    const sale = await ctx.db.get(id);
    if (!sale) throw new Error(`Sale ${id} not found`);
    // A cancelled sale is read-only, like updatePrice. The detail-page
    // re-upload affordance (ISO-audit C6) also hides for cancelled sales, so
    // this is the server-side backstop.
    if (sale.estado === 'cancelada')
      throw new Error('No se puede editar una venta cancelada');
    await ctx.db.patch(id, { carnetUrl, syncStatus: 'pending' as const });
    await ctx.scheduler.runAfter(0, api.sales._pushToSheet, {
      id,
      mode: 'patch',
    });
    return { id };
  },
});

export const setCarnetUrl = action({
  args: { idToken: v.string(), ...setCarnetUrlArgs },
  handler: async (ctx, { idToken, ...args }): Promise<{ id: Id<'sales'> }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.sales._setCarnetUrl, args);
  },
});

const setCertificadoUrlArgs = { id: v.id('sales'), certificadoUrl: v.string() };

export const _setCertificadoUrl = internalMutation({
  args: setCertificadoUrlArgs,
  handler: async (ctx, { id, certificadoUrl }) => {
    const sale = await ctx.db.get(id);
    if (!sale) throw new Error(`Sale ${id} not found`);
    if (sale.estado === 'cancelada')
      throw new Error('No se puede editar una venta cancelada');
    await ctx.db.patch(id, {
      certificadoUrl,
      syncStatus: 'pending' as const,
    });
    await ctx.scheduler.runAfter(0, api.sales._pushToSheet, {
      id,
      mode: 'patch',
    });
    return { id };
  },
});

export const setCertificadoUrl = action({
  args: { idToken: v.string(), ...setCertificadoUrlArgs },
  handler: async (ctx, { idToken, ...args }): Promise<{ id: Id<'sales'> }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.sales._setCertificadoUrl, args);
  },
});

export const _getInternal = internalQuery({
  args: { id: v.id('sales') },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const _markPushed = internalMutation({
  args: { id: v.id('sales') },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      syncStatus: 'synced' as const,
      lastPushedAt: new Date().toISOString(),
      syncError: undefined,
    });
  },
});

export const _markPushFailed = internalMutation({
  args: { id: v.id('sales'), error: v.string() },
  handler: async (ctx, { id, error }) => {
    await ctx.db.patch(id, {
      syncStatus: 'error' as const,
      syncError: error.slice(0, 500),
    });
  },
});

export const _pushToSheet = action({
  args: {
    id: v.id('sales'),
    mode: v.union(v.literal('patch'), v.literal('append')),
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
      itemIdsJoined: sale.itemIds.join(', '),
      clientNombre: client?.nombre ?? '',
    };
    const fields: Record<string, string> = {};
    for (const col of COLUMN_MAPS.sales) {
      const val = fieldSource[col];
      fields[col] = val === null || val === undefined ? '' : String(val);
    }

    const result = await pushTableRowToVercel({
      table: 'sales',
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
  args: { id: v.id('sales') },
  handler: async (ctx, { id }): Promise<{ ok: boolean; message: string }> => {
    const row = await ctx.runQuery(internal.sales._getInternal, { id });
    if (!row) return { ok: false, message: 'Sale not found' };
    return await ctx.runAction(api.sales._pushToSheet, { id, mode: 'patch' });
  },
});
