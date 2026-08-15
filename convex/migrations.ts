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
import {
  bumpCatalogVersion,
  bumpCatalogVersionIfPublished,
} from './_lib/catalogVersion';
import { computePrecioFinal } from './_lib/pricing';

/**
 * Backfill the DERIVED `precioFinalCOP` (= round(costoBaseCOP × 2.6)) for every
 * existing inventory doc, part of the 2026-07-21 price refactor that replaced
 * the embajador/consciente tiers with a single derived final price. New/edited
 * items compute it in lotItems; this catches the docs captured before the
 * refactor.
 *
 * Idempotent: a doc whose stored precioFinalCOP already equals the computed
 * value is skipped, so re-running (or running after normal edits) is harmless.
 * Docs with no/zero costoBaseCOP get no price (computePrecioFinal → undefined).
 *
 *   npx convex run --prod migrations:backfillPrecioFinal '{}'
 */
export const backfillPrecioFinal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('productInventory').collect();
    let updated = 0;
    for (const row of rows) {
      const next = computePrecioFinal(row.costoBaseCOP);
      if (next !== row.precioFinalCOP) {
        await ctx.db.patch(row._id, { precioFinalCOP: next });
        updated += 1;
      }
    }
    return { scanned: rows.length, updated };
  },
});

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
 * Backfill the denormalized `mina` / `tratamiento` for items published BEFORE
 * Fix 1B (docs/audits/2026-08-12-convex-usage-audit.md §4).
 *
 * `products.publishedCatalog` used to resolve lot provenance with a per-lote
 * point read on every execution, which dragged those `lots` documents into the
 * public catalog's reactive read set — so any write to a published lot re-ran
 * the catalog for every connected anonymous visitor. The lookup now happens
 * once, at publish time, via `withPublishStamp()`.
 *
 * Items published before that change never went through the new stamp, and the
 * catalog query deliberately has NO fallback to `lots` (a fallback would
 * reinstate the read-set dependency). Without this backfill those items would
 * render with blank mina/tratamiento.
 *
 * ⚠️ RUN THIS BEFORE OR IMMEDIATELY AFTER DEPLOYING Fix 1B — between the deploy
 * and this migration, already-published items show no provenance.
 *
 * Idempotent: only patches rows whose stored value actually differs from the
 * lot's, so re-running is a no-op. Safe to re-run after new lots are published.
 *
 *   npx convex run --prod migrations:backfillLotProvenance '{}'
 */
export const backfillLotProvenance = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query('productInventory')
      .withIndex('by_mostrarEnCatalogo', (q) => q.eq('mostrarEnCatalogo', true))
      .collect();

    // Resolve each distinct lote ONCE — this is a one-shot migration, but there
    // is no reason to re-read the same lot per item.
    const lotCache = new Map<
      string,
      { mina?: string; tratamiento?: string } | undefined
    >();
    const patched: string[] = [];
    const missingLote: string[] = [];

    for (const row of rows) {
      if (!row.loteId) continue; // legacy/orphan — excluded from the catalog anyway
      if (!lotCache.has(row.loteId)) {
        const lot = await ctx.db
          .query('lots')
          .withIndex('by_loteId', (q) => q.eq('loteId', row.loteId!))
          .first();
        lotCache.set(
          row.loteId,
          lot ? { mina: lot.mina, tratamiento: lot.tratamiento } : undefined,
        );
      }
      const prov = lotCache.get(row.loteId);
      if (!prov) {
        missingLote.push(row.itemId);
        continue;
      }
      if (row.mina === prov.mina && row.tratamiento === prov.tratamiento)
        continue;
      await ctx.db.patch(row._id, {
        mina: prov.mina,
        tratamiento: prov.tratamiento,
      });
      patched.push(row.itemId);
    }

    // `mina`/`tratamiento` are projected by `publishedCatalog`, so a backfill
    // changes what visitors see. Every row scanned here is already published
    // (the index above filters on it), hence the unguarded bump — but only when
    // something actually moved, so a converged re-run stays free.
    if (patched.length > 0) await bumpCatalogVersion(ctx);

    return {
      scanned: rows.length,
      backfilled: patched.length,
      itemIds: patched,
      // Published items whose lote no longer resolves — these will render
      // without provenance. Worth eyeballing rather than failing the run.
      missingLote,
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
    // Re-asserting VENDIDA changes what the public catalog renders for this
    // piece if it is published. One-shot repair, but the sentinel costs one
    // write and keeps the wiring guard in tests/catalogSentinelWiring.test.ts
    // unconditional — no allowlist to drift.
    await bumpCatalogVersionIfPublished(ctx, keep, keep);

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
    for (const it of [
      '449',
      '454',
      '456',
      '458',
      '460',
      '463',
      '464',
      '465',
      '466',
    ]) {
      out.push(
        await ctx.runMutation(internal.migrations._moveItemToLote, {
          itemId: it,
          toLoteId: 'C-065',
        }),
      );
    }
    const news: Array<{
      itemId: string;
      nombre: string;
      costoBaseCOP: number;
    }> = [
      { itemId: '477', nombre: 'Chatones Redondos 5mm', costoBaseCOP: 22400 },
      {
        itemId: '481',
        nombre: 'Chatones de Mariposa 4 mm',
        costoBaseCOP: 140000,
      },
      {
        itemId: '520',
        nombre: 'Chatones de Mariposa 3,5mm',
        costoBaseCOP: 225000,
      },
      { itemId: '521', nombre: 'Chatones Redondos 2mm', costoBaseCOP: 14800 },
    ];
    for (const n of news) {
      out.push(
        await ctx.runMutation(internal.migrations._createItemExplicit, {
          itemId: n.itemId,
          loteId: 'C-065',
          nombre: n.nombre,
          tipo: 'insumo',
          categoria: 'Insumo',
          costoBaseCOP: n.costoBaseCOP,
        }),
      );
    }
    return out;
  },
});

/**
 * Raise lot-sequence high-water marks so the allocator can never mint a loteId
 * that already exists in the sheet.
 *
 * WHY THIS IS NEEDED: lotes created by hand directly in the SOT Lotes tab never
 * pass through `sequences.allocateNext`, so the counter does not advance with
 * them. As of 2026-07-24 the sheet holds C-089 and MED-026 while prod
 * `sequences` still reads `lot:C` = 77 and `lot:MED` = 25 — the next
 * `lots.create` for Cali would mint C-077, which already exists. `lots` has no
 * unique index and both `lots.getByLoteId` and fotoSync's `findByKey` resolve
 * with `.first()`, so the duplicate would not error: the older doc would simply
 * shadow the new one and the sheet would gain a second C-077 row.
 *
 * The values are supplied by the caller rather than derived, because the
 * authoritative maximum lives in the SHEET and a Convex mutation cannot read it.
 * Derive them from the Lotes tab, then pass them in.
 *
 * MONOTONIC BY CONSTRUCTION: a sequence is only ever raised, never lowered, so
 * re-running is harmless and a stale/low argument is ignored rather than
 * reissuing numbers that are already spoken for. A name with no existing row is
 * created, which is how a brand-new sede bootstraps.
 *
 *   npx convex run --prod migrations:raiseLotSequences '{"raises":[
 *     {"name":"lot:C","minNextValue":90},
 *     {"name":"lot:MED","minNextValue":27}]}'
 */
