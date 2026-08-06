import {
  query,
  mutation,
  action,
  internalMutation,
  internalQuery,
  internalAction,
  type MutationCtx,
} from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { api, internal } from './_generated/api';
import {
  qualityBucket,
  caratBucket,
  procedenciaBucket,
  comboKey,
} from '../src/utils/patron-buckets';
import {
  normalizeCalidadForSheet,
  normalizeColorForSheet,
} from './_lib/fotosintesisVocab';
import {
  assembleBundleGroups,
  type ResolvedBundleItem,
  type ShownSublote,
  type ShownLot,
} from './_lib/publishedGroups';
import { postToVercel } from './_lib/sheetSync';
import { requireAccessLevel } from './_lib/authz';
import { isStaffSession } from './_lib/requireStaffSession';
import { withPublishStamp } from './_lib/publishState';
import { precioEspecialDeObservacion } from './_lib/precioEspecial';
import { omitFotosintesisOnly } from './_lib/saleSafe';

// =============================================================================
// QUERIES — read the mirror
// =============================================================================

/**
 * List all products in the inventory mirror.
 * Returns rows ordered by itemId numerically.
 */
export const list = query({
  args: {
    estado: v.optional(
      v.union(
        v.literal('DISPONIBLE'),
        v.literal('VENDIDA'),
        v.literal('ASESOR'),
        v.literal('CONSIGNACION'),
        v.literal('Retornado'),
        v.literal('ESMEREOGENESIS'),
        v.literal('ESMERO'),
        v.literal('DISPONIBLE ADOPTADA'),
        v.literal('LOTE X CT'),
        v.literal(''),
      ),
    ),
    search: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { estado, search, sessionToken }) => {
    if (!(await isStaffSession(sessionToken))) return [];
    const rows = estado
      ? await ctx.db
          .query('productInventory')
          .withIndex('by_estado', (q) => q.eq('estado', estado))
          .collect()
      : await ctx.db.query('productInventory').collect();

    const filtered = search
      ? rows.filter((row) => {
          const s = search.toLowerCase();
          return (
            row.itemId.toLowerCase().includes(s) ||
            (row.nombre ?? '').toLowerCase().includes(s) ||
            (row.color ?? '').toLowerCase().includes(s) ||
            (row.calidad ?? '').toLowerCase().includes(s) ||
            (row.coleccion ?? '').toLowerCase().includes(s)
          );
        })
      : rows;

    // Numeric sort on itemId (unchanged — preserves the existing ordering).
    const sorted = filtered.sort((a, b) => {
      const an = Number(a.itemId);
      const bn = Number(b.itemId);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return a.itemId.localeCompare(b.itemId);
    });

    // BANDWIDTH: project to ONLY the fields the admin list/table actually
    // renders. This query is subscribed reactively by every admin on
    // `/admin/products`, the Fotosíntesis Home, and the ⌘K spotlight, so it
    // re-runs on every productInventory write and ships the whole list each
    // time. Full docs carry 40+ fields — heavy/internal ones the list never
    // reads (costoBaseCOP, precioPotencialCOP,
    // formulaGema/formulaJoya, minerales, complementos,
    // medidasValores, procedencia, observacion, preponderancia, tipoEsmeralda,
    // subtipoForm, tipoJoya, tecnicaJoya, qr, asesor, asesorActual,
    // estadoAsesor, certificadoUrl, nivelRareza, calificacion, lastPulledAt,
    // _creationTime, …). Projecting them away shrinks the reactive payload.
    //
    // SAFE — the union of fields every consumer reads is exactly this set:
    //   * ProductManagementPage → InventoryRow (toRow) + EditDrawer
    //     (toDrawerProduct, fed FROM this list array via props, NOT a
    //     separate products.get) + Bandeja inspector.
    //   * Fotosíntesis HomePage → only `estado`.
    //   * ProductoSpotlight → itemId, nombre, fotoUrl, loteId, estado, and
    //     precioFinalCOP shown as the per-item price hint in the multi-item
    //     venta picker. Legacy `precioCOP` lost its Sheets column (audit
    //     2026-05-29) and is ~82% empty, so the picker uses precioFinalCOP.
    // The edit drawer never touches the heavy fields; saveEdit/pushToSheet
    // re-read the full row server-side, so the push is unaffected.
    return sorted.map((row) => ({
      _id: row._id,
      itemId: row.itemId,
      rowIndex: row.rowIndex,
      nombre: row.nombre,
      peso: row.peso,
      color: row.color,
      calidad: row.calidad,
      cantidad: row.cantidad,
      talla: row.talla,
      medidas: row.medidas,
      categoria: row.categoria,
      precioCOP: row.precioCOP,
      precioFinalCOP: row.precioFinalCOP,
      ubicacion: row.ubicacion,
      coleccion: row.coleccion,
      caja: row.caja,
      estado: row.estado,
      // `tipo` (gema | joya | insumo | bruto | lote) rides along so the Atelier
      // etiquetas gallery can split "productos" from "insumos" without a second
      // query. One short optional string — negligible against the payload the
      // list already ships. Undefined on legacy rows (they predate the field);
      // consumers must treat "absent" as "producto".
      tipo: row.tipo,
      loteId: row.loteId,
      fotoUrl: row.fotoUrl,
      syncStatus: row.syncStatus,
      syncError: row.syncError,
      lastPushedAt: row.lastPushedAt,
    }));
  },
});

/**
 * Get a single product by itemId.
 *
 * Filtrada como `getByItem`, y por la misma razón: devolvía `.first()` pelado,
 * o sea el documento entero. Cuando se sincronizaron las 14 columnas AQ→BE, el
 * filtro se le puso a `getByItem` y a `lotItems:search` y a ésta NO — un olvido,
 * no una decisión: el header de _lib/saleSafe.ts ni la menciona.
 *
 * Lo que devolvía, verificado contra producción el 2026-07-30 con un POST
 * anónimo a /api/query (sin credencial ninguna): 53 campos, entre ellos
 * `cajaComprador` con el nombre de un comprador real, `cajaValorPagadoCOP`,
 * `cajaPrecioVentaCOP` y `cajaEstadoContable`. Dato personal de un tercero y la
 * plata de una venta, a quien preguntara.
 *
 * La ficha de producto NO era el vector: ProductDetailPage pide este doc sólo
 * si `isAdmin` y manda 'skip' si no. Pero eso es la app absteniéndose de
 * preguntar, no el servidor negándose a contestar; en Convex `query({})` es
 * pública, la URL del deployment viaja en el bundle y `products:list` reparte
 * los 513 itemId sin pedir nada. Enumerar era trivial.
 *
 * Ninguno de los seis consumidores (EditItemDrawer, AsesorMovementPanel,
 * VentaPage, VentaDetailPage, CommitLogRow, ProductDetailPage) lee una sola de
 * las 14 — se verificó campo por campo antes de filtrar. Y si mañana alguna
 * quiere una, el `Omit<>` de omitFotosintesisOnly lo rompe en compilación, no
 * en producción.
 *
 * OJO — lo que esto NO tapa: `costoBaseCOP` y `preponderancia` siguen saliendo,
 * porque EditItemDrawer los necesita de verdad para el preview de precio. No se
 * arregla con una proyección: no hay identidad de cliente en estas queries (por
 * eso `fotosintesisFields` se cerró con un secreto de SERVIDOR), así que
 * "alcanzable desde el browser" y "alcanzable por cualquiera" son el mismo
 * conjunto. Sacarlos exige mover esas lecturas a un endpoint de api/ que valide
 * el JWT. Es decisión de diseño aparte, y está sin tomar.
 */
export const get = query({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    const row = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    // `.first()` devuelve null cuando no existe, y null no se filtra: se pasa.
    return row ? omitFotosintesisOnly(row) : null;
  },
});

/**
 * Batch-read the kardex-relevant fields for a set of itemIds, preserving the
 * caller's order. Backs the multi-item Kardex on VentaPage (live selection) and
 * VentaDetailPage (persisted `sale.itemIds`) — the detail page has no spotlight
 * objects to read specs from, and a per-item `products.get` would mean N hooks.
 *
 * Projected (not full docs) so it stays cheap to subscribe reactively: the
 * carnet renders name + thumb + the four specs, the per-item tier price, and
 * `estado` (so the page can live-guard every item against re-selling a VENDIDA
 * piece). Missing itemIds are skipped, so the result can be shorter than input.
 */
export const getManyByItemIds = query({
  args: { itemIds: v.array(v.string()) },
  handler: async (ctx, { itemIds }) => {
    const out: Array<{
      itemId: string;
      nombre?: string;
      peso?: string;
      color?: string;
      calidad?: string;
      medidas?: string;
      fotoUrl?: string;
      loteId?: string;
      estado: string;
      precioCOP?: number;
      precioFinalCOP?: number;
    }> = [];
    for (const itemId of itemIds) {
      const row = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
        .first();
      if (!row) continue;
      out.push({
        itemId: row.itemId,
        nombre: row.nombre,
        peso: row.peso,
        color: row.color,
        calidad: row.calidad,
        medidas: row.medidas,
        fotoUrl: row.fotoUrl,
        loteId: row.loteId,
        estado: row.estado,
        precioCOP: row.precioCOP,
        precioFinalCOP: row.precioFinalCOP,
      });
    }
    return out;
  },
});

