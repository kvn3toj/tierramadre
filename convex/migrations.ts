/**
 * One-off data migrations. Run with `npx convex run --prod migrations:<name>`.
 * Safe to delete a migration once it has run in prod.
 */
import { internalMutation, internalAction } from './_generated/server';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { bumpInventoryTotal } from './products';
import { withPublishStamp } from './_lib/publishState';

/**
 * Backfill `publishedAt` for Fotosíntesis items published BEFORE the Estrenos
 * carousel integration shipped.
 *
 * `publishedAt` is stamped by `withPublishStamp()` only on a false→true
 * transition of `mostrarEnCatalogo` (see convex/_lib/publishState.ts). Items
 * already published before that helper existed never had a transition to
 * catch, so they'd never surface in Estrenos otherwise. This is a one-time
 * catch-up: every currently-published item without a stamp gets one, seeded
 * from its own `_creationTime` (when it was captured in Convex) — the closest
 * available proxy for "when it became new," since we don't know its actual
 * historical publish date.
 *
 * Idempotent: rows that already have `publishedAt` are skipped, so re-running
 * after a partial run or after new items are published normally is harmless.
 *
 *   npx convex run --prod migrations:backfillPublishedAt '{}'
 */
export const backfillPublishedAt = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query('productInventory')
      .withIndex('by_mostrarEnCatalogo', (q) => q.eq('mostrarEnCatalogo', true))
      .collect();

    const eligible = rows.filter(
      (row) => row.loteId !== undefined && row.publishedAt === undefined,
    );

    for (const row of eligible) {
      await ctx.db.patch(row._id, { publishedAt: row._creationTime });
    }

    return {
      backfilled: eligible.length,
      itemIds: eligible.map((row) => row.itemId),
    };
  },
});

/**
 * Merge the duplicated "Agua Marina" stone.
 *
 * The same 18.8 ct stone was catalogued twice:
 *   - item 340 "Aguamarina"  — the SOLD record (VENDIDA · Alvaro Pelaez ·
 *                              OFI.CALI), but that sale lives only in the SOT
 *                              sheet; Convex still shows it DISPONIBLE/empty.
 *                              (KEEP — surviving number, holds the sale.)
 *   - item 368 "Agua Marina" — the 20% member of lot C-007, marked DISPONIBLE
 *                              even though the stone was sold.  (DUPLICATE — delete.)
 *
 * We move C-007's membership onto item 340, re-assert 340's sold-state, and
 * delete 368, atomically, so the lot invariant is preserved (C-007 keeps 6
 * members summing 100%, just via 340 instead of 368) and the lot's member now
 * correctly reads VENDIDA. An audit row is written and item 340 is re-pushed to
 * the SOT Inventario tab. `itemId`s are NOT renumbered — they key Drive folders
 * + QR tags, so the retired number 368 simply becomes an (invisible) gap.
 *
 * NOTE: this collapses two records into one physical stone. It does NOT create a
 * formal `sales` row (we don't have the client / amount / date) — it only mirrors
 * the sheet's VENDIDA status. Record the actual sale separately if you need it
 * for commissions/analytics.
 *
 * Idempotent-ish: re-running after success aborts (340 already in C-007 / 368 gone).
 *
 *   npx convex run --prod migrations:mergeAguaMarina '{}'
 */
export const mergeAguaMarina = internalMutation({
  args: {},
  handler: async (ctx) => {
    const KEEP = '340';
    const DROP = '368';
    const LOTE = 'C-007';

    const keep = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', KEEP))
      .first();
    const drop = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', DROP))
      .first();

    if (!keep) throw new Error(`Aborting: item ${KEEP} not found`);
    if (!drop)
      return { ok: true, note: `item ${DROP} already gone — nothing to do` };
    if (keep.loteId && keep.loteId !== LOTE)
      throw new Error(
        `Aborting: item ${KEEP} already belongs to lote ${keep.loteId}`,
      );
    if (drop.loteId !== LOTE)
      throw new Error(
        `Aborting: item ${DROP} is not in ${LOTE} (loteId=${drop.loteId})`,
      );

    const joins = await ctx.db
      .query('lotItems')
      .withIndex('by_loteId', (q) => q.eq('loteId', LOTE))
      .collect();
    const dropJoin = joins.find((j) => j.itemId === DROP);
    if (!dropJoin)
      throw new Error(`Aborting: no ${LOTE} join for item ${DROP}`);
    if (joins.some((j) => j.itemId === KEEP))
      throw new Error(`Aborting: ${LOTE} already has a join for item ${KEEP}`);

    const now = new Date().toISOString();

    // Item 340's real sold-state lives ONLY in the SOT sheet (row 341) — it was
    // never mirrored into Convex (Convex shows it DISPONIBLE/empty, and item
    // 368's own record is DISPONIBLE too). Verified from the sheet 2026-07-01:
    //   ESTADO=VENDIDA · ASESOR=Alvaro Pelaez · UBICACIÓN=OFI.CALI
    // We MUST re-assert these on 340 before the push, or pushToSheet — which
    // writes the full field set from the Convex mirror (estado ?? "DISPONIBLE",
    // asesor ?? "", ubicacion ?? "") — would rewrite row 341 back to DISPONIBLE
    // and blank the ambassador + location, destroying the sale record.
    const SOLD = {
      estado: 'VENDIDA' as const,
      asesor: 'Alvaro Pelaez',
      ubicacion: 'OFI.CALI',
    };

    // 1. Copy the lot membership + lot pricing onto the surviving item 340,
    //    and preserve its sold-state (see SOLD above).
    await ctx.db.patch(keep._id, {
      loteId: LOTE,
      preponderancia: drop.preponderancia,
      costoBaseCOP: drop.costoBaseCOP,
      precioEmbajadorCOP: drop.precioEmbajadorCOP,
      precioConscienteCOP: drop.precioConscienteCOP,
      tipo: drop.tipo,
      estado: SOLD.estado,
      asesor: SOLD.asesor,
      ubicacion: SOLD.ubicacion,
      syncStatus: 'pending' as const,
      syncError: undefined,
    });

    // 2. Repoint the lot join → C-007 now counts item 340 at the same 20%.
    await ctx.db.patch(dropJoin._id, { itemId: KEEP });

    // 3. Delete the duplicate product row.
    await ctx.db.delete(drop._id);

    // 4. Keep the maintained inventory counter honest (-1).
    const stats = await ctx.db.query('inventoryStats').first();
    if (stats && stats.total > 0)
      await ctx.db.patch(stats._id, { total: stats.total - 1 });

    // 5. Audit on the surviving item, then push it to the SOT sheet (row 341).
    const auditId = await ctx.db.insert('productEdits', {
      itemId: KEEP,
      editorEmail: 'migration:mergeAguaMarina',
      editedAt: now,
      changes: [
        { field: 'loteId', before: keep.loteId ?? null, after: LOTE },
        { field: 'estado', before: keep.estado ?? null, after: SOLD.estado },
        { field: 'asesor', before: keep.asesor ?? null, after: SOLD.asesor },
        {
          field: 'ubicacion',
          before: keep.ubicacion ?? null,
          after: SOLD.ubicacion,
        },
        {
          field: 'preponderancia',
          before: keep.preponderancia ?? null,
          after: drop.preponderancia ?? null,
        },
        {
          field: 'costoBaseCOP',
          before: keep.costoBaseCOP ?? null,
          after: drop.costoBaseCOP ?? null,
        },
      ],
      status: 'pending' as const,
    });
    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId: KEEP,
      auditId,
      mode: 'patch',
    });

    return { ok: true, keptItemId: KEEP, deletedItemId: DROP, lote: LOTE };
  },
});