export const raiseLotSequences = internalMutation({
  args: {
    raises: v.array(v.object({ name: v.string(), minNextValue: v.number() })),
  },
  handler: async (ctx, { raises }) => {
    const out: Array<{
      name: string;
      before: number | null;
      after: number;
      action: 'raised' | 'created' | 'unchanged';
    }> = [];

    for (const { name, minNextValue } of raises) {
      if (!Number.isInteger(minNextValue) || minNextValue < 1) {
        throw new Error(
          `minNextValue inválido para "${name}": ${minNextValue}`,
        );
      }
      const row = await ctx.db
        .query('sequences')
        .withIndex('by_name', (q) => q.eq('name', name))
        .first();

      if (!row) {
        await ctx.db.insert('sequences', { name, nextValue: minNextValue });
        out.push({
          name,
          before: null,
          after: minNextValue,
          action: 'created',
        });
        continue;
      }
      if (row.nextValue >= minNextValue) {
        out.push({
          name,
          before: row.nextValue,
          after: row.nextValue,
          action: 'unchanged',
        });
        continue;
      }
      await ctx.db.patch(row._id, { nextValue: minNextValue });
      out.push({
        name,
        before: row.nextValue,
        after: minNextValue,
        action: 'raised',
      });
    }

    return out;
  },
});
// ======================================================================

/**
 * Alta en Convex de los 7 ítems que el inventario manuscrito del 2026-08-12
 * creó EN LA HOJA, y cierre del retiro de sus 3 padres.
 *
 * POR QUÉ HACE FALTA: `scripts/aplicar-inventario-manuscrito-20260812.mjs`
 * escribió las 7 filas en el SOT, pero el pull NO crea documentos: `fotoSync`
 * sólo inserta filas nuevas para `providers` y `clients`; en `inventory` las
 * marca «fila nueva en la hoja — créala desde la app» y las salta. Por eso el
 * sync del 12-ago reportó `inventory: 523` y no 530.
 *
 * La lección estructural: para ALTAS el camino es Convex → hoja (lo que hizo
 * `seedSublotes508509497` el 03-ago). La hoja sólo sirve para editar lo que ya
 * existe. Esta migración cierra esa brecha en la dirección correcta.
 *
 * ⚠️ NO EMPUJA A LA HOJA. `_createItemExplicit` termina agendando
 * `products.pushToSheet` con `mode:'append'`; como estas 7 filas YA existen en
 * el SOT (525–531), usarlo duplicaría filas — el mismo modo de falla que dejó
 * 21 filas basura el 03-ago. Acá se inserta y punto: el siguiente pull
 * reconcilia los campos escribibles desde la hoja, que es su dueña.
 *
 * Qué hace:
 *   1. Crea 93A, 93B y 535–539 con sus costos exactos + su fila en `lotItems`.
 *   2. Publica los 7 hijos (mostrarEnCatalogo:true) con la procedencia del lote.
 *   3. Despublica #93, #501 y #504 — los padres retirados. `mostrarEnCatalogo`
 *      está EXCLUIDA del pull desde el 2026-07-30 (va sólo Convex → hoja), así
 *      que la columna Y de la hoja no puede hacerlo: tiene que ser acá.
 *   4. `inventoryStats.total` 523 → 530 (vía bumpInventoryTotal, 1 por alta).
 *
 * Idempotente: un itemId que ya existe se salta (`created:false`), así que
 * re-correrla es inofensivo.
 *
 *   npx convex run migrations:seedManuscrito20260812 '{}'          # dev
 *   npx convex run --prod migrations:seedManuscrito20260812 '{}'   # prod
 */
const MANUSCRITO_20260812_ALTAS = [
  {
    itemId: '93A',
    rowIndex: 525,
    nombre: 'Romeo',
    loteId: 'C-045',
    subLote: 'C-045-G1',
    categoria: 'Gema',
    talla: 'Óvalo',
    cantidad: 1,
    peso: '0.83',
    color: 'Verde Limón',
    calidad: 'COMERCIAL SÚPER FINA',
    medidas: '7.4 × 5.6 mm',
    costoBaseCOP: 223771,
    estado: 'DISPONIBLE' as const,
    observacion:
      'Sublote C-045-G1 de #93 Dos Luciérnagas (subdivisión 12-ago-2026, inventario manuscrito). ' +
      'Costo repartido por quilataje: 0.83/1.74 × 469.120.',
  },
  {
    itemId: '93B',
    rowIndex: 526,
    nombre: 'Julieta',
    loteId: 'C-045',
    subLote: 'C-045-G1',
    categoria: 'Gema',
    talla: 'Óvalo',
    cantidad: 1,
    peso: '0.91',
    color: 'Verde Limón',
    calidad: 'COMERCIAL SÚPER FINA',
    medidas: '7.4 × 5.6 mm',
    costoBaseCOP: 245349,
    estado: 'DISPONIBLE' as const,
    observacion:
      'Sublote C-045-G1 de #93 Dos Luciérnagas (subdivisión 12-ago-2026, inventario manuscrito). ' +
      'Costo repartido por quilataje: absorbe el redondeo. Σ hijos = $469.120 exacto.',
  },
  {
    itemId: '535',
    rowIndex: 527,
    nombre: 'Amor Prohibido',
    loteId: 'C-068',
    subLote: '504-A',
    categoria: 'Topitos',
    talla: 'Baguette',
    cantidad: 1,
    peso: undefined,
    color: 'Verde Natural',
    calidad: 'COMERCIAL FINA',
    medidas: '5.0 × 3.1 mm',
    costoBaseCOP: 15313,
    estado: 'DISPONIBLE' as const,
    observacion:
      'Sublote 504-A de #504 Baguette (subdivisión 12-ago-2026, inventario manuscrito). ' +
      'Costo repartido por unidad — falta pesar: el papel da 0,55 ct del par, no de cada piedra.',
  },
  {
    itemId: '536',
    rowIndex: 528,
    nombre: 'Romance Predestinado',
    loteId: 'C-068',
    subLote: '504-B',
    categoria: 'Topitos',
    talla: 'Baguette',
    cantidad: 1,
    peso: undefined,
    color: 'Verde Natural',
    calidad: 'COMERCIAL FINA',
    medidas: '4.9 × 3.0 mm',
    costoBaseCOP: 15312,
    estado: 'DISPONIBLE' as const,
    observacion:
      'Sublote 504-B de #504 Baguette (subdivisión 12-ago-2026, inventario manuscrito). ' +
      'Costo repartido por unidad — absorbe el redondeo. Σ hijos = $30.625 exacto.',
  },
  {
    itemId: '537',
    rowIndex: 529,
    nombre: 'Dos Amores',
    loteId: 'C-068',
    subLote: '501-A',
    categoria: 'Lote de Gemas',
    talla: 'Baguette',
    cantidad: 2,
    peso: '0.32',
    color: 'Verde Natural',
    calidad: 'COMERCIAL SUPERIOR',
    medidas: '4.2 × 2.9 mm',
    costoBaseCOP: 26972,
    estado: 'DISPONIBLE' as const,
    observacion:
      'Sublote 501-A de #501 Baguette (subdivisión 12-ago-2026, inventario manuscrito). ' +
      'Costo repartido por quilataje: 0.32/1.09 × 91.875. ⚠️ Falta la 2ª medida.',
  },
  {
    itemId: '538',
    rowIndex: 530,
    nombre: 'Éxitosos',
    loteId: 'C-068',
    subLote: '501-B',
    categoria: 'Lote de Gemas',
    talla: 'Baguette',
    cantidad: 2,
    peso: '0.42',
    color: 'Verde Natural',
    calidad: 'COMERCIAL SUPERIOR',
    medidas: '4.8 × 2.7 mm · 4.6 × 2.7 mm',
    costoBaseCOP: 35401,
    estado: 'DISPONIBLE' as const,
    observacion:
      'Sublote 501-B de #501 Baguette (subdivisión 12-ago-2026, inventario manuscrito). ' +
      'Costo repartido por quilataje: 0.42/1.09 × 91.875. Peso del grupo, no por piedra.',
  },
  {
    itemId: '539',
    rowIndex: 531,
    nombre: 'Equilibrio',
    loteId: 'C-068',
    subLote: '501-C',
    categoria: 'Lote de Gemas',
    talla: 'Baguette',
    cantidad: 2,
    peso: '0.35',
    color: 'Verde Natural',
    calidad: 'COMERCIAL SUPERIOR',
    medidas: '5.6 × 2.7 mm · 5.3 × 2.5 mm',
    costoBaseCOP: 29502,
    estado: 'DISPONIBLE' as const,
    observacion:
      'Sublote 501-C de #501 Baguette (subdivisión 12-ago-2026, inventario manuscrito). ' +
      'Costo repartido por quilataje: absorbe el redondeo. Σ hijos = $91.875 exacto.',
  },
];