/**
 * Las 14 columnas AQ→BE del SOT, proyectadas A PROPÓSITO.
 *
 * `omitFotosintesisOnly` las saca de `getByItem` y de `lotItems:search` porque
 * esas dos alimentan la ficha de producto y al anima-bot. El efecto lateral era
 * que quedaban sin NINGUNA vía de lectura: datos sincronizados que nadie podía
 * mirar, ni siquiera Fotosíntesis, que es para quien son.
 *
 * Ésta es esa vía. Proyecta por nombre —no hace spread— así que una columna
 * nueva del esquema no se cuela sola: hay que agregarla acá a mano, que es
 * justo lo que se quiere para datos con plata y nombres de compradores adentro.
 *
 * SÓLO para las pantallas de /admin/Fotosintesis y para verificar sincros.
 * NO la consumas desde la ficha de producto, la vitrina ni nada que lea un
 * comercial: seis de estos campos son costo, plata o dato personal de un
 * tercero (ver convex/_lib/saleSafe.ts).
 *
 * CERRADA CON SECRETO DE SERVIDOR, y no es precaución de más: en Convex
 * `query({})` es PÚBLICA y la URL del deployment viaja en el bundle del cliente
 * (VITE_CONVEX_URL). La primera versión no pedía nada, y con un
 * `new ConvexHttpClient(url).query('products:fotosintesisFields', {})` —sin
 * credencial ninguna— devolvía las 513 filas con nombres de compradores, saldos
 * y montos pagados. Verificado, no hipotético.
 *
 * Mismo `ADMIN_SYNC_TOKEN` que ghl.ts usa como secreto de proxy confiable, y
 * falla cerrado si no está configurado. `itemId` sigue siendo opcional a
 * propósito: el barrido completo es lo que necesita la verificación de sincros,
 * y con el token ya no es una superficie anónima.
 */
export const fotosintesisFields = query({
  args: { secret: v.string(), itemId: v.optional(v.string()) },
  handler: async (ctx, { secret, itemId }) => {
    const expected = process.env.ADMIN_SYNC_TOKEN;
    if (!expected || secret !== expected)
      throw new ConvexError('No autorizado.');
    const rows = itemId
      ? await ctx.db
          .query('productInventory')
          .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
          .collect()
      : await ctx.db.query('productInventory').collect();
    return rows.map((r) => ({
      itemId: r.itemId,
      nombre: r.nombre,
      pesoGr: r.pesoGr,
      costoLoteCOP: r.costoLoteCOP,
      precioObjetivoCOP: r.precioObjetivoCOP,
      cajaPrecioVentaCOP: r.cajaPrecioVentaCOP,
      cajaValorPagadoCOP: r.cajaValorPagadoCOP,
      cajaSaldoCOP: r.cajaSaldoCOP,
      cajaComprador: r.cajaComprador,
      cajaEstadoContable: r.cajaEstadoContable,
      subLote: r.subLote,
      productoUrl: r.productoUrl,
      carpetaFotosUrl: r.carpetaFotosUrl,
      animaNotas: r.animaNotas,
      fuentes: r.fuentes,
      notasConflictos: r.notasConflictos,
    }));
  },
});

/**
 * Resolve ONE inventory item by its itemId — the shared resolver behind the QR
 * scanner (PWA camera + anima-bot Telegram bridge both call this). Returns the
 * full row for the admin ficha, or null when the code points at an unknown /
 * not-yet-registered item.
 */
export const getByItem = query({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    const row = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!row) return null;
    // `precioEspecial` se DERIVA de la observación (ver _lib/precioEspecial.ts);
    // no existe como columna. Ausente cuando no aplica o ya venció.
    //
    // El spread manda la fila ENTERA, así que toda columna nueva del SOT sale
    // por acá sin que nadie lo decida. Esta query alimenta la ficha de producto,
    // y las 14 columnas AQ→BE son de Fotosíntesis: gramaje de taller, costos de
    // lote, contabilidad de caja, notas internas. Ninguna se muestra al cliente.
    // Ver convex/_lib/saleSafe.ts.
    return {
      ...omitFotosintesisOnly(row),
      precioEspecial: precioEspecialDeObservacion(row.observacion),
    };
  },
});

/**
 * Public, PROJECTED single-item lookup for the product-detail page.
 *
 * Unlike `get`/`getByItem` (which return the RAW row and would leak
 * costoBaseCOP / precioConscienteCOP / syncStatus / preponderancia over an
 * anonymous WebSocket), this projects ONLY the same public-safe fields as
 * `publishedCatalog`. It lets the QR product page overlay fresh Convex values
 * (medidas, nombre, talla, characteristics…) onto the sheet-derived product for
 * ALL viewers — covering both items the legacy sheet lags AND no-loteId items
 * that `publishedCatalog` can never surface (it filters on loteId). No publish
 * filter here: a scanned QR should resolve any real item. Price is limited to
 * the public ambassador tier; cost/consciente/sync stay internal.
 */
export const getPublicByItem = query({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    const row = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!row) return null;

    // Denormalize lot-level provenance (same as publishedCatalog) when present.
    let mina: string | undefined;
    let tratamiento: string | undefined;
    const loteId = row.loteId;
    if (loteId) {
      const lot = await ctx.db
        .query('lots')
        .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
        .first();
      mina = lot?.mina;
      tratamiento = lot?.tratamiento;
    }

    return {
      itemId: row.itemId,
      nombre: row.nombre,
      peso: row.peso,
      color: row.color,
      calidad: row.calidad,
      cantidad: row.cantidad,
      talla: row.talla,
      medidas: row.medidas,
      medidasValores: row.medidasValores,
      categoria: row.categoria,
      precioFinalCOP: row.precioFinalCOP,
      estado: row.estado,
      qr: row.qr,
      coleccion: row.coleccion,
      fotoUrl: row.fotoUrl,
      certificadoUrl: row.certificadoUrl,
      // Fotosíntesis characteristics (public per decision 2026-06-30).
      procedencia: row.procedencia,
      nivelRareza: row.nivelRareza,
      calificacion: row.calificacion,
      tipoEsmeralda: row.tipoEsmeralda,
      tipoJoya: row.tipoJoya,
      tecnicaJoya: row.tecnicaJoya,
      minerales: row.minerales,
      complementos: row.complementos,
      observacion: row.observacion,
      // Promoción de cierre de temporada, derivada de `observacion`.
      precioEspecial: precioEspecialDeObservacion(row.observacion),
      mina,
      tratamiento,
    };
  },
});

/** All productInventory rows for a Fotosíntesis lote (close/resumen UI). */
export const listByLote = query({
  args: { loteId: v.string() },
  handler: async (ctx, { loteId }) => {
    const rows = await ctx.db
      .query('productInventory')
      .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
      .collect();
    return rows.sort((a, b) => a.itemId.localeCompare(b.itemId, 'es'));
  },
});

/**
 * Published Fotosíntesis catalog — every productInventory row that belongs
 * to a lot (`loteId` set) AND has been published (`mostrarEnCatalogo` true).
 *
 * This is the bridge that lets the customer-facing Treasure Browser show
 * Fotosíntesis-captured items. They live in a separate spreadsheet from the
 * legacy catalog (`get-treasure-sheets` reads the legacy sheet only).
 * Items kept "en reserva" (mostrarEnCatalogo false) are intentionally
 * excluded so the publish/reserve decision is honored.
 *
 * QUIÉN MANDA SOBRE `mostrarEnCatalogo`: Convex. En un solo sentido.
 *
 * Este bloque decía que la bandera era "Convex-only — never synced to Sheets".
 * Era falso: estaba en el allowlist de pull, así que cada sync la pisaba con la
 * columna Y. Y como la publicación se administra desde la app y la hoja sólo se
 * entera por push, las dos caras se separaron — Convex con 416 publicadas, la
 * hoja con 131. El sync habría ocultado 285 piezas de cara al cliente.
 *
 * Resuelto el 2026-07-30 sacándola del pull (ver sheetPullMaps.ts): ahora el
 * docstring es cierto. Convex es dueño de la bandera y del sello `publishedAt`
 * (ver convex/fotoSync.ts); la hoja recibe el valor por push y no lo devuelve.
 *
 * Publicar desde el SOT NO está soportado: editar la columna Y a mano no hace
 * nada, y el próximo push la sobrescribe. Si se quiere habilitar, hace falta un
 * canal de eventos, no reactivar el pull.
 */
export const publishedCatalog = query({
  args: {},
  handler: async (ctx) => {
    // Scan ONLY published rows via the index, not the whole inventory table.
    // The set of `mostrarEnCatalogo === true` rows is tiny (a handful of
    // published lot items) versus the full table (thousands of legacy rows),
    // so this slashes per-execution DB read. It also narrows the reactive
    // read set: writes to unpublished rows (every cron pull, most admin edits)
    // fall outside this index range and no longer re-run the query for the
    // anonymous catalog visitors subscribed to it.
    const rows = await ctx.db
      .query('productInventory')
      .withIndex('by_mostrarEnCatalogo', (q) => q.eq('mostrarEnCatalogo', true))
      .collect();

    // Only items captured through a lot are catalog-eligible; legacy/orphan rows
    // without a loteId are excluded.
    const published = rows.filter((row) => row.loteId !== undefined);

    // Denormalize lot-level provenance (mina + tratamiento) onto each item.
    // These live on the `lots` table, not productInventory, so we resolve each
    // distinct lote once and attach. The published set is tiny (a handful of
    // items across a few lotes), so this adds only a few point reads per call.
    const loteProvenance = new Map<
      string,
      { mina?: string; tratamiento?: string }
    >();
    for (const loteId of new Set(
      published.map((r) => r.loteId).filter((id): id is string => !!id),
    )) {
      const lot = await ctx.db
        .query('lots')
        .withIndex('by_loteId', (q) => q.eq('loteId', loteId))
        .first();
      loteProvenance.set(loteId, {
        mina: lot?.mina,
        tratamiento: lot?.tratamiento,
      });
    }

    // Project ONLY the fields the customer catalog consumes (see
    // useFotosintesisCatalog.PublishedRow). The public catalog price is the
    // derived final price (precioFinalCOP = costoBaseCOP × 2.6, sheet column M);
    // costoBaseCOP (L) is intentionally NOT projected so the public can't see
    // cost. precioPotencialCOP, sync metadata and rowIndex stay internal. The
    // Fotosíntesis characteristics block below is surfaced publicly per product
    // decision 2026-06-30 (gem grade, origin, treatment, jewelry detail).
    return published.map((row) => {
      const prov = row.loteId ? loteProvenance.get(row.loteId) : undefined;
      return {
        itemId: row.itemId,
        nombre: row.nombre,
        peso: row.peso,
        color: row.color,
        calidad: row.calidad,
        cantidad: row.cantidad,
        talla: row.talla,
        medidas: row.medidas,
        medidasValores: row.medidasValores,
        categoria: row.categoria,
        precioFinalCOP: row.precioFinalCOP,
        ubicacion: row.ubicacion,
        asesor: row.asesor,
        estado: row.estado,
        qr: row.qr,
        coleccion: row.coleccion,
        caja: row.caja,
        asesorActual: row.asesorActual,
        estadoAsesor: row.estadoAsesor,
        fotoUrl: row.fotoUrl,
        certificadoUrl: row.certificadoUrl,
        publishedAt: row.publishedAt,
        // ── Fotosíntesis characteristics (surfaced publicly 2026-06-30) ──
        procedencia: row.procedencia,
        nivelRareza: row.nivelRareza,
        calificacion: row.calificacion,
        tipoEsmeralda: row.tipoEsmeralda,
        tipoJoya: row.tipoJoya,
        tecnicaJoya: row.tecnicaJoya,
        minerales: row.minerales,
        complementos: row.complementos,
        observacion: row.observacion,
        // Promoción de cierre de temporada, derivada de `observacion` (no es
        // columna; ver _lib/precioEspecial.ts). Ausente si venció o no aplica.
        precioEspecial: precioEspecialDeObservacion(row.observacion),
        // Lot-level provenance, denormalized from the `lots` table.
        mina: prov?.mina,
        tratamiento: prov?.tratamiento,
      };
    });
  },
});