/**
 * Seed "Bucket C" — a batch of real inventory records handed off by the
 * studio (raw-stone lot + loose gemas + one anillo + an empty base lot for
 * 9 women's rings) that needed to land in prod as code instead of via the
 * Fotosíntesis UI. One-off, run once.
 *
 * This is an `internalAction` (not an `internalMutation`) so it can drive
 * the SAME guarded mutations the wizard itself uses — `lots._create` /
 * `lotItems._create` / `products._createProduct` — via `ctx.runMutation`.
 * Per `commissions.ts`'s note, `ctx.runMutation` from inside a function is a
 * cross-transaction call: each create below commits on its own (not one
 * giant atomic transaction). That's fine here — it mirrors how the real
 * capture wizard itself sequences a lot-open followed by N item-creates,
 * and every individual create still gets its own guards (preponderancia
 * ≤100%, idempotency, lot-state checks).
 *
 * Provider choices (no provider was specified by the source data):
 *   - Rocas Lunares (raw stone) → "Edwin Mauricio Ruiz" (tipo "gemas"),
 *     the same provider behind the reference lot C-013 "Rocas Sagradas".
 *   - Lote base 9 anillos mujer (silver rings) → "Taller de Bronce El Rey,
 *     Joyas Artesanales" (tipo "joyas"), the active silver-jewelry supplier
 *     behind the most recent C-023..C-033 lots.
 * `sede: 'C'`, `formaPago: 'contado'`, `metodoContado: 'transferencia'` are
 * assumptions matching every other lot in prod — flag for the studio to
 * correct if wrong.
 *
 * SKIPPED (not created — see schema-verification notes, no forced fit):
 *   - Esferas del Dragón + 4 topos/cadenas "insumos": there is no
 *     materials/insumos STOCK table in the schema. `productInventory.tipo`
 *     accepts the literal `"insumo"` and `providers.tipo` accepts
 *     `"insumos"`, but neither carries quantity/cost tracking for loose
 *     jewelry-assembly components (findings/clasps/chain-by-the-meter) —
 *     the only real materials table (`materials`) is name+type only, no
 *     cantidad/costoCOP. Forcing these into `productInventory` would
 *     misrepresent them as sellable catalog items.
 *   - Gemas pedagógicas / Circones: marketing/educational items with no
 *     categoria in `CATEGORIAS` (src/data/vocabularies.ts) that fits —
 *     they aren't inventory in the Fotosíntesis sense.
 *
 * PRICING GAPS (flagged, not invented): items 2-5, 7, 8 below have no
 * `precioCOP` — the source data never gave a public/sale price for these,
 * only cost/weight/quality. Luz del Sol (7) and Aurora Escondida (8) also
 * have missing color/calidad/valor per the source data.
 *
 *   npx convex run --prod migrations:seedBucketC '{}'
 */