/** Los tres padres subdivididos: retirados, no borrados. Fila y QR siguen vivos. */
const MANUSCRITO_20260812_PADRES = ['93', '501', '504'];

export const seedManuscrito20260812 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    const creados: Array<{
      itemId: string;
      created: boolean;
      reason?: string;
    }> = [];

    for (const a of MANUSCRITO_20260812_ALTAS) {
      const existente = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', a.itemId))
        .first();
      if (existente) {
        creados.push({ itemId: a.itemId, created: false, reason: 'ya existe' });
        continue;
      }

      const lot = await ctx.db
        .query('lots')
        .withIndex('by_loteId', (q) => q.eq('loteId', a.loteId))
        .first();
      if (!lot)
        throw new Error(`Lote ${a.loteId} no existe (ítem ${a.itemId})`);

      await ctx.db.insert('productInventory', {
        itemId: a.itemId,
        rowIndex: a.rowIndex,
        nombre: a.nombre,
        peso: a.peso,
        color: a.color,
        calidad: a.calidad,
        cantidad: a.cantidad,
        talla: a.talla,
        medidas: a.medidas,
        categoria: a.categoria,
        estado: a.estado,
        qr: `https://tierramadre.app/p/${a.itemId}`,
        loteId: a.loteId,
        subLote: a.subLote,
        // El costo lo posee la hoja desde el 2026-07-24; se siembra igual para
        // que el ítem nazca correcto y no espere al primer pull.
        costoBaseCOP: a.costoBaseCOP,
        // preponderancia 0: ya no deriva costo (2026-07-24) y así no altera la
        // suma 1,0 del lote, que es la convención de la hoja.
        preponderancia: 0,
        observacion: a.observacion,
        tipo: 'gema',
        // Publicados, igual que hizo seedSublotes508509497 con los 10 hijos del
        // 03-ago. Sin denormalizar mina/tratamiento a propósito: el tercer
        // argumento de `withPublishStamp` (provenance) es de la rama
        // perf/convex-db-io-20260812 y NO está en main ni en producción, que
        // todavía resuelve la procedencia por lectura en publishedCatalog.
        // Cuando esa rama entre, el republish la estampa sola.
        ...withPublishStamp(null, true),
        lastPulledAt: now,
        // 'pending' y NO se agenda pushToSheet: la fila ya existe en el SOT
        // (525–531) y un push en modo append la duplicaría.
        syncStatus: 'pending' as const,
      });
      await bumpInventoryTotal(ctx, 1);

      const hermanos = await ctx.db
        .query('lotItems')
        .withIndex('by_loteId', (q) => q.eq('loteId', a.loteId))
        .collect();
      await ctx.db.insert('lotItems', {
        loteId: a.loteId,
        itemId: a.itemId,
        preponderancia: 0,
        costoBaseCOP: a.costoBaseCOP,
        ordenEnLote: hermanos.length + 1,
      });

      creados.push({ itemId: a.itemId, created: true });
    }

    // Padres retirados fuera del catálogo. publishedCatalog filtra por
    // mostrarEnCatalogo y loteId, NO por cantidad: con cant 0 seguirían
    // visibles en la vitrina, que es justo el doble-venta que el retiro evita.
    const despublicados: Array<{ itemId: string; antes: boolean | undefined }> =
      [];
    for (const itemId of MANUSCRITO_20260812_PADRES) {
      const padre = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
        .first();
      if (!padre) {
        despublicados.push({ itemId, antes: undefined });
        continue;
      }
      const antes = padre.mostrarEnCatalogo;
      if (antes !== false)
        await ctx.db.patch(padre._id, withPublishStamp(padre, false));
      despublicados.push({ itemId, antes });
    }

    return {
      creados,
      despublicados,
      nota: 'No se empuja a la hoja: las filas 525–531 ya existen en el SOT.',
    };
  },
});

/**
 * ADDENDUM al inventario manuscrito 2026-08-12 — la mitad que la hoja NO puede
 * hacer. Hermana de `seedManuscrito20260812`, mismo motivo estructural: para
 * ALTAS el camino es Convex → hoja, nunca al revés (`fotoSync` salta toda fila
 * nueva de `inventory` con «fila nueva en la hoja — créala desde la app»).
 *
 * ORDEN: primero `scripts/aplicar-addendum-inventario-20260812.mjs --apply`
 * (crea las filas 532–533 en el SOT y retira #218), después el sync completo,
 * y recién entonces esta migración. Al revés, los `rowIndex` de abajo apuntan a
 * filas que todavía no existen.
 *
 * Qué hace:
 *   1. Crea #540 Felicidad y #541 Alegría con su fila en `lotItems`, heredando
 *      la consignación viva de #218 (nacen en ASESOR, con Isa).
 *   2. Despublica #218. ESTO NO ESTABA EN EL ADDENDUM y hace falta: #218 está
 *      hoy `mostrarEnCatalogo:true` y `publishedCatalog` filtra por
 *      `mostrarEnCatalogo` y `loteId`, **NO por cantidad** — con `cant 0`
 *      seguiría ofertable en la vitrina, que es justo el doble-venta que el
 *      retiro evita. Mismo tratamiento que recibieron #93, #501 y #504.
 *      La columna Y de la hoja no puede hacerlo: está excluida del pull desde
 *      el 2026-07-30 (va sólo Convex → hoja).
 *   3. Re-apunta el kardex de Isa: 3 filas nuevas bajo un `kardexEventId`
 *      propio — ver el bloque de abajo.
 *
 * ⚠️ NO EMPUJA A LA HOJA, por partida doble:
 *   · Las filas 532–533 ya existen en el SOT cuando esto corre; un push en modo
 *     append las duplicaría (el modo de falla que dejó 21 filas basura el 03-ago).
 *   · Las filas de kardex nacen `syncStatus:'synced'` como manda el contrato de
 *     `_backfillMovements`: son históricas, el papel firmado es el origen. (Y de
 *     todos modos la pestaña "Movimientos Asesor" no existe — las 32 filas de
 *     `asesorMovements` en prod están en `syncStatus:'error'` por eso mismo.)
 *
 * Idempotente en los tres pasos: por `itemId` las altas, por el valor actual de
 * `mostrarEnCatalogo` el despublicado, y por `movimientoId` el kardex — los
 * `movimientoId` son deterministas a propósito (nada de `Date.now()`), que es lo
 * que hace que re-correrla sea inofensiva.
 *
 *   npx convex run migrations:seedAddendum20260812 '{}'          # dev
 *   npx convex run --prod migrations:seedAddendum20260812 '{}'   # prod
 */
