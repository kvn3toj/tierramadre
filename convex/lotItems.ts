import {
  query,
  internalMutation,
  action,
  type MutationCtx,
} from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { api, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { bumpInventoryTotal } from './products';
import { omitFotosintesisOnly, omitInternosV4 } from './_lib/saleSafe';
import { preponderanciaSum, balancesTo100 } from './_lib/lotMath';
import { computePrecioFinal } from './_lib/pricing';
import { withPublishStamp, lotProvenance } from './_lib/publishState';
import { bumpCatalogVersionIfPublished } from './_lib/catalogVersion';
import { requireAccessLevel } from './_lib/authz';
import { requireBotSecret } from './_lib/botAuth';
import {
  isStaffSession,
  isStaffOrBotSession,
  requireStaffOrBotSession,
} from './_lib/requireStaffSession';

const tipoItemValidator = v.union(
  v.literal('gema'),
  v.literal('joya'),
  v.literal('insumo'),
  v.literal('lote'),
  v.literal('bruto'),
);

/** Resolve a lotItems join row by its productInventory itemId — used by the
 *  QR scanner to jump straight to an item's edit view without the operator
 *  needing to know which lote it lives in. Also read by anima-bot's
 *  `casillaV4` (anima-bot/src/fotosintesis/client.ts) to resolve a v4 casilla
 *  state, so it accepts EITHER a staff session or the bot secret — see
 *  `_lib/requireStaffSession.ts`'s `isStaffOrBotSession`. */
/**
 * EL LOCKSTEP CON anima-bot YA ESTÁ VIVO (merge de `feat/wizards-viabot` a `main`).
 *
 * La rama de wizards declaraba `sessionToken`/`botSecret` acá SIN gatear, a propósito, para
 * que anima-bot pudiera empezar a mandar `botSecret` antes del merge: Convex **rechaza
 * argumentos no declarados**, así que el commit del bot no podía aterrizar antes. Con el merge
 * llega el gate de `main`, y a partir de ahora **un llamador sin credencial recibe `null`**.
 *
 * Qué se rompe si el bot no lo manda: `casillaV4` recibe `null`, y el wizard traduce `null` a
 * «no es una casilla v4 — es del riel viejo». O sea que el tap del tablero y el deep link
 * `cas_` fallan **culpando a los datos y no al deploy**, que es el peor modo de fallo posible.
 *
 * El commit que lo cierra del lado del bot es `fix/botsecret-queries-gateadas` (`cd7667d`), que
 * mete un `queryAuthed` y lo usa acá, en `providers:list` y en `products:list`. **Verificado el
 * 2026-08-13: NO está en `main` de anima-bot.** Tiene que aterrizar junto con este merge.
 *
 * Ver `anima-bot/docs/reconciliacion-v4-tierramadre.md` §4.1 F3.
 */
export const getByItemId = query({
  args: {
    itemId: v.string(),
    sessionToken: v.optional(v.string()),
    botSecret: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, sessionToken, botSecret }) => {
    if (!(await isStaffOrBotSession({ sessionToken, botSecret }))) return null;
    const row = await ctx.db
      .query('lotItems')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    // Gemela de `listByLote`: mismo `costoUnitarioRealCOP` capturado en v4,
    // misma query pública sin `idToken`. Ver `_lib/saleSafe.ts`.
    return row ? omitInternosV4(row) : null;
  },
});