export const seedBucketC = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    rocasLunares: {
      loteId: string;
      items: Array<{ itemId: string; nombre: string; costoBaseCOP: number }>;
    };
    loteBaseAnillosMujer: { loteId: string };
    standalone: Array<{ itemId: string; nombre: string }>;
    skipped: string[];
  }> => {
    const EDWIN_PROVIDER_ID =
      'kd7dgn7p7yc35782q4qxb70kas87ces0' as Id<'providers'>;
    const TALLER_BRONCE_PROVIDER_ID =
      'kd7ckddjz19mat00t1222ztkx18a5wk1' as Id<'providers'>;
    const fecha = new Date().toISOString().slice(0, 10);

    // ── 1. Rocas Lunares — raw-stone lot + 5 sub-lote items ────────────
    const rocasLunaresLot = await ctx.runMutation(internal.lots._create, {
      sede: 'C',
      providerId: EDWIN_PROVIDER_ID,
      fechaRecepcion: fecha,
      renombreLote: 'Rocas Lunares',
      pesoTotalQuilates: 142.48,
      costoTotalCOP: 585000,
      unidadesDeclaradas: 5,
      formaPago: 'contado',
      metodoContado: 'transferencia',
      notas:
        'Migración seedBucketC: valores de sub-lote suman $584.950 vs $585.000 declarado (gap $50, rounding en la fuente) — ver reporte.',
    });

    const subLotesSpec = [
      {
        n: 1,
        piedras: 17,
        peso: '37.70',
        color: 'Verde Natural',
        calidad: 'COMERCIAL SUPERIOR',
        categoria: undefined as string | undefined,
        preponderancia: 26.4615,
      },
      {
        n: 2,
        piedras: 14,
        peso: '38.42',
        color: 'Verde Limón',
        calidad: 'COMERCIAL SUPERIOR',
        categoria: undefined as string | undefined,
        preponderancia: 26.9658,
      },
      {
        n: 3,
        piedras: 8,
        peso: '31.20',
        color: 'Verde Menta',
        calidad: 'COMERCIAL ESTÁNDAR',
        categoria: undefined as string | undefined,
        preponderancia: 21.8974,
      },
      {
        n: 4,
        piedras: 4,
        peso: '13.50',
        color: 'Verde Cristal',
        calidad: undefined as string | undefined,
        categoria: 'Rarezas',
        preponderancia: 9.4701,
      },
      {
        n: 5,
        piedras: 2,
        peso: '21.66',
        color: 'Verde Menta',
        calidad: 'COMERCIAL ESTÁNDAR',
        categoria: undefined as string | undefined,
        preponderancia: 15.1966,
      },
    ];

    const rocasLunaresItems: Array<{
      itemId: string;
      nombre: string;
      costoBaseCOP: number;
    }> = [];
    for (const sub of subLotesSpec) {
      const nombre = `Rocas Lunares - Sub-lote ${sub.n}`;
      const created = await ctx.runMutation(internal.lotItems._create, {
        loteId: rocasLunaresLot.loteId,
        tipo: 'bruto',
        nombre,
        preponderancia: sub.preponderancia,
        color: sub.color,
        calidad: sub.calidad,
        peso: sub.peso,
        categoria: sub.categoria,
        cantidadEstimada: sub.piedras,
        procedencia: 'Boyacá',
      });
      rocasLunaresItems.push({
        itemId: created.itemId,
        nombre,
        costoBaseCOP: created.costoBaseCOP,
      });
    }

    // ── 6. Lote base de 9 anillos de mujer — empty base lot, no items yet ──
    const loteBaseAnillosMujer = await ctx.runMutation(internal.lots._create, {
      sede: 'C',
      providerId: TALLER_BRONCE_PROVIDER_ID,
      fechaRecepcion: fecha,
      renombreLote: 'Lote base 9 anillos de mujer',
      costoTotalCOP: 261000,
      unidadesDeclaradas: 9,
      formaPago: 'contado',
      metodoContado: 'transferencia',
      notas:
        'Migración seedBucketC: lote base en plata, sin ítems individuales aún.',
    });

    // ── 2,3,4,5,7,8 — standalone catalog items (no raw-material lot) ───
    const editorEmail = 'migration:seedBucketC';
    const editorName = 'Kevin Pineda (migration)';

    async function nextItemId(): Promise<string> {
      const all = await ctx.runQuery(api.products.list, {});
      let max = 0;
      for (const p of all as Array<{ itemId: string }>) {
        const n = Number(p.itemId);
        if (Number.isFinite(n) && n > max) max = n;
      }
      return String(max + 1);
    }

    const standalone: Array<{ itemId: string; nombre: string }> = [];

    async function createStandalone(fields: {
      nombre: string;
      peso?: string;
      color?: string;
      calidad?: string;
      cantidad?: number;
      talla?: string;
      medidas?: string;
      categoria?: string;
      caja?: string;
    }): Promise<void> {
      const itemId = await nextItemId();
      const result = await ctx.runMutation(internal.products._createProduct, {
        itemId,
        editorEmail,
        editorName,
        fields,
      });
      standalone.push({ itemId: result.itemId, nombre: fields.nombre });
    }

    // 2. Destellos Gemelos — par, Baúl Comercial, Verde Natural, Comercial Súper Fina, 0.56 ct total.
    await createStandalone({
      nombre: 'Destellos Gemelos',
      categoria: 'Gema',
      color: 'Verde Natural',
      calidad: 'COMERCIAL SÚPER FINA',
      peso: '0.56',
      cantidad: 2,
    });

    // 3. Reflejos del Sol — par, Baúl Comercial, Verde Natural, Comercial Estándar, 0.52 ct total.
    await createStandalone({
      nombre: 'Reflejos del Sol',
      categoria: 'Gema',
      color: 'Verde Natural',
      calidad: 'COMERCIAL ESTÁNDAR',
      peso: '0.52',
      cantidad: 2,
    });

    // 4. Registro de Vida — Verde Chivor, Extra Fina F2 (con tratamiento), 0.54 ct.
    await createStandalone({
      nombre: 'Registro de Vida',
      categoria: 'Gema',
      color: 'Verde Chivor',
      calidad: 'F2',
      peso: '0.54',
      cantidad: 1,
    });

    // 5. Poseidón — anillo de hombre. Base plata 5g $94.000 talla 7; gema
    // 1.12 ct 6mm×5.5mm Verde profundo Fina Comercial corte Semicuadrada.
    // NOTE: standalone products.createProduct has no tipoJoya/observacion
    // fields (those only exist on the Fotosíntesis lotItems create path) —
    // corte + the base-metal cost breakdown are folded into `medidas` since
    // there's no dedicated field; `peso` holds the silver base grams
    // (matches the legacy Anillo en Plata records' convention), gema carat
    // weight is folded into `medidas` too. precioCOP intentionally omitted
    // — the $94.000 given is only the base metal cost, not a total sale
    // price (gema value not supplied).
    await createStandalone({
      nombre: 'Poseidón',
      categoria: 'Anillo en Plata',
      talla: '7',
      peso: '5',
      color: 'Verde profundo',
      calidad: 'FINA COMERCIAL',
      medidas:
        'Gema 1.12 ct, 6mm x 5.5mm, corte Semicuadrada. Base plata 5g = $94.000 COP (costo base, no incluye valor de la gema).',
    });

    // 7. Luz del Sol — Verde Limón, Comercial Fina, 0.36 ct. precioCOP TBD.
    await createStandalone({
      nombre: 'Luz del Sol',
      categoria: 'Gema',
      color: 'Verde Limón',
      calidad: 'COMERCIAL FINA',
      peso: '0.36',
      cantidad: 1,
    });

    // 8. Aurora Escondida — 0.50 ct, corte Semicuadrada. color/calidad/precioCOP TBD.
    await createStandalone({
      nombre: 'Aurora Escondida',
      categoria: 'Gema',
      talla: 'Semicuadrada',
      peso: '0.50',
      cantidad: 1,
    });

    return {
      rocasLunares: {
        loteId: rocasLunaresLot.loteId,
        items: rocasLunaresItems,
      },
      loteBaseAnillosMujer: { loteId: loteBaseAnillosMujer.loteId },
      standalone,
      skipped: [
        'Esferas del Dragón (no insumos/materials stock table with cantidad+costo)',
        'Topo/cadena insumos x4 (same reason)',
        'Gemas pedagógicas / Circones (no fitting categoria — marketing/educational, not inventory)',
      ],
    };
  },
});