const ADDENDUM_20260812_ALTAS = [
  {
    itemId: '540',
    rowIndex: 532,
    nombre: 'Felicidad',
    loteId: 'LC-10',
    subLote: 'LC-10-DR',
    coleccion: 'Dinastías',
    categoria: 'Gema',
    talla: 'Lágrima',
    cantidad: 1,
    peso: '0.37',
    color: 'Verde Limón',
    calidad: 'COMERCIAL FINA',
    medidas: '5.9 × 3.9 mm',
    costoBaseCOP: 182154,
    precioFinalCOP: 340102,
    ubicacion: 'OFI.CALI',
    estado: 'ASESOR' as const,
    asesor: 'Mauricio Echeverry',
    asesorActual: 'Isa la Negra Vikinga Warrior Portocarrero',
    estadoAsesor: 'ASESOR',
    /**
     * SALE PUBLICADA. Nació sin publicar mientras su medida estaba en disputa
     * (el papel dice 5,9 × 3,9; la col I del padre traía `5.6 × 7.0 × 5.7` para
     * la segunda piedra), pero la disputa se resolvió sin tener que re-medir la
     * piedra —que está donde Isa— porque el propio quilataje la desempata:
     *
     *   · 0,37 ct en lágrima ≈ 6 × 4 mm. El 5,9 × 3,9 del papel calza.
     *   · 5.6 × 7.0 × 5.7 mm sería una piedra de bastante más de 1 ct, no de
     *     0,37 — y tiene el ancho (7.0) MAYOR que el largo (5.6), que en una
     *     lágrima no se escribe así.
     *
     * Lo mismo del otro lado: el 7,7 × 4,8 del papel para los 0,67 ct de #541
     * también calza. O sea que el papel es coherente con los dos pesos y la
     * segunda terna de la col I no lo es con ninguno — el dato corrupto es el
     * de la hoja, no el del manuscrito. (La col I de #218 se deja como está: el
     * padre queda retirado y su `observacion` documenta la división.)
     */
    publicar: true,
    observacion:
      'Sublote LC-10-DR de #218 Dinastía Real (subdivisión 12-ago-2026, inventario manuscrito). ' +
      'Costo y precio repartidos por quilataje: 0.37/1.04. Nace en ASESOR con Isa la Negra Vikinga ' +
      'Warrior Portocarrero: hereda la consignación viva del padre (entrega del 27-jul-2026). ' +
      'Medida tomada del manuscrito (5,9 × 3,9): la segunda terna que traía la col I del padre ' +
      '(5.6 × 7.0 × 5.7) es incompatible con 0,37 ct — sería una piedra de más de 1 ct.',
  },
  {
    itemId: '541',
    rowIndex: 533,
    nombre: 'Alegría',
    loteId: 'LC-10',
    subLote: 'LC-10-DR',
    coleccion: 'Dinastías',
    categoria: 'Gema',
    talla: 'Lágrima',
    cantidad: 1,
    peso: '0.67',
    color: 'Verde Limón',
    calidad: 'COMERCIAL FINA',
    medidas: '7.7 × 4.7 × 3.7 mm',
    costoBaseCOP: 329846,
    precioFinalCOP: 615860,
    ubicacion: 'OFI.CALI',
    estado: 'ASESOR' as const,
    asesor: 'Mauricio Echeverry',
    asesorActual: 'Isa la Negra Vikinga Warrior Portocarrero',
    estadoAsesor: 'ASESOR',
    /** Su medida SÍ calza: el 7,7 × 4,8 del papel coincide con la primera terna
     *  que ya traía la col I del padre (`7.7 × 4.7 × 3.7`). */
    publicar: true,
    observacion:
      'Sublote LC-10-DR de #218 Dinastía Real (subdivisión 12-ago-2026, inventario manuscrito). ' +
      'Costo y precio repartidos por quilataje: absorbe el redondeo. Σ hijos = $512.000 en costo y ' +
      '$955.962 en precio, exacto. Nace en ASESOR con Isa la Negra Vikinga Warrior Portocarrero: ' +
      'hereda la consignación viva del padre (entrega del 27-jul-2026).',
  },
];

/**
 * El kardex de Isa, re-apuntado. El movimiento vivo de #218 es
 * `MOV-218-1785178014521` (entrega del 27-jul-2026, precio $955.962) y pertenece
 * al evento `KDX-1785178014410-d8b0hq`, que cubre CINCO ítems bajo UN comprobante
 * firmado (#382 Teia, #427 Namek, #218 Dinastía Real, #171 Dinastía Celestial,
 * #484 Magia · PDF 1JjV3hGPIAEwJ2ilEe6MbCEhZcwL6_R3g).
 *
 * POR QUÉ NO SE TOCA ESE EVENTO: el PDF firmado lista 5 ítems. Agregarle filas
 * haría que `exportMovimientoKardexPdf` regenerara un documento distinto del que
 * Isa firmó. `asesorMovements` es append-only por diseño y el papel es el origen.
 * Así que estas 3 filas van bajo un `kardexEventId` PROPIO y referencian el
 * comprobante original en `notas` en vez de copiar su URL — si alguien regenera
 * el PDF de este evento nuevo, `_setComprobanteUrl` no pisa el firmado.
 *
 * POR QUÉ FUNCIONA: `MovimientosKardexPage` deriva «lo que el asesor tiene en
 * mano» del ÚLTIMO movimiento por `itemId` (`.order('desc')` sobre
 * `by_asesorNombre`, primer hit por ítem) y lo cuenta como retenido sólo si
 * `tipo === 'entrega'`. Estas filas se insertan hoy, así que su `_creationTime`
 * gana al del 27-jul: #218 sale del selector de devolución y #540/#541 entran,
 * sin tocar el `estado` de #218 — que sigue en ASESOR, como manda el addendum.
 *
 * POR QUÉ NO POR LA APP: `_registerHandoff` exige `estado === 'DISPONIBLE'` y los
 * hijos nacen en ASESOR; `_registerReturn` forzaría #218 a DISPONIBLE, que es
 * justo lo que el addendum prohíbe, y registraría una devolución que nunca pasó.
 *
 * La suma cierra a cero: 340.102 + 615.860 = 955.962, el precio exacto con el que
 * #218 salió el 27-jul.
 */
const ADDENDUM_20260812_KARDEX_EVENT = 'KDX-SUBDIV-218-20260812';
const ADDENDUM_20260812_COMPROBANTE_PADRE =
  'https://drive.google.com/file/d/1JjV3hGPIAEwJ2ilEe6MbCEhZcwL6_R3g/view';