/**
 * Published catalog GROUPS — lotes and sublotes the operator chose to show as
 * a single bundled card (hero photo + total price + per-item gallery).
 *
 *   - Lote group:    lots.estado === "publicado" && lots.mostrarComoLote
 *   - Sublote group: subLotes.estado === "activa" && subLotes.mostrarComoLote
 *
 * Returns a uniform shape so the frontend renders both the same way. Per-item
 * price = precioFinalCOP ?? 0 (the derived final price, matching
 * publishedCatalog); totalPriceCOP = sum. The
 * frontend emits one card per group and excludes member items from the
 * individual-item catalog (`publishedCatalog`).
 *
 * Precedence: a shown sublote group CLAIMS its items away from its parent
 * lote's bundle card, so a shared item never appears in both the sublote card
 * and the parent lote card. Sublote groups are built first; the lote card then
 * lists only the items no shown sublote claimed (and is dropped if emptied).
 */
export const publishedGroups = query({
  args: {},
  handler: async (ctx) => {
    // Resolve a productInventory row into a bundle member, carrying its
    // `mostrarEnCatalogo` flag so the pure assembler can drop hidden pieces.
    const resolve = async (
      itemId: string,
    ): Promise<ResolvedBundleItem | null> => {
      const p = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
        .first();
      if (!p) return null;
      return {
        itemId: p.itemId,
        nombre: p.nombre ?? '',
        fotoUrl: p.fotoUrl,
        precioCOP: p.precioFinalCOP ?? 0,
        color: p.color,
        calidad: p.calidad,
        peso: p.peso,
        categoria: p.categoria,
        talla: p.talla,
        medidas: p.medidas,
        // Per-piece Fotosíntesis characteristics so a lote's per-image detail
        // overlay reflects the exact gem, not just the bundle aggregate.
        procedencia: p.procedencia,
        nivelRareza: p.nivelRareza,
        calificacion: p.calificacion,
        tipoEsmeralda: p.tipoEsmeralda,
        tipoJoya: p.tipoJoya,
        tecnicaJoya: p.tecnicaJoya,
        minerales: p.minerales,
        complementos: p.complementos,
        observacion: p.observacion,
        mostrarEnCatalogo: p.mostrarEnCatalogo === true,
      };
    };

    // Shown sub-lotes: active + opted into bundle display.
    const activeSubs = await ctx.db
      .query('subLotes')
      .withIndex('by_estado', (q) => q.eq('estado', 'activa'))
      .collect();
    const shownSublotes: ShownSublote[] = activeSubs
      .filter((s) => s.mostrarComoLote === true)
      .map((s) => ({
        subLoteId: s.subLoteId,
        parentLoteId: s.parentLoteId,
        nombre: s.nombre,
        fotoUrl: s.fotoUrl,
        itemIds: s.itemIds,
      }));

    // Shown lotes: published + opted into bundle display, members in lot order.
    const publishedLots = await ctx.db
      .query('lots')
      .withIndex('by_estado', (q) => q.eq('estado', 'publicado'))
      .collect();
    const shownLots: ShownLot[] = [];
    for (const lot of publishedLots) {
      if (lot.mostrarComoLote !== true) continue;
      const joins = await ctx.db
        .query('lotItems')
        .withIndex('by_loteId', (q) => q.eq('loteId', lot.loteId))
        .collect();
      joins.sort((a, b) => a.ordenEnLote - b.ordenEnLote);
      shownLots.push({
        loteId: lot.loteId,
        nombre: lot.renombreLote ?? lot.loteId,
        fotoUrl: lot.fotoLoteUrl,
        memberItemIds: joins.map((j) => j.itemId),
      });
    }

    // Pre-resolve every candidate item once so the assembly stays pure + sync.
    const candidateIds = new Set<string>();
    for (const s of shownSublotes)
      for (const id of s.itemIds) candidateIds.add(id);
    for (const l of shownLots)
      for (const id of l.memberItemIds) candidateIds.add(id);
    const resolved = new Map<string, ResolvedBundleItem | null>();
    for (const id of candidateIds) resolved.set(id, await resolve(id));

    const groups = assembleBundleGroups({
      shownSublotes,
      shownLots,
      resolveItem: (id) => resolved.get(id) ?? null,
    });

    // Denormalize lot-level provenance (mina + tratamiento) onto each bundle
    // card via its parentLoteId — mirrors publishedCatalog's per-item join so a
    // lote/sublote card can show the same origin + treatment as a single item.
    const groupProvenance = new Map<
      string,
      { mina?: string; tratamiento?: string }
    >();
    for (const g of groups) {
      if (groupProvenance.has(g.parentLoteId)) continue;
      const lot = await ctx.db
        .query('lots')
        .withIndex('by_loteId', (q) => q.eq('loteId', g.parentLoteId))
        .first();
      groupProvenance.set(g.parentLoteId, {
        mina: lot?.mina,
        tratamiento: lot?.tratamiento,
      });
    }
    return groups.map((g) => ({
      ...g,
      ...(groupProvenance.get(g.parentLoteId) ?? {}),
    }));
  },
});

/**
 * Recent edit history for an item (last 20).
 */
export const editHistory = query({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    const all = await ctx.db
      .query('productEdits')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .order('desc')
      .take(20);
    return all;
  },
});

/**
 * Sync status summary — used by the toolbar to show "12 pending" badges.
 */
export const syncStats = query({
  args: {},
  handler: async (ctx) => {
    // Instead of collecting all rows, we use the by_syncStatus index
    // to count pending and errored items efficiently.
    const pendingRows = await ctx.db
      .query('productInventory')
      .withIndex('by_syncStatus', (q) => q.eq('syncStatus', 'pending'))
      .collect();
    const erroredRows = await ctx.db
      .query('productInventory')
      .withIndex('by_syncStatus', (q) => q.eq('syncStatus', 'error'))
      .collect();

    const pending = pendingRows.length;
    const errored = erroredRows.length;

    // BANDWIDTH: `total` and `lastPull` come from the maintained
    // `inventoryStats` singleton (ONE doc) instead of a reactive
    // `.take(1000)` scan of full productInventory documents. The old scan
    // re-ran on every productInventory write for every subscribed admin
    // (a 1000-doc fan-out per sync). The counter is maintained at the four
    // insert sites + the pull path (see ensureInventoryStats / bump helpers).
    //
    // `syncStats` is a query, so it can't lazily seed the singleton (queries
    // can't write). If it's somehow missing (brand-new deployment before the
    // first insert/pull), fall back to 0 / null — the frontend already
    // tolerates this via `stats?.total ?? products?.length` and
    // `stats?.lastPull ?? null`. The first insert or pull seeds it for real.
    const statsRow = await ctx.db.query('inventoryStats').first();
    const total = statsRow?.total ?? 0;
    const lastPull = statsRow?.lastPull ?? null;

    return { total, pending, errored, lastPull };
  },
});

// =============================================================================
// MUTATIONS — write to the mirror, schedule push to Sheets
// =============================================================================

/**
 * Save edits to a product. Patches the mirror immediately for optimistic UI,
 * inserts an audit entry, and schedules an action that pushes to Sheets.
 */
/**
 * C2 — sale-integrity guard. Returns the first non-cancelled sale that still
 * owns `itemId`, or null. The canonical way to free a sold item is
 * `sales.cancel` (which restores DISPONIBLE + writes an audit row on both
 * sides); a manual estado flip via `saveEdit` / `saveEditMany` would bypass
 * BR-6 and leave a phantom re-sellable item, so callers reject the change when
 * this returns a sale. Sale cardinality in this internal tool is small, so a
 * `by_estado` scan of the two open states is cheap.
 */
async function findOwningActiveSale(ctx: MutationCtx, itemId: string) {
  for (const estado of ['confirmada', 'reservada'] as const) {
    const sales = await ctx.db
      .query('sales')
      .withIndex('by_estado', (q) => q.eq('estado', estado))
      .collect();
    const owning = sales.find((s) => s.itemIds.includes(itemId));
    if (owning) return owning;
  }
  return null;
}

const saveEditPatchArgs = v.object({
  nombre: v.optional(v.string()),
  peso: v.optional(v.string()),
  color: v.optional(v.string()),
  calidad: v.optional(v.string()),
  cantidad: v.optional(v.number()),
  talla: v.optional(v.string()),
  medidas: v.optional(v.string()),
  medidasValores: v.optional(v.string()),
  categoria: v.optional(v.string()),
  precioCOP: v.optional(v.number()),
  ubicacion: v.optional(v.string()),
  asesor: v.optional(v.string()),
  coleccion: v.optional(v.string()),
  caja: v.optional(v.string()),
  estado: v.optional(
    v.union(
      v.literal('DISPONIBLE'),
      v.literal('VENDIDA'),
      v.literal('ASESOR'),
      v.literal('CONSIGNACION'),
      v.literal('Retornado'),
      v.literal('ESMEREOGENESIS'),
      v.literal('ESMERO'),
      v.literal('DISPONIBLE ADOPTADA'),
      v.literal('LOTE X CT'),
      v.literal(''),
    ),
  ),
});