/**
 * seedInsumosMarketing — registers the 6 insumo purchases + 2 marketing items
 * that seedBucketC deliberately skipped, now that the user asked to bring the
 * whole Anima registry into Fotosíntesis.
 *
 * Model (validated): each is its own lote with ONE lotItem at 100%
 * preponderancia, `mostrarEnCatalogo:false` (never in the public catalog),
 * then `_close`d — the same shipped insumo pattern used for C-035 (silver
 * bases). This is what records cost (`costoBaseCOP` fans out from the lote's
 * `costoTotalCOP`); the standalone `_createProduct` path cannot set cost.
 *
 * Provider: assigned to "Joyería Legado" (created 2026-07-10, tipo insumos) —
 * a best-guess default because the Anima notes never named a supplier for
 * these components. FLAG: confirm/correct the real provider per insumo.
 *
 * Marketing items (gemas pedagógicas, circones) have NO cost in the source
 * (costoTotalCOP 0) and NO color/calidad — registered hidden, tagged
 * categoria "Marketing", for the studio to complete later.
 *
 * Idempotent via clientToken (unlike seedBucketC) — safe to re-run.
 *
 *   npx convex run --prod migrations:seedInsumosMarketing '{}'
 */
export const seedInsumosMarketing = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<
    Array<{
      loteId: string;
      itemId: string;
      nombre: string;
      costoBaseCOP: number;
    }>
  > => {
    const LEGADO_PROVIDER_ID =
      'kd77twtmcf9syvg68fvc9acqrd8a8tgv' as Id<'providers'>;
    const fecha = new Date().toISOString().slice(0, 10);

    const specs = [
      // ── 6 insumos (jewelry-assembly components) ──────────────────────
      {
        token: 'insumo-esferas-del-dragon',
        tipo: 'insumo' as const,
        nombre: 'Esferas del Dragón (cuentas verdes)',
        costo: 255000,
        cantidad: 3,
        categoria: 'Insumo',
        peso: undefined as string | undefined,
        obs: '3 cuentas esféricas verdes ($85.000 c/u). Antes "Balines". Proveedor asumido: Joyería Legado (confirmar).',
      },
      {
        token: 'insumo-cadenas-bano-oro',
        tipo: 'insumo' as const,
        nombre: 'Cadenas de baño en oro',
        costo: 24000,
        cantidad: 6,
        categoria: 'Insumo',
        peso: undefined,
        obs: '6 cadenas ($4.000 c/u). Proveedor asumido: Joyería Legado (confirmar).',
      },
      {
        token: 'insumo-topos-redondos',
        tipo: 'insumo' as const,
        nombre: 'Topos Redondos (postes aretes)',
        costo: 278100,
        cantidad: 14,
        categoria: 'Insumo',
        peso: undefined,
        obs: '14 pares: 4mm×6, 3mm×6, 5mm×1, 2mm×1. 1 suelto 3mm usado en Perlita #260. Proveedor asumido: Joyería Legado (confirmar).',
      },
      {
        token: 'insumo-topos-planos',
        tipo: 'insumo' as const,
        nombre: 'Topos Planos (postes aretes)',
        costo: 291500,
        cantidad: 15,
        categoria: 'Insumo',
        peso: undefined,
        obs: '15 pares: 5mm×1, 4x4.5mm×7, 3.2mm×6, 2mm×1. 1 suelto 3.2mm usado en Luz del Firmamento #257. Proveedor asumido: Joyería Legado (confirmar).',
      },
      {
        token: 'insumo-pares-topos-3',
        tipo: 'insumo' as const,
        nombre: 'Pares Topos #3 (postes plata)',
        costo: 500000,
        cantidad: 20,
        categoria: 'Insumo',
        peso: undefined,
        obs: '20 pares ($25.000 c/u). 3 usados (Almas Gemelas #97, Dos Pequitas #77, Reflejos del Sol). Stock 17. Proveedor asumido: Joyería Legado (confirmar).',
      },
      {
        token: 'insumo-pares-topos-4',
        tipo: 'insumo' as const,
        nombre: 'Pares Topos #4 (postes plata 4.3mm)',
        costo: 500000,
        cantidad: 14,
        categoria: 'Insumo',
        peso: undefined,
        obs: '14 pares 4.3mm ($35.714 c/u). 3 usados (Ojos del Universo #76, Hadas del Bosque #89, Destellos Gemelos). Stock 11. Proveedor asumido: Joyería Legado (confirmar).',
      },
      // ── 2 marketing items (no cost, no sale — hidden) ────────────────
      {
        token: 'marketing-gemas-pedagogicas',
        tipo: 'gema' as const,
        nombre: 'Gemas Pedagógicas Laboratorio (Marketing)',
        costo: 0,
        cantidad: 4,
        categoria: 'Marketing',
        peso: '4.32',
        obs: '4 gemas uso pedagógico/laboratorio, ~7mm (1.06/1.11/1.08/1.07 ct). NO VENTA. Color/calidad/propósito y costo por confirmar.',
      },
      {
        token: 'marketing-circones',
        tipo: 'gema' as const,
        nombre: 'Circones (Marketing)',
        costo: 0,
        cantidad: 4,
        categoria: 'Marketing',
        peso: '1.81',
        obs: '4 circones 4mm, 1.81 ct total. NO VENTA. Color/calidad/propósito y costo por confirmar.',
      },
    ];

    const created: Array<{
      loteId: string;
      itemId: string;
      nombre: string;
      costoBaseCOP: number;
    }> = [];

    for (const s of specs) {
      const lot = await ctx.runMutation(internal.lots._create, {
        sede: 'C',
        providerId: LEGADO_PROVIDER_ID,
        fechaRecepcion: fecha,
        renombreLote: s.nombre,
        costoTotalCOP: s.costo,
        unidadesDeclaradas: 1,
        formaPago: 'contado',
        metodoContado: 'transferencia',
        notas: `Migración seedInsumosMarketing: ${s.obs}`,
        clientToken: `${s.token}-lote`,
      });
      const item = await ctx.runMutation(internal.lotItems._create, {
        loteId: lot.loteId,
        tipo: s.tipo,
        nombre: s.nombre,
        preponderancia: 100,
        cantidad: s.cantidad,
        categoria: s.categoria,
        peso: s.peso,
        mostrarEnCatalogo: false,
        observacion: s.obs,
        clientToken: `${s.token}-item`,
      });
      // Tolerant close: on a re-run the clientToken makes the creates
      // idempotent, but _close throws on an already-closed lote — swallow that
      // so a partial re-run can finish the remaining items.
      try {
        await ctx.runMutation(internal.lots._close, { id: lot.id });
      } catch (e) {
        if (!String(e).includes('cerrado')) throw e;
      }
      created.push({
        loteId: lot.loteId,
        itemId: item.itemId,
        nombre: s.nombre,
        costoBaseCOP: item.costoBaseCOP,
      });
    }

    return created;
  },
});

