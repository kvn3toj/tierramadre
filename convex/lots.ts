import {
  query,
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { pushTableRowToVercel, requireAppUrl } from './_lib/sheetSync';
import { normalizeLotEstado } from './_lib/sheetPullMaps';
import { COLUMN_MAPS } from './_lib/columnMaps';
import {
  allocateNext,
  formatLotId,
  lotSequenceName,
  parseLoteId,
  reclaimIfTail,
} from './sequences';
import { canReopenLot } from './_lib/lotMath';
import { withPublishStamp } from './_lib/publishState';
import { bumpCatalogVersion } from './_lib/catalogVersion';
import { requireAccessLevel } from './_lib/authz';
import { requireBotSecret } from './_lib/botAuth';
import {
  isStaffSession,
  isStaffOrBotSession,
} from './_lib/requireStaffSession';

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

// `list` and `peekNextLoteId` below are also read by the anima-bot Telegram
// bridge (listOpenLots / peekNextLoteId in
// anima-bot/src/fotosintesis/client.ts), which cannot obtain a staff session
// — hence the `botSecret` arg and `isStaffOrBotSession` gate instead of the
// staff-only `isStaffSession` used everywhere else in this file. See
// `_lib/requireStaffSession.ts` for the full rationale and the exact list of
// which queries in this lockdown accept a bot secret (this is one of only 7).
export const list = query({
  args: {
    estado: v.optional(
      v.union(
        v.literal('abierto'),
        v.literal('cerrado'),
        v.literal('publicado'),
        v.literal('cancelado'),
      ),
    ),
    sessionToken: v.optional(v.string()),
    botSecret: v.optional(v.string()),
  },
  handler: async (ctx, { estado, sessionToken, botSecret }) => {
    if (!(await isStaffOrBotSession({ sessionToken, botSecret }))) return [];
    const rows = estado
      ? await ctx.db
          .query('lots')
          .withIndex('by_estado', (q) => q.eq('estado', estado))
          .collect()
      : await ctx.db.query('lots').collect();
    return rows.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const get = query({
  args: { id: v.id('lots'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, { id, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return null;
    return ctx.db.get(id);
  },
});

export const getByLoteId = query({
  args: { loteId: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, { loteId, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return null;
    return ctx.db
      .query('lots')
      .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
      .first();
  },
});

/**
 * Read-only peek at the next lot ID for the chosen sede. Lets the form
 * preview "B-008" / "C-001" before submit. Does NOT consume the sequence.
 * Also read by anima-bot (see the `list` comment above) — accepts a bot
 * secret too.
 */
export const peekNextLoteId = query({
  args: {
    sede: sedeValidator,
    sessionToken: v.optional(v.string()),
    botSecret: v.optional(v.string()),
  },
  handler: async (ctx, { sede, sessionToken, botSecret }) => {
    if (!(await isStaffOrBotSession({ sessionToken, botSecret }))) {
      return { nextValue: 0, preview: '' };
    }
    const seq = await ctx.db
      .query('sequences')
      .withIndex('by_name', (q) => q.eq('name', lotSequenceName(sede)))
      .first();
    const next = seq?.nextValue ?? 1;
    return { nextValue: next, preview: formatLotId(next, sede) };
  },
});

const createArgs = {
  sede: sedeValidator,
  providerId: v.id('providers'),
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
  clientToken: v.optional(v.string()),
};

export const _create = internalMutation({
  args: createArgs,
  handler: async (ctx, args) => {
    // Idempotency guard (money-critical): replay of the same clientToken
    // returns the prior result instead of creating a second lot. The created
    // row is existence-checked — a cancel that reclaimed the tail sequence
    // deletes the lot, so a stale token must fall through and re-create (C7).
    if (args.clientToken) {
      const prior = await ctx.db
        .query('commitTokens')
        .withIndex('by_token', (q) => q.eq('token', args.clientToken!))
        .unique();
      if (prior) {
        const stillThere = await ctx.db.get(prior.primaryId as Id<'lots'>);
        if (stillThere) {
          return JSON.parse(prior.result) as { id: Id<'lots'>; loteId: string };
        }
        await ctx.db.delete(prior._id);
      }
    }

    if (args.unidadesDeclaradas < 1)
      throw new Error('unidadesDeclaradas debe ser ≥ 1');
    if (args.costoTotalCOP <= 0) throw new Error('costoTotalCOP debe ser > 0');
    if (args.formaPago === 'credito' && !args.fechaVencimiento)
      throw new Error('Crédito requiere fechaVencimiento');
    if (args.formaPago === 'contado' && !args.metodoContado)
      throw new Error('Contado requiere metodoContado');

    const provider = await ctx.db.get(args.providerId);
    if (!provider) throw new Error('Proveedor no encontrado');

    const seqValue = await allocateNext(ctx, lotSequenceName(args.sede));
    const loteId = formatLotId(seqValue, args.sede);

    const now = new Date().toISOString();
    const all = await ctx.db.query('lots').collect();
    const maxRow = all.reduce((m, l) => Math.max(m, l.rowIndex), 1);

    // Strip `clientToken` — it's an idempotency control arg, not a `lots` column.
    const { clientToken, ...lotFields } = args;
    const id = await ctx.db.insert('lots', {
      loteId,
      ...lotFields,
      estado: 'abierto' as const,
      rowIndex: maxRow + 1,
      lastPulledAt: now,
      syncStatus: 'pending' as const,
    });

    await ctx.scheduler.runAfter(0, api.lots._pushToSheet, {
      id,
      mode: 'append',
    });

    const result = { id, loteId };
    if (clientToken) {
      await ctx.db.insert('commitTokens', {
        token: clientToken,
        kind: 'lot.create',
        primaryId: id,
        result: JSON.stringify(result),
        createdAt: new Date().toISOString(),
      });
    }
    return result;
  },
});

export const create = action({
  args: { idToken: v.string(), ...createArgs },
  handler: async (
    ctx,
    { idToken, ...args },
  ): Promise<{ id: Id<'lots'>; loteId: string }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.lots._create, args);
  },
});

/**
 * anima-bot bridge — open a new lote from the Telegram wizard. Same contract as
 * `create`, authenticated with the shared bot secret (see `_lib/botAuth.ts`)
 * instead of a Google ID token. Reuses `_create`, so the cost/units/formaPago
 * guards and `clientToken` idempotency apply identically.
 */
export const openViaBot = action({
  args: { botSecret: v.string(), ...createArgs },
  handler: async (
    ctx,
    { botSecret, ...args },
  ): Promise<{ id: Id<'lots'>; loteId: string }> => {
    requireBotSecret(botSecret);
    return await ctx.runMutation(internal.lots._create, args);
  },
});

const updateArgs = {
  id: v.id('lots'),
  patch: lotPatchValidator,
  editorEmail: v.optional(v.string()),
};

/**
 * internalMutation: reachable via the `update` action below (staff, idToken
 * verified) or directly via internal.lots._update from fotoSync.ts's
 * out-of-band sheet-sync side effects (system sentinel editorEmail).
 */
export const _update = internalMutation({
  args: updateArgs,
  // editorEmail stays in updateArgs (callers/fotoSync still pass it) but is no
  // longer read here: with the cost re-fan removed there is no item-level audit
  // to attribute. The lote-row patch itself is not per-field audited.
  handler: async (ctx, { id, patch }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error(`Lot ${id} not found`);
    if (existing.estado !== 'abierto')
      throw new Error('Sólo se pueden editar lotes abiertos');
    await ctx.db.patch(id, {
      ...patch,
      syncStatus: 'pending' as const,
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, api.lots._pushToSheet, {
      id,
      mode: 'patch',
    });

    // costoBaseCOP is SHEET-OWNED since 2026-07-24: the preponderancia-based
    // derivation is fully deactivated, so changing a lote's costoTotalCOP no
    // longer re-fans any member item's cost. `update` patches only the lote row
    // (above). Item costs are typed into column L of the sheet by hand and
    // pulled back into Convex; nothing here recomputes or overwrites them.
    // `refanned` is kept in the return shape (always 0 now) so callers and tests
    // keep compiling against the same contract.
    const refanned = 0;

    return { id, refanned };
  },
});

export const update = action({
  args: { idToken: v.string(), id: v.id('lots'), patch: lotPatchValidator },
  handler: async (
    ctx,
    { idToken, id, patch },
  ): Promise<{ id: Id<'lots'>; refanned: number }> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.lots._update, {
      id,
      patch,
      editorEmail: caller.email,
    });
  },
});

/**
 * Set the catalog-grouping fields (`fotoLoteUrl`, `mostrarComoLote`). Unlike
 * `update` this works regardless of lot estado (grouping is decided at/after
 * close). `fotoLoteUrl` is Convex-only; `mostrarComoLote` IS a synced sheet
 * column (Lotes!U), so changing it flips syncStatus and pushes so the sheet
 * reflects the flag — and the reverse edit (sheet → Convex) is allowlisted in
 * sheetPullMaps.ts. Omitting a field leaves it unchanged; pass `fotoLoteUrl: ""`
 * to clear it.
 */
const setLoteDisplayArgs = {
  id: v.id('lots'),
  fotoLoteUrl: v.optional(v.string()),
  mostrarComoLote: v.optional(v.boolean()),
};

export const _setLoteDisplay = internalMutation({
  args: setLoteDisplayArgs,
  handler: async (ctx, { id, fotoLoteUrl, mostrarComoLote }) => {
    const lot = await ctx.db.get(id);
    if (!lot) throw new Error(`Lot ${id} not found`);
    if (lot.estado === 'cancelado')
      throw new Error('No se puede configurar un lote cancelado');
    const patch: Record<string, unknown> = {};
    if (fotoLoteUrl !== undefined) patch.fotoLoteUrl = fotoLoteUrl;
    if (mostrarComoLote !== undefined) patch.mostrarComoLote = mostrarComoLote;
    if (Object.keys(patch).length === 0) return { id, changed: false };
    // mostrarComoLote is a synced sheet column (U) — push so the sheet reflects it.
    if (mostrarComoLote !== undefined) {
      patch.syncStatus = 'pending';
      patch.syncError = undefined;
    }
    await ctx.db.patch(id, patch);
    if (mostrarComoLote !== undefined) {
      await ctx.scheduler.runAfter(0, api.lots._pushToSheet, {
        id,
        mode: 'patch',
      });
    }
    return { id, changed: true };
  },
});

export const setLoteDisplay = action({
  args: { idToken: v.string(), ...setLoteDisplayArgs },
  handler: async (
    ctx,
    { idToken, ...args },
  ): Promise<{ id: Id<'lots'>; changed: boolean }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.lots._setLoteDisplay, args);
  },
});

/**
 * BR-2: suma preponderancia ≡ 100 ± 0.01.
 * BR-3: count(lotItems where loteId === L) === unidadesDeclaradas.
 *
 * Both validated here on the server — the UI mirrors but cannot be the
 * sole authority.
 */
export const _close = internalMutation({
  args: { id: v.id('lots') },
  handler: async (ctx, { id }) => {
    const lot = await ctx.db.get(id);
    if (!lot) throw new Error(`Lot ${id} not found`);
    if (lot.estado !== 'abierto')
      throw new Error('El lote ya está cerrado o publicado');

    const items = await ctx.db
      .query('lotItems')
      .withIndex('by_loteId', (q) => q.eq('loteId', lot.loteId))
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
      estado: 'cerrado' as const,
      syncStatus: 'pending' as const,
    });
    await ctx.scheduler.runAfter(0, api.lots._pushToSheet, {
      id,
      mode: 'patch',
    });
    return { id, loteId: lot.loteId };
  },
});