export const listByLote = query({
  args: { loteId: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, { loteId, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return [];
    const items = await ctx.db
      .query('lotItems')
      .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
      .collect();
    const sorted = items.sort((a, b) => a.ordenEnLote - b.ordenEnLote);
    // Enrich each join row with the human-readable `nombre` (and `tipo`) from
    // its productInventory mirror so the capture bandeja can show the name the
    // operator typed — not just the sequential itemId. Keeps the field additive
    // for other consumers (LoteResumenPage) that ignore it.
    return await Promise.all(
      sorted.map(async (item) => {
        const product = await ctx.db
          .query('productInventory')
          .withIndex('by_itemId', (q) => q.eq('itemId', item.itemId))
          .first();
        // El spread arrastra lo que la casilla v4 sumó al documento: el costo
        // unitario capturado y el rango de venta esperado. Ver `_lib/saleSafe.ts`
        // — las pantallas W2 leen por `casillas.*`, que sí está gateada por rol.
        return {
          ...omitInternosV4(item),
          nombre: product?.nombre,
          tipoEsmeralda: product?.tipoEsmeralda,
        };
      }),
    );
  },
});

/** Case-insensitive, comma-tolerant normalization for free-text `medidas`
 *  matching — "3,5mm" and "3.5mm" (or with/without spaces) compare equal. */
function normalizeMedidas(s: string): string {
  return s.toLowerCase().replace(/,/g, '.').replace(/\s+/g, '');
}

/**
 * Stock search for the anima-bot Telegram bridge (`searchItems` in
 * anima-bot/src/fotosintesis/client.ts) — answers "¿hay gemas de 3,5mm
 * disponibles?"-style questions.
 *
 * NOTE: despite living in this file, this reads `productInventory`, not the
 * `lotItems` table. `lotItems` only carries {loteId, itemId, preponderancia,
 * costoBaseCOP, ordenEnLote} — none of tipo/nombre/medidas/cantidad/color/
 * calidad/ubicacion/mostrarEnCatalogo exist there; they're all on the linked
 * productInventory row. `loteId !== undefined` is treated as "is a lot item"
 * here, matching products.publishedCatalog's own convention (lotItems.create
 * always sets both together; _remove clears loteId on the orphaned row).
 *
 * GATED (2026-08-05, F7): was "no auth gate — public read", but the same
 * unauthenticated-POST audit that closed products.list/clients.list/etc.
 * showed this returns full productInventory rows (via omitFotosintesisOnly,
 * not a public projection) to anyone holding the Convex deployment URL. Now
 * requires EITHER a verified staff session OR the anima-bot shared secret
 * (`ANIMA_BOT_SECRET`) — see `_lib/requireStaffSession.ts`'s
 * `isStaffOrBotSession`. The bot secret path exists because this is exactly
 * `searchItems`'s stock-search query above, confirmed against
 * anima-bot/src/fotosintesis/client.ts. The bot's `.env` carries
 * `ANIMA_BOT_SECRET`, and since 2026-08 its client sends it on EVERY call,
 * queries included (`client.ts:391-396`) — this docblock used to say "its
 * query calls don't send it yet", which stopped being true and left anyone
 * reading it here with the opposite conclusion. `client.ts:371-383` documents
 * that gap as a past incident.
 */
export const search = query({
  args: {
    tipo: v.optional(v.string()),
    medidas: v.optional(v.string()),
    minCantidad: v.optional(v.number()),
    loteId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    botSecret: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { tipo, medidas, minCantidad, loteId, sessionToken, botSecret },
  ) => {
    // Lanza si la credencial vino y no sirve; `[]` solo cuando no vino ninguna.
    if (!(await requireStaffOrBotSession({ sessionToken, botSecret })))
      return [];
    // by_loteId is the only relevant index available — tipo has none, so it
    // (like medidas) is filtered in memory below regardless.
    const rows = loteId
      ? await ctx.db
          .query('productInventory')
          .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
          .collect()
      : await ctx.db.query('productInventory').collect();

    const effectiveMin = minCantidad ?? 1;
    const medidasQuery = medidas ? normalizeMedidas(medidas) : null;

    const filtered = rows.filter((row) => {
      if (row.loteId === undefined) return false;
      if (tipo !== undefined && row.tipo !== tipo) return false;
      if (effectiveMin > 0) {
        if (row.cantidad === undefined || row.cantidad < effectiveMin) {
          return false;
        }
      }
      if (medidasQuery !== null) {
        if (row.medidas === undefined) return false;
        if (!normalizeMedidas(row.medidas).includes(medidasQuery)) {
          return false;
        }
      }
      return true;
    });

    // Devuelve el documento completo, así que toda columna nueva del SOT sale
    // por acá sola. El anima-bot consume esta query (ver asesorMovements.ts):
    // las 14 columnas de Fotosíntesis no le corresponden. Ver _lib/saleSafe.ts.
    return filtered
      .sort((a, b) => {
        const cantDiff = (b.cantidad ?? 0) - (a.cantidad ?? 0);
        if (cantDiff !== 0) return cantDiff;
        return (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es');
      })
      .map(omitFotosintesisOnly);
  },
});

/**
 * Cumulative preponderancia for a given lot. Reactive — the wizard
 * subscribes to this so the PreponderanciaTracker updates as items are
 * created/edited. Also read by anima-bot's `preponderanciaState`
 * (anima-bot/src/fotosintesis/client.ts) — accepts either a staff session or
 * the bot secret, see `_lib/requireStaffSession.ts`'s `isStaffOrBotSession`.
 */
export const sumPreponderancia = query({
  args: {
    loteId: v.string(),
    sessionToken: v.optional(v.string()),
    botSecret: v.optional(v.string()),
  },
  handler: async (ctx, { loteId, sessionToken, botSecret }) => {
    if (!(await isStaffOrBotSession({ sessionToken, botSecret }))) {
      return { sum: 0, count: 0, remaining: 100, overflow: 0 };
    }
    const items = await ctx.db
      .query('lotItems')
      .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
      .collect();
    const sum = items.reduce((s, it) => s + it.preponderancia, 0);
    return {
      sum,
      count: items.length,
      remaining: Math.max(0, 100 - sum),
      overflow: Math.max(0, sum - 100),
    };
  },
});

/**
 * Allocate the next sequential itemId in productInventory.
 *
 * Mirrors createProduct's approach but as a server-side numeric pick
 * rather than a user-supplied ID. We scan productInventory for the
 * highest numeric itemId and return next + 1 as a string.
 */
async function nextItemId(ctx: {
  db: { query: (table: 'productInventory' | 'lotItems') => any };
}): Promise<string> {
  // NOTE: itemId allocation relies on Convex OCC serializing this table scan. clientToken (above) closes the AI-retry replay path; a concurrency test should prove the distinct-create path before any allocator change.
  //
  // Mira LOS DOS rieles (2026-08-01). Las casillas v4 viven solo en `lotItems`
  // y no tienen fila en `productInventory`, así que un allocator que escaneara
  // solo el inventario les asignaría a los ítems nuevos un número ya usado por
  // una casilla. No es una carrera: pasa determinísticamente en la primera
  // captura vieja después del primer lote v4 — o sea, en la doble corrida.
  // Como los QR impresos referencian `#NNN`, un choque son dos piedras
  // distintas con la misma etiqueta física.
  const inventario = await ctx.db.query('productInventory').collect();
  const casillas = await ctx.db.query('lotItems').collect();
  let max = 0;
  for (const p of [...inventario, ...casillas]) {
    const n = Number(p.itemId);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}

/**
 * Create one item in a lot. This:
 *   1. Reads the lot to validate state.
 *   2. Allocates the next itemId in productInventory.
 *   3. Starts costoBaseCOP at 0 — cost is sheet-owned (2026-07-24), typed into
 *      column L by hand and pulled back later; no derivation from the lote.
 *   4. Inserts the productInventory row directly (mostrarEnCatalogo:false).
 *   5. Inserts the lotItems row.
 *   6. Schedules the productInventory push (mode: append).
 */
const createArgs = {
  loteId: v.string(),
  tipo: tipoItemValidator,
  nombre: v.string(),
  preponderancia: v.number(),
  // Type-specific fields are passed flat; the wizard validates per-type.
  color: v.optional(v.string()),
  calidad: v.optional(v.string()),
  peso: v.optional(v.string()),
  medidas: v.optional(v.string()),
  talla: v.optional(v.string()),
  categoria: v.optional(v.string()),
  coleccion: v.optional(v.string()),
  caja: v.optional(v.string()),
  cantidad: v.optional(v.number()),
  ubicacion: v.optional(v.string()),
  observacion: v.optional(v.string()),
  procedencia: v.optional(v.string()),
  precioPublicoCOP: v.optional(v.number()),
  mostrarEnCatalogo: v.optional(v.boolean()),
  nivelRareza: v.optional(v.number()),
  calificacion: v.optional(v.number()),
  tipoEsmeralda: v.optional(v.string()),
  subtipoForm: v.optional(v.string()),
  tipoJoya: v.optional(v.string()),
  tecnicaJoya: v.optional(v.string()),
  minerales: v.optional(v.array(v.string())),
  complementos: v.optional(v.array(v.string())),
  fotoUrl: v.optional(v.string()),
  certificadoUrl: v.optional(v.string()),
  formulaGema: v.optional(v.string()),
  formulaJoya: v.optional(v.string()),
  rangoDescuento: v.optional(v.string()),
  precioEmbajadorCOP: v.optional(v.number()),
  precioConscienteCOP: v.optional(v.number()),
  // Bruto-only — informational fields about an unworked parcel.
  rendimientoEsperado: v.optional(v.number()),
  cantidadEstimada: v.optional(v.number()),
  clientToken: v.optional(v.string()),
};

export const _create = internalMutation({
  args: createArgs,
  handler: async (ctx, args) => {
    // Idempotency guard (money-critical): replay of the same clientToken
    // returns the prior result instead of allocating a second itemId / inserting
    // a duplicate productInventory + lotItems row. The created lotItems row is
    // existence-checked — if it was since removed (orphaned + deleted), the stale
    // token is dropped and the create runs again (C7).
    if (args.clientToken) {
      const prior = await ctx.db
        .query('commitTokens')
        .withIndex('by_token', (q) => q.eq('token', args.clientToken!))
        .unique();
      if (prior) {
        const stillThere = await ctx.db.get(prior.primaryId as Id<'lotItems'>);
        if (stillThere) {
          return JSON.parse(prior.result) as {
            lotItemId: Id<'lotItems'>;
            productId: Id<'productInventory'>;
            itemId: string;
            costoBaseCOP: number;
          };
        }
        await ctx.db.delete(prior._id);
      }
    }

    if (args.preponderancia <= 0 || args.preponderancia > 100) {
      throw new Error('preponderancia debe estar en (0, 100]');
    }
    if (args.nombre.trim().length === 0) {
      throw new Error('Nombre es obligatorio');
    }

    const lot = await ctx.db
      .query('lots')
      .withIndex('by_loteId', (q) => q.eq('loteId', args.loteId))
      .first();
    if (!lot) throw new Error(`Lote ${args.loteId} no encontrado`);
    if (lot.estado !== 'abierto') {
      throw new Error('Sólo se pueden añadir ítems a un lote abierto');
    }

    const existing = await ctx.db
      .query('lotItems')
      .withIndex('by_loteId', (q) => q.eq('loteId', args.loteId))
      .collect();

    if (existing.length >= lot.unidadesDeclaradas) {
      throw new Error(
        `El lote ya tiene ${existing.length} ítems (declaradas: ${lot.unidadesDeclaradas})`,
      );
    }

    const sumExisting = existing.reduce((s, it) => s + it.preponderancia, 0);
    if (sumExisting + args.preponderancia > 100.01) {
      throw new Error(
        `La preponderancia ${args.preponderancia}% excede el 100% del lote ` +
          `(actual ${sumExisting}%, intento ${args.preponderancia}%).`,
      );
    }

    // COST OWNERSHIP (2026-07-24): costoBaseCOP is sheet-owned. A new item starts
    // at 0; a human types the real item cost into column L of the sheet and it is
    // pulled back into Convex. The old preponderancia-based derivation
    // (lot.costoTotalCOP × preponderancia%) is fully deactivated.
    const costoBaseCOP = 0;

    const itemId = await nextItemId(ctx);
    const now = new Date().toISOString();

    const allInv = await ctx.db.query('productInventory').collect();
    const maxRow = allInv.reduce((m, p) => Math.max(m, p.rowIndex), 1);
    const productId = await ctx.db.insert('productInventory', {
      itemId,
      rowIndex: maxRow + 1,
      nombre: args.nombre,
      peso: args.peso,
      color: args.color,
      calidad: args.calidad,
      cantidad: args.cantidad,
      talla: args.talla,
      medidas: args.medidas,
      categoria: args.categoria,
      ubicacion: args.ubicacion,
      coleccion: args.coleccion,
      caja: args.caja,
      precioCOP: args.precioPublicoCOP,
      estado: 'DISPONIBLE' as const,
      loteId: args.loteId,
      preponderancia: args.preponderancia,
      costoBaseCOP,
      ...withPublishStamp(
        null,
        args.mostrarEnCatalogo ?? false,
        args.mostrarEnCatalogo
          ? await lotProvenance(ctx, args.loteId)
          : undefined,
      ),
      tipo: args.tipo,
      procedencia: args.procedencia,
      observacion: args.observacion,
      rendimientoEsperado: args.rendimientoEsperado,
      cantidadEstimada: args.cantidadEstimada,
      nivelRareza: args.nivelRareza,
      calificacion: args.calificacion,
      tipoEsmeralda: args.tipoEsmeralda,
      subtipoForm: args.subtipoForm,
      tipoJoya: args.tipoJoya,
      tecnicaJoya: args.tecnicaJoya,
      minerales: args.minerales,
      complementos: args.complementos,
      fotoUrl: args.fotoUrl,
      certificadoUrl: args.certificadoUrl,
      formulaGema: args.formulaGema,
      formulaJoya: args.formulaJoya,
      rangoDescuento: args.rangoDescuento,
      // DERIVED single final price (2026-07-21 refactor); replaces the tiers.
      precioFinalCOP: computePrecioFinal(costoBaseCOP),
      lastPulledAt: now,
      syncStatus: 'pending' as const,
    });

    // BANDWIDTH: keep the inventoryStats counter in sync (+1) so
    // products.syncStats reads ONE singleton doc instead of reactively
    // scanning up to 1000 full productInventory documents. total is
    // monotonic — a new lot item only ever adds to it.
    await bumpInventoryTotal(ctx, 1);

    // Fix 1C — a wizard capture only reaches the public catalog when it is
    // created already published, which is the uncommon case; the guard keeps
    // ordinary captures from invalidating anyone's cache.
    await bumpCatalogVersionIfPublished(ctx, null, {
      mostrarEnCatalogo: args.mostrarEnCatalogo ?? false,
    });

    // Single audit row captures the wizard creation. The same auditId
    // feeds api.products.pushToSheet so the audit moves from "pending"
    // to "saved" once Sheets confirms the row.
    const auditId = await ctx.db.insert('productEdits', {
      itemId,
      editorEmail: 'fotosintesis-wizard',
      editedAt: now,
      changes: [{ field: 'tipo', before: null, after: args.tipo }],
      status: 'pending' as const,
    });

    const lotItemId = await ctx.db.insert('lotItems', {
      loteId: args.loteId,
      itemId,
      preponderancia: args.preponderancia,
      costoBaseCOP,
      ordenEnLote: existing.length + 1,
    });

    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId,
      auditId,
      mode: 'append',
    });

    const result = { lotItemId, productId, itemId, costoBaseCOP };
    if (args.clientToken) {
      await ctx.db.insert('commitTokens', {
        token: args.clientToken,
        kind: 'item.create',
        primaryId: lotItemId,
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
  ): Promise<{
    lotItemId: Id<'lotItems'>;
    productId: Id<'productInventory'>;
    itemId: string;
    costoBaseCOP: number;
  }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.lotItems._create, args);
  },
});

/**
 * anima-bot bridge — create a lot item from the Telegram wizard. Same contract
 * as `create`, but authenticated with the shared bot secret instead of a Google
 * ID token (see `_lib/botAuth.ts`). Reuses `_create` unchanged, so all the
 * money-critical guards (preponderancia ≤ 100, lote abierto, idempotency via
 * `clientToken`) apply identically.
 */
export const createViaBot = action({
  args: { botSecret: v.string(), ...createArgs },
  handler: async (
    ctx,
    { botSecret, ...args },
  ): Promise<{
    lotItemId: Id<'lotItems'>;
    productId: Id<'productInventory'>;
    itemId: string;
    costoBaseCOP: number;
  }> => {
    requireBotSecret(botSecret);
    return await ctx.runMutation(internal.lotItems._create, args);
  },
});

/**
 * anima-bot bridge — patch fotoUrl/certificadoUrl after the bot has uploaded the
 * media to Drive (the item must exist first so the upload folder is keyed by its
 * itemId, mirroring the web capture flow). Reuses `_updateMedia`.
 */
export const updateMediaViaBot = action({
  args: {
    botSecret: v.string(),
    lotItemId: v.id('lotItems'),
    fotoUrl: v.optional(v.string()),
    certificadoUrl: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { botSecret, lotItemId, fotoUrl, certificadoUrl },
  ): Promise<{
    lotItemId: Id<'lotItems'>;
    changed: boolean;
    changedFields?: string[];
  }> => {
    requireBotSecret(botSecret);
    return await ctx.runMutation(internal.lotItems._updateMedia, {
      lotItemId,
      fotoUrl,
      certificadoUrl,
      editorEmail: 'anima-bot',
    });
  },
});

/**
 * Attach an EXISTING productInventory row to a lote by creating its lotItems row.
 * Unlike `_create`, this does NOT allocate a new itemId and does NOT recompute
 * costoBaseCOP from the lote: it reuses the product's own cost and joins it at
 * `preponderancia: 0` (bears none of the lote's *declared* cost — for insumos
 * that already carry their own cost, e.g. the seedToposSubdivision items). This
 * lets a lote-less product become photo-eligible (fotoUrl requires a lotItemId)
 * without touching the money model or the lote's other items. Idempotent: if the
 * item already has a lotItems row, returns it unchanged.
 */
export const _attachExistingToLote = internalMutation({
  args: {
    itemId: v.string(),
    loteId: v.string(),
    editorEmail: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, loteId, editorEmail }) => {
    const product = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!product) throw new Error(`productInventory ${itemId} no encontrado`);

    const existing = await ctx.db
      .query('lotItems')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (existing) {
      return {
        itemId,
        attached: false as const,
        lotItemId: existing._id,
        reason: 'ya tiene lotItems',
      };
    }

    const lot = await ctx.db
      .query('lots')
      .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
      .first();
    if (!lot) throw new Error(`Lote ${loteId} no encontrado`);

    const siblings = await ctx.db
      .query('lotItems')
      .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
      .collect();
    const ordenEnLote =
      siblings.reduce((m, s) => Math.max(m, s.ordenEnLote), 0) + 1;

    const lotItemId = await ctx.db.insert('lotItems', {
      loteId,
      itemId,
      preponderancia: 0, // insumo: no comparte el costo declarado del lote
      costoBaseCOP: product.costoBaseCOP ?? 0, // preserva su costo propio
      ordenEnLote,
    });

    const now = new Date().toISOString();
    const auditId = await ctx.db.insert('productEdits', {
      itemId,
      editorEmail: editorEmail ?? 'anima-bot',
      editedAt: now,
      changes: [
        { field: 'loteId', before: product.loteId ?? null, after: loteId },
      ],
      status: 'pending' as const,
    });

    await ctx.db.patch(product._id, {
      loteId,
      syncStatus: 'pending' as const,
      syncError: undefined,
    });

    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId,
      auditId,
      mode: 'patch',
    });

    return { itemId, attached: true as const, lotItemId };
  },
});