/**
 * Subdivide the 4 "topos" insumos (postes de aretes) into one inventory item
 * PER SIZE, so each size gets its own sequential itemId → its own scannable QR
 * label in Atelier · Etiquetas.
 *
 * Decision (2026-07-11): the 4 parent insumos stay untouched — the whole cost
 * lives there. These sized children are registered at `costo 0` so they are
 * pure QR/label surfaces and DON'T double-count cost. They are hidden
 * (`mostrarEnCatalogo:false`, tipo insumo) exactly like the parents.
 *
 * Per-size quantities reconcile with the seeded parent totals:
 *   - Pares Topos #4 → 4.3mm ×14 (11 en stock)                         = 14
 *   - Pares Topos #3 → 3.5mm ×11(9), 3.4mm ×7, 3.3mm ×1, 4mm ×1(usado) = 20
 *   - Topos Redondos → 4mm ×6, 3mm ×6, 5mm ×1, 2mm plata ×1            = 14 pares
 *   - Topos Planos   → 5mm ×1, 4×4.5mm ×7, 3.2mm ×6, 2mm plata ×1      = 15 pares
 *
 * `cantidad` = unidades disponibles hoy (en stock para Pares #3/#4; pares para
 * Redondos/Planos, con los "sueltos" usados anotados en la observación).
 *
 * Silver pairs carry their gram weight so the label's third line is useful:
 * Redondos 2mm = 0.47 g, Planos 2mm = 0.37 g.
 *
 * Mechanism: each child is a STANDALONE `products._createProduct` row (no lote,
 * no cost) — the lote path rejects `costoTotalCOP <= 0`, and a lote-less row is
 * exactly "cost stays in the parent". A standalone row has no `loteId` and no
 * `mostrarEnCatalogo`, so it's doubly excluded from the public catalog (which
 * requires both). We then stamp `tipo:'insumo'` via `_stampInsumoTipo` so it
 * lands under the Etiquetas "Insumos" tab. Idempotent by `nombre` (unique per
 * size) — a re-run skips sizes that already exist.
 *
 *   npx convex run --prod migrations:seedToposSubdivision '{}'
 */