/**
 * Internal: the actual write. Only reachable via the `saveEdit` action below,
 * which verifies the caller's role server-side first — see convex/_lib/authz.ts.
 */
export const _saveEdit = internalMutation({
  args: {
    itemId: v.string(),
    editorEmail: v.string(),
    editorName: v.optional(v.string()),
    patch: saveEditPatchArgs,
  },
  handler: async (ctx, { itemId, editorEmail, editorName, patch }) => {
    const existing = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!existing) throw new Error(`Producto ${itemId} no está en el espejo`);

    // C2 — sale-integrity guard: never move a sold item out of VENDIDA while a
    // live (non-cancelled) sale still owns it. The canonical reversal is
    // sales.cancel; a manual flip here would bypass BR-6 and leave a phantom
    // re-sellable item.
    if (patch.estado !== undefined && patch.estado !== 'VENDIDA') {
      const owningSale = await findOwningActiveSale(ctx, itemId);
      if (owningSale) {
        throw new Error(
          `El ítem ${itemId} está vendido en la venta ${owningSale.saleId}. ` +
            `Para liberarlo, cancelá esa venta primero (así el stock se ` +
            `restaura y queda auditado).`,
        );
      }
    }

    // Compute changes for the audit log (only fields that actually changed)
    const changes: Array<{
      field: string;
      before: string | number | null;
      after: string | number | null;
    }> = [];
    for (const [field, after] of Object.entries(patch)) {
      if (after === undefined) continue;
      const before = (existing as Record<string, unknown>)[field];
      if (before === after) continue;
      const beforeNorm =
        typeof before === 'string' || typeof before === 'number'
          ? before
          : null;
      const afterNorm =
        typeof after === 'string' || typeof after === 'number' ? after : null;
      changes.push({ field, before: beforeNorm, after: afterNorm });
    }
    if (changes.length === 0) {
      return { itemId, changesCount: 0, message: 'Sin cambios' };
    }

    // Patch the mirror — UI updates immediately
    await ctx.db.patch(existing._id, {
      ...patch,
      syncStatus: 'pending' as const,
      syncError: undefined,
    });

    // Insert audit row (status: pending until the action confirms the push)
    const auditId = await ctx.db.insert('productEdits', {
      itemId,
      editorEmail,
      editorName,
      editedAt: new Date().toISOString(),
      changes,
      status: 'pending' as const,
    });

    // Schedule the Sheets push (non-blocking; fires immediately)
    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId,
      auditId,
    });

    return { itemId, changesCount: changes.length, auditId };
  },
});

/**
 * Public entry point for saveEdit. Verifies the caller's Google ID token
 * server-side and requires the `admin` role (ProductManagement is behind
 * `AdminRoute` client-side, but that only hides the UI — this is the real
 * gate) before delegating to the internal mutation. `editorEmail`/`editorName`
 * in the audit trail always come from the verified token, never the client.
 */
export const saveEdit = action({
  args: {
    idToken: v.string(),
    itemId: v.string(),
    patch: saveEditPatchArgs,
  },
  handler: async (
    ctx,
    { idToken, itemId, patch },
  ): Promise<{
    itemId: string;
    changesCount: number;
    message?: string;
    auditId?: string;
  }> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.products._saveEdit, {
      itemId,
      editorEmail: caller.email,
      editorName: caller.name,
      patch,
    });
  },
});

/**
 * Internal: mark an audit row + mirror row as successfully pushed.
 * Called by the pushToSheet action on success.
 */
export const _markPushed = internalMutation({
  args: { itemId: v.string(), auditId: v.id('productEdits') },
  handler: async (ctx, { itemId, auditId }) => {
    const row = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (row) {
      await ctx.db.patch(row._id, {
        syncStatus: 'synced' as const,
        lastPushedAt: new Date().toISOString(),
        syncError: undefined,
      });
    }
    await ctx.db.patch(auditId, { status: 'saved' as const });
  },
});

/**
 * Internal: record a push failure.
 */
export const _markPushFailed = internalMutation({
  args: {
    itemId: v.string(),
    auditId: v.id('productEdits'),
    error: v.string(),
  },
  handler: async (ctx, { itemId, auditId, error }) => {
    const row = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (row) {
      await ctx.db.patch(row._id, {
        syncStatus: 'error' as const,
        syncError: error.slice(0, 500),
      });
    }
    await ctx.db.patch(auditId, {
      status: 'failed' as const,
      error: error.slice(0, 500),
    });
  },
});

/**
 * Internal: read a single mirror row (for the action).
 */
export const _getInternal = internalQuery({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    return await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
  },
});

// =============================================================================
// ACTIONS — talk to Google Sheets
// =============================================================================

/**
 * Push a single product's current mirror state to the Google Sheet.
 *
 * Architecture: this action calls our own Vercel endpoint
 * `/api/admin-product-update` rather than talking to the Sheets API
 * directly. That keeps the Google service account credentials in one
 * place (Vercel env vars) and reuses the existing `withApiHandler` /
 * `provideSheets` plumbing.
 *
 * Required env var on the Convex deployment:
 *   APP_URL — base URL of the Vercel app (e.g. https://tierra-madre-studio.vercel.app)
 *   ADMIN_SYNC_TOKEN — shared secret matching the Vercel-side token
 */