export const close = action({
  args: { idToken: v.string(), id: v.id('lots') },
  handler: async (
    ctx,
    { idToken, id },
  ): Promise<{ id: Id<'lots'>; loteId: string }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.lots._close, { id });
  },
});

/**
 * Cancel an open lot: orphan every linked productInventory row (same
 * pattern as `lotItems.remove`), delete every `lotItems` join row, and
 * flip the lot estado to `cancelado`. We keep the lot row so historical
 * references survive (Sheets, audit trails), but it no longer appears in
 * the active queue.
 *
 * Only `abierto` lots can be cancelled — for a closed or published lot the
 * undo flow is `reopen` (below), which returns it to `abierto` so the header
 * can be corrected, rather than voiding it outright.
 */
const cancelArgs = {
  id: v.id('lots'),
  reason: v.optional(v.string()),
};

export const _cancel = internalMutation({
  args: cancelArgs,
  handler: async (ctx, { id, reason }) => {
    const lot = await ctx.db.get(id);
    if (!lot) throw new Error(`Lot ${id} not found`);
    if (lot.estado !== 'abierto')
      throw new Error('Sólo se pueden cancelar lotes abiertos');

    const lotItemRows = await ctx.db
      .query('lotItems')
      .withIndex('by_loteId', (q) => q.eq('loteId', lot.loteId))
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
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', li.itemId))
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
      ? `${lot.notas ? `${lot.notas} | ` : ''}Cancelado: ${trimmedReason}`
      : lot.notas;

    await ctx.db.patch(id, {
      estado: 'cancelado' as const,
      notas: notasNext,
      syncStatus: 'pending' as const,
      syncError: undefined,
    });

    await ctx.scheduler.runAfter(0, api.lots._pushToSheet, {
      id,
      mode: 'patch',
    });

    return {
      id,
      loteId: lot.loteId,
      orphanedItems: lotItemRows.length,
      reclaimed: false,
    };
  },
});