/**
 * Patch the preponderancia of an existing lot item. Cost is DECOUPLED from
 * preponderancia (2026-07-24): `costoBaseCOP` is sheet-owned and is NOT touched
 * here — only the item's share (preponderancia) is updated on both the lotItems
 * join and the productInventory mirror, and a push is scheduled with an audit
 * row for that field.
 *
 * BR-2 (sum ≤ 100) is re-validated server-side against the *other*
 * items in the lot so the operator can drop one ítem's share and
 * raise another without tripping the overflow guard.
 */
export const _updatePreponderancia = internalMutation({
  args: {
    lotItemId: v.id('lotItems'),
    preponderancia: v.number(),
    editorEmail: v.optional(v.string()),
  },
  handler: async (ctx, { lotItemId, preponderancia, editorEmail }) => {
    // NOTE: this internalMutation is only ever invoked via ctx.runMutation
    // from the `updatePreponderancia` action below. Convex redacts plain
    // `Error` messages thrown by functions reached that way in production
    // deployments (the client only sees a generic "Server Error" — this is
    // what operators were seeing instead of the real validation reason).
    // ConvexError is the one error type Convex always forwards verbatim, so
    // every guard here throws ConvexError instead of Error.
    if (preponderancia <= 0 || preponderancia > 100) {
      throw new ConvexError('preponderancia debe estar en (0, 100]');
    }
    const existing = await ctx.db.get(lotItemId);
    if (!existing) throw new ConvexError(`lotItem ${lotItemId} no encontrado`);

    const lot = await ctx.db
      .query('lots')
      .withIndex('by_loteId', (q) => q.eq('loteId', existing.loteId))
      .first();
    if (!lot) throw new ConvexError(`Lote ${existing.loteId} no encontrado`);
    // Editing is allowed in any lot estado — the studio needs to fix
    // preponderancia after a lot has been closed/published when a
    // mis-keyed split is discovered. Preponderancia overflow is still
    // re-validated below.

    const siblings = await ctx.db
      .query('lotItems')
      .withIndex('by_loteId', (q) => q.eq('loteId', existing.loteId))
      .collect();
    // Round to 2 decimals before summing/comparing — siblings can carry
    // long binary-float tails from prior divisions (equal-split creates,
    // earlier edits), and comparing those raw tails against a 100.01
    // tolerance risks a false "exceeds 100%" rejection on a legitimate
    // nudge (e.g. 99.9% -> 100.0%).
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const sumOthers = round2(
      siblings
        .filter((s) => s._id !== lotItemId)
        .reduce((s, it) => s + it.preponderancia, 0),
    );
    if (round2(sumOthers + preponderancia) > 100.01) {
      throw new ConvexError(
        `La preponderancia ${preponderancia}% excede el 100% del lote ` +
          `(otros ítems suman ${sumOthers}%).`,
      );
    }

    // Cost is sheet-owned (2026-07-24) — patch ONLY the share, never costoBaseCOP.
    await ctx.db.patch(lotItemId, { preponderancia });

    const product = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', existing.itemId))
      .first();
    if (product) {
      const now = new Date().toISOString();
      await ctx.db.patch(product._id, {
        preponderancia,
        syncStatus: 'pending' as const,
      });
      const auditId = await ctx.db.insert('productEdits', {
        itemId: product.itemId,
        editorEmail: editorEmail ?? 'fotosintesis-edit',
        editedAt: now,
        changes: [
          {
            field: 'preponderancia',
            before: existing.preponderancia,
            after: preponderancia,
          },
        ],
        status: 'pending' as const,
      });
      await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
        itemId: product.itemId,
        auditId,
        mode: 'patch',
      });
    }

    // costoBaseCOP is unchanged by a preponderancia edit; echo the existing
    // sheet-owned value to keep the action's return shape stable.
    return { lotItemId, preponderancia, costoBaseCOP: existing.costoBaseCOP };
  },
});