export const pushToSheet = action({
  args: {
    itemId: v.string(),
    auditId: v.id('productEdits'),
    // Phase G — create flow: "append" tells the Vercel endpoint that the
    // row is new (no existing column-A item to validate against and the
    // sheet must `values.append` rather than `values.update`). Defaults
    // to "patch" so all existing callers (saveEdit, saveEditMany,
    // retryPush) keep their semantics.
    mode: v.optional(v.union(v.literal('patch'), v.literal('append'))),
  },
  handler: async (
    ctx,
    { itemId, auditId, mode },
  ): Promise<{ ok: boolean; message: string }> => {
    const pushMode: 'patch' | 'append' = mode ?? 'patch';
    const appUrl: string | undefined = process.env.APP_URL;
    const syncToken: string | undefined = process.env.ADMIN_SYNC_TOKEN;
    if (!appUrl || !syncToken) {
      const msg = 'APP_URL or ADMIN_SYNC_TOKEN missing on Convex deployment';
      await ctx.runMutation(internal.products._markPushFailed, {
        itemId,
        auditId,
        error: msg,
      });
      return { ok: false, message: msg };
    }

    // Read current mirror state (the source for the push)
    const row = await ctx.runQuery(internal.products._getInternal, { itemId });
    if (!row) {
      const msg = `Mirror row not found for ${itemId}`;
      await ctx.runMutation(internal.products._markPushFailed, {
        itemId,
        auditId,
        error: msg,
      });
      return { ok: false, message: msg };
    }

    try {
      const sheetTarget = row.loteId ? 'fotosintesis' : 'legacy';
      // postToVercel follows redirects while preserving POST — a redirecting
      // APP_URL (e.g. a *.vercel.app alias 301-ing to the custom domain) would
      // otherwise downgrade this write to GET and get 405'd. See sheetSync.ts.
      const res = await postToVercel(`${appUrl}/api/admin-product-update`, {
        headers: {
          'content-type': 'application/json',
          'x-admin-sync-token': syncToken,
        },
        body: JSON.stringify({
          itemId,
          rowIndex: row.rowIndex,
          mode: pushMode,
          target: sheetTarget,
          loteId: row.loteId ?? undefined,
          fields: {
            nombre: row.nombre ?? '',
            peso: row.peso ?? '',
            color: normalizeColorForSheet(row.color),
            calidad: normalizeCalidadForSheet(row.calidad),
            cantidad: row.cantidad ?? '',
            talla: row.talla ?? '',
            medidas: row.medidas ?? '',
            medidasValores: row.medidasValores ?? '',
            categoria: row.categoria ?? row.tipoEsmeralda ?? '',
            // precioCOP (column L) retired from the SOT mirror 2026-05-29 — no
            // longer pushed; the Convex field stays app-only. See
            // api/_lib/fotosintesis-inventory-columns.js.
            ubicacion: row.ubicacion ?? '',
            asesor: row.asesor ?? '',
            estado: row.estado ?? 'DISPONIBLE',
            qr: row.qr ?? '',
            coleccion: row.coleccion ?? '',
            caja: row.caja ?? '',
            asesorActual: row.asesorActual ?? '',
            estadoAsesor: row.estadoAsesor ?? '',
            // ── Fotosíntesis v2 fields (written only on the SOT Inventario
            // tab; the legacy treasure sheet ignores them) ──
            //
            // PUSH-ONLY FIELD — do NOT collapse this to `?? ''`. preponderancia
            // is the one field we push but never pull: it is deliberately
            // EXCLUDED from WRITABLE.inventory (see convex/_lib/sheetPullMaps.ts),
            // so an undefined mirror value means "Convex never learned it", NOT
            // "the operator cleared it". api/admin-product-update.ts:257 writes
            // any key that is present-and-defined, so sending '' would blank
            // column U — the ONLY place that number lives — and the pull could
            // never bring it back. Omitting the key preserves the sheet cell.
            // Every other field here is round-tripped by the pull, so for those
            // `?? ''` genuinely means "empty on both sides" and is safe.
            ...(row.preponderancia !== undefined
              ? { preponderancia: row.preponderancia }
              : {}),
            loteId: row.loteId ?? '',
            costoBaseCOP: row.costoBaseCOP ?? '',
            mostrarEnCatalogo: row.mostrarEnCatalogo ? 'TRUE' : 'FALSE',
            procedencia: row.procedencia ?? '',
            observacion: row.observacion ?? '',
            rendimientoEsperado: row.rendimientoEsperado ?? '',
            cantidadEstimada: row.cantidadEstimada ?? '',
            nivelRareza: row.nivelRareza ?? '',
            calificacion: row.calificacion ?? '',
            tipoEsmeralda: row.tipoEsmeralda ?? '',
            subtipoForm: row.subtipoForm ?? '',
            tipoJoya: row.tipoJoya ?? '',
            tecnicaJoya: row.tecnicaJoya ?? '',
            minerales: (row.minerales ?? []).join(', '),
            complementos: (row.complementos ?? []).join(', '),
            fotoUrl: row.fotoUrl ?? '',
            certificadoUrl: row.certificadoUrl ?? '',
            formulaGema: row.formulaGema ?? '',
            formulaJoya: row.formulaJoya ?? '',
            rangoDescuento: row.rangoDescuento ?? '',
            // DERIVED final price → column M. Column N is now reserved/empty
            // ("(sin uso)"), so no tier key is emitted for it.
            precioFinalCOP: row.precioFinalCOP ?? '',
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      await ctx.runMutation(internal.products._markPushed, { itemId, auditId });
      return { ok: true, message: 'Pushed to Sheets' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.products._markPushFailed, {
        itemId,
        auditId,
        error: msg,
      });
      return { ok: false, message: msg };
    }
  },
});

/**
 * Internal: latest audit row for an item (any status). Used by retryPush.
 */
export const _latestAudit = internalQuery({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    return await ctx.db
      .query('productEdits')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .order('desc')
      .first();
  },
});

/**
 * Internal: reset mirror + audit row for a retry attempt. Flips
 * syncStatus back to "pending", clears the error, and marks the audit
 * row as "pending" again.
 */
export const _resetForRetry = internalMutation({
  args: { itemId: v.string(), auditId: v.id('productEdits') },
  handler: async (ctx, { itemId, auditId }) => {
    const row = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (row) {
      await ctx.db.patch(row._id, {
        syncStatus: 'pending' as const,
        syncError: undefined,
      });
    }
    await ctx.db.patch(auditId, {
      status: 'pending' as const,
      error: undefined,
    });
  },
});

/**
 * Retry the most recent failed/pending push for a given item. Looks up
 * the latest audit row, resets mirror+audit state to pending, and fires
 * pushToSheet again. Surfaced from the InventoryRow's clickable error
 * dot ("click to retry").
 */
export const retryPush = action({
  args: { itemId: v.string() },
  handler: async (
    ctx,
    { itemId },
  ): Promise<{ ok: boolean; message: string }> => {
    const audit = await ctx.runQuery(internal.products._latestAudit, {
      itemId,
    });
    if (!audit) {
      return {
        ok: false,
        message: 'Sin historial de ediciones para reintentar',
      };
    }
    await ctx.runMutation(internal.products._resetForRetry, {
      itemId,
      auditId: audit._id,
    });
    return await ctx.runAction(api.products.pushToSheet, {
      itemId,
      auditId: audit._id,
    });
  },
});

// =============================================================================
// BULK EDITS — multi-select operations from the InventoryRow checkbox column
// =============================================================================

/**
 * Apply a single estado change to many products at once. Used by the
 * sticky bulk action bar ("Marcar como disponible (N) / Marcar como
 * vendida (N)"). Each row gets the standard treatment: mirror patch,
 * audit row insert, and a scheduled `pushToSheet` action.
 *
 * Rows that are missing from the mirror or already at the requested
 * estado are skipped — `unchangedCount` distinguishes "nothing to do"
 * from "applied". The mutation never throws on a missing row; it just
 * counts it as missing so the toolbar can report partial successes.
 */
/**
 * Internal: the actual bulk write. Only reachable via the `saveEditMany`
 * action below, which verifies the caller's role server-side first.
 */
export const _saveEditMany = internalMutation({
  args: {
    itemIds: v.array(v.string()),
    editorEmail: v.string(),
    editorName: v.optional(v.string()),
    // Phase H — broadened from `{ estado }` to a saveEdit-compatible
    // patch so the bulk action bar can also change precioCOP / coleccion
    // / ubicacion in a single mutation. Each row still gets a per-field
    // diff in its audit row (only fields whose value actually changes).
    patch: saveEditPatchArgs,
  },
  handler: async (ctx, { itemIds, editorEmail, editorName, patch }) => {
    let updatedCount = 0;
    let unchangedCount = 0;
    let missingCount = 0;
    let blockedCount = 0;
    const editedAt = new Date().toISOString();

    // C2 — when this bulk patch moves estado out of VENDIDA, pre-compute the
    // set of itemIds still owned by a live sale so we can skip (not abort) them.
    const guardEstadoChange =
      patch.estado !== undefined && patch.estado !== 'VENDIDA';
    let saleOwnedItemIds: Set<string> | null = null;
    if (guardEstadoChange) {
      saleOwnedItemIds = new Set<string>();
      for (const estado of ['confirmada', 'reservada'] as const) {
        const sales = await ctx.db
          .query('sales')
          .withIndex('by_estado', (q) => q.eq('estado', estado))
          .collect();
        for (const sale of sales) {
          for (const id of sale.itemIds) saleOwnedItemIds.add(id);
        }
      }
    }

    for (const itemId of itemIds) {
      const existing = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
        .first();
      if (!existing) {
        missingCount++;
        continue;
      }

      // C2 — never free a sale-owned item via a bulk estado flip.
      if (saleOwnedItemIds && saleOwnedItemIds.has(itemId)) {
        blockedCount++;
        continue;
      }

      // Per-row diff — skip rows where every patched field already
      // matches the mirror (mirrors saveEdit's "Sin cambios" path).
      const changes: Array<{
        field: string;
        before: string | number | null;
        after: string | number | null;
      }> = [];
      for (const [field, after] of Object.entries(patch)) {
        if (after === undefined) continue;
        const before = (existing as Record<string, unknown>)[field];
        if (before === after) continue;
        const beforeNorm =
          typeof before === 'string' || typeof before === 'number'
            ? before
            : null;
        const afterNorm =
          typeof after === 'string' || typeof after === 'number' ? after : null;
        changes.push({ field, before: beforeNorm, after: afterNorm });
      }
      if (changes.length === 0) {
        unchangedCount++;
        continue;
      }

      await ctx.db.patch(existing._id, {
        ...patch,
        syncStatus: 'pending' as const,
        syncError: undefined,
      });

      const auditId = await ctx.db.insert('productEdits', {
        itemId,
        editorEmail,
        editorName,
        editedAt,
        changes,
        status: 'pending' as const,
      });

      await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
        itemId,
        auditId,
      });

      updatedCount++;
    }

    return {
      total: itemIds.length,
      updatedCount,
      unchangedCount,
      missingCount,
      blockedCount,
    };
  },
});

/**
 * Public entry point for saveEditMany — same auth gate as `saveEdit`.
 */
export const saveEditMany = action({
  args: {
    idToken: v.string(),
    itemIds: v.array(v.string()),
    patch: saveEditPatchArgs,
  },
  handler: async (
    ctx,
    { idToken, itemIds, patch },
  ): Promise<{
    total: number;
    updatedCount: number;
    unchangedCount: number;
    missingCount: number;
    blockedCount: number;
  }> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.products._saveEditMany, {
      itemIds,
      editorEmail: caller.email,
      editorName: caller.name,
      patch,
    });
  },
});

// =============================================================================
// SOFT LOCKS — drawer-open coordination between concurrent admins
// =============================================================================

/** Lock TTL: 5 minutes. */
const LOCK_TTL_MS = 5 * 60 * 1000;

/**
 * Claim a soft lock on a product. Multiple admins can hit
 * `/admin/products` at once; the lock signals "X has the drawer open"
 * so peers see a banner instead of stomping on the same edit.
 *
 * Returns `{ ok: true }` when the lock is now held by `holderEmail`
 * (fresh insert, expired-takeover, or refresh by the same holder).
 *
 * Returns `{ ok: false, holder, expiresAt }` when a non-expired lock
 * is already held by a different admin — the caller surfaces a banner
 * and skips the release-on-cleanup path.
 */
export const claimLock = mutation({
  args: {
    itemId: v.string(),
    holderEmail: v.string(),
    holderName: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, holderEmail, holderName }) => {
    const now = Date.now();
    const claimedAt = new Date(now).toISOString();
    const expiresAt = new Date(now + LOCK_TTL_MS).toISOString();

    const existing = await ctx.db
      .query('productLocks')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();

    if (!existing) {
      await ctx.db.insert('productLocks', {
        itemId,
        holderEmail,
        holderName,
        claimedAt,
        expiresAt,
      });
      return { ok: true as const };
    }

    const existingExpiresMs = Date.parse(existing.expiresAt);
    const isExpired =
      !Number.isFinite(existingExpiresMs) || existingExpiresMs <= now;

    if (existing.holderEmail === holderEmail || isExpired) {
      await ctx.db.patch(existing._id, {
        holderEmail,
        holderName,
        claimedAt,
        expiresAt,
      });
      return { ok: true as const };
    }

    return {
      ok: false as const,
      holder: {
        email: existing.holderEmail,
        name: existing.holderName,
      },
      expiresAt: existing.expiresAt,
    };
  },
});

/**
 * Release a soft lock. Only deletes the row if the caller's email
 * matches the current holder; no-op otherwise. Defensive against
 * interleaved cleanups that could otherwise kill another admin's
 * legitimate lock.
 */
export const releaseLock = mutation({
  args: {
    itemId: v.string(),
    holderEmail: v.string(),
  },
  handler: async (ctx, { itemId, holderEmail }) => {
    const existing = await ctx.db
      .query('productLocks')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!existing) return { released: false };
    if (existing.holderEmail !== holderEmail) return { released: false };
    await ctx.db.delete(existing._id);
    return { released: true };
  },
});

/**
 * Read the current lock state for a product. Returns `null` when free
 * or expired; otherwise the holder identity + expiry. The drawer
 * subscribes to this reactively so a "X está editando" banner appears
 * the moment another admin claims (or drops away when they release).
 */
export const lockStatus = query({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    const existing = await ctx.db
      .query('productLocks')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!existing) return null;
    const expiresAtMs = Date.parse(existing.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      return null;
    }
    return {
      holderEmail: existing.holderEmail,
      holderName: existing.holderName,
      claimedAt: existing.claimedAt,
      expiresAt: existing.expiresAt,
    };
  },
});