const ADDENDUM_20260812_MOVIMIENTOS = [
  {
    movimientoId: 'MOV-218-20260812-SUBDIV-CIERRE',
    itemId: '218',
    tipo: 'devolucion' as const,
    /** NO es una devolución física: Isa nunca devolvió nada. Es el cierre
     *  contable de la línea del padre, para que el ledger no muestre un ítem
     *  con `cant 0` en su mano ni cuente $955.962 dos veces. `devolucion` es el
     *  único cierre que el esquema admite (`tipo` es entrega | devolucion). */
    fecha: '2026-08-12',
    precio: 955962,
    /** 2, no 1: lo que salió el 27-jul dentro de #218 fueron DOS piedras. La
     *  entrega original dejó `cantidad` vacía; acá se explicita para que el
     *  cierre cuadre contra las dos entregas de abajo (1 + 1). */
    cantidad: 2,
    /** El estado NO cambia — por eso anterior === nuevo. `_backfillMovements`
     *  y esta migración no patchean `productInventory.estado`, y el addendum
     *  exige que #218 siga en ASESOR. */
    estadoAnterior: 'ASESOR',
    estadoNuevo: 'ASESOR',
    notas:
      'Cierre contable, NO devolución física. #218 se subdividió el 12-ago-2026 en #540 Felicidad ' +
      '(0.37 ct) y #541 Alegría (0.67 ct), que siguen en manos de Isa. La entrega original es ' +
      'MOV-218-1785178014521 (27-jul-2026), evento KDX-1785178014410-d8b0hq, comprobante firmado ' +
      `${ADDENDUM_20260812_COMPROBANTE_PADRE} — ese evento NO se modifica.`,
  },
  {
    movimientoId: 'MOV-540-20260812-SUBDIV',
    itemId: '540',
    tipo: 'entrega' as const,
    /** 27-jul y no 12-ago a propósito: la piedra está físicamente con Isa desde
     *  la entrega del padre. El kardex mide cuánto lleva una pieza en la mano
     *  de alguien; fecharla hoy borraría dos semanas de consignación. */
    fecha: '2026-07-27',
    precio: 340102,
    cantidad: 1,
    estadoAnterior: 'DISPONIBLE',
    estadoNuevo: 'ASESOR',
    notas:
      'Hereda la consignación de #218 Dinastía Real, subdividido el 12-ago-2026. Entregado ' +
      'físicamente el 27-jul-2026 como parte del padre, evento KDX-1785178014410-d8b0hq, ' +
      `comprobante firmado ${ADDENDUM_20260812_COMPROBANTE_PADRE} (que lista el padre, no esta pieza).`,
  },
  {
    movimientoId: 'MOV-541-20260812-SUBDIV',
    itemId: '541',
    tipo: 'entrega' as const,
    fecha: '2026-07-27',
    precio: 615860,
    cantidad: 1,
    estadoAnterior: 'DISPONIBLE',
    estadoNuevo: 'ASESOR',
    notas:
      'Hereda la consignación de #218 Dinastía Real, subdividido el 12-ago-2026. Entregado ' +
      'físicamente el 27-jul-2026 como parte del padre, evento KDX-1785178014410-d8b0hq, ' +
      `comprobante firmado ${ADDENDUM_20260812_COMPROBANTE_PADRE} (que lista el padre, no esta pieza).`,
  },
];

/** El padre subdividido: retirado y despublicado, NO borrado. Fila, nombre y QR
 *  siguen vivos — «Dinastía Real» sobrevive como el nombre del par, igual que
 *  «Dos Luciérnagas» en #93. */
const ADDENDUM_20260812_PADRE = '218';

/** Datos de la entrega original, para que el ledger de Isa quede consistente. */
const ADDENDUM_20260812_ASESOR = {
  nombre: 'Isa la Negra Vikinga Warrior Portocarrero',
  id: 'asesor_8',
};