export const updatePreponderancia = action({
  args: {
    idToken: v.string(),
    lotItemId: v.id('lotItems'),
    preponderancia: v.number(),
  },
  handler: async (
    ctx,
    { idToken, lotItemId, preponderancia },
  ): Promise<{
    lotItemId: Id<'lotItems'>;
    preponderancia: number;
    costoBaseCOP: number;
  }> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.lotItems._updatePreponderancia, {
      lotItemId,
      preponderancia,
      editorEmail: caller.email,
    });
  },
});

/**
 * Patch a lot item's gema metadata. Accepts any subset of editable
 * fields and writes them to the linked productInventory row. If
 * `preponderancia` is in the patch, the share is re-validated (BR-2) and
 * updated on both the lotItems join and the productInventory mirror —
 * `costoBaseCOP` is sheet-owned (2026-07-24) and is NOT recomputed or touched.
 *
 * A single productEdits audit row captures every changed field with
 * before/after values. Sheets push is scheduled once at the end so a
 * multi-field edit is one network round-trip.
 *
 * Only fields actually different from the existing values produce
 * patches/audit entries — a no-op call returns early.
 */
const gemaPatchValidator = v.object({
  nombre: v.optional(v.string()),
  peso: v.optional(v.string()),
  color: v.optional(v.string()),
  calidad: v.optional(v.string()),
  procedencia: v.optional(v.string()),
  observacion: v.optional(v.string()),
  talla: v.optional(v.string()),
  medidas: v.optional(v.string()),
  cantidad: v.optional(v.number()),
  categoria: v.optional(v.string()),
  nivelRareza: v.optional(v.number()),
  calificacion: v.optional(v.number()),
  tipoEsmeralda: v.optional(v.string()),
  subtipoForm: v.optional(v.string()),
  tipoJoya: v.optional(v.string()),
  tecnicaJoya: v.optional(v.string()),
  minerales: v.optional(v.array(v.string())),
  complementos: v.optional(v.array(v.string())),
  fotoUrl: v.optional(v.string()),
  certificadoUrl: v.optional(v.string()),
  formulaGema: v.optional(v.string()),
  formulaJoya: v.optional(v.string()),
  rangoDescuento: v.optional(v.string()),
  precioEmbajadorCOP: v.optional(v.number()),
  precioConscienteCOP: v.optional(v.number()),
  precioPublicoCOP: v.optional(v.number()),
  mostrarEnCatalogo: v.optional(v.boolean()),
  preponderancia: v.optional(v.number()),
  // Bruto-only informational fields — editable like any other captured
  // value once the parcel is in the lot.
  cantidadEstimada: v.optional(v.number()),
  rendimientoEsperado: v.optional(v.number()),
});