/**
 * List all active (non-expired) soft locks.
 *
 * The page-level Bandeja subscribes to this so each row can render a
 * small gold dot when another editor currently holds the lock. Filtering
 * to non-expired locks happens client-side after `collect()` because the
 * lock TTL is small (5 min) and the row cardinality is bounded by the
 * number of admins editing concurrently — no index needed.
 */
export const listActiveLocks = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('productLocks').collect();
    const now = new Date().toISOString();
    return all.filter((l) => l.expiresAt > now);
  },
});

/**
 * Pull the full inventory from the Google Sheet into the mirror.
 *
 * Strategy: fetch the existing public endpoint /api/get-treasure-sheets
 * (which returns the parsed TreasureItem[] array) and reconcile with the
 * mirror — upsert by itemId, keep the rowIndex from the sheet.
 *
 * Run via Convex cron (see convex/crons.ts) or manually from the admin
 * panel toolbar (the "Resync from sheet" button).
 */
/**
 * Internal: the actual sheet pull. Reachable from the 15-min cron (trusted —
 * Convex's own scheduler, not an external caller) and from the public
 * `pullFromSheet` action below (which gates the manual "Resync" button behind
 * an admin token check).
 *
 * post-fix: pullFromSheet now reconciles rowIndex to true physical rows
 * (sheetRow). Running the admin-gated `pullFromSheet` action (below) after the
 * sheetRow fix re-pins every legacy rowIndex to its authoritative physical
 * row — no separate reconcile action is needed.
 */
export const _pullFromSheet = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ pulled: number; upserted: number; rebased: number }> => {
    const appUrl: string | undefined = process.env.APP_URL;
    const syncToken: string | undefined = process.env.ADMIN_SYNC_TOKEN;
    if (!appUrl) {
      throw new Error('APP_URL missing on Convex deployment');
    }
    if (!syncToken) {
      throw new Error('ADMIN_SYNC_TOKEN missing on Convex deployment');
    }

    // Without this header, the request resolves to the `anon` grant and
    // /api/get-treasure-sheets returns the 18-field public projection — no
    // precio/ubicacion/asesor/caja, and `estado` absent entirely (so the
    // reconcile below would flip every VENDIDA stone back to DISPONIBLE via
    // normalizeEstado's default). The ADMIN_SYNC_TOKEN service grant
    // (api/_lib/catalogGrant.ts) makes this call resolve `staff`, same as a
    // signed-in asesor — the full, unprojected row this reconcile needs.
    const res = await fetch(`${appUrl}/api/get-treasure-sheets`, {
      headers: { Authorization: `Bearer ${syncToken}` },
    });
    if (!res.ok) {
      throw new Error(`Sheet fetch failed: HTTP ${res.status}`);
    }
    const payload = (await res.json()) as { treasure?: SheetRow[] };
    const items: SheetRow[] = payload.treasure ?? [];

    // Batch upsert all items in a single mutation to avoid excessive re-renders
    // and database bandwidth consumption.
    const result = await ctx.runMutation(
      internal.products._upsertManyFromSheet,
      {
        items: items
          .map((item, i) => ({
            itemId: String(item.item ?? '').trim(),
            // ROOT-CAUSE FIX: `i + 2` was the position in the COMPACTED payload
            // array (blank/non-numeric rows already dropped by
            // /api/get-treasure-sheets), NOT the true physical sheet row — that
            // mismatch drove the rowIndex drift. Consume the API's authoritative
            // `sheetRow` (1-based physical row) when present; the `i + 2`
            // fallback preserves old behaviour if the API build lacks the field.
            rowIndex: item.sheetRow ?? i + 2,
            fields: {
              nombre: nullableStr(item.nombre),
              peso: nullableStr(item.peso),
              color: nullableStr(item.color),
              calidad: nullableStr(item.calidad),
              cantidad: nullableNum(item.cantidad),
              talla: nullableStr(item.talla),
              medidas: nullableStr(item.medidas),
              medidasValores: nullableStr(item.medidasValores),
              categoria: nullableStr(item.categoria),
              precioCOP: nullableNum(item.precioCOP),
              ubicacion: nullableStr(item.ubicacion),
              asesor: nullableStr(item.asesor),
              estado: normalizeEstado(item.estado),
              qr: nullableStr(item.qr),
              coleccion: nullableStr(item.coleccion),
              caja: nullableStr(item.caja),
              asesorActual: nullableStr(item.asesorActual),
              estadoAsesor: nullableStr(item.estadoAsesor),
            },
          }))
          .filter((item) => item.itemId !== ''),
      },
    );

    return {
      pulled: items.length,
      upserted: result.upserted,
      rebased: result.rebased,
    };
  },
});

/**
 * Public entry point for a manual "Resync from sheet" button — verifies the
 * caller is admin, then delegates to the internal action (also used by the
 * unauthenticated cron).
 */
export const pullFromSheet = action({
  args: { idToken: v.string() },
  handler: async (
    ctx,
    { idToken },
  ): Promise<{ pulled: number; upserted: number; rebased: number }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runAction(internal.products._pullFromSheet, {});
  },
});

/**
 * Cron-only gated wrapper (free-tier policy, 2026-07-21). The daily inventory
 * pull is the biggest recurring Convex-bandwidth cost, so it no-ops unless
 * `INVENTORY_PULL_CRON === "on"` — mirroring `fotoSync.reconcileBackstop`. The
 * SPREADSHEET is the source of truth; the manual "Resync from sheet" button
 * (`pullFromSheet`) and the event-driven `/sync/foto` delta endpoint remain the
 * on-demand path and are NOT gated. Flip the env flag to re-enable the daily auto-pull.
 */
export const _pullFromSheetCron = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<
    { skipped: true } | { pulled: number; upserted: number; rebased: number }
  > => {
    if (process.env.INVENTORY_PULL_CRON !== 'on') {
      return { skipped: true };
    }
    return await ctx.runAction(internal.products._pullFromSheet, {});
  },
});

export const _upsertManyFromSheet = internalMutation({
  args: {
    items: v.array(
      v.object({
        itemId: v.string(),
        rowIndex: v.number(),
        fields: v.object({
          nombre: v.union(v.string(), v.null()),
          peso: v.union(v.string(), v.null()),
          color: v.union(v.string(), v.null()),
          calidad: v.union(v.string(), v.null()),
          cantidad: v.union(v.number(), v.null()),
          talla: v.union(v.string(), v.null()),
          medidas: v.union(v.string(), v.null()),
          medidasValores: v.union(v.string(), v.null()),
          categoria: v.union(v.string(), v.null()),
          precioCOP: v.union(v.number(), v.null()),
          ubicacion: v.union(v.string(), v.null()),
          asesor: v.union(v.string(), v.null()),
          estado: v.union(
            v.literal('DISPONIBLE'),
            v.literal('VENDIDA'),
            v.literal('ASESOR'),
            v.literal('CONSIGNACION'),
            v.literal('Retornado'),
            v.literal('ESMEREOGENESIS'),
            v.literal('ESMERO'),
            v.literal('DISPONIBLE ADOPTADA'),
            v.literal('LOTE X CT'),
            v.literal(''),
          ),
          qr: v.union(v.string(), v.null()),
          coleccion: v.union(v.string(), v.null()),
          caja: v.union(v.string(), v.null()),
          asesorActual: v.union(v.string(), v.null()),
          estadoAsesor: v.union(v.string(), v.null()),
        }),
      }),
    ),
  },
  handler: async (ctx, { items }) => {
    let upserted = 0;
    let rebased = 0;
    const now = new Date().toISOString();

    // Fetch all existing items to minimize individual queries
    const existingItems = await ctx.db.query('productInventory').collect();
    const existingMap = new Map(
      existingItems.map((item) => [item.itemId, item]),
    );

    for (const item of items) {
      const existing = existingMap.get(item.itemId);
      const cleanedFields = {
        nombre: item.fields.nombre ?? undefined,
        peso: item.fields.peso ?? undefined,
        color: item.fields.color ?? undefined,
        calidad: item.fields.calidad ?? undefined,
        cantidad: item.fields.cantidad ?? undefined,
        talla: item.fields.talla ?? undefined,
        medidas: item.fields.medidas ?? undefined,
        medidasValores: item.fields.medidasValores ?? undefined,
        categoria: item.fields.categoria ?? undefined,
        precioCOP: item.fields.precioCOP ?? undefined,
        ubicacion: item.fields.ubicacion ?? undefined,
        asesor: item.fields.asesor ?? undefined,
        estado: item.fields.estado,
        qr: item.fields.qr ?? undefined,
        coleccion: item.fields.coleccion ?? undefined,
        caja: item.fields.caja ?? undefined,
        asesorActual: item.fields.asesorActual ?? undefined,
        estadoAsesor: item.fields.estadoAsesor ?? undefined,
      };

      if (!existing) {
        await ctx.db.insert('productInventory', {
          itemId: item.itemId,
          rowIndex: item.rowIndex,
          ...cleanedFields,
          lastPulledAt: now,
          syncStatus: 'synced' as const,
        });
        upserted++;
        continue;
      }

      const rowIndexShifted = existing.rowIndex !== item.rowIndex;

      // Check if any actual data fields changed
      const fieldsChanged = Object.entries(cleanedFields).some(
        ([key, value]) => {
          return existing[key as keyof typeof existing] !== value;
        },
      );

      // If nothing changed (neither data nor row index), skip the database write entirely
      // to save database operations on the 5-minute cron job.
      if (!fieldsChanged && !rowIndexShifted) {
        continue;
      }

      const baseUpdate: { rowIndex: number; lastPulledAt: string } = {
        rowIndex: item.rowIndex,
        lastPulledAt: now,
      };

      if (
        existing.syncStatus === 'pending' ||
        existing.syncStatus === 'error'
      ) {
        await ctx.db.patch(existing._id, baseUpdate);
        if (rowIndexShifted) rebased++;
        continue;
      }

      await ctx.db.patch(existing._id, {
        ...cleanedFields,
        ...baseUpdate,
        syncStatus: 'synced' as const,
      });
      if (rowIndexShifted) rebased++;
    }

    // BANDWIDTH: maintain the inventoryStats singleton with ONE extra write
    // per pull, not per row. `upserted` counts the rows we inserted this call.
    // We also stamp `lastPull` once here so syncStats never has to scan for a
    // max(lastPulledAt). (`now` is the single timestamp used for every row in
    // this batch.)
    if (upserted > 0) await bumpInventoryTotal(ctx, upserted);
    await setInventoryLastPull(ctx, now);

    return { upserted, rebased };
  },
});