export const seedToposSubdivision = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<Array<{ itemId: string; nombre: string; skipped: boolean }>> => {
    const specs: Array<{
      token: string;
      nombre: string;
      cantidad: number;
      peso?: string;
      obs: string;
    }> = [
      // ── Pares Topos #4 (padre: insumo-pares-topos-4) ──────────────────
      {
        token: 'insumo-pares-topos-4-4-3mm',
        nombre: 'Pares Topos #4 · 4.3mm',
        cantidad: 11,
        obs: 'Subdivisión de "Pares Topos #4" (insumo-pares-topos-4). 4.3mm: 14 recibidos, 3 usados (Ojos del Universo #76, Hadas del Bosque #89, Destellos Gemelos), 11 en stock. Costo permanece en el padre.',
      },
      // ── Pares Topos #3 (padre: insumo-pares-topos-3) ──────────────────
      {
        token: 'insumo-pares-topos-3-3-5mm',
        nombre: 'Pares Topos #3 · 3.5mm',
        cantidad: 9,
        obs: 'Subdivisión de "Pares Topos #3" (insumo-pares-topos-3). 3.5mm: 11 recibidos, 2 usados, 9 en stock. Costo permanece en el padre.',
      },
      {
        token: 'insumo-pares-topos-3-3-4mm',
        nombre: 'Pares Topos #3 · 3.4mm',
        cantidad: 7,
        obs: 'Subdivisión de "Pares Topos #3" (insumo-pares-topos-3). 3.4mm: 7 recibidos, 7 en stock. Costo permanece en el padre.',
      },
      {
        token: 'insumo-pares-topos-3-3-3mm',
        nombre: 'Pares Topos #3 · 3.3mm',
        cantidad: 1,
        obs: 'Subdivisión de "Pares Topos #3" (insumo-pares-topos-3). 3.3mm: 1 recibido, 1 en stock. Costo permanece en el padre.',
      },
      {
        token: 'insumo-pares-topos-3-4mm',
        nombre: 'Pares Topos #3 · 4mm',
        cantidad: 0,
        obs: 'Subdivisión de "Pares Topos #3" (insumo-pares-topos-3). 4mm: 1 recibido, ya usado, 0 en stock. Costo permanece en el padre.',
      },
      // ── Topos Redondos (padre: insumo-topos-redondos) ─────────────────
      {
        token: 'insumo-topos-redondos-4mm',
        nombre: 'Topos Redondos 4mm (par)',
        cantidad: 6,
        obs: 'Subdivisión de "Topos Redondos" (insumo-topos-redondos). 4mm: 6 pares. Costo permanece en el padre.',
      },
      {
        token: 'insumo-topos-redondos-3mm',
        nombre: 'Topos Redondos 3mm (par)',
        cantidad: 6,
        obs: 'Subdivisión de "Topos Redondos" (insumo-topos-redondos). 3mm: 6 pares. 1 poste suelto 3mm usado en Perlita #260. Costo permanece en el padre.',
      },
      {
        token: 'insumo-topos-redondos-5mm',
        nombre: 'Topos Redondos 5mm (par)',
        cantidad: 1,
        obs: 'Subdivisión de "Topos Redondos" (insumo-topos-redondos). 5mm: 1 par. Costo permanece en el padre.',
      },
      {
        token: 'insumo-topos-redondos-2mm-plata',
        nombre: 'Topos Redondos 2mm plata (par)',
        cantidad: 1,
        peso: '0.47',
        obs: 'Subdivisión de "Topos Redondos" (insumo-topos-redondos). 2mm en plata: 1 par, 0.47 g. Costo permanece en el padre.',
      },
      // ── Topos Planos (padre: insumo-topos-planos) ─────────────────────
      {
        token: 'insumo-topos-planos-5mm',
        nombre: 'Topos Planos 5mm (par)',
        cantidad: 1,
        obs: 'Subdivisión de "Topos Planos" (insumo-topos-planos). 5mm: 1 par. Costo permanece en el padre.',
      },
      {
        token: 'insumo-topos-planos-4x4-5mm',
        nombre: 'Topos Planos 4×4.5mm (par)',
        cantidad: 7,
        obs: 'Subdivisión de "Topos Planos" (insumo-topos-planos). 4×4.5mm: 7 pares. Costo permanece en el padre.',
      },
      {
        token: 'insumo-topos-planos-3-2mm',
        nombre: 'Topos Planos 3.2mm (par)',
        cantidad: 6,
        obs: 'Subdivisión de "Topos Planos" (insumo-topos-planos). 3.2mm: 6 pares. 1 poste suelto 3.2mm usado en Luz del Firmamento #257. Costo permanece en el padre.',
      },
      {
        token: 'insumo-topos-planos-2mm-plata',
        nombre: 'Topos Planos 2mm plata (par)',
        cantidad: 1,
        peso: '0.37',
        obs: 'Subdivisión de "Topos Planos" (insumo-topos-planos). 2mm en plata: 1 par, 0.37 g. Costo permanece en el padre.',
      },
    ];

    const editorEmail = 'migration:seedToposSubdivision';
    const editorName = 'Kevin Pineda (migration)';

    // One scan of the full inventory: existing names (idempotency) + max itemId
    // (allocator seed). We bump `nextId` locally per create so the batch never
    // collides with itself within a single run.
    const all = (await ctx.runQuery(api.products.list, {})) as Array<{
      itemId: string;
      nombre?: string;
    }>;
    const existingNombres = new Set(
      all.map((p) => (p.nombre ?? '').trim()).filter(Boolean),
    );
    let nextId = all.reduce((m, p) => {
      const n = Number(p.itemId);
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);

    const created: Array<{ itemId: string; nombre: string; skipped: boolean }> =
      [];

    for (const s of specs) {
      if (existingNombres.has(s.nombre.trim())) {
        const prior = all.find((p) => (p.nombre ?? '').trim() === s.nombre);
        created.push({
          itemId: prior?.itemId ?? '?',
          nombre: s.nombre,
          skipped: true,
        });
        continue;
      }
      nextId += 1;
      const itemId = String(nextId);
      await ctx.runMutation(internal.products._createProduct, {
        itemId,
        editorEmail,
        editorName,
        fields: {
          nombre: s.nombre,
          peso: s.peso,
          cantidad: s.cantidad,
          categoria: 'Insumo',
        },
      });
      // Stamp tipo so it groups under Etiquetas' "Insumos" tab (the standalone
      // create path has no `tipo` field of its own).
      await ctx.runMutation(internal.migrations._stampInsumoTipo, {
        itemId,
        observacion: s.obs,
      });
      existingNombres.add(s.nombre.trim());
      created.push({ itemId, nombre: s.nombre, skipped: false });
    }

    return created;
  },
});

/**
 * Stamp `tipo:'insumo'` (and an observación) onto a freshly-created standalone
 * productInventory row. Used by `seedToposSubdivision` because the public
 * `_createProduct` fields don't include `tipo`/`observacion`.
 */
export const _stampInsumoTipo = internalMutation({
  args: { itemId: v.string(), observacion: v.optional(v.string()) },
  handler: async (ctx, { itemId, observacion }) => {
    const row = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!row) throw new Error(`productInventory ${itemId} no encontrado`);
    await ctx.db.patch(row._id, {
      tipo: 'insumo' as const,
      ...(observacion ? { observacion } : {}),
    });
  },
});

/**
 * One-off: attach the 7 topos/chatones insumos (created by seedToposSubdivision
 * with no lote, so they cannot receive a foto — fotoUrl requires a lotItemId) to
 * lote C-039 "Topos Planos (postes aretes)" via _attachExistingToLote. Joins at
 * preponderancia 0 with each product's own cost preserved; item 449 stays at 100%
 * and the lote's cost model is untouched. Idempotent.
 *   npx convex run --prod migrations:attachToposToC039 '{}'
 */
export const attachToposToC039 = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<
    Array<{ itemId: string; attached: boolean; lotItemId?: string }>
  > => {
    const ITEMS = ['454', '456', '458', '460', '464', '465', '466'];
    const out: Array<{
      itemId: string;
      attached: boolean;
      lotItemId?: string;
    }> = [];
    for (const itemId of ITEMS) {
      const r = await ctx.runMutation(internal.lotItems._attachExistingToLote, {
        itemId,
        loteId: 'C-039',
        editorEmail: 'anima-bot',
      });
      out.push(r as { itemId: string; attached: boolean; lotItemId?: string });
    }
    return out;
  },
});

/**
 * Explicit-id lote creation — adopts the Modelo/Fotosíntesis código as the Convex
 * loteId (the app otherwise auto-numbers lotes). Idempotent by loteId.
 */