export const cancel = action({
  args: { idToken: v.string(), ...cancelArgs },
  handler: async (
    ctx,
    { idToken, ...args },
  ): Promise<{
    id: Id<'lots'>;
    loteId: string;
    orphanedItems: number;
    reclaimed: boolean;
  }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.lots._cancel, args);
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
      table: 'lots',
      rowIndex,
      mode: 'patch',
      idValue: voidId,
      previousIdValue: loteId,
      fields: { loteId: voidId, estado: 'cancelado' },
    });
  },
});

/**
 * Bulk-flip every productInventory row owned by this lot to
 * `mostrarEnCatalogo: true`, then mark the lot as published.
 */
export const _publish = internalMutation({
  args: { id: v.id('lots') },
  handler: async (ctx, { id }) => {
    const lot = await ctx.db.get(id);
    if (!lot) throw new Error(`Lot ${id} not found`);
    if (lot.estado !== 'cerrado')
      throw new Error('Sólo lotes cerrados pueden publicarse');

    const items = await ctx.db
      .query('lotItems')
      .withIndex('by_loteId', (q) => q.eq('loteId', lot.loteId))
      .collect();

    let flipped = 0;
    for (const item of items) {
      const product = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', item.itemId))
        .first();
      if (product && product.mostrarEnCatalogo !== true) {
        // Provenance comes from `lot`, already in scope — no extra read.
        await ctx.db.patch(
          product._id,
          withPublishStamp(product, true, {
            mina: lot.mina,
            tratamiento: lot.tratamiento,
          }),
        );
        flipped++;
      }
    }

    // Fix 1C — publishing a lote adds items to the public catalog. One bump for
    // the whole lote, not one per item.
    if (flipped > 0) await bumpCatalogVersion(ctx);

    await ctx.db.patch(id, {
      estado: 'publicado' as const,
      syncStatus: 'pending' as const,
    });
    await ctx.scheduler.runAfter(0, api.lots._pushToSheet, {
      id,
      mode: 'patch',
    });
    return { id, loteId: lot.loteId, flipped };
  },
});