/**
 * Internal: upsert a single sheet row into the mirror.
 * Only overwrites mirror fields when syncStatus === "synced" — pending
 * local edits take precedence and aren't clobbered by a pull.
 */
export const _upsertFromSheet = internalMutation({
  args: {
    itemId: v.string(),
    rowIndex: v.number(),
    fields: v.object({
      nombre: v.union(v.string(), v.null()),
      peso: v.union(v.string(), v.null()),
      color: v.union(v.string(), v.null()),
      calidad: v.union(v.string(), v.null()),
      cantidad: v.union(v.number(), v.null()),
      talla: v.union(v.string(), v.null()),
      medidas: v.union(v.string(), v.null()),
      medidasValores: v.union(v.string(), v.null()),
      categoria: v.union(v.string(), v.null()),
      precioCOP: v.union(v.number(), v.null()),
      ubicacion: v.union(v.string(), v.null()),
      asesor: v.union(v.string(), v.null()),
      estado: v.union(
        v.literal('DISPONIBLE'),
        v.literal('VENDIDA'),
        v.literal('ASESOR'),
        v.literal('CONSIGNACION'),
        v.literal('Retornado'),
        v.literal('ESMEREOGENESIS'),
        v.literal('ESMERO'),
        v.literal('DISPONIBLE ADOPTADA'),
        v.literal('LOTE X CT'),
        v.literal(''),
      ),
      qr: v.union(v.string(), v.null()),
      coleccion: v.union(v.string(), v.null()),
      caja: v.union(v.string(), v.null()),
      asesorActual: v.union(v.string(), v.null()),
      estadoAsesor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, { itemId, rowIndex, fields }) => {
    const existing = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    const now = new Date().toISOString();

    const cleanedFields = {
      nombre: fields.nombre ?? undefined,
      peso: fields.peso ?? undefined,
      color: fields.color ?? undefined,
      calidad: fields.calidad ?? undefined,
      cantidad: fields.cantidad ?? undefined,
      talla: fields.talla ?? undefined,
      medidas: fields.medidas ?? undefined,
      medidasValores: fields.medidasValores ?? undefined,
      categoria: fields.categoria ?? undefined,
      precioCOP: fields.precioCOP ?? undefined,
      ubicacion: fields.ubicacion ?? undefined,
      asesor: fields.asesor ?? undefined,
      estado: fields.estado,
      qr: fields.qr ?? undefined,
      coleccion: fields.coleccion ?? undefined,
      caja: fields.caja ?? undefined,
      asesorActual: fields.asesorActual ?? undefined,
      estadoAsesor: fields.estadoAsesor ?? undefined,
    };

    if (!existing) {
      await ctx.db.insert('productInventory', {
        itemId,
        rowIndex,
        ...cleanedFields,
        lastPulledAt: now,
        syncStatus: 'synced' as const,
      });
      // BANDWIDTH: maintain the inventoryStats counter (+1) and stamp the
      // single-row pull timestamp so syncStats reads the singleton, not a scan.
      await bumpInventoryTotal(ctx, 1);
      await setInventoryLastPull(ctx, now);
      return { upserted: true, rebased: false };
    }

    // Always re-pin rowIndex to what the sheet says (rows can shift)
    const rowIndexShifted = existing.rowIndex !== rowIndex;

    // Check if any actual data fields changed
    const fieldsChanged = Object.entries(cleanedFields).some(([key, value]) => {
      return existing[key as keyof typeof existing] !== value;
    });

    // If nothing changed (neither data nor row index), skip the database write entirely
    if (!fieldsChanged && !rowIndexShifted) {
      return { upserted: false, rebased: false };
    }

    const baseUpdate: { rowIndex: number; lastPulledAt: string } = {
      rowIndex,
      lastPulledAt: now,
    };

    if (existing.syncStatus === 'pending' || existing.syncStatus === 'error') {
      // Don't clobber a pending edit's content — only refresh row index + pull time
      await ctx.db.patch(existing._id, baseUpdate);
      return { upserted: false, rebased: rowIndexShifted };
    }

    await ctx.db.patch(existing._id, {
      ...cleanedFields,
      ...baseUpdate,
      syncStatus: 'synced' as const,
    });
    return { upserted: false, rebased: rowIndexShifted };
  },
});

// =============================================================================
// HELPERS
// =============================================================================

// ─── Inventory stats singleton maintenance ──────────────────────────────────
//
// BANDWIDTH: keep a maintained `inventoryStats` counter (single row) so the
// reactive `syncStats` query reads ONE doc instead of `.take(1000)`-ing full
// productInventory documents (which re-ran on every write for every admin).
//
// `total` is monotonically increasing — productInventory rows are never
// deleted anywhere in convex/ (lots.cancel / lotItems.remove only ORPHAN
// rows; sheet pulls only insert/patch). So bumping a counter at the 4 insert
// sites is sufficient and never drifts downward.

/**
 * Lazily seed (at most once, ever) and return the singleton row's Convex _id.
 * The seeding `collect()` scan runs only the FIRST time the singleton is
 * missing — after that every caller just reads/patches the one row.
 */
async function ensureInventoryStats(ctx: MutationCtx) {
  const existing = await ctx.db.query('inventoryStats').first();
  if (existing) return existing;
  // One-time seed: count the current table size so the counter starts
  // accurate. This is the ONLY scan this whole mechanism ever performs.
  const all = await ctx.db.query('productInventory').collect();
  const total = all.length;
  const lastPull = all.reduce<string | undefined>(
    (acc, r) =>
      acc === undefined || r.lastPulledAt > acc ? r.lastPulledAt : acc,
    undefined,
  );
  const id = await ctx.db.insert('inventoryStats', { total, lastPull });
  return (await ctx.db.get(id))!;
}

/**
 * Increment the maintained inventory total by `n` (≥ 1). Exported so the
 * other insert site (lotItems.create) can keep the counter in sync without
 * duplicating the seed-or-patch logic.
 */
export async function bumpInventoryTotal(ctx: MutationCtx, n: number) {
  if (n <= 0) return;
  const stats = await ensureInventoryStats(ctx);
  await ctx.db.patch(stats._id, { total: stats.total + n });
}

/** Stamp the singleton's `lastPull` once per pull (NOT once per row). */
export async function setInventoryLastPull(ctx: MutationCtx, lastPull: string) {
  const stats = await ensureInventoryStats(ctx);
  await ctx.db.patch(stats._id, { lastPull });
}

type SheetRow = {
  item?: number | string;
  /**
   * True 1-based PHYSICAL row of this item in the sheet, supplied by
   * /api/get-treasure-sheets. Distinct from the item's position in the
   * compacted payload array — blank/non-numeric rows are dropped upstream, so
   * the array index drifts from the real row. `_pullFromSheet` pins rowIndex
   * to this when present. Optional for backward-compat with older API builds.
   */
  sheetRow?: number;
  nombre?: string;
  peso?: string | number;
  color?: string;
  calidad?: string;
  cantidad?: number | string;
  talla?: string;
  medidas?: string;
  medidasValores?: string;
  categoria?: string;
  precioCOP?: number | string;
  ubicacion?: string;
  asesor?: string;
  estado?: string;
  qr?: string;
  coleccion?: string;
  caja?: string;
  asesorActual?: string;
  estadoAsesor?: string;
};

function nullableStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function nullableNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// Normalize the raw sheet ESTADO into one of the 10 vocabularies stored in
// productInventory.estado (see schema.ts). Comparison is case-insensitive
// on the uppercase variants and preserves the legacy mixed-case for
// "Retornado". Empty cells default to DISPONIBLE to match the historical
// behaviour of get-treasure-sheets. Genuinely unknown values fall back to
// "" so an unexpected sheet edit doesn't break the pull.
//
// CONSIGNACION round-trips here too: it's only ever WRITTEN by
// `asesorMovements._registerHandoff` (never typed into the sheet directly by
// Maritza), but a pull must still recognize the value it pushed or a re-sync
// would silently reset a consignment item's estado to "" and desync from the
// real Convex state.
function normalizeEstado(
  v: unknown,
):
  | 'DISPONIBLE'
  | 'VENDIDA'
  | 'ASESOR'
  | 'CONSIGNACION'
  | 'Retornado'
  | 'ESMEREOGENESIS'
  | 'ESMERO'
  | 'DISPONIBLE ADOPTADA'
  | 'LOTE X CT'
  | '' {
  const raw = String(v ?? '').trim();
  const upper = raw.toUpperCase();
  if (
    upper === 'DISPONIBLE' ||
    upper === 'VENDIDA' ||
    upper === 'ASESOR' ||
    upper === 'CONSIGNACION'
  ) {
    return upper;
  }
  if (upper === 'RETORNADO') return 'Retornado'; // preserve legacy casing
  if (upper === 'ESMEREOGENESIS') return 'ESMEREOGENESIS';
  if (upper === 'ESMERO') return 'ESMERO';
  if (upper === 'DISPONIBLE ADOPTADA') return 'DISPONIBLE ADOPTADA';
  if (upper === 'LOTE X CT') return 'LOTE X CT';
  if (raw === '') return 'DISPONIBLE'; // mirror the legacy default in get-treasure-sheets
  return '';
}

// =============================================================================
// PATRONES — sold-stone aggregations grouped by procedencia × quality × carat
// =============================================================================

/**
 * Patrones similar to a target item: scans VENDIDA rows over the
 * lookback window, groups by procedencia × quality × carat-bucket,
 * filters to combos that overlap the target stone, and returns the
 * top 5 by count with median price.
 */
export const patronesFor = query({
  args: { itemId: v.string(), lookbackDays: v.optional(v.number()) },
  handler: async (ctx, { itemId, lookbackDays }) => {
    const days = lookbackDays ?? 90;
    const horizon = new Date(Date.now() - days * 86400000).toISOString();
    const target = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    if (!target) return { combos: [], total: 0 };

    const targetProc = procedenciaBucket(target.coleccion);
    const targetQual = qualityBucket(target.calidad);
    const peso = Number(target.peso);
    const targetCarat = caratBucket(peso);

    const sold = await ctx.db
      .query('productInventory')
      .withIndex('by_estado', (q) => q.eq('estado', 'VENDIDA'))
      .collect();

    const buckets = new Map<
      string,
      { count: number; prices: number[]; label: string }
    >();
    for (const p of sold) {
      const ts = p.lastPushedAt ?? p.lastPulledAt;
      if (ts < horizon) continue;
      const proc = procedenciaBucket(p.coleccion);
      const qual = qualityBucket(p.calidad);
      const c = caratBucket(Number(p.peso));
      if (!proc || !qual || !c) continue;
      // Match if procedencia matches AND quality matches AND carat windows overlap.
      if (targetProc && targetQual && targetCarat) {
        if (proc !== targetProc) continue;
        if (qual !== targetQual) continue;
        const [tlo, thi] = targetCarat;
        const [plo, phi] = c;
        if (phi < tlo || plo > thi) continue;
      }
      const key = comboKey({
        procedencia: proc,
        quality: qual,
        caratLo: c[0],
        caratHi: c[1],
      });
      const entry = buckets.get(key) ?? {
        count: 0,
        prices: [],
        label: `${proc} · ${qual} · ${c[0].toFixed(1)}–${c[1].toFixed(1)} ct`,
      };
      entry.count += 1;
      if (typeof p.precioCOP === 'number' && p.precioCOP > 0)
        entry.prices.push(p.precioCOP);
      buckets.set(key, entry);
    }

    const combos = Array.from(buckets.entries())
      .map(([key, v]) => ({
        key,
        label: v.label,
        count: v.count,
        medianPriceCOP: v.prices.length ? median(v.prices) : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { combos, total: combos.reduce((s, c) => s + c.count, 0) };
  },
});

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Top-5 global patrones combos across all VENDIDA rows in the
 * lookback window. Used by the FotoHero "patrones del semestre"
 * sparkline / chip stack.
 */
export const patronesGlobalTop = query({
  args: { lookbackDays: v.optional(v.number()) },
  handler: async (ctx, { lookbackDays }) => {
    const days = lookbackDays ?? 90;
    const horizon = new Date(Date.now() - days * 86400000).toISOString();
    const sold = await ctx.db
      .query('productInventory')
      .withIndex('by_estado', (q) => q.eq('estado', 'VENDIDA'))
      .collect();
    const buckets = new Map<
      string,
      { count: number; prices: number[]; label: string }
    >();
    for (const p of sold) {
      const ts = p.lastPushedAt ?? p.lastPulledAt;
      if (ts < horizon) continue;
      const proc = procedenciaBucket(p.coleccion);
      const qual = qualityBucket(p.calidad);
      const c = caratBucket(Number(p.peso));
      if (!proc || !qual || !c) continue;
      const key = comboKey({
        procedencia: proc,
        quality: qual,
        caratLo: c[0],
        caratHi: c[1],
      });
      const entry = buckets.get(key) ?? {
        count: 0,
        prices: [],
        label: `${proc} · ${qual} · ${c[0].toFixed(1)}–${c[1].toFixed(1)} ct`,
      };
      entry.count += 1;
      if (typeof p.precioCOP === 'number' && p.precioCOP > 0)
        entry.prices.push(p.precioCOP);
      buckets.set(key, entry);
    }
    const combos = Array.from(buckets.entries())
      .map(([key, v]) => ({
        key,
        label: v.label,
        count: v.count,
        medianPriceCOP: v.prices.length ? median(v.prices) : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return { combos, total: combos.reduce((s, c) => s + c.count, 0) };
  },
});

/**
 * N most recent edits across all products. Powers the
 * Bandeja "Historial reciente" card.
 */
export const recentEdits = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const cap = Math.min(limit ?? 5, 50);
    const edits = await ctx.db.query('productEdits').order('desc').take(cap);
    return edits;
  },
});

// =============================================================================
// CREATE — "+ Nueva piedra" flow (Phase G)
// =============================================================================

/**
 * createProduct — insert a new piece into the mirror and append it to
 * the Google Sheet.
 *
 * Validates that `itemId` is non-empty and unique against the mirror
 * (the same constraints `validateNewProduct` enforces in the UI), then:
 *   1. Inserts a productInventory doc with rowIndex = max(existing) + 1
 *      and syncStatus "pending" (mirrors the saveEdit pattern).
 *   2. Inserts a productEdits audit row with `before: null` for every
 *      provided field — the history reads "created with these values".
 *   3. Schedules pushToSheet with `mode: "append"` so the Vercel
 *      endpoint appends a new row instead of patching an existing one.
 *
 * Returns `{ itemId, productId, rowIndex }` so the caller can route the
 * Bandeja inspector to the new row immediately (Convex reactivity will
 * surface it in the list one tick later).
 */
const createProductFieldsArgs = v.object({
  nombre: v.optional(v.string()),
  peso: v.optional(v.string()),
  color: v.optional(v.string()),
  calidad: v.optional(v.string()),
  cantidad: v.optional(v.number()),
  talla: v.optional(v.string()),
  medidas: v.optional(v.string()),
  medidasValores: v.optional(v.string()),
  categoria: v.optional(v.string()),
  precioCOP: v.optional(v.number()),
  ubicacion: v.optional(v.string()),
  asesor: v.optional(v.string()),
  coleccion: v.optional(v.string()),
  caja: v.optional(v.string()),
});

/**
 * Internal: the actual insert. Only reachable via the `createProduct` action
 * below, which verifies the caller's role server-side first.
 */
export const _createProduct = internalMutation({
  args: {
    itemId: v.string(),
    editorEmail: v.string(),
    editorName: v.optional(v.string()),
    fields: createProductFieldsArgs,
  },
  handler: async (ctx, { itemId, editorEmail, editorName, fields }) => {
    const itemIdTrim = itemId.trim();
    if (!itemIdTrim) throw new Error('El número de la piedra es obligatorio');
    const dup = await ctx.db
      .query('productInventory')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemIdTrim))
      .first();
    if (dup)
      throw new Error(`Ya existe una piedra con el número ${itemIdTrim}`);

    const all = await ctx.db.query('productInventory').collect();
    const maxRow = all.reduce((m, p) => Math.max(m, p.rowIndex), 1);
    const nextRow = maxRow + 1;
    const now = new Date().toISOString();

    const productId = await ctx.db.insert('productInventory', {
      itemId: itemIdTrim,
      rowIndex: nextRow,
      ...fields,
      estado: 'DISPONIBLE' as const,
      lastPulledAt: now,
      syncStatus: 'pending' as const,
    });

    // BANDWIDTH: keep the inventoryStats counter in sync so syncStats reads
    // ONE doc instead of scanning. total is monotonic — a new product only
    // adds to it. (Not a pull, so we do NOT touch lastPull here.)
    await bumpInventoryTotal(ctx, 1);

    const auditId = await ctx.db.insert('productEdits', {
      itemId: itemIdTrim,
      editorEmail,
      editorName,
      editedAt: now,
      changes: Object.entries(fields)
        .filter(([, value]) => value !== undefined)
        .map(([field, after]) => ({
          field,
          before: null,
          after: (after as string | number | null) ?? null,
        })),
      status: 'pending' as const,
    });

    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId: itemIdTrim,
      auditId,
      mode: 'append' as const,
    });

    return { itemId: itemIdTrim, productId, rowIndex: nextRow };
  },
});

/**
 * Public entry point for createProduct — same auth gate as `saveEdit`.
 */
export const createProduct = action({
  args: {
    idToken: v.string(),
    itemId: v.string(),
    fields: createProductFieldsArgs,
  },
  handler: async (
    ctx,
    { idToken, itemId, fields },
  ): Promise<{ itemId: string; productId: string; rowIndex: number }> => {
    const caller = await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.products._createProduct, {
      itemId,
      editorEmail: caller.email,
      editorName: caller.name,
      fields,
    });
  },
});