export const _createLoteExplicit = internalMutation({
  args: {
    loteId: v.string(),
    renombreLote: v.string(),
    costoTotalCOP: v.number(),
    unidadesDeclaradas: v.number(),
    providerId: v.id('providers'),
  },
  handler: async (ctx, a) => {
    const ex = await ctx.db
      .query('lots')
      .withIndex('by_loteId', (q) => q.eq('loteId', a.loteId))
      .first();
    if (ex) return { loteId: a.loteId, created: false };
    const allLots = await ctx.db.query('lots').collect();
    const maxRow = allLots.reduce((m, l) => Math.max(m, l.rowIndex ?? 1), 1);
    await ctx.db.insert('lots', {
      loteId: a.loteId,
      providerId: a.providerId,
      fechaRecepcion: '2026-07-15',
      costoTotalCOP: a.costoTotalCOP,
      unidadesDeclaradas: a.unidadesDeclaradas,
      formaPago: 'contado',
      estado: 'abierto' as const,
      renombreLote: a.renombreLote,
      rowIndex: maxRow + 1,
      lastPulledAt: new Date().toISOString(),
      syncStatus: 'pending' as const,
    });
    return { loteId: a.loteId, created: true };
  },
});

/**
 * Explicit-id item creation — registers a productInventory + lotItems row with a
 * SPECIFIED itemId (the app otherwise auto-numbers). Joins at preponderancia 0 with
 * its own costoBaseCOP (money-neutral). Mirrors lotItems._create field-for-field.
 * Idempotent by itemId. Schedules the SOT Inventario append.
 */
export const _createItemExplicit = internalMutation({
  args: {
    itemId: v.string(),
    loteId: v.string(),
    nombre: v.string(),
    tipo: v.union(
      v.literal('gema'),
      v.literal('joya'),
      v.literal('insumo'),
      v.literal('lote'),
      v.literal('bruto'),
    ),
    categoria: v.string(),
    costoBaseCOP: v.number(),
    peso: v.optional(v.string()),
    calidad: v.optional(v.string()),
    cantidad: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const exP = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', a.itemId))
      .first();
    if (exP) return { itemId: a.itemId, created: false, reason: 'ya existe' };
    const lot = await ctx.db
      .query('lots')
      .withIndex('by_loteId', (q) => q.eq('loteId', a.loteId))
      .first();
    if (!lot) throw new Error(`Lote ${a.loteId} no existe`);

    const now = new Date().toISOString();
    const allInv = await ctx.db.query('productInventory').collect();
    const maxRow = allInv.reduce((m, p) => Math.max(m, p.rowIndex), 1);
    await ctx.db.insert('productInventory', {
      itemId: a.itemId,
      rowIndex: maxRow + 1,
      nombre: a.nombre,
      peso: a.peso,
      calidad: a.calidad,
      cantidad: a.cantidad,
      categoria: a.categoria,
      estado: 'DISPONIBLE' as const,
      loteId: a.loteId,
      preponderancia: 0,
      costoBaseCOP: a.costoBaseCOP,
      ...withPublishStamp(null, false),
      tipo: a.tipo,
      lastPulledAt: now,
      syncStatus: 'pending' as const,
    });
    await bumpInventoryTotal(ctx, 1);

    const siblings = await ctx.db
      .query('lotItems')
      .withIndex('by_loteId', (q) => q.eq('loteId', a.loteId))
      .collect();
    const auditId = await ctx.db.insert('productEdits', {
      itemId: a.itemId,
      editorEmail: 'anima-bot',
      editedAt: now,
      changes: [{ field: 'tipo', before: null, after: a.tipo }],
      status: 'pending' as const,
    });
    await ctx.db.insert('lotItems', {
      loteId: a.loteId,
      itemId: a.itemId,
      preponderancia: 0,
      costoBaseCOP: a.costoBaseCOP,
      ordenEnLote: siblings.length + 1,
    });
    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId: a.itemId,
      auditId,
      mode: 'append',
    });
    return { itemId: a.itemId, created: true };
  },
});

/**
 * One-off: register the 8 clean-named Group B items (476,478,482,483,484,495,495A,495B)
 * into their Modelo códigos as new Convex lotes. Placeholder provider (Joyería Legado)
 * and gem costs = 0 (to refine later). C-065 chatones handled separately.
 *   npx convex run --prod migrations:registerCleanBatch1 '{}'
 */