export const _updateGemaFields = internalMutation({
  args: {
    lotItemId: v.id('lotItems'),
    patch: gemaPatchValidator,
    editorEmail: v.optional(v.string()),
  },
  handler: async (ctx, { lotItemId, patch, editorEmail }) => {
    const lotItem = await ctx.db.get(lotItemId);
    if (!lotItem) throw new Error(`lotItem ${lotItemId} no encontrado`);

    const lot = await ctx.db
      .query('lots')
      .withIndex('by_loteId', (q) => q.eq('loteId', lotItem.loteId))
      .first();
    if (!lot) throw new Error(`Lote ${lotItem.loteId} no encontrado`);
    // Editing is allowed in any lot estado. The studio needs to fix
    // gem details (e.g. a wrongly-keyed peso or color) after a lot has
    // been closed or even published. Preponderancia overflow and the
    // BR-2 invariant are still re-validated below before any writes.

    const product = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', lotItem.itemId))
      .first();
    if (!product) {
      throw new Error(`productInventory para ${lotItem.itemId} no encontrado`);
    }

    // Validate nombre — productInventory mirror cannot have an empty name.
    if (patch.nombre !== undefined && patch.nombre.trim().length === 0) {
      throw new Error('Nombre es obligatorio');
    }

    // Re-validate preponderancia against siblings (BR-2) before any writes.
    // Cost is DECOUPLED (2026-07-24): a preponderancia edit no longer derives
    // costoBaseCOP — cost is sheet-owned.
    let nextPreponderancia: number | undefined;
    if (patch.preponderancia !== undefined) {
      const p = patch.preponderancia;
      if (p <= 0 || p > 100) {
        throw new Error('preponderancia debe estar en (0, 100]');
      }
      const siblings = await ctx.db
        .query('lotItems')
        .withIndex('by_loteId', (q) => q.eq('loteId', lotItem.loteId))
        .collect();
      const sumOthers = siblings
        .filter((s) => s._id !== lotItemId)
        .reduce((s, it) => s + it.preponderancia, 0);
      if (sumOthers + p > 100.01) {
        throw new Error(
          `La preponderancia ${p}% excede el 100% del lote ` +
            `(otros ítems suman ${sumOthers}%).`,
        );
      }
      nextPreponderancia = p;
    }

    // Compute the diff vs current product/lotItem state so we audit only
    // real changes. `precioPublicoCOP` from the UI maps to productInventory.precioCOP.
    type Change = {
      field: string;
      before: string | number | null;
      after: string | number | null;
    };
    const changes: Change[] = [];
    const productPatch: Record<string, unknown> = {};

    const compareString = (
      field: string,
      next: string | undefined,
      current: string | undefined,
      targetField?: string,
    ) => {
      if (next === undefined) return;
      const normalized = next.trim();
      const finalValue = normalized.length === 0 ? undefined : normalized;
      if (finalValue === current) return;
      productPatch[targetField ?? field] = finalValue;
      changes.push({
        field,
        before: current ?? null,
        after: finalValue ?? null,
      });
    };

    compareString('nombre', patch.nombre, product.nombre);
    compareString('peso', patch.peso, product.peso);
    compareString('color', patch.color, product.color);
    compareString('calidad', patch.calidad, product.calidad);
    compareString('procedencia', patch.procedencia, product.procedencia);
    compareString('observacion', patch.observacion, product.observacion);
    compareString('talla', patch.talla, product.talla);
    compareString('medidas', patch.medidas, product.medidas);
    compareString('categoria', patch.categoria, product.categoria);
    compareString('tipoEsmeralda', patch.tipoEsmeralda, product.tipoEsmeralda);
    compareString('subtipoForm', patch.subtipoForm, product.subtipoForm);
    compareString('tipoJoya', patch.tipoJoya, product.tipoJoya);
    compareString('tecnicaJoya', patch.tecnicaJoya, product.tecnicaJoya);
    compareString('formulaGema', patch.formulaGema, product.formulaGema);
    compareString('formulaJoya', patch.formulaJoya, product.formulaJoya);
    compareString(
      'rangoDescuento',
      patch.rangoDescuento,
      product.rangoDescuento,
    );
    compareString('fotoUrl', patch.fotoUrl, product.fotoUrl);
    compareString(
      'certificadoUrl',
      patch.certificadoUrl,
      product.certificadoUrl,
    );

    const compareNumber = (
      field: string,
      next: number | undefined,
      current: number | undefined,
    ) => {
      if (next === undefined) return;
      if (next === current) return;
      productPatch[field] = next;
      changes.push({ field, before: current ?? null, after: next });
    };

    compareNumber('cantidad', patch.cantidad, product.cantidad);
    compareNumber('nivelRareza', patch.nivelRareza, product.nivelRareza);
    compareNumber('calificacion', patch.calificacion, product.calificacion);
    compareNumber(
      'cantidadEstimada',
      patch.cantidadEstimada,
      product.cantidadEstimada,
    );
    compareNumber(
      'rendimientoEsperado',
      patch.rendimientoEsperado,
      product.rendimientoEsperado,
    );
    // Price tiers removed (2026-07-21): precioFinalCOP is derived from
    // costoBaseCOP, not set directly here. Any tier fields still in the patch
    // are ignored.

    if (patch.minerales !== undefined) {
      const prev = product.minerales ?? [];
      const next = patch.minerales;
      const same =
        prev.length === next.length && prev.every((v, i) => v === next[i]);
      if (!same) {
        productPatch.minerales = next;
        changes.push({
          field: 'minerales',
          before: prev.join(', ') || null,
          after: next.join(', ') || null,
        });
      }
    }

    if (patch.complementos !== undefined) {
      const prev = product.complementos ?? [];
      const next = patch.complementos;
      const same =
        prev.length === next.length && prev.every((v, i) => v === next[i]);
      if (!same) {
        productPatch.complementos = next;
        changes.push({
          field: 'complementos',
          before: prev.join(', ') || null,
          after: next.join(', ') || null,
        });
      }
    }

    if (patch.precioPublicoCOP !== undefined) {
      // F13 — a literal 0 is a real price (e.g. free / canje tier), NOT a
      // "clear" sentinel. Blank inputs arrive as undefined (the *PatchFromDraft
      // builders omit them) and are skipped by the guard above, so zero-handling
      // is now consistent with the precioEmbajador/Consciente tier fields.
      const next = patch.precioPublicoCOP;
      if (next !== product.precioCOP) {
        productPatch.precioCOP = next;
        changes.push({
          field: 'precioCOP',
          before: product.precioCOP ?? null,
          after: next ?? null,
        });
      }
    }

    if (patch.mostrarEnCatalogo !== undefined) {
      if (patch.mostrarEnCatalogo !== (product.mostrarEnCatalogo ?? false)) {
        Object.assign(
          productPatch,
          withPublishStamp(
            product,
            patch.mostrarEnCatalogo,
            patch.mostrarEnCatalogo
              ? await lotProvenance(ctx, product.loteId)
              : undefined,
          ),
        );
        changes.push({
          field: 'mostrarEnCatalogo',
          before: product.mostrarEnCatalogo ? 1 : 0,
          after: patch.mostrarEnCatalogo ? 1 : 0,
        });
      }
    }

    if (
      nextPreponderancia !== undefined &&
      nextPreponderancia !== lotItem.preponderancia
    ) {
      // Cost is sheet-owned (2026-07-24): update ONLY the share, never
      // costoBaseCOP, and never re-derive the price from it.
      productPatch.preponderancia = nextPreponderancia;
      changes.push({
        field: 'preponderancia',
        before: lotItem.preponderancia,
        after: nextPreponderancia,
      });
    }

    if (changes.length === 0) {
      return { lotItemId, changed: false };
    }

    // 1. Mirror writes (productInventory + lotItems if preponderancia changed).
    await ctx.db.patch(product._id, {
      ...productPatch,
      syncStatus: 'pending' as const,
      syncError: undefined,
    });

    // Fix 1C — this is the per-item editor: it can flip the publish toggle AND
    // it rewrites projected fields (precio, foto, the Fotosíntesis
    // characteristics). Guarded on before/after so an edit to a reserved piece
    // invalidates nothing, while both a publish and an unpublish do.
    await bumpCatalogVersionIfPublished(ctx, product, {
      mostrarEnCatalogo:
        (productPatch as { mostrarEnCatalogo?: boolean }).mostrarEnCatalogo ??
        product.mostrarEnCatalogo,
    });
    if (
      nextPreponderancia !== undefined &&
      nextPreponderancia !== lotItem.preponderancia
    ) {
      // Only the share is written back to the join — costoBaseCOP is sheet-owned.
      await ctx.db.patch(lotItemId, { preponderancia: nextPreponderancia });
    }

    // 2. Audit + scheduled sheet push.
    const now = new Date().toISOString();
    const auditId = await ctx.db.insert('productEdits', {
      itemId: product.itemId,
      editorEmail: editorEmail ?? 'fotosintesis-edit',
      editedAt: now,
      changes,
      status: 'pending' as const,
    });
    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId: product.itemId,
      auditId,
      mode: 'patch',
    });

    return {
      lotItemId,
      changed: true,
      changedFields: changes.map((c) => c.field),
      // costoBaseCOP is sheet-owned and unchanged by this edit; echo the
      // existing value to keep the action's return shape stable.
      costoBaseCOP: lotItem.costoBaseCOP,
    };
  },
});