export const seedAddendum20260812 = internalMutation({
  args: {
    /** Quién queda registrado como autor de las filas de kardex. Por defecto,
     *  el mismo operador que registró la entrega original del 27-jul. */
    editorEmail: v.optional(v.string()),
  },
  handler: async (ctx, { editorEmail }) => {
    const now = new Date().toISOString();
    const autor = editorEmail ?? 'kpp.coomunity@gmail.com';

    // ── 1. Altas ──────────────────────────────────────────────────────────
    const creados: Array<{
      itemId: string;
      created: boolean;
      publicado?: boolean;
      loteDocumento?: string;
      reason?: string;
    }> = [];

    for (const a of ADDENDUM_20260812_ALTAS) {
      const existente = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', a.itemId))
        .first();
      if (existente) {
        creados.push({ itemId: a.itemId, created: false, reason: 'ya existe' });
        continue;
      }

      // El lote puede NO existir como documento, y no es un error: `LC-10` es
      // un loteId legacy que sólo vive como string en las filas de inventario.
      // Ninguno de los 15 `LC-*` está en la tabla `lots` (73 ítems), y el propio
      // #218 vive así: sin documento de lote, sin fila en `lotItems` y sin
      // mina/tratamiento denormalizados. Las hijas nacen igual que el padre —
      // inventarle un lote a LC-10 sería fabricar costo y proveedor que nadie
      // declaró.
      //
      // La primera versión abortaba acá. Que la transacción se cayera entera en
      // vez de escribir a medias es justamente lo que se buscaba.
      const lot = await ctx.db
        .query('lots')
        .withIndex('by_loteId', (q) => q.eq('loteId', a.loteId))
        .first();

      await ctx.db.insert('productInventory', {
        itemId: a.itemId,
        rowIndex: a.rowIndex,
        nombre: a.nombre,
        peso: a.peso,
        color: a.color,
        calidad: a.calidad,
        cantidad: a.cantidad,
        talla: a.talla,
        medidas: a.medidas,
        categoria: a.categoria,
        coleccion: a.coleccion,
        ubicacion: a.ubicacion,
        estado: a.estado,
        // El bloque de asesor completo: los hijos heredan la consignación viva
        // del padre. Sin esto no aparecerían en `enAsesor` y el selector de
        // devolución no los mostraría aunque el kardex diga que Isa los tiene.
        asesor: a.asesor,
        asesorActual: a.asesorActual,
        estadoAsesor: a.estadoAsesor,
        qr: `https://tierramadre.app/p/${a.itemId}`,
        productoUrl: `https://tierramadre.app/product/${a.itemId}`,
        loteId: a.loteId,
        subLote: a.subLote,
        // Costo y precio los posee la hoja, pero se siembran para que el ítem
        // nazca correcto y no espere al primer pull.
        costoBaseCOP: a.costoBaseCOP,
        precioFinalCOP: a.precioFinalCOP,
        // Crítico: sin esto, un re-fan del lote repricearía con costo × 2,6 y
        // se perdería el precio de remate que el reparto preserva. El pull lo
        // estamparía igual, pero para entonces el daño ya podría estar hecho.
        precioFinalManual: true,
        // preponderancia 0: ya no deriva costo (2026-07-24) y así no altera la
        // suma 1,0 del lote, que es la convención de la hoja.
        preponderancia: 0,
        observacion: a.observacion,
        tipo: 'gema',
        // Sin certificadoUrl ni carpetaFotosUrl del padre a propósito: el
        // certificado de #218 ampara el par de piedras, no cada una suelta.
        // La procedencia SÍ se estampa: `withPublishStamp` acepta el tercer
        // argumento desde Fix 1B (PR #111, ya en main). Las hijas nacen con
        // mina/tratamiento denormalizados, así que backfillLotProvenance no
        // hace falta por ellas.
        // Sin lote no hay procedencia que estampar: el padre tampoco la tiene.
        ...withPublishStamp(
          null,
          a.publicar,
          lot ? { mina: lot.mina, tratamiento: lot.tratamiento } : undefined,
        ),
        lastPulledAt: now,
        // 'pending' y NO se agenda pushToSheet: las filas 532–533 ya existen en
        // el SOT y un push en modo append las duplicaría.
        syncStatus: 'pending' as const,
      });
      await bumpInventoryTotal(ctx, 1);
      // Una pieza nueva publicada CAMBIA lo que renderiza el catálogo público:
      // hay que invalidar la caché de cada visitante ya, no al vencer el TTL.
      if (a.publicar)
        await bumpCatalogVersionIfPublished(ctx, null, {
          mostrarEnCatalogo: true,
        });

      // `lotItems` sólo si el lote existe: la tabla es la composición de un
      // lote real. Colgar filas de un loteId fantasma dejaría huérfanos que
      // ningún rollup sabe leer — y el padre no tiene fila ahí tampoco.
      if (lot) {
        const hermanos = await ctx.db
          .query('lotItems')
          .withIndex('by_loteId', (q) => q.eq('loteId', a.loteId))
          .collect();
        await ctx.db.insert('lotItems', {
          loteId: a.loteId,
          itemId: a.itemId,
          preponderancia: 0,
          costoBaseCOP: a.costoBaseCOP,
          ordenEnLote: hermanos.length + 1,
        });
      }

      creados.push({
        itemId: a.itemId,
        created: true,
        publicado: a.publicar,
        loteDocumento: lot ? 'sí' : 'no existe (loteId legacy)',
      });
    }

    // ── 2. El padre sale del catálogo ─────────────────────────────────────
    const padre = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', ADDENDUM_20260812_PADRE))
      .first();
    let despublicado: { itemId: string; antes?: boolean; cambiado: boolean };
    if (!padre) {
      throw new Error(
        `#${ADDENDUM_20260812_PADRE} no está en el espejo — la hoja tiene que ` +
          `haberse sincronizado antes de correr esto.`,
      );
    } else {
      const antes = padre.mostrarEnCatalogo;
      if (antes !== false) {
        await ctx.db.patch(padre._id, withPublishStamp(padre, false));
        // Estaba visible y deja de estarlo: el centinela avisa a los visitantes
        // en vez de dejarles la pieza retirada en caché hasta el piso de TTL.
        await bumpCatalogVersionIfPublished(ctx, padre, {
          mostrarEnCatalogo: false,
        });
      }
      despublicado = {
        itemId: ADDENDUM_20260812_PADRE,
        antes,
        cambiado: antes !== false,
      };
    }

    // ── 2b. El retiro que la hoja NO logró propagar ───────────────────────
    //
    // DESCUBIERTO AL VERIFICAR EL SYNC DEL 12-ago: escribir `0` y vaciar una
    // celda numérica en la hoja NO llega a Convex. Son dos mecanismos distintos
    // y los dos son silenciosos:
    //
    //   · VACIAR → `coerceCell('num', '')` devuelve `skip:true` a propósito
    //     («never clear a number from a blanked cell», sheetPullMaps.ts). Por eso
    //     #218 y #93 conservan su `precioFinalCOP` aunque la col M quedó vacía.
    //   · PONER 0 → la col L está formateada como contabilidad y renderiza el
    //     cero como `"-"`. `/api/get-inventory-rows` lee FORMATTED_VALUE, así que
    //     el pull recibe `"-"`, `Number("-")` es NaN y `coerceCell` lo salta.
    //     La col G (Cant.) no tiene ese formato: su `0` sí aterrizó.
    //
    // No es teórico ni nuevo: los tres padres que la corrida del 12-ago retiró
    // por hoja (#93, #501, #504) siguen HOY en producción con su costo entero,
    // mientras que los del 03-ago (#497, #508, #509) —retirados por migración,
    // Convex primero— están correctamente en 0. La hoja dice una cosa y el
    // espejo otra desde hace horas, sin que nada avisara.
    //
    // Se repara acá porque es exactamente la invariante que el addendum exige:
    // «Σ hijos == padre», con el padre en 0. Si esto no corre, #218 conserva
    // $512.000 y $955.962 al mismo tiempo que sus hijas aportan otro tanto.
    //
    // Los `lotItems` no están afectados: ninguno de los cuatro padres tiene fila
    // ahí (verificado en prod), así que los totales por lote no doblan. El dato
    // sucio vive sólo en `productInventory`.
    const RETIRADOS_A_SANEAR: Array<{ itemId: string; motivo: string }> = [
      { itemId: '218', motivo: 'este addendum' },
      { itemId: '93', motivo: 'corrida del 12-ago (quedó sucio)' },
      { itemId: '501', motivo: 'corrida del 12-ago (quedó sucio)' },
      { itemId: '504', motivo: 'corrida del 12-ago (quedó sucio)' },
    ];
    const saneados: Array<{
      itemId: string;
      costoAntes?: number;
      precioAntes?: number;
      cambiado: boolean;
    }> = [];
    for (const r of RETIRADOS_A_SANEAR) {
      const doc = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', r.itemId))
        .first();
      if (!doc) {
        saneados.push({ itemId: r.itemId, cambiado: false });
        continue;
      }
      // Guardarraíl: sólo se sanea un ítem REALMENTE retirado. Si alguien le
      // devolvió unidades, este saneo no aplica y no se toca.
      if ((doc.cantidad ?? 0) !== 0) {
        saneados.push({ itemId: r.itemId, cambiado: false });
        continue;
      }
      const yaLimpio =
        (doc.costoBaseCOP ?? 0) === 0 &&
        doc.precioFinalCOP === undefined &&
        doc.precioCOP === undefined;
      if (yaLimpio) {
        saneados.push({ itemId: r.itemId, cambiado: false });
        continue;
      }
      saneados.push({
        itemId: r.itemId,
        costoAntes: doc.costoBaseCOP,
        precioAntes: doc.precioFinalCOP,
        cambiado: true,
      });
      await ctx.db.patch(doc._id, {
        costoBaseCOP: 0,
        // `undefined` BORRA el campo en Convex, que es lo que la col M vacía
        // quería decir. Con costo 0, `computePrecioFinal` no re-deriva nada, así
        // que soltar `precioFinalManual` no revive el precio.
        precioFinalCOP: undefined,
        precioCOP: undefined,
        precioFinalManual: undefined,
      });
    }

    // ── 3. El kardex de Isa ───────────────────────────────────────────────
    // Mismo contrato que `asesorMovements._backfillMovements` (idempotente por
    // movimientoId, sin el guard de estado, sin patchear productInventory, sin
    // push a la hoja). Inline y no vía runMutation porque una mutation no puede
    // llamar a otra — y así los tres pasos caen en UNA transacción: o entran las
    // altas Y el kardex, o no entra nada.
    const todos = await ctx.db.query('asesorMovements').collect();
    const vistos = new Set(todos.map((r) => r.movimientoId));
    let maxRow = todos.reduce((m, r) => Math.max(m, r.rowIndex), 1);
    const kardex: Array<{
      movimientoId: string;
      itemId: string;
      tipo: string;
      skipped: boolean;
    }> = [];

    for (const m of ADDENDUM_20260812_MOVIMIENTOS) {
      if (vistos.has(m.movimientoId)) {
        kardex.push({
          movimientoId: m.movimientoId,
          itemId: m.itemId,
          tipo: m.tipo,
          skipped: true,
        });
        continue;
      }
      const producto = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', m.itemId))
        .first();
      if (!producto)
        throw new Error(
          `No puedo registrar ${m.movimientoId}: el ítem ${m.itemId} no existe.`,
        );
      maxRow += 1;
      await ctx.db.insert('asesorMovements', {
        itemId: m.itemId,
        itemNombre: producto.nombre,
        tipo: m.tipo,
        asesorNombre: ADDENDUM_20260812_ASESOR.nombre,
        asesorId: ADDENDUM_20260812_ASESOR.id,
        cantidad: m.cantidad,
        precio: m.precio,
        fecha: m.fecha,
        notas: m.notas,
        kardexEventId: ADDENDUM_20260812_KARDEX_EVENT,
        registradoPorEmail: autor,
        registradoPorNombre: 'migracion-addendum-20260812',
        estadoAnterior: m.estadoAnterior,
        estadoNuevo: m.estadoNuevo,
        movimientoId: m.movimientoId,
        // Sin comprobanteUrl: el PDF firmado ampara al padre, no a estas filas.
        // La referencia vive en `notas` para que regenerar el PDF de ESTE evento
        // no pise el original.
        rowIndex: maxRow,
        lastPulledAt: now,
        // 'synced' aunque nunca se empuje: históricas, el papel es el origen.
        syncStatus: 'synced' as const,
      });
      vistos.add(m.movimientoId);
      kardex.push({
        movimientoId: m.movimientoId,
        itemId: m.itemId,
        tipo: m.tipo,
        skipped: false,
      });
    }

    return {
      creados,
      despublicado,
      saneados,
      kardex: {
        eventId: ADDENDUM_20260812_KARDEX_EVENT,
        insertados: kardex.filter((k) => !k.skipped).length,
        saltados: kardex.filter((k) => k.skipped).length,
        filas: kardex,
      },
      pendientes: [
        'La medida de #540 sale del manuscrito (5,9 × 3,9), no de la col I del padre: la segunda ' +
          'terna de ahí (5.6 × 7.0 × 5.7) es incompatible con 0,37 ct. Confirmarla contra la ' +
          'piedra cuando vuelva de donde Isa sigue siendo lo prolijo, pero ya no bloquea.',
        'LC-10 no existe en la tabla `lots` (ninguno de los 15 LC-* existe; 73 ítems). Las hijas ' +
          'nacen sin fila en lotItems y sin mina/tratamiento, igual que #218 y #171. ' +
          'backfillLotProvenance NO puede arreglarlo: salta los ítems cuyo loteId no resuelve. ' +
          'HALLAZGO MAYOR: 226 de los 429 publicados están en esa situación y renderizan el ' +
          'catálogo sin procedencia, porque Fix 1B quitó a propósito el fallback a `lots`.',
        'El sublote LC-10-DR no queda registrado en la pestaña Sublotes (mismo alcance que la ' +
          'corrida del 12-ago).',
        '#218 conserva precioEmbajadorCOP $1.730.560 y el bloque de Caja ($1.331.200): dos ' +
          'ledgers que siguen apuntando a un ítem con cant 0. Fuera del alcance del addendum.',
        'DEFECTO DE FONDO, sin arreglar: la hoja no puede poner un número en 0 ni vaciarlo. ' +
          'Vaciar lo salta coerceCell a propósito; el 0 muere porque la col L renderiza "-" y ' +
          '/api/get-inventory-rows lee FORMATTED_VALUE. Este paso 2b repara los cuatro casos ' +
          'conocidos, pero el próximo retiro por hoja volverá a divergir en silencio.',
      ],
      nota:
        'No se empuja a la hoja: las filas 532–533 ya existen en el SOT y el kardex nunca tuvo ' +
        'pestaña (las 32 filas de asesorMovements en prod están en syncStatus error).',
    };
  },
});