export const publish = action({
  args: { idToken: v.string(), id: v.id('lots') },
  handler: async (
    ctx,
    { idToken, id },
  ): Promise<{ id: Id<'lots'>; loteId: string; flipped: number }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.lots._publish, { id });
  },
});

/**
 * Reopen a cerrado/publicado lot back to `abierto` so a miskeyed lot header
 * (most importantly costoTotalCOP) can be corrected via EditLotDrawer — this is
 * the "undo flow" the cancel comment refers to, and the only real way to fix a
 * lot's accounting after close. Guards (ISO-audit C1):
 *   - estado must be cerrado/publicado (abierto/cancelado are rejected);
 *   - blocked if ANY member item is already VENDIDA — reopening would let an
 *     operator edit accounting a sale already depends on. Cancel that sale first.
 * Reopening a *published* lot pulls its items out of the public catalog
 * (mostrarEnCatalogo:false) so nothing stays live mid-edit; republish re-adds
 * them. The reason is appended to the lot's notas (same audit convention as
 * cancel) since productEdits has no lot-scoped row.
 */
const reopenArgs = {
  id: v.id('lots'),
  editorEmail: v.optional(v.string()),
  reason: v.optional(v.string()),
};

export const _reopen = internalMutation({
  args: reopenArgs,
  handler: async (ctx, { id, editorEmail, reason }) => {
    const lot = await ctx.db.get(id);
    if (!lot) throw new Error(`Lot ${id} not found`);

    const items = await ctx.db
      .query('lotItems')
      .withIndex('by_loteId', (q) => q.eq('loteId', lot.loteId))
      .collect();
    const products = await Promise.all(
      items.map((li) =>
        ctx.db
          .query('productInventory')
          .withIndex('by_itemId', (q) => q.eq('itemId', li.itemId))
          .first(),
      ),
    );

    const verdict = canReopenLot({
      estado: lot.estado,
      members: items.map((li, i) => ({
        itemId: li.itemId,
        estado: products[i]?.estado,
      })),
    });
    if (!verdict.ok) {
      if (verdict.reason === 'not-closeable')
        throw new Error('Sólo se pueden reabrir lotes cerrados o publicados');
      throw new Error(
        `No se puede reabrir: ítem(s) ${verdict.soldItemIds.join(', ')} ya ` +
          `vendido(s). Cancelá esa venta primero.`,
      );
    }

    // Pull published members out of the public catalog while the lot is edited.
    let demotedFromCatalog = 0;
    if (lot.estado === 'publicado') {
      for (const product of products) {
        if (product && product.mostrarEnCatalogo === true) {
          await ctx.db.patch(product._id, { mostrarEnCatalogo: false });
          demotedFromCatalog++;
        }
      }
    }
    // Fix 1C — an UNpublish has to invalidate too, or the withdrawn pieces
    // linger in every visitor's cached catalog until the TTL expires. One bump
    // for the whole lote.
    if (demotedFromCatalog > 0) await bumpCatalogVersion(ctx);

    const trimmedReason = reason?.trim();
    const reopenNote = `Reabierto${editorEmail ? ` por ${editorEmail}` : ''}${
      trimmedReason ? `: ${trimmedReason}` : ''
    }`;
    const notasNext = `${lot.notas ? `${lot.notas} | ` : ''}${reopenNote}`;

    await ctx.db.patch(id, {
      estado: 'abierto' as const,
      notas: notasNext,
      syncStatus: 'pending' as const,
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, api.lots._pushToSheet, {
      id,
      mode: 'patch',
    });

    return {
      id,
      loteId: lot.loteId,
      reopenedFrom: lot.estado,
      demotedFromCatalog,
    };
  },
});

export const reopen = action({
  args: {
    idToken: v.string(),
    id: v.id('lots'),
    reason: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { idToken, id, reason },
  ): Promise<{
    id: Id<'lots'>;
    loteId: string;
    reopenedFrom: 'abierto' | 'cerrado' | 'publicado' | 'cancelado';
    demotedFromCatalog: number;
  }> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.lots._reopen, {
      id,
      reason,
      editorEmail: caller.email,
    });
  },
});