export const updateGemaFields = action({
  args: {
    idToken: v.string(),
    lotItemId: v.id('lotItems'),
    patch: gemaPatchValidator,
  },
  handler: async (
    ctx,
    { idToken, lotItemId, patch },
  ): Promise<{
    lotItemId: Id<'lotItems'>;
    changed: boolean;
    changedFields?: string[];
    costoBaseCOP?: number;
  }> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.lotItems._updateGemaFields, {
      lotItemId,
      patch,
      editorEmail: caller.email,
    });
  },
});

/**
 * Update only an item's media (foto + certificado) on the linked
 * productInventory row. Unlike `updateGemaFields`, this is intentionally
 * **state-agnostic**: media is presentation metadata, not financial data, so
 * an operator can refresh / replace an item's photo after the lot has been
 * `cerrado` or `publicado` (e.g. a better studio shot arrives days later)
 * without reopening the lot.
 *
 * Pass an empty string to clear a field. Only fields that actually change
 * produce an audit entry + Sheets push; a no-op returns early.
 */
/**
 * Shared core for every media update. Takes the ALREADY-RESOLVED
 * productInventory row, because the two entry points reach it differently:
 * `_updateMedia` hops through a lotItems join row, `_updateMediaByItem` looks
 * the item up directly.
 *
 * Note what this does NOT touch: `lotItems`. Media has always lived on the
 * productInventory row — the join row was only ever an ADDRESSING handle, never
 * a destination. That is why an itemId-keyed entry point is not a workaround
 * but the more honest key: an item with no lote still has a photo and can still
 * earn a certificate.
 */