/**
 * REMANENTES de la hoja "Inventario 12 Agosto" — la mitad que la hoja NO puede
 * hacer. Hermana de `seedManuscrito20260812` y `seedAddendum20260812`.
 *
 * CORRECCIÓN AL MOTIVO DE LAS HERMANAS (verificado en prod el 15-ago-2026): el
 * pull HOY SÍ upserta filas nuevas de inventario — `products._pullFromSheet`
 * inserta y bumpea `inventoryStats` (la nota «fotoSync las salta» quedó vieja).
 * El sync completo del 15-ago ya creó #542–#554 en prod (total 545), ASÍ QUE en
 * prod el paso 2 se salta entero por idempotencia (created:false, sin re-bump).
 * Lo que el pull NO hace es importar un lote sin proveedor:
 * `lots._insertMissingFromSheet` exige providerId, y por eso C-090 quedó
 * afuera. En prod, el trabajo real de esta migración es SOLO el paso 1.
 * Las altas quedan como respaldo idempotente para un deployment donde ese
 * sync no haya corrido (dev).
 *
 * ORDEN: primero `scripts/aplicar-remanentes-12ago.mjs --apply` (corrió el
 * 15-ago-2026: filas 534–546 en el SOT, C-090 en la pestaña Lotes, +2 cortes en
 * Listas), después el sync completo, y recién entonces esta migración. Al
 * revés, los `rowIndex` de abajo apuntan a filas que todavía no existen.
 *
 * Qué hace:
 *   1. Crea el lote C-090 con el patrón "Recuperado" (C-070/C-074, verificado
 *      en prod): costoTotalCOP 0, sin fecha ni formaPago, estado abierto, y el
 *      MISMO providerId placeholder que C-070 — se lee de C-070 en vez de
 *      inventar un proveedor, porque `providerId` es obligatorio en el schema
 *      y "sin proveedor" es un hecho que el placeholder ya representa.
 *      rowIndex 111 = su fila real en la pestaña Lotes.
 *   2. Crea #542–#554 (2 Chivor → C-070, 11 Muzo → C-090). Nacen DISPONIBLE,
 *      cant 1, OFI.CALI, preponderancia 0, `mostrarEnCatalogo:false` vía
 *      `withPublishStamp` y SIN costoBaseCOP ni precioFinalCOP: la hoja de
 *      origen no trae costos y vacío es un hecho, no un hueco. Sin costo,
 *      `computePrecioFinal` no deriva nada — no ofertables hasta costear.
 *   3. `inventoryStats.total` 532 → 545 (vía bumpInventoryTotal, 1 por alta).
 *
 * SIN filas en `lotItems`, a propósito: los 13 ítems que HOY viven en C-070
 * tienen cero filas ahí (verificado en prod) — el patrón Recuperado existe
 * solo como string `loteId` en el inventario. Colgar lotItems únicamente de
 * las altas dejaría la composición del lote a medias. Cuando C-090 se costee
 * (proveedor + factura), `lotItems._attachExistingToLote` es el camino.
 *
 * SIN bumpCatalogVersion: nada de esto está publicado, el catálogo público no
 * cambia. Y NO EMPUJA A LA HOJA: las filas 534–546 ya existen en el SOT; un
 * push en modo append las duplicaría (el modo de falla del 03-ago).
 *
 * Idempotente: por `loteId` el lote, por `itemId` cada alta — re-correrla es
 * inofensivo.
 *
 *   npx convex run migrations:seedRemanentes20260812 '{}'          # dev
 *   npx convex run --prod migrations:seedRemanentes20260812 '{}'   # prod
 */
const REMANENTES_20260812_LOTE = {
  loteId: 'C-090',
  rowIndex: 111,
  unidadesDeclaradas: 11,
  pesoTotalQuilates: 21.21,
  mina: 'Muzo',
  notas:
    'Creado 12-ago-2026 para las 11 gemas Verde Muzo de la hoja "Inventario 12 Agosto". ' +
    'Falta proveedor, factura, fecha y costo. Mismo patrón que los lotes "Recuperado" (C-070, C-074).',
};

const REMANENTES_20260812_OBSERVACION =
  'Alta 12-ago-2026 desde la hoja "Inventario 12 Agosto". Sin costo: la hoja no lo trae. ' +
  'NO ofertable hasta costear.';