export const registerCleanBatch1 = internalAction({
  args: {},
  handler: async (ctx): Promise<Array<Record<string, unknown>>> => {
    const PROVIDER = 'kd77twtmcf9syvg68fvc9acqrd8a8tgv' as Id<'providers'>;
    const lotes = [
      {
        loteId: 'C-061',
        renombreLote: 'Asteroides Verdes III',
        costoTotalCOP: 500000,
        unidadesDeclaradas: 40,
      },
      {
        loteId: 'C-049',
        renombreLote: 'Topito Solitario',
        costoTotalCOP: 87400,
        unidadesDeclaradas: 1,
      },
      {
        loteId: 'C-069',
        renombreLote: 'Origen del Origen',
        costoTotalCOP: 0,
        unidadesDeclaradas: 3,
      },
      {
        loteId: 'C-054',
        renombreLote: 'Anillos Joyero Cali',
        costoTotalCOP: 1279000,
        unidadesDeclaradas: 3,
      },
    ];
    for (const l of lotes) {
      await ctx.runMutation(internal.migrations._createLoteExplicit, {
        ...l,
        providerId: PROVIDER,
      });
    }
    const items: Array<{
      itemId: string;
      loteId: string;
      nombre: string;
      tipo: 'gema' | 'joya' | 'insumo';
      categoria: string;
      costoBaseCOP: number;
      peso?: string;
      calidad?: string;
      cantidad?: number;
    }> = [
      {
        itemId: '476',
        loteId: 'C-061',
        nombre: 'Asteroides Verdes III',
        tipo: 'insumo',
        categoria: 'Insumo',
        costoBaseCOP: 500000,
        peso: '48.4',
        calidad: 'C. Estándar',
        cantidad: 40,
      },
      {
        itemId: '478',
        loteId: 'C-049',
        nombre: 'Topito Plano Solitario 5mm',
        tipo: 'insumo',
        categoria: 'Insumo',
        costoBaseCOP: 87400,
        peso: '0.45',
        calidad: 'Fina esencial',
        cantidad: 1,
      },
      {
        itemId: '482',
        loteId: 'C-069',
        nombre: 'Destino',
        tipo: 'gema',
        categoria: 'Gema',
        costoBaseCOP: 0,
        peso: '0.92',
        calidad: 'No-oil',
      },
      {
        itemId: '483',
        loteId: 'C-069',
        nombre: 'Gratitud',
        tipo: 'gema',
        categoria: 'Gema',
        costoBaseCOP: 0,
        peso: '0.89',
        calidad: 'No-oil',
      },
      {
        itemId: '484',
        loteId: 'C-069',
        nombre: 'Magia',
        tipo: 'gema',
        categoria: 'Gema',
        costoBaseCOP: 0,
        peso: '4.44',
        calidad: 'F2',
      },
      {
        itemId: '495',
        loteId: 'C-054',
        nombre: 'Anillos Joyero Cali 4 de plata y 1 de oro',
        tipo: 'joya',
        categoria: 'Joya',
        costoBaseCOP: 0,
      },
      {
        itemId: '495A',
        loteId: 'C-054',
        nombre: 'Anillos Producidos Joyero Cali (Juan)',
        tipo: 'joya',
        categoria: 'Joya',
        costoBaseCOP: 0,
      },
      {
        itemId: '495B',
        loteId: 'C-054',
        nombre: 'Anillo de Oro producido Cali',
        tipo: 'joya',
        categoria: 'Joya',
        costoBaseCOP: 1279000,
      },
    ];
    const out: Array<Record<string, unknown>> = [];
    for (const it of items) {
      out.push(
        await ctx.runMutation(internal.migrations._createItemExplicit, it),
      );
    }
    return out;
  },
});

/**
 * Move an existing item to a different lote (updates lotItems.loteId +
 * productInventory.loteId, keeps preponderancia/cost, re-orders in the target,
 * audits + patches the SOT). Idempotent-ish: moving to the same lote is a no-op patch.
 */
export const _moveItemToLote = internalMutation({
  args: {
    itemId: v.string(),
    toLoteId: v.string(),
    editorEmail: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, toLoteId, editorEmail }) => {
    const product = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!product) throw new Error(`item ${itemId} no existe`);
    const toLot = await ctx.db
      .query('lots')
      .withIndex('by_loteId', (q) => q.eq('loteId', toLoteId))
      .first();
    if (!toLot) throw new Error(`lote ${toLoteId} no existe`);
    const fromLoteId = product.loteId ?? null;
    const sib = await ctx.db
      .query('lotItems')
      .withIndex('by_loteId', (q) => q.eq('loteId', toLoteId))
      .collect();
    const li = await ctx.db
      .query('lotItems')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (li) {
      await ctx.db.patch(li._id, {
        loteId: toLoteId,
        ordenEnLote: sib.length + 1,
      });
    } else {
      await ctx.db.insert('lotItems', {
        loteId: toLoteId,
        itemId,
        preponderancia: product.preponderancia ?? 0,
        costoBaseCOP: product.costoBaseCOP ?? 0,
        ordenEnLote: sib.length + 1,
      });
    }
    const now = new Date().toISOString();
    const auditId = await ctx.db.insert('productEdits', {
      itemId,
      editorEmail: editorEmail ?? 'anima-bot',
      editedAt: now,
      changes: [{ field: 'loteId', before: fromLoteId, after: toLoteId }],
      status: 'pending' as const,
    });
    await ctx.db.patch(product._id, {
      loteId: toLoteId,
      syncStatus: 'pending' as const,
      syncError: undefined,
    });
    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId,
      auditId,
      mode: 'patch',
    });
    return { itemId, from: fromLoteId, to: toLoteId };
  },
});

/**
 * One-off: consolidate the chatones/topos into lote C-065 (canonical per the
 * Modelo/Fotosíntesis). Creates C-065, moves 449/454/456/458/460/463/464/465/466
 * out of C-039 (which is left empty), and registers the 4 new chatones
 * 477/481/520/521 with their Modelo names + costs. Names of the MOVED items are
 * kept as-is (Convex) — rename separately if desired.
 *   npx convex run --prod migrations:migrateChatonesToC065 '{}'
 */
export const migrateChatonesToC065 = internalAction({
  args: {},
  handler: async (ctx): Promise<Array<Record<string, unknown>>> => {
    const PROVIDER = 'kd77twtmcf9syvg68fvc9acqrd8a8tgv' as Id<'providers'>;
    await ctx.runMutation(internal.migrations._createLoteExplicit, {
      loteId: 'C-065',
      renombreLote: 'Chatones',
      costoTotalCOP: 1450050,
      unidadesDeclaradas: 13,
      providerId: PROVIDER,
    });
    const out: Array<Record<string, unknown>> = [];
    for (const it of ['449', '454', '456', '458', '460', '463', '464', '465', '466']) {
      out.push(await ctx.runMutation(internal.migrations._moveItemToLote, { itemId: it, toLoteId: 'C-065' }));
    }
    const news: Array<{ itemId: string; nombre: string; costoBaseCOP: number }> = [
      { itemId: '477', nombre: 'Chatones Redondos 5mm', costoBaseCOP: 22400 },
      { itemId: '481', nombre: 'Chatones de Mariposa 4 mm', costoBaseCOP: 140000 },
      { itemId: '520', nombre: 'Chatones de Mariposa 3,5mm', costoBaseCOP: 225000 },
      { itemId: '521', nombre: 'Chatones Redondos 2mm', costoBaseCOP: 14800 },
    ];
    for (const n of news) {
      out.push(await ctx.runMutation(internal.migrations._createItemExplicit, {
        itemId: n.itemId, loteId: 'C-065', nombre: n.nombre,
        tipo: 'insumo', categoria: 'Insumo', costoBaseCOP: n.costoBaseCOP,
      }));
    }
    return out;
  },
});