async function applyMediaToProduct(
  ctx: MutationCtx,
  product: Doc<'productInventory'>,
  opts: {
    fotoUrl?: string;
    certificadoUrl?: string;
    editorEmail?: string;
  },
): Promise<{ changed: boolean; changedFields?: string[] }> {
  type Change = {
    field: string;
    before: string | number | null;
    after: string | number | null;
  };
  const changes: Change[] = [];
  const productPatch: Record<string, unknown> = {};

  const applyMedia = (
    field: 'fotoUrl' | 'certificadoUrl',
    next: string | undefined,
    current: string | undefined,
  ) => {
    if (next === undefined) return;
    const normalized = next.trim();
    const finalValue = normalized.length === 0 ? undefined : normalized;
    if (finalValue === current) return;
    productPatch[field] = finalValue;
    changes.push({
      field,
      before: current ?? null,
      after: finalValue ?? null,
    });
  };

  applyMedia('fotoUrl', opts.fotoUrl, product.fotoUrl);
  applyMedia('certificadoUrl', opts.certificadoUrl, product.certificadoUrl);

  if (changes.length === 0) return { changed: false };

  await ctx.db.patch(product._id, {
    ...productPatch,
    syncStatus: 'pending' as const,
    syncError: undefined,
  });

  const now = new Date().toISOString();
  const auditId = await ctx.db.insert('productEdits', {
    itemId: product.itemId,
    editorEmail: opts.editorEmail ?? 'fotosintesis-media',
    editedAt: now,
    changes,
    status: 'pending' as const,
  });
  await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
    itemId: product.itemId,
    auditId,
    mode: 'patch',
  });

  return { changed: true, changedFields: changes.map((c) => c.field) };
}