export const _getInternal = internalQuery({
  args: { id: v.id('lots') },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const _markPushed = internalMutation({
  args: { id: v.id('lots') },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      syncStatus: 'synced' as const,
      lastPushedAt: new Date().toISOString(),
      syncError: undefined,
    });
  },
});

export const _markPushFailed = internalMutation({
  args: { id: v.id('lots'), error: v.string() },
  handler: async (ctx, { id, error }) => {
    await ctx.db.patch(id, {
      syncStatus: 'error' as const,
      syncError: error.slice(0, 500),
    });
  },
});

export const _pushToSheet = action({
  args: {
    id: v.id('lots'),
    mode: v.union(v.literal('patch'), v.literal('append')),
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
      providerNombre: provider?.nombreORazonSocial ?? '',
    };
    const fields: Record<string, string> = {};
    for (const col of COLUMN_MAPS.lots) {
      const val = fieldSource[col];
      fields[col] = val === null || val === undefined ? '' : String(val);
    }

    const result = await pushTableRowToVercel({
      table: 'lots',
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
  args: { id: v.id('lots') },
  handler: async (ctx, { id }): Promise<{ ok: boolean; message: string }> => {
    const row = await ctx.runQuery(internal.lots._getInternal, { id });
    if (!row) return { ok: false, message: 'Lot not found' };
    return await ctx.runAction(api.lots._pushToSheet, { id, mode: 'patch' });
  },
});

// ── rowIndex relink (Lotes) ────────────────────────────────────────────────
//
// `_create` assigns rowIndex as `maxRow + 1` — a counter that is never
// reconciled against the sheet. Insert or delete a row in Lotes and every
// stored pointer below it silently means a different row. As of the 2026-07-31
// audit ALL 79 matchable lots were off (uniformly +2 across the C series);
// only C-009 surfaced it, because it was the only lot edited since the drift
// and the column-A guard in /api/admin-table-update caught the mismatch.
//
// This is the same defect `products._pullFromSheet` already fixed by consuming
// the API's authoritative physical row instead of an array position. Lots has
// no pull at all, so the repair is a dedicated relink: match on loteId — the
// natural key in column A, and the very value the push guard validates — and
// rewrite rowIndex to the sheet's truth.
//
// The pull also INSERTS lots the sheet has and Convex lacks — but only rows it
// can represent faithfully. As of the audit, 28 of the 30 missing rows are
// `estado: "reconstruido"` with an empty provider: retroactive groupings built
// on 2026-07-23 from legacy collections ("Fénix", "Madres", …), not real
// purchases. `reconstruido` is outside the estado union and `providerId` is
// required, so those rows CANNOT enter the table without either widening the
// schema or inventing a provider. Both are product decisions, so they are
// skipped WITH A REASON instead of coerced — a silently defaulted provider
// would attribute someone else's stones to a real supplier.
//
// Field-level sync is deliberately NOT duplicated here: `_lib/sheetPullMaps`
// (LOTS allowlist + planRowPatch, applied by fotoSync) already owns that
// policy. This pull does only what nothing else does — rowIndex truth and
// missing-lot insertion. Deletion is never performed.

type LotRelinkChange = {
  loteId: string;
  from: number;
  to: number;
};

type LotSkip = {
  loteId: string;
  sheetRow: number;
  reason: string;
};

export const _applyRowIndexRelink = internalMutation({
  args: {
    updates: v.array(v.object({ loteId: v.string(), rowIndex: v.number() })),
  },
  handler: async (ctx, { updates }) => {
    const changes: LotRelinkChange[] = [];
    for (const { loteId, rowIndex } of updates) {
      const lot = await ctx.db
        .query('lots')
        .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
        .first();
      if (!lot || lot.rowIndex === rowIndex) continue;
      // rowIndex only — never touch syncStatus here. A lot parked in `error`
      // because of the drift stays in `error` until its next push actually
      // succeeds; silently flipping it to `synced` would claim the sheet row
      // was written when nothing was pushed.
      await ctx.db.patch(lot._id, { rowIndex });
      changes.push({ loteId, from: lot.rowIndex, to: rowIndex });
    }
    return changes;
  },
});

/**
 * Insert lots the sheet has and Convex lacks. Returns what it created and what
 * it refused to create, so a caller never has to infer silence.
 *
 * Inserted rows land as `syncStatus: "synced"`: the sheet row already exists
 * and is the source of these values, so there is nothing to push back. Marking
 * them `pending` would queue a redundant write against a row we just read.
 */
export const _insertMissingFromSheet = internalMutation({
  args: {
    candidates: v.array(
      v.object({
        loteId: v.string(),
        rowIndex: v.number(),
        providerNombre: v.string(),
        estado: v.string(),
        fechaRecepcion: v.string(),
        costoTotalCOP: v.number(),
        unidadesDeclaradas: v.number(),
        formaPago: v.string(),
        sede: v.optional(v.string()),
        renombreLote: v.optional(v.string()),
        mina: v.optional(v.string()),
        tratamiento: v.optional(v.string()),
        notas: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { candidates }) => {
    const created: string[] = [];
    const skipped: LotSkip[] = [];

    for (const c of candidates) {
      const already = await ctx.db
        .query('lots')
        .withIndex('by_loteId', (q) => q.eq('loteId', c.loteId))
        .first();
      if (already) continue;

      const estado = normalizeLotEstado(c.estado);
      if (estado === null) {
        skipped.push({
          loteId: c.loteId,
          sheetRow: c.rowIndex,
          reason: `estado "${c.estado}" no existe en el modelo (abierto|cerrado|publicado|cancelado)`,
        });
        continue;
      }

      // Resolve the provider by name rather than defaulting one. `providerId`
      // is a real FK: guessing it would credit a purchase to a supplier who
      // never made it, and that error is invisible once stored.
      const nombre = c.providerNombre.trim();
      if (!nombre) {
        skipped.push({
          loteId: c.loteId,
          sheetRow: c.rowIndex,
          reason: 'sin proveedor en la hoja; providerId es obligatorio',
        });
        continue;
      }
      const provider = await ctx.db
        .query('providers')
        .withIndex('by_nombre', (q) => q.eq('nombreORazonSocial', nombre))
        .first();
      if (!provider) {
        skipped.push({
          loteId: c.loteId,
          sheetRow: c.rowIndex,
          reason: `proveedor "${nombre}" no existe en Convex; créalo antes de importar el lote`,
        });
        continue;
      }

      await ctx.db.insert('lots', {
        loteId: c.loteId,
        rowIndex: c.rowIndex,
        providerId: provider._id,
        estado: estado as 'abierto' | 'cerrado' | 'publicado' | 'cancelado',
        fechaRecepcion: c.fechaRecepcion,
        costoTotalCOP: c.costoTotalCOP,
        unidadesDeclaradas: c.unidadesDeclaradas,
        formaPago: c.formaPago,
        sede: c.sede,
        renombreLote: c.renombreLote,
        mina: c.mina,
        tratamiento: c.tratamiento,
        notas: c.notas,
        mostrarComoLote: false,
        syncStatus: 'synced' as const,
        lastPulledAt: new Date().toISOString(),
      });
      created.push(c.loteId);
    }

    return { created, skipped };
  },
});

export const _relinkRowIndexFromSheet = internalAction({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (
    ctx,
    { dryRun },
  ): Promise<{
    dryRun: boolean;
    sheetRows: number;
    matched: number;
    changes: LotRelinkChange[];
    convexOnly: string[];
    sheetOnly: string[];
    importable: number;
    created: string[];
    skipped: LotSkip[];
  }> => {
    const appUrl = requireAppUrl();
    const token = process.env.ADMIN_SYNC_TOKEN;
    if (!token)
      throw new Error('ADMIN_SYNC_TOKEN missing on Convex deployment');

    const res = await fetch(`${appUrl}/api/get-table?table=lots`, {
      headers: { 'x-admin-sync-token': token },
    });
    if (!res.ok) {
      throw new Error(`Lotes sheet fetch failed: HTTP ${res.status}`);
    }
    const payload = (await res.json()) as {
      data?: { rows?: Array<Record<string, string>> };
      rows?: Array<Record<string, string>>;
    };
    const rows = payload.data?.rows ?? payload.rows ?? [];
    if (rows.length === 0) {
      // An empty read would relink nothing but still look "successful"; treat
      // it as a transport failure rather than reporting a clean no-op.
      throw new Error('Lotes sheet returned 0 rows — refusing to relink');
    }

    // `__rowIndex` is the physical 1-based sheet row stamped by /api/get-table,
    // not a position in a compacted array — that distinction is the whole fix.
    const sheetRowByLote = new Map<string, number>();
    for (const row of rows) {
      const loteId = String(row.loteId ?? '').trim();
      if (!loteId) continue;
      const physical = Number(row.__rowIndex);
      if (!Number.isFinite(physical)) continue;
      // First occurrence wins: a duplicated loteId in the sheet is a data bug,
      // and pointing at the first row keeps the guard's column-A check honest.
      if (!sheetRowByLote.has(loteId)) sheetRowByLote.set(loteId, physical);
    }

    const lots = await ctx.runQuery(internal.lots._listAllForRelink, {});
    const updates: Array<{ loteId: string; rowIndex: number }> = [];
    const convexOnly: string[] = [];
    for (const lot of lots) {
      const physical = sheetRowByLote.get(lot.loteId);
      if (physical === undefined) {
        convexOnly.push(lot.loteId);
        continue;
      }
      if (physical !== lot.rowIndex)
        updates.push({ loteId: lot.loteId, rowIndex: physical });
    }

    const convexIds = new Set(lots.map((l) => l.loteId));
    const sheetOnly = [...sheetRowByLote.keys()].filter(
      (id) => !convexIds.has(id),
    );

    const changes: LotRelinkChange[] = dryRun
      ? updates.map((u) => ({
          loteId: u.loteId,
          from: lots.find((l) => l.loteId === u.loteId)?.rowIndex ?? -1,
          to: u.rowIndex,
        }))
      : await ctx.runMutation(internal.lots._applyRowIndexRelink, { updates });

    // Sheet-only rows: try to import them, but only those the model can hold.
    const rowByLote = new Map(
      rows.map((r) => [String(r.loteId ?? '').trim(), r]),
    );
    const candidates = sheetOnly.map((loteId) => {
      const r = rowByLote.get(loteId) ?? {};
      const num = (x: unknown) => {
        // Sheet money/counts arrive as display strings ("1,234"); strip the
        // thousands separators before Number() turns them into NaN.
        const n = Number(String(x ?? '').replace(/[^\d.-]/g, ''));
        return Number.isFinite(n) ? n : 0;
      };
      return {
        loteId,
        rowIndex: sheetRowByLote.get(loteId) as number,
        providerNombre: String(r.providerNombre ?? ''),
        estado: String(r.estado ?? ''),
        fechaRecepcion: String(r.fechaRecepcion ?? ''),
        costoTotalCOP: num(r.costoTotalCOP),
        unidadesDeclaradas: num(r.unidadesDeclaradas),
        formaPago: String(r.formaPago ?? ''),
        sede: String(r.sede ?? '') || undefined,
        renombreLote: String(r.renombreLote ?? '') || undefined,
        mina: String(r.mina ?? '') || undefined,
        tratamiento: String(r.tratamiento ?? '') || undefined,
        notas: String(r.notas ?? '') || undefined,
      };
    });

    const imported: { created: string[]; skipped: LotSkip[] } = dryRun
      ? { created: [], skipped: [] }
      : await ctx.runMutation(internal.lots._insertMissingFromSheet, {
          candidates,
        });

    return {
      dryRun: Boolean(dryRun),
      sheetRows: rows.length,
      matched: lots.length - convexOnly.length,
      changes,
      convexOnly,
      sheetOnly,
      importable: candidates.length,
      created: imported.created,
      skipped: imported.skipped,
    };
  },
});

export const _listAllForRelink = internalQuery({
  args: {},
  handler: async (ctx) => {
    const lots = await ctx.db.query('lots').collect();
    return lots.map((l) => ({ loteId: l.loteId, rowIndex: l.rowIndex }));
  },
});

/**
 * Admin entry point for "Reparar índices de fila (Lotes)". Pass `dryRun: true`
 * to see exactly what would change before writing anything.
 */
export const relinkRowIndexFromSheet = action({
  args: { idToken: v.string(), dryRun: v.optional(v.boolean()) },
  handler: async (
    ctx,
    { idToken, dryRun },
  ): Promise<{
    dryRun: boolean;
    sheetRows: number;
    matched: number;
    changes: LotRelinkChange[];
    convexOnly: string[];
    sheetOnly: string[];
    importable: number;
    created: string[];
    skipped: LotSkip[];
  }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runAction(internal.lots._relinkRowIndexFromSheet, {
      dryRun,
    });
  },
});