// =============================================================================
// BULK PUBLISH CERTIFICATES
// =============================================================================

/**
 * Publish every product that already carries a certificate (`certificadoUrl`)
 * so its Certificado de Origen shows in the product-page carousel, EXCLUDING
 * `tipo === 'insumo'` (raw supplies are never certified/published).
 *
 * "Publish" here means flipping `mostrarEnCatalogo` on via `withPublishStamp`
 * so the catalog/carousel becomes reachable — it does not generate or alter
 * the certificate artwork itself. Idempotent: already-published rows are
 * counted as `alreadyPublished` and left untouched (their `publishedAt`
 * timestamp is preserved by the "first publish wins" guard).
 */
export const _bulkPublishCertificados = internalMutation({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    published: number;
    alreadyPublished: number;
    skippedInsumo: number;
    skippedNoCert: number;
  }> => {
    const all = await ctx.db.query('productInventory').collect();
    let published = 0;
    let alreadyPublished = 0;
    let skippedInsumo = 0;
    let skippedNoCert = 0;

    for (const row of all) {
      const hasCert = !!row.certificadoUrl && row.certificadoUrl.trim() !== '';
      if (!hasCert) {
        skippedNoCert++;
        continue;
      }
      if (row.tipo === 'insumo') {
        skippedInsumo++;
        continue;
      }
      if (row.mostrarEnCatalogo === true) {
        alreadyPublished++;
        continue;
      }
      await ctx.db.patch(row._id, withPublishStamp(row, true));
      published++;
    }

    return { published, alreadyPublished, skippedInsumo, skippedNoCert };
  },
});

/**
 * Public entry point for the bulk-publish certificates action. Admin-only.
 */
export const bulkPublishCertificados = action({
  args: { idToken: v.string() },
  handler: async (
    ctx,
    { idToken },
  ): Promise<{
    published: number;
    alreadyPublished: number;
    skippedInsumo: number;
    skippedNoCert: number;
  }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(
      internal.products._bulkPublishCertificados,
      {},
    );
  },
});