export const _updateMedia = internalMutation({
  args: {
    lotItemId: v.id('lotItems'),
    fotoUrl: v.optional(v.string()),
    certificadoUrl: v.optional(v.string()),
    editorEmail: v.optional(v.string()),
  },
  handler: async (ctx, { lotItemId, fotoUrl, certificadoUrl, editorEmail }) => {
    const lotItem = await ctx.db.get(lotItemId);
    if (!lotItem) throw new Error(`lotItem ${lotItemId} no encontrado`);

    const product = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', lotItem.itemId))
      .first();
    if (!product) {
      throw new Error(`productInventory para ${lotItem.itemId} no encontrado`);
    }

    const result = await applyMediaToProduct(ctx, product, {
      fotoUrl,
      certificadoUrl,
      editorEmail,
    });
    return { lotItemId, ...result };
  },
});

/**
 * itemId-keyed twin of `_updateMedia`. Exists because requiring a `lotItemId`
 * made the certificate flow depend on the Convex-only `lotItems` join, which
 * the Sheets pull does not create (375 of 513 items have no join row today).
 * Since media lands on productInventory either way, the join hop bought nothing
 * and blocked every lote-less item.
 */
export const _updateMediaByItem = internalMutation({
  args: {
    itemId: v.string(),
    fotoUrl: v.optional(v.string()),
    certificadoUrl: v.optional(v.string()),
    editorEmail: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, fotoUrl, certificadoUrl, editorEmail }) => {
    const product = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!product) {
      throw new Error(`productInventory para ${itemId} no encontrado`);
    }

    const result = await applyMediaToProduct(ctx, product, {
      fotoUrl,
      certificadoUrl,
      editorEmail,
    });
    return { itemId, ...result };
  },
});

export const updateMedia = action({
  args: {
    idToken: v.string(),
    lotItemId: v.id('lotItems'),
    fotoUrl: v.optional(v.string()),
    certificadoUrl: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { idToken, lotItemId, fotoUrl, certificadoUrl },
  ): Promise<{
    lotItemId: Id<'lotItems'>;
    changed: boolean;
    changedFields?: string[];
  }> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.lotItems._updateMedia, {
      lotItemId,
      fotoUrl,
      certificadoUrl,
      editorEmail: caller.email,
    });
  },
});

/**
 * Public, itemId-keyed media update — same admin gate as `updateMedia`. The
 * certificate generator uses this so it never has to resolve a join row that
 * may not exist.
 */
export const updateMediaByItem = action({
  args: {
    idToken: v.string(),
    itemId: v.string(),
    fotoUrl: v.optional(v.string()),
    certificadoUrl: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { idToken, itemId, fotoUrl, certificadoUrl },
  ): Promise<{
    itemId: string;
    changed: boolean;
    changedFields?: string[];
  }> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.lotItems._updateMediaByItem, {
      itemId,
      fotoUrl,
      certificadoUrl,
      editorEmail: caller.email,
    });
  },
});

export const _remove = internalMutation({
  args: { lotItemId: v.id('lotItems'), editorEmail: v.optional(v.string()) },
  handler: async (ctx, { lotItemId, editorEmail }) => {
    const item = await ctx.db.get(lotItemId);
    if (!item) return { removed: false as const };
    // Item removal is allowed in any lot estado — operators may need to
    // pull a mis-captured stone out of a published lot. Sales referencing
    // the productInventory row stay safe because we orphan that row
    // (see below) rather than deleting it.
    const lot = await ctx.db
      .query('lots')
      .withIndex('by_loteId', (q) => q.eq('loteId', item.loteId))
      .first();

    // BR-2: after removing this item the remaining siblings must still sum to
    // 100% on a closed/published lot. Compute the post-removal sum BEFORE the
    // delete so we can warn the operator — previously this invariant broke
    // silently with no signal. (ISO-audit C7.)
    const siblings = await ctx.db
      .query('lotItems')
      .withIndex('by_loteId', (q) => q.eq('loteId', item.loteId))
      .collect();
    const sumAfter = preponderanciaSum(
      siblings.filter((s) => s._id !== lotItemId),
    );
    const balances = balancesTo100(sumAfter);

    await ctx.db.delete(lotItemId);
    // We leave the productInventory row in place — the user may want to
    // re-link it to a new lot, and deleting the row would cascade problems
    // with sales referencing it. Orphan it by clearing the lot-derived fields.
    // We deliberately do NOT push this orphaning to Sheets (pushToSheet routes
    // by loteId, which is now cleared → it would misroute to the legacy tab);
    // this matches lots.cancel's orphan path.
    const product = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', item.itemId))
      .first();
    if (product) {
      await ctx.db.patch(product._id, {
        loteId: undefined,
        preponderancia: undefined,
        costoBaseCOP: undefined,
      });
      // Audit row so the removal is traceable in the item's history — the old
      // remove left no record at all. (ISO-audit C7.) Stays "pending" because
      // the orphan intentionally isn't synced to Sheets (see above).
      await ctx.db.insert('productEdits', {
        itemId: product.itemId,
        editorEmail: editorEmail ?? 'fotosintesis-remove',
        editedAt: new Date().toISOString(),
        changes: [
          { field: 'loteId', before: item.loteId, after: null },
          { field: 'preponderancia', before: item.preponderancia, after: null },
          {
            field: 'costoBaseCOP',
            before: product.costoBaseCOP ?? null,
            after: null,
          },
        ],
        status: 'pending' as const,
      });
    }

    const warning =
      lot && lot.estado !== 'abierto' && !balances
        ? `El lote ${lot.loteId} (${lot.estado}) ya no suma 100% ` +
          `(ahora ${sumAfter.toFixed(2)}%). Ajustá la preponderancia de los ` +
          `ítems restantes.`
        : null;

    return {
      removed: true as const,
      lotEstado: lot?.estado ?? null,
      sumAfter,
      balances,
      warning,
    };
  },
});

export const remove = action({
  args: { idToken: v.string(), lotItemId: v.id('lotItems') },
  handler: async (
    ctx,
    { idToken, lotItemId },
  ): Promise<
    | { removed: false }
    | {
        removed: true;
        lotEstado: string | null;
        sumAfter: number;
        balances: boolean;
        warning: string | null;
      }
  > => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.lotItems._remove, {
      lotItemId,
      editorEmail: caller.email,
    });
  },
});