const REMANENTES_20260812_ALTAS = [
  {
    itemId: '542',
    rowIndex: 534,
    nombre: 'Caja de Sueños',
    loteId: 'C-070',
    talla: 'Cuadrada',
    cantidad: 1,
    peso: '1.42',
    color: 'Verde Chivor',
    calidad: 'F2',
    medidas: '6.8 × 6.6 mm',
  },
  {
    itemId: '543',
    rowIndex: 535,
    nombre: 'Cuarteto de Nos',
    loteId: 'C-070',
    talla: 'Semicuadrada',
    cantidad: 1,
    peso: '1.08',
    color: 'Verde Chivor',
    calidad: 'F2',
    medidas: '6.6 × 6.2 mm',
  },
  {
    itemId: '544',
    rowIndex: 536,
    nombre: 'Viaje Estelar',
    loteId: 'C-090',
    talla: 'Octogonal',
    cantidad: 1,
    peso: '4.1',
    color: 'Verde Muzo',
    calidad: 'F1',
    medidas: '12.91 × 6.78 mm',
  },
  {
    itemId: '545',
    rowIndex: 537,
    nombre: 'Sentir de la Montaña',
    loteId: 'C-090',
    talla: 'Octogonal',
    cantidad: 1,
    peso: '2.15',
    color: 'Verde Muzo',
    calidad: 'F1',
    medidas: '10.09 × 5.59 mm',
  },
  {
    itemId: '546',
    rowIndex: 538,
    nombre: 'Planeta Verde',
    loteId: 'C-090',
    talla: 'Octogonal',
    cantidad: 1,
    peso: '3.87',
    color: 'Verde Muzo',
    calidad: 'F1',
    medidas: '13.41 × 6.46 mm',
  },
  {
    itemId: '547',
    rowIndex: 539,
    nombre: 'Tiempo',
    loteId: 'C-090',
    talla: 'Corazón',
    cantidad: 1,
    peso: '1.83',
    color: 'Verde Muzo',
    calidad: 'F2',
    medidas: '8.69 × 7.27 mm',
  },
  {
    itemId: '548',
    rowIndex: 540,
    nombre: 'Semilla',
    loteId: 'C-090',
    talla: 'Cushion',
    cantidad: 1,
    peso: '2.2',
    color: 'Verde Muzo',
    calidad: 'F1',
    medidas: '7.99 × 7.49 mm',
  },
  {
    itemId: '549',
    rowIndex: 541,
    nombre: 'Luz de la Montaña',
    loteId: 'C-090',
    talla: 'Octogonal',
    cantidad: 1,
    peso: '2.29',
    color: 'Verde Muzo',
    calidad: 'F1',
    medidas: '9.86 × 5.54 mm',
  },
  {
    itemId: '550',
    rowIndex: 542,
    nombre: 'Libertad',
    loteId: 'C-090',
    talla: 'Octogonal',
    cantidad: 1,
    peso: '1',
    color: 'Verde Muzo',
    calidad: 'F1',
    medidas: '6.78 × 5.44 mm',
  },
  {
    itemId: '551',
    rowIndex: 543,
    nombre: 'Latido de la Tierra',
    loteId: 'C-090',
    talla: 'Lágrima',
    cantidad: 1,
    peso: '1.48',
    color: 'Verde Muzo',
    calidad: 'F1',
    medidas: '9.5 × 7 mm',
  },
  {
    itemId: '552',
    rowIndex: 544,
    nombre: 'Corazón Valiente',
    loteId: 'C-090',
    talla: 'Corazón',
    cantidad: 1,
    peso: '0.56',
    color: 'Verde Muzo',
    calidad: 'F2',
    medidas: '5.46 × 5.02 mm',
  },
  {
    itemId: '553',
    rowIndex: 545,
    nombre: 'Alma Ancestral',
    loteId: 'C-090',
    talla: 'Trapecio',
    cantidad: 1,
    peso: '0.84',
    color: 'Verde Muzo',
    calidad: 'F1',
    medidas: '8.37 × 5.72 mm',
  },
  {
    itemId: '554',
    rowIndex: 546,
    nombre: 'Arrecife',
    loteId: 'C-090',
    talla: 'Rectangular',
    cantidad: 1,
    peso: '0.89',
    color: 'Verde Muzo',
    calidad: 'F1',
    medidas: '9.96 × 5.84 mm',
  },
];

export const seedRemanentes20260812 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();

    // ── 1. El lote C-090, patrón "Recuperado" ────────────────────────────
    // El providerId placeholder se hereda de C-070 en vez de transcribirse:
    // los _id difieren entre dev y prod, y C-070 ES el patrón que C-090 sigue.
    let loteCreado: { loteId: string; created: boolean };
    const loteExistente = await ctx.db
      .query('lots')
      .withIndex('by_loteId', (q) =>
        q.eq('loteId', REMANENTES_20260812_LOTE.loteId),
      )
      .first();
    if (loteExistente) {
      loteCreado = { loteId: REMANENTES_20260812_LOTE.loteId, created: false };
    } else {
      const c070 = await ctx.db
        .query('lots')
        .withIndex('by_loteId', (q) => q.eq('loteId', 'C-070'))
        .first();
      if (!c070)
        throw new Error(
          'C-070 no existe en `lots` — es la referencia del patrón Recuperado ' +
            'y la fuente del providerId placeholder. Sin él no se crea C-090.',
        );
      await ctx.db.insert('lots', {
        loteId: REMANENTES_20260812_LOTE.loteId,
        rowIndex: REMANENTES_20260812_LOTE.rowIndex,
        providerId: c070.providerId,
        fechaRecepcion: '',
        costoTotalCOP: 0,
        unidadesDeclaradas: REMANENTES_20260812_LOTE.unidadesDeclaradas,
        pesoTotalQuilates: REMANENTES_20260812_LOTE.pesoTotalQuilates,
        formaPago: '',
        estado: 'abierto' as const,
        mina: REMANENTES_20260812_LOTE.mina,
        notas: REMANENTES_20260812_LOTE.notas,
        mostrarComoLote: false,
        // 'synced' y sin push: la fila 111 ya existe en la pestaña Lotes.
        syncStatus: 'synced' as const,
        lastPulledAt: now,
      });
      loteCreado = { loteId: REMANENTES_20260812_LOTE.loteId, created: true };
    }

    // ── 2. Las 13 altas ───────────────────────────────────────────────────
    const creados: Array<{
      itemId: string;
      created: boolean;
      reason?: string;
    }> = [];
    for (const a of REMANENTES_20260812_ALTAS) {
      const existente = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', a.itemId))
        .first();
      if (existente) {
        creados.push({ itemId: a.itemId, created: false, reason: 'ya existe' });
        continue;
      }

      await ctx.db.insert('productInventory', {
        itemId: a.itemId,
        rowIndex: a.rowIndex,
        nombre: a.nombre,
        peso: a.peso,
        color: a.color,
        calidad: a.calidad,
        cantidad: a.cantidad,
        talla: a.talla,
        medidas: a.medidas,
        categoria: 'Gema',
        ubicacion: 'OFI.CALI',
        estado: 'DISPONIBLE' as const,
        qr: `https://tierramadre.app/p/${a.itemId}`,
        productoUrl: `https://tierramadre.app/product/${a.itemId}`,
        loteId: a.loteId,
        // SIN costoBaseCOP ni precioFinalCOP: la hoja de origen no trae la
        // columna de costos llena. Vacío es un hecho, no un hueco — sembrar
        // cualquiera de los dos sería inventar un dato con forma de dato.
        // preponderancia 0: ya no deriva costo (2026-07-24) y no altera la
        // suma del lote.
        preponderancia: 0,
        observacion: REMANENTES_20260812_OBSERVACION,
        tipo: 'gema',
        // mostrarEnCatalogo:false — el FALSE que la col Y de la hoja no puede
        // estampar (excluida del pull desde el 2026-07-30). Sin publicar no
        // hay publishedAt ni procedencia que denormalizar.
        ...withPublishStamp(null, false),
        lastPulledAt: now,
        // 'pending' y NO se agenda pushToSheet: las filas 534–546 ya existen
        // en el SOT y un push en modo append las duplicaría.
        syncStatus: 'pending' as const,
      });
      await bumpInventoryTotal(ctx, 1);
      creados.push({ itemId: a.itemId, created: true });
    }

    return {
      lote: loteCreado,
      creados,
      nota:
        'No se empuja a la hoja: las filas 534–546 y Lotes f111 ya existen en el SOT ' +
        '(aplicar-remanentes-12ago.mjs, 15-ago-2026). Sin lotItems a propósito: los 13 ítems ' +
        'viejos de C-070 tampoco tienen — cuando C-090 se costee, _attachExistingToLote.',
    };
  },
});
