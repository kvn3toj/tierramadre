import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Shared envelope for tables that mirror a Google Sheets tab.
// Fotosíntesis v2: providers/lots/clients/sales reuse the same sync
// metadata pattern that productInventory established.
const syncFields = {
  rowIndex: v.number(),
  lastPulledAt: v.string(),
  lastPushedAt: v.optional(v.string()),
  syncStatus: v.union(
    v.literal('synced'),
    v.literal('pending'),
    v.literal('error'),
  ),
  syncError: v.optional(v.string()),
} as const;

export default defineSchema({
  invitations: defineTable({
    invitationId: v.string(),
    shortCode: v.string(),
    creatorEmail: v.string(),
    creatorName: v.string(),
    creatorRole: v.optional(v.string()),
    guestName: v.optional(v.string()),
    guestContact: v.optional(v.string()),
    contactType: v.optional(v.string()),
    status: v.union(
      v.literal('active'),
      v.literal('pending'),
      v.literal('expired'),
    ),
    createdAt: v.string(),
    activatedAt: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    pricingMode: v.string(),
    durationHours: v.number(),
    guestCurrencyMode: v.optional(v.string()),
    guestMultiplier: v.optional(v.float64()),
    pin: v.optional(v.string()),
    boundToken: v.optional(v.string()),
  })
    .index('by_creatorEmail', ['creatorEmail'])
    .index('by_shortCode', ['shortCode'])
    .index('by_status', ['status']),

  // ─── Ambassador curation (favourites + per-product overrides) ────
  //
  // Before this table, BOTH lived in localStorage — `useAmbassadorFavorites`
  // under `tm-ambassador-favorites-{slug}` and `useAmbassadorOverrides` under
  // `tm:ambassador-overrides:{slug}`. That meant an ambassador's curation
  // existed only inside the browser that made it: invisible from their phone,
  // from a second session, and — the point of the feature — to their client.
  //
  // ONE table for both, not two. They are the same act (an ambassador saying
  // something about one of their pieces), keyed the same way, authorised the
  // same way, and read together on every profile render. Splitting them would
  // mean two endpoints, two authorisation paths and two caches to keep honest.
  //
  // `itemId` is a STRING, matching AmbassadorProductOverride.itemId and the
  // favourites array, both of which stringify TreasureItem.item.
  ambassadorCuration: defineTable({
    /** Profile slug — Asesor.slug, the same one /ambassadors/:slug uses. */
    slug: v.string(),
    itemId: v.string(),
    /** Whether the ambassador pinned this piece to their showcase. */
    isFavorite: v.boolean(),
    /** Position within the favourites row; absent for non-favourites. */
    sortOrder: v.optional(v.float64()),
    /**
     * The ambassador offers this piece for resale through TM.
     *
     * Separate from `estado`, deliberately. `estado` is TM's books: a piece an
     * ambassador bought stays VENDIDA internally and accounting depends on
     * that. Whether it is OFFERED is the owner's own statement, and it is
     * never inferred from ownership — inferring it would list the ring
     * somebody bought for their wife on the public catalog.
     */
    forResale: v.optional(v.boolean()),
    customName: v.optional(v.string()),
    /**
     * Validated server-side against [base × 1.0, base × 10.0] before it is
     * written — the client's own check is a courtesy, not the gate.
     */
    customPriceCOP: v.optional(v.float64()),
    updatedAt: v.string(),
    /** Verified session email of the writer (audit; never returned publicly). */
    updatedByEmail: v.optional(v.string()),
  })
    .index('by_slug_item', ['slug', 'itemId'])
    .index('by_slug', ['slug']),

  // ─── Public "Vitrina" share links ────────────────────────────────
  //
  // A staff-generated public share: one short `token` → a set of product
  // item numbers plus the pricing the client should see (multiplier +
  // currency, mirroring the invitation guestMultiplier/guestCurrencyMode
  // model). Convex-only (no Sheets mirror); read with no auth by the public
  // `/v/:token` route so a client views the products without signing in.
  // The multiplier is stored HERE (not in the URL) so the chosen markup is
  // never exposed to — or editable by — the recipient.
  vitrinas: defineTable({
    token: v.string(),
    itemIds: v.array(v.float64()),
    currency: v.union(v.literal('COP'), v.literal('USD')),
    multiplier: v.float64(),
    senderSlug: v.optional(v.string()),
    createdAt: v.string(),
    // Verified Google email of the staff member who minted the link (audit).
    // Set by the /api/vitrina proxy after it verifies the caller's Google token.
    createdByEmail: v.optional(v.string()),
  }).index('by_token', ['token']),

  // ─── Vitrina → GHL selection audit trail ─────────────────────────
  //
  // Recorded by /api/vitrina-select the instant a client taps "Consultar por
  // WhatsApp" on a product from a GHL-sourced Vitrina link (one carrying
  // ?cid=<ghlContactId>). This is a deterministic signal written straight to
  // GHL (producto_seleccionado_sku + tags) at click time — it does NOT depend
  // on María correctly parsing the client's free-text WhatsApp reply. This
  // table itself is just the audit trail / future-reminder-cron hook; the
  // GHL contact record is the source of truth for automation.
  vitrinaSelections: defineTable({
    ghlContactId: v.string(),
    sku: v.string(),
    selectedAt: v.string(),
  }).index('by_ghlContactId', ['ghlContactId']),

  productViews: defineTable({
    timestamp: v.string(),
    itemId: v.string(),
    productName: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    referrer: v.optional(v.string()),
    deviceType: v.optional(v.string()),
    browser: v.optional(v.string()),
    country: v.optional(v.string()),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userRole: v.optional(v.string()),
    inviterName: v.optional(v.string()),
  })
    .index('by_itemId', ['itemId'])
    .index('by_inviterName', ['inviterName'])
    .index('by_userEmail', ['userEmail']),

  // ─── Admin Product Management ────────────────────────────────────
  //
  // Mirror of the Google Sheet "Inventario" tab. Source of truth remains
  // the sheet; this table is a reactive mirror that the admin panel reads
  // and writes through. Mutations patch the mirror synchronously and then
  // schedule an action that pushes the change back to Sheets.
  //
  // `rowIndex` is the 1-based row number in the sheet (excluding header).
  // It MUST be kept in sync with the sheet so update writes target the
  // correct row. Re-syncs from the sheet are the only way it changes.

  productInventory: defineTable({
    // Natural key from the sheet — column A
    itemId: v.string(),
    // 1-based row index in 'Inventario' (header is row 1, first product is row 2)
    rowIndex: v.number(),

    // Editable fields (mirrors Sheets columns)
    nombre: v.optional(v.string()),
    peso: v.optional(v.string()), // string because of "Plata" / "Oro 18k"
    color: v.optional(v.string()),
    calidad: v.optional(v.string()),
    cantidad: v.optional(v.number()),
    talla: v.optional(v.string()), // forma de talla / corte (hoja col H "Corte")
    tallaAnillo: v.optional(v.string()), // aro del anillo (hoja col BF)
    medidas: v.optional(v.string()),
    medidasValores: v.optional(v.string()),
    categoria: v.optional(v.string()),
    // ── Price block — grouped to mirror the SOT "Inventario" tab layout
    // (Sheets columns L–N). costoBaseCOP (col L) is SHEET-OWNED (2026-07-24): a
    // human types the item cost into the sheet and it is pulled back; the old
    // lot.costoTotalCOP × preponderancia% derivation is fully deactivated.
    // PRICE MODEL (2026-07-21 refactor): the single final price is
    // `precioFinalCOP = round(costoBaseCOP × TM_MARKUP_DEFAULT)` (2.6). It
    // replaced the former embajador/consciente x1–x4 tiers.
    // PRICE OWNERSHIP (2026-07-23): precioFinalCOP is no longer purely derived.
    // cost × 2.6 is the SEED for a new item; after that the sheet owns the value
    // (column M is in the WRITABLE allowlist — see convex/_lib/sheetPullMaps.ts)
    // because the official price list is not a fixed multiple of cost. When the
    // sheet supplies a price, `precioFinalManual` is stamped true and the lote
    // re-fan stops repricing that row. costoBaseCOP is now sheet-owned too (see
    // the block header above) — it is no longer derived from the lote.
    // APP-ONLY (audit 2026-05-29): `precioCOP` lost its Sheets column ("Precio
    // COP" / former column L, ~82% empty). It is still written by the capture
    // UI and read by the patrones analytics, but is NO LONGER mirrored to or
    // pulled from the SOT sheet. Kept optional for existing docs.
    precioCOP: v.optional(v.number()),
    costoBaseCOP: v.optional(v.number()), // L — sheet-owned item cost (manual; no longer derived)
    precioFinalCOP: v.optional(v.number()), // M — seeded costoBaseCOP × 2.6, then sheet-owned
    // TRUE once a human set the price (sheet pull or admin edit): the lote
    // re-fan must not reset it to costoBaseCOP × 2.6. Absent/false ⇒ the row is
    // still tracking the seed formula.
    precioFinalManual: v.optional(v.boolean()),
    // DEPRECATED (2026-07-21 price refactor + audit F4): superseded by
    // precioFinalCOP. No UI writer, no Sheets column, never pushed or pulled.
    // Retained (optional) ONLY so pre-existing docs validate; strip via a data
    // migration in a later cleanup pass.
    precioEmbajadorCOP: v.optional(v.number()),
    precioPotencialCOP: v.optional(v.number()),
    precioConscienteCOP: v.optional(v.number()),
    ubicacion: v.optional(v.string()),
    asesor: v.optional(v.string()),
    // 10 values: the 4 we always handled + 5 inherited from the legacy
    // sheet's ESTADO dropdown (Retornado, ESMEREOGENESIS, ESMERO,
    // DISPONIBLE ADOPTADA, LOTE X CT) + 1 app-only addition (CONSIGNACION).
    // Keeps existing rows in `1mghR6...!INVENTARIO Tierra.Madre` validating
    // on pull without a migration pass. Mirror in
    // `src/data/vocabularies.ts#PRODUCT_ESTADOS`.
    //
    // CONSIGNACION (2026-07-09): same "out of the vault, not sold yet" shape
    // as ASESOR, but for an EXTERNAL comercializador with no system account —
    // see `convex/asesorMovements.ts` for the destino heuristic that decides
    // which of the two a handoff writes. Additive, never a rename: existing
    // ASESOR rows/callers are untouched.
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
    qr: v.optional(v.string()),
    coleccion: v.optional(v.string()),
    caja: v.optional(v.string()),
    asesorActual: v.optional(v.string()),
    estadoAsesor: v.optional(v.string()),

    // Fotosíntesis v2 — optional fields populated when an item is created
    // through a lot (lotItems.create). Older items predating Fotosíntesis v2
    // leave these undefined.
    loteId: v.optional(v.string()),
    // Item kind captured by the wizard ("gema" | "bruto" | "joya" | "insumo" |
    // "lote"). Optional + free string so legacy rows (which never stored it)
    // validate; the edit drawer falls back to field-based inference when absent.
    tipo: v.optional(v.string()),
    preponderancia: v.optional(v.number()),
    mostrarEnCatalogo: v.optional(v.boolean()),
    // ms epoch, stamped once by withPublishStamp() the first time
    // mostrarEnCatalogo flips true. Powers the Estrenos "newest" sort for
    // Fotosíntesis items — never cleared or reset by a later unpublish.
    publishedAt: v.optional(v.number()),
    // ── Denormalized lot provenance ──────────────────────────────────────
    // Copies of the owning lot's `mina` / `tratamiento`, stamped by
    // withPublishStamp() every time the item is published. These are NOT the
    // source of truth — the `lots` row is — they exist purely so
    // `products.publishedCatalog` can read provenance off the item instead of
    // point-reading `lots`, which used to drag those lot documents into the
    // public catalog's reactive read set.
    // See docs/audits/2026-08-12-convex-usage-audit.md §4, Fix 1B.
    // Safe to denormalize because a lot is frozen once published:
    // `lots._update` rejects anything not `abierto` (convex/lots.ts:277).
    mina: v.optional(v.string()),
    tratamiento: v.optional(v.string()),
    // Captured at lotItems.create, editable via lotItems.updateGemaFields, and
    // synced to the SOT "Inventario" tab (target="fotosintesis") through the
    // extended layout in api/_lib/fotosintesis-inventory-columns.js.
    procedencia: v.optional(v.string()),
    observacion: v.optional(v.string()),
    // Bruto (rough/unworked parcel) metadata — populated only for tipo "bruto"
    // lotItems. `cantidadEstimada` is a rough piece-count; `rendimientoEsperado`
    // is the % yield Maritza expects after sorting. Both informational only;
    // costoBaseCOP is sheet-owned (manual), not derived from the lote.
    rendimientoEsperado: v.optional(v.number()),
    cantidadEstimada: v.optional(v.number()),

    // Form FOTOSÍNTESIS — esmeraldas / joyas / pricing (optional)
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
    // ── Bloque hoja-primero (AQ–BE del SOT v3) ──
    // Los mantiene una persona en la hoja; la app los lee y NUNCA los escribe
    // (`preserve: true` en api/_lib/fotosintesis-inventory-columns.js).
    // SENSIBLES — no pueden salir por una query que lea un comercial:
    // costoLoteCOP y precioObjetivoCOP son COSTO; cajaValorPagadoCOP,
    // cajaSaldoCOP, cajaEstadoContable son PLATA; cajaComprador es dato
    // personal de un tercero. Ver convex/_lib/saleSafe.ts.
    /** AQ — gramaje real de la pieza (el cotizador lo conjeturaba) */
    pesoGr: v.optional(v.number()),
    /** AR — COSTO, no exponer a comercial */
    costoLoteCOP: v.optional(v.number()),
    /** AT — COSTO, no exponer a comercial */
    precioObjetivoCOP: v.optional(v.number()),
    /** AU — precio al cliente según la decisión del 2026-07-23 */
    cajaPrecioVentaCOP: v.optional(v.number()),
    /** AV — PLATA, no exponer a comercial */
    cajaValorPagadoCOP: v.optional(v.number()),
    /** AW — PLATA, no exponer a comercial */
    cajaSaldoCOP: v.optional(v.number()),
    /** AX — DATO PERSONAL de un tercero, no exponer a comercial */
    cajaComprador: v.optional(v.string()),
    /** AY — PLATA, no exponer a comercial */
    cajaEstadoContable: v.optional(v.string()),
    /** AZ — qué se vende JUNTO (p. ej. C-042-G1 "Guardianas Gemelas") */
    subLote: v.optional(v.string()),
    /** BA — URL pública del producto */
    productoUrl: v.optional(v.string()),
    /** BB — carpeta de fotos en Drive (la buena; NO products/<item> - <nombre>) */
    carpetaFotosUrl: v.optional(v.string()),
    /** BC — notas relacionadas en Anima */
    animaNotas: v.optional(v.string()),
    /** BD — procedencia del dato */
    fuentes: v.optional(v.string()),
    /** BE — notas / conflictos detectados */
    notasConflictos: v.optional(v.string()),
    /** ISO timestamp of last successful pull from Sheets */
    lastPulledAt: v.string(),
    /** ISO timestamp of last successful push to Sheets (null if never edited) */
    lastPushedAt: v.optional(v.string()),
    /** "synced" = mirror matches sheet | "pending" = local edit not yet written | "error" = push failed */
    syncStatus: v.union(
      v.literal('synced'),
      v.literal('pending'),
      v.literal('error'),
    ),
    /** Last sync error message (if syncStatus === "error") */
    syncError: v.optional(v.string()),
    /** Legacy hash from older sync writer — kept optional so existing docs validate. */
    fieldsHash: v.optional(v.string()),
  })
    .index('by_itemId', ['itemId'])
    .index('by_rowIndex', ['rowIndex'])
    .index('by_estado', ['estado'])
    .index('by_syncStatus', ['syncStatus'])
    .index('by_loteId', ['loteId'])
    // Powers the PUBLIC, always-on `products.publishedCatalog` query. Indexing
    // `mostrarEnCatalogo` lets that query scan ONLY published rows instead of
    // the whole table — which also means cron/admin writes to unpublished rows
    // (the overwhelming majority) no longer invalidate every catalog visitor's
    // reactive subscription. Both a bandwidth and an invalidation-frequency win.
    .index('by_mostrarEnCatalogo', ['mostrarEnCatalogo']),

  productEdits: defineTable({
    /** Item being edited */
    itemId: v.string(),
    /** Admin who made the edit (email) */
    editorEmail: v.string(),
    editorName: v.optional(v.string()),
    /** ISO timestamp */
    editedAt: v.string(),
    /** Field name → { before, after } */
    changes: v.array(
      v.object({
        field: v.string(),
        before: v.union(v.string(), v.number(), v.null()),
        after: v.union(v.string(), v.number(), v.null()),
      }),
    ),
    /** "saved" once Sheets push succeeded, "pending" before */
    status: v.union(
      v.literal('saved'),
      v.literal('pending'),
      v.literal('failed'),
    ),
    /** Failure reason if status === "failed" */
    error: v.optional(v.string()),
  })
    .index('by_itemId', ['itemId'])
    .index('by_editor', ['editorEmail']),

  productLocks: defineTable({
    /** Item being held open in the drawer */
    itemId: v.string(),
    /** Admin who claimed the lock */
    holderEmail: v.string(),
    holderName: v.optional(v.string()),
    /** ISO timestamp; lock auto-expires after 5 minutes */
    claimedAt: v.string(),
    expiresAt: v.string(),
  }).index('by_itemId', ['itemId']),

  /**
   * Kardex de movimientos con asesores — historial de "entrega" /
   * "devolución" de una pieza de `productInventory` hacia/desde un asesor
   * o comercializador externo en consignación (`estado: "ASESOR"` o
   * `"CONSIGNACION"` — see the `destino` arg in `convex/asesorMovements.ts`).
   *
   * NOT the same thing as the sale "Kardex" comprobante (see `sales` +
   * VentaDetailPage) — that one is a completed sale and moves the item to
   * `VENDIDA`. This table is the pre-sale consignment ledger: the item
   * stays inventory, just physically with an asesor, and can come back.
   *
   * Append-only (each row is immutable once pushed) and mirrors ONE row in
   * the "Movimientos Asesor" tab of the Fotosíntesis SOT spreadsheet — see
   * convex/asesorMovements.ts + convex/_lib/columnMaps.ts.
   */
  asesorMovements: defineTable({
    itemId: v.string(),
    /** Snapshot of the product name at movement time (survives renames). */
    itemNombre: v.optional(v.string()),
    tipo: v.union(v.literal('entrega'), v.literal('devolucion')),
    asesorNombre: v.string(),
    /** id from the asesores directory (get-asesores), when resolvable. Left
     *  empty for an external recipient (a comercializador with no system
     *  account, e.g. a consignment dealer) — `asesorNombre` is free text and
     *  already covers that case without a schema change. */
    asesorId: v.optional(v.string()),
    cantidad: v.optional(v.number()),
    /** Item price at the moment of the movement (COP) — populates the
     *  per-item line + total on the printed/PDF comprobante. */
    precio: v.optional(v.number()),
    /** ISO date (yyyy-mm-dd) the movement applies to — operator-editable. */
    fecha: v.string(),
    notas: v.optional(v.string()),
    /** Free-text condition of the handoff, shared across every item in the
     *  same `kardexEventId` (e.g. "Devolución obligatoria si no se vende"). */
    condicion: v.optional(v.string()),
    /** Groups every item movement created from ONE multi-item entrega/
     *  devolución event (one form submission, one printed comprobante) —
     *  same convention as a physical hoja manuscrita covering several
     *  items in one signature. Absent on movements created before batching
     *  existed (each was its own implicit one-item event). */
    kardexEventId: v.optional(v.string()),
    /** Person who physically handed over / received back the item(s) —
     *  may differ from `registradoPor*` (whoever operates the digital
     *  form). Optional: falls back to registradoPorNombre when absent. */
    entregadoPorNombre: v.optional(v.string()),
    registradoPorEmail: v.string(),
    registradoPorNombre: v.optional(v.string()),
    /** productInventory.estado snapshot before/after — lets the ledger read
     *  standalone (Sheets tab) without joining back to Inventario. */
    estadoAnterior: v.string(),
    estadoNuevo: v.string(),
    /** Synthetic natural key pushed as column A (never patched — append-only). */
    movimientoId: v.string(),
    /** Drive URL of the PDF comprobante for this kardex event. Written once,
     *  after the browser rasterizes + uploads it (see
     *  MovimientosKardexPage.handleGenerateComprobante). EVERY row sharing a
     *  kardexEventId carries the same URL — the event has one comprobante, not
     *  the item. Optional: rows exist before the PDF is generated, and it may
     *  never be generated at all.
     *
     *  Denormalised onto every row on purpose: `by_kardexEventId` already
     *  exists, so a lookup is one indexed scan with no join, and the anima-bot
     *  can resolve a comprobante with the same plain query it uses elsewhere.
     *  Before this field the URL lived ONLY in React state and died with the
     *  browser tab. */
    comprobanteUrl: v.optional(v.string()),
    ...syncFields,
  })
    .index('by_itemId', ['itemId'])
    .index('by_asesorNombre', ['asesorNombre'])
    .index('by_kardexEventId', ['kardexEventId'])
    .index('by_rowIndex', ['rowIndex'])
    .index('by_syncStatus', ['syncStatus']),

  // ─── Fotosíntesis v2 · Captura administrativa ────────────────────
  //
  // Five new tables backing the Proveedor → Compra → Inventario → Ventas
  // workflow plus a utility `sequences` table for race-safe allocation
  // of B-{NNN} (lots) and V-{NNNN} (sales) numbers.
  //
  // Convention: the four content tables (providers, lots, clients, sales)
  // mirror Sheets tabs and reuse the `syncFields` envelope. lotItems lives
  // only in Convex (PRD §8.3). sequences is a Convex-only utility.

  /** Race-safe monotonic counters. One row per named sequence. */
  sequences: defineTable({
    name: v.string(),
    nextValue: v.number(),
  }).index('by_name', ['name']),

  // ─── SOT v4 · Motor de precios (Modelo v2) ───────────────────────
  //
  // Los supuestos del modelo, versionados por fecha — el equivalente de
  // `Fijacion_Precios!B4:B12` del xlsx, pero sin celdas sueltas. Que tenga
  // `vigenteDesde` es lo que impide el defecto más caro de una tabla de
  // parámetros: cambiar la tasa este mes y repreciar retroactivamente lo que
  // ya se vendió con la tasa vieja. El motor (`_lib/motorPrecios.ts`) recibe
  // siempre la config que corresponde a la fecha de la cotización, nunca la
  // más nueva por defecto.
  //
  // El gasto fijo unitario NO se guarda aquí: se deriva como
  // `gastosFijosMensualesCOP ÷ COUNT(lotes activos)` (decisión D2), para que
  // el divisor no pueda quedar desactualizado como el `B6` escrito a mano.
  configPrecios: defineTable({
    vigenteDesde: v.string(), // ISO AAAA-MM-DD, inclusive
    gastosFijosMensualesCOP: v.number(),
    comisionPct: v.number(),
    ivaJoyaPct: v.number(),
    // IVA de gema suelta en venta nacional. Ausente = 0 (las reglas previas al
    // 2026-08-20 asumían gema exenta; el art. 424 ET no la excluye — ver
    // motorPrecios.ts). La corrección entra por una regla NUEVA, nunca
    // editando una vieja: eso repreciaría lo ya cotizado.
    ivaGemaPct: v.optional(v.number()),
    margenNetoDeseadoPct: v.number(), // sobre el PRECIO, no markup sobre costo
    remateHasta: v.string(), // último día del remate, ISO
    multRemateGema: v.number(),
    multRemateJoya: v.number(),
    /**
     * Ventas estimadas del mes — el `B11` del xlsx, que era `=B4*2,5` (un
     * multiplicador hardcodeado que nadie decidió). Ahora es un DATO DE ENTRADA
     * que Kevin dicta cada mes, versionado por período igual que los gastos
     * fijos. Ausente ⇒ la brecha del Tablero va vacía, nunca en cero.
     */
    ventasEstimadasMesCOP: v.optional(v.number()),
    notas: v.optional(v.string()),
  }).index('by_vigenteDesde', ['vigenteDesde']),

  // La traza de cada recálculo del gasto fijo unitario. Existe para poder
  // responder después «¿por qué cambió este precio?» sin reconstruirlo de
  // memoria — hoy en la hoja ese recálculo es manual y no deja rastro.
  // El planner que decide qué evento recalcula vive en `_lib/recalculo.ts`.
  recalculos: defineTable({
    ts: v.number(),
    evento: v.string(), // ALTA_LOTE | VENTA | CANCELACION_LOTE
    divisorUsado: v.number(), // lotes activos — el divisor de D2
    unidadesActivas: v.number(), // piezas no vendidas: auditoría, NO divisor
    valorAnterior: v.number(),
    valorNuevo: v.number(),
    motivo: v.optional(v.string()),
  }).index('by_ts', ['ts']),

  // ─── SOT v4 · W3, el ledger de movimientos ───────────────────────
  //
  // Todo lo que le pasa a una pieza después de existir es un movimiento, y la
  // venta es uno de ellos. Hoy son dos rieles separados (`sales.create` y
  // `asesorMovements`) que se parecen mucho, y por esa separación el caso real
  // del ítem 5 de Pablo Loaiza —vendido, cobro pendiente— nunca entró como
  // venta.
  //
  // Append-only: un movimiento no se edita, se compensa con otro. Es un libro
  // contable, no un estado.
  movimientos: defineTable({
    movimientoId: v.string(),
    kardexEventId: v.string(), // agrupa N ítems bajo una misma entrega
    tipo: v.union(
      v.literal('VENTA'),
      v.literal('CONSIGNACION'),
      v.literal('DEVOLUCION'),
      v.literal('ASESOR'),
    ),
    fecha: v.string(),
    itemIds: v.array(v.string()),
    entregadoPor: v.string(),
    recibidoPor: v.string(),
    condicion: v.optional(v.string()),
    notas: v.optional(v.string()),
    /** Solo en VENTA. `precioVentaRealCOP` es obligatorio dentro del bloque. */
    venta: v.optional(
      v.object({
        cliente: v.string(),
        precioVentaRealCOP: v.number(),
        comisionPct: v.optional(v.number()),
        pagoComisionesA: v.optional(v.string()),
        formaPago: v.string(),
        efectivo: v.optional(
          v.object({
            numeroRecibo: v.string(),
            recibidoPor: v.string(),
            /** Cuándo entró la plata a caja. La pedía el canon y faltaba. */
            fechaIngresoCaja: v.optional(v.string()),
            ubicacion: v.optional(v.string()),
          }),
        ),
        transferencia: v.optional(
          v.object({
            numeroCuenta: v.string(),
            titular: v.string(),
            banco: v.string(),
            numeroTransaccion: v.string(),
          }),
        ),
        credito: v.optional(
          v.object({ fechaInicio: v.string(), fechaPago: v.string() }),
        ),
      }),
    ),
    /** La cadena consignación → venta, trazada. */
    origenKardexEventId: v.optional(v.string()),
    registradoPor: v.string(),
    ts: v.number(),
    /**
     * Ciclo de vida maker-checker (2026-08-02). Ausente = fila del riel web
     * anterior a este campo, ya CONFIRMADA de hecho (sus efectos se aplicaron
     * en el mismo `_registrar` que la creó). Additive, nunca backfilleado.
     */
    estadoMovimiento: v.optional(
      v.union(
        v.literal('POR_CONFIRMAR'),
        v.literal('CONFIRMADO'),
        v.literal('RECHAZADO'),
      ),
    ),
    motivoRechazo: v.optional(v.string()),
    resueltoPor: v.optional(v.string()),
    resueltoEn: v.optional(v.number()),
  })
    .index('by_movimientoId', ['movimientoId'])
    .index('by_kardexEventId', ['kardexEventId'])
    .index('by_tipo', ['tipo'])
    .index('by_ts', ['ts']),

  // ─── SOT v4 · El espejo push-only ────────────────────────────────
  //
  // La cola hacia el libro «SOT v4 · Espejo (PRUEBAS)». A diferencia del riel
  // viejo —que guarda el estado de sync en la propia fila de dominio— el espejo
  // v4 usa una cola explícita, por dos razones: la escritura NO puede reventar
  // la mutation de origen (Convex es la verdad; la hoja es una vista), y un
  // evento puede tocar varias pestañas a la vez.
  //
  // La fila se ubica en la hoja BUSCANDO el id en su columna, nunca por un
  // contador: `rowIndex = maxRow + 1` ya causó deriva real en el riel viejo y
  // tiene una reparación dedicada (`convex/lots.ts:947-1096`).
  espejoOutbox: defineTable({
    /** Pestaña destino: Lotes | Casillas | Movimientos. */
    pestana: v.string(),
    /** Id natural de la fila (loteId, itemId, movimientoId) — la clave del upsert. */
    idFila: v.string(),
    /** La fila ya marshalada: { cabecera nombrada -> valor en texto }. */
    campos: v.record(v.string(), v.string()),
    estado: v.union(
      v.literal('pendiente'),
      v.literal('enviado'),
      // Dead-letter: agotó los intentos. Se aparta para que no bloquee la cola,
      // pero NO se borra ni se silencia — `espejo:apartadas` la lista y el
      // reporte de deriva la nombra. Un tope silencioso convertiría «se dejó de
      // intentar» en «se sincronizó».
      v.literal('apartada'),
      v.literal('error'),
    ),
    intentos: v.number(),
    ultimoError: v.optional(v.string()),
    creadoEn: v.number(),
    enviadoEn: v.optional(v.number()),
    /** Backoff: no se reintenta antes de este instante. */
    proximoIntentoEn: v.optional(v.number()),
  })
    .index('by_estado', ['estado'])
    .index('by_pestana_idFila', ['pestana', 'idFila']),

  // ─── Idempotency · Commit tokens ─────────────────────────────────
  //
  // MONEY-CRITICAL: the four "create" mutations (lots/lotItems/sales/subLotes)
  // accept an optional `clientToken`. The first create persists a row here; a
  // replay (AI copilot retry / operator double-click sharing the same token)
  // short-circuits to the stored `result` instead of inserting a second row.
  // `primaryId` is the created row's _id — existence-checked on replay because a
  // later cancel can delete the row (+ reclaim its sequence), in which case the
  // stale token is dropped and the create runs again (C7).
  commitTokens: defineTable({
    token: v.string(),
    kind: v.string(),
    primaryId: v.string(), // the _id of the row created (existence-checked on replay)
    result: v.string(), // JSON.stringify of the mutation's return value
    createdAt: v.string(),
  }).index('by_token', ['token']),

  providers: defineTable({
    nombreORazonSocial: v.string(),
    nit: v.optional(v.string()),
    cedula: v.optional(v.string()),
    direccion: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    // Canonical values: gemas | joyas | insumos | otros. Stored as free text
    // so the capture UI can save an operator write-in ("Otra opción") when the
    // proveedor category isn't one of the four. Mirror in
    // `src/data/vocabularies.ts#PROVIDER_TIPOS`.
    tipo: v.string(),
    notas: v.optional(v.string()),
    /**
     * La fila centinela de las agrupaciones reconstruidas — ver
     * `_lib/proveedorCentinela.ts`. No es un proveedor: es el lugar donde
     * apuntan los lotes cuyo proveedor real todavía no se sabe, para no
     * atribuirle piedras ajenas a alguien que nunca las vendió.
     *
     * Sale de los pickers y de los reportes de proveedores (`providers.list`),
     * pero SÍ se ve en la ficha del lote: que el nombre aparezca es el punto.
     */
    centinela: v.optional(v.boolean()),
    /**
     * Set when a rename is in flight: holds the prior natural-key value so
     * the Sheets safety check can validate column A against the OLD name
     * before overwriting it. Cleared on successful push.
     */
    pendingPreviousIdValue: v.optional(v.string()),
    ...syncFields,
  })
    .index('by_nit', ['nit'])
    .index('by_nombre', ['nombreORazonSocial'])
    .index('by_rowIndex', ['rowIndex'])
    .index('by_syncStatus', ['syncStatus']),

  lots: defineTable({
    /**
     * "B-001"/"C-001", ... — globally unique, allocated via sequences.
     * Prefix encodes the sede (B = Bogotá, C = Cali). Pre-multisede rows
     * have a B- id; the optional `sede` field carries the same info for
     * filtering/group-by queries.
     */
    loteId: v.string(),
    /**
     * Sede where the lot was captured. Optional for legacy rows. Canonical
     * codes B/C/S/M; stored as free text so a sanitized custom bóveda code
     * (the loteId prefix) can be saved via the capture UI's "Otra…" write-in.
     */
    sede: v.optional(v.string()),
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
    // Canonical: contado | credito | esmereogenesis | bajo_pedido |
    // consignacion. Free text so the capture UI can save an operator write-in
    // ("Otra…"); the credito/contado branches simply don't fire for customs.
    formaPago: v.string(),
    // Canonical: efectivo | transferencia. Free text for write-in parity.
    metodoContado: v.optional(v.string()),
    fechaVencimiento: v.optional(v.string()),
    numeroCuotas: v.optional(v.number()),
    numeroFactura: v.optional(v.string()),
    urlFactura: v.optional(v.string()),
    notas: v.optional(v.string()),
    estado: v.union(
      v.literal('abierto'),
      v.literal('cerrado'),
      v.literal('publicado'),
      v.literal('cancelado'),
      /**
       * Agrupación retroactiva armada el 2026-07-23 desde colecciones legadas
       * («Fénix», «Madres», …), no una compra. Entró a la unión el 2026-08-01
       * (decisión de Kevin) porque sin ella los 28 lotes que la hoja tiene y
       * Convex no, no cabían en la tabla — y sus piezas quedaban invisibles
       * para el conteo de lotes activos, que es el divisor del gasto fijo.
       *
       * Cuenta como ACTIVO si tiene ≥1 unidad no vendida, igual que cualquier
       * otro: D2 no mira `lots.estado`, así que no hay conflicto. Y NO es
       * `abierto` — mapearlo allá lo volvería indistinguible de una compra
       * real, además de dejarlo editable por el wizard viejo.
       */
      v.literal('reconstruido'),
    ),
    // Catalog grouping. `fotoLoteUrl` is Convex-only; `mostrarComoLote` IS
    // synced (COLUMN_MAPS.lots col U + WRITABLE.lots) so it can be toggled from
    // the sheet. When true and the lot is `publicado`, the customer catalog
    // shows the whole lote as ONE grouped card (hero photo + total price +
    // per-item gallery) instead of one card per item.
    fotoLoteUrl: v.optional(v.string()),
    mostrarComoLote: v.optional(v.boolean()),

    // ─── SOT v4 · W1 «Cerebro Racional» ────────────────────────────
    //
    // Aditivos y OPCIONALES a nivel schema, para no romper las filas legacy
    // que nunca los tuvieron. La obligatoriedad vive en la validación del
    // camino v4 (`_lib/loteV4.ts`), no aquí: el schema describe lo que puede
    // existir; el wizard describe lo que hay que capturar.

    /**
     * El campo que decide el régimen fiscal: gema (divisor 0,60) o joya
     * (0,41). `mixta` es legítimo a nivel lote y significa «se resuelve
     * casilla por casilla» — el motor NO cotiza un lote mixto como bloque.
     * Cotizar con el divisor equivocado mueve el precio 46%.
     */
    categoriaFiscal: v.optional(
      v.union(v.literal('gema'), v.literal('joya'), v.literal('mixta')),
    ),
    /**
     * De dónde salió `categoriaFiscal` (decisión de Kevin, 2026-08-02).
     * `capturada` — alguien la escribió por W1/W2. `inferida` — la sembró
     * `_lib/categoriaFiscalInferencia.ts` por palabras clave del nombre; el
     * motor cotiza igual (el candado solo exige que EXISTA), pero cada precio
     * que sale de un lote `inferida` viaja con el aviso `CATEGORIA_INFERIDA`,
     * y el espejo la muestra con sufijo («joya (inferida)»). `revisada` —
     * Kevin la graduó tras mirarla. **Gate duro de Fase 3**
     * (`lotesPendientesDeRevision`): prod no corta con NINGÚN lote en
     * `inferida`. Ausente = capturada de un lote legacy, de antes de que este
     * campo existiera.
     */
    categoriaFiscalOrigen: v.optional(
      v.union(
        v.literal('capturada'),
        v.literal('inferida'),
        v.literal('revisada'),
      ),
    ),
    /**
     * El negocio que es este lote (dictamen de Kevin, punto 5, 2026-08-02).
     * `'operacional'` es el default implícito: absorbe el gasto fijo de la
     * comercializadora (D2/divisor) y se precifica por absorción (K +
     * escalones). `'coleccion'` es OTRO negocio — piezas reales, precio
     * individual y negociado, NUNCA absorbe el fijo mensual ni cuenta en el
     * divisor (así era el modelo histórico: por eso `B6` decía 76 y no más).
     * Ausente ⇒ operacional, para no forzar el campo en cada lote legacy.
     */
    segmento: v.optional(
      v.union(v.literal('operacional'), v.literal('coleccion')),
    ),
    /**
     * Descripción de COMPRA — el «Cerebro Racional» de W1. Es OTRA cosa que
     * `renombreLote`, que es el nombre comercial/creativo de W2. El canon las
     * lista aparte a propósito: una dice qué se compró, la otra cómo se vende.
     */
    nombre: v.optional(v.string()),
    /**
     * Cuándo se PAGÓ el lote. Distinta de `fechaVencimiento`, que es cuándo se
     * DEBE pagar. Se autocompleta con la fecha del abono que lleva el saldo a 0
     * (`_lib/loteV4.fechaPagoPorAbonos`) y también se puede capturar a mano.
     */
    fechaPago: v.optional(v.string()),
    /**
     * Bloque de gemas. OPCIONAL, al revés que el de joya: es descriptivo, no un
     * insumo del costo. De acá hereda la casilla su `tipo`.
     */
    gema: v.optional(
      v.object({
        tipoGema: v.string(),
        cantidadGemas: v.number(),
        corteGema: v.string(),
        pesoTotalCt: v.number(),
        calidadPromedio: v.string(),
        medidaPromedio: v.string(),
        pesoGemaPromedioCt: v.number(),
        costoPorCtCOP: v.number(),
      }),
    ),
    /** Bloque de joyería. Obligatorio en v4 cuando la categoría es `joya`. */
    joya: v.optional(
      v.object({
        tipoJoya: v.string(),
        mineral: v.string(),
        gramaje: v.number(),
        costoPorGramoCOP: v.number(),
        /** Cuántas piezas trae el lote de joya. La pedía el canon y faltaba. */
        cantidadJoyas: v.optional(v.number()),
        presupuestoJoyaCOP: v.optional(v.number()),
      }),
    ),
    /**
     * Landed cost como documentos que ajustan (viáticos, packing, domicilio),
     * no como un campo editable: así se puede decir DE QUÉ fue el ajuste. Un
     * monto suelto dentro del costo es indistinguible de un dedazo.
     */
    costosVariables: v.optional(
      v.array(v.object({ concepto: v.string(), montoCOP: v.number() })),
    ),
    /**
     * El costo de compra PURO, sin los variables. `costoTotalCOP` guarda el
     * landed cost (compra + variables) porque es lo que el motor absorbe, pero
     * la conciliación contra la suma de las casillas tiene que usar este:
     * los viáticos y el packing son del lote y no le pertenecen a ninguna
     * pieza, así que compararlos contra Σ costos unitarios inventa una
     * diferencia que no existe. Es la misma columna `F` de la auditoría,
     * distinta de `F + J`.
     */
    costoCompraCOP: v.optional(v.number()),
    abonoCOP: v.optional(v.number()),
    saldoCOP: v.optional(v.number()),
    /**
     * Marca el lote como capturado con el modelo nuevo. El wizard viejo debe
     * RECHAZAR abrirlo: sus reglas (preponderancia sumando 100, costo por
     * prorrateo) contradicen las de v4, y mezclarlas corrompería el costo.
     */
    origenModelo: v.optional(v.literal('v4')),
    /**
     * Queda escrito cuando alguien publica un lote con casillas incompletas.
     * El override existe —la operación real a veces necesita publicar antes de
     * terminar de clasificar— pero no puede ser invisible: sin registro, «se
     * publicó parcial» se vuelve el estado normal y nadie sabe qué falta.
     */
    publicacionParcial: v.optional(
      v.object({
        ts: v.number(),
        por: v.string(),
        motivo: v.string(),
        casillasIncompletas: v.array(v.string()),
      }),
    ),

    ...syncFields,
  })
    .index('by_loteId', ['loteId'])
    .index('by_provider', ['providerId'])
    .index('by_estado', ['estado'])
    .index('by_rowIndex', ['rowIndex'])
    .index('by_syncStatus', ['syncStatus']),

  /** Convex-only join between lots and productInventory. Not synced to Sheets. */
  lotItems: defineTable({
    loteId: v.string(),
    itemId: v.string(),
    preponderancia: v.number(),
    costoBaseCOP: v.number(),
    ordenEnLote: v.number(),

    // ─── SOT v4 · W2 «Cerebro Creativo», la casilla ────────────────
    //
    // Una casilla v4 nace aquí y NO tiene fila en `productInventory`: crearla
    // dispararía el push al SOT v3 vivo (el APP_URL del deployment de dev
    // apunta a producción — ver reconocimiento §5.5) y sembraría un precio con
    // el multiplicador plano 2,6× que este modelo erradica.
    //
    // Por eso `preponderancia` y `costoBaseCOP` quedan en 0 en las casillas v4:
    // son campos del riel viejo. El costo autoritativo es
    // `costoUnitarioRealCOP`, CAPTURADO — jamás prorrateado (regla §4.2, el
    // error de $52.500 de «Choker + Piedra»).
    estadoCasilla: v.optional(v.string()),
    /**
     * El costo real de ESTA pieza, capturado por quien la clasifica. Es el
     * campo nuevo que reemplaza a `costoBaseCOP` en v4: aquel nace en cero, es
     * propiedad de la hoja, y el helper que lo llenaba prorrateaba el lote.
     */
    costoUnitarioRealCOP: v.optional(v.number()),
    /** Solo cuando el lote es `mixta`: cada casilla declara su régimen. */
    categoriaFiscal: v.optional(v.union(v.literal('gema'), v.literal('joya'))),

    // Los campos que W2 captura. Todos opcionales en el schema: la casilla nace
    // vacía a propósito y se llena de a poco, posiblemente en varias sesiones.
    // Cuáles son obligatorios para considerarla COMPLETA lo decide
    // `_lib/casillaW2.ts`, no el schema — codificarlo en el validator
    // impediría guardar el trabajo a medias, que es el caso normal.
    renombre: v.optional(v.string()),
    calidad: v.optional(v.string()),
    color: v.optional(v.string()),
    corte: v.optional(v.string()),
    ct: v.optional(v.number()),
    gradoRareza: v.optional(v.string()),
    /**
     * El tipo de gema de ESTA pieza (Murralla, Gola, Raíz…). Nace heredado del
     * bloque Gema del lote y quien clasifica lo corrige si la pieza es de otro
     * tipo — clasificar es corregir defaults, no digitar de cero.
     */
    tipo: v.optional(v.string()),
    tipoJoya: v.optional(v.string()),
    gramaje: v.optional(v.number()),
    /** Intención comercial, no dato de la pieza. */
    rangoVentaEsperadoCOP: v.optional(v.number()),
    clasificadaPor: v.optional(v.string()),
    clasificadaEn: v.optional(v.number()),
    /**
     * Modalidades de venta mutuamente excluyentes sobre la MISMA mercancía —
     * el caso C-010, escrito hoy en tres filas (el bulto completo y sus dos
     * partes, las mismas 6 piezas). Vender una modalidad bloquea a sus
     * hermanas: hoy nada lo impide y se puede vender dos veces lo mismo.
     */
    modalidadGrupo: v.optional(v.string()),
    /**
     * La foto de LA PIEZA, capturada al clasificar por Telegram (W2).
     *
     * Vive acá y NO en `productInventory` a propósito: una casilla v4 no tiene
     * fila de producto (ver la cabecera de `lotsV4.ts`), y escribir allá
     * agendaría `products.pushToSheet`, que desde dev escribe en el SOT v3 de
     * producción.
     *
     * CONSECUENCIA: esta foto NO llega al catálogo. La materialización de
     * Fase 2 es la que debe arrastrarla a `productInventory.fotoUrl`.
     */
    fotoUrl: v.optional(v.string()),
  })
    .index('by_loteId', ['loteId'])
    .index('by_itemId', ['itemId']),

  clients: defineTable({
    nombre: v.string(),
    nit: v.optional(v.string()),
    cedula: v.optional(v.string()),
    direccion: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    // Canonical: embajador | final. Free text so the venta UI's comprador
    // picker can save a custom buyer type ("Otro…", e.g. "mayorista"); the
    // custom path is captured through the cliente-final form.
    tipo: v.string(),
    /** Free-form id pointing to the asesores directory (when tipo = "embajador"). */
    asesorId: v.optional(v.string()),
    /** See providers.pendingPreviousIdValue — same rename-safety mechanism. */
    pendingPreviousIdValue: v.optional(v.string()),

    // ─── GHL commerce integration (Áreas 2 & 4) ──────────────────────
    // Additive + all optional so existing Sheets-mirrored rows validate.
    // The GHL bot / web checkout upsert these. `ghlContactId` is the sync key
    // to the GoHighLevel contact. `leadScore` is GHL-owned (never written from
    // here — golden rule #6, one writer per field); `totalCompradoCOP` is
    // Convex-owned and incremented when a sale is confirmed/paid.
    ghlContactId: v.optional(v.string()),
    ambassadorId: v.optional(v.id('ambassadors')),
    leadScore: v.optional(v.number()),
    totalCompradoCOP: v.optional(v.number()),
    ultimaCompraFecha: v.optional(v.string()),
    tipoInteres: v.optional(v.string()),
    presupuestoDeclaradoCOP: v.optional(v.number()),
    canalOrigen: v.optional(v.string()),
    instagramHandle: v.optional(v.string()),
    ciudad: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    ...syncFields,
  })
    .index('by_nit', ['nit'])
    .index('by_email', ['email'])
    .index('by_nombre', ['nombre'])
    .index('by_rowIndex', ['rowIndex'])
    .index('by_syncStatus', ['syncStatus'])
    // GHL webhook fan-out resolves a contact by its GoHighLevel id; the bot
    // matches inbound leads by phone. Both are point lookups, so index them.
    .index('by_ghlContactId', ['ghlContactId'])
    .index('by_telefono', ['telefono']),

  // ─── GHL commerce · Ambassadors (asesores / embajadores) ─────────
  //
  // The referral + commission layer for the GoHighLevel funnel. An ambassador
  // earns `comisionPercent` of every sale attributed to them (sales.ambassadorId,
  // resolved from `ambassador_slug` at order time = first-touch, spec T4). `nivel`
  // drives the default commission; `score` is recomputed by the `ambassador-scoring`
  // cron. Convex-only (not a Sheets mirror).
  ambassadors: defineTable({
    slug: v.string(),
    nombre: v.string(),
    email: v.string(),
    celular: v.optional(v.string()),
    instagramHandle: v.optional(v.string()),
    nivel: v.union(
      v.literal('bronce'),
      v.literal('plata'),
      v.literal('oro'),
      v.literal('diamante'),
    ),
    comisionPercent: v.number(),
    score: v.number(),
    status: v.union(
      v.literal('invited'),
      v.literal('active'),
      v.literal('paused'),
      v.literal('suspended'),
      v.literal('archived'),
    ),
    referidoPor: v.optional(v.id('ambassadors')),
    ghlContactId: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index('by_slug', ['slug'])
    .index('by_email', ['email'])
    .index('by_status', ['status']),

  // ─── GHL commerce · Commissions ledger ───────────────────────────
  //
  // One row per attributed sale. `ghl.markOrderPaid` inserts it (via
  // commissions.createFromOrder) when a sale flips to `confirmada` (= paid).
  // Convex has no UNIQUE constraint, so createFromOrder queries `by_saleId`
  // first and no-ops if a row exists — emulating the spec's UNIQUE(order_id)
  // idempotency guard so a replayed MP webhook never double-pays (golden rule #4).
  commissions: defineTable({
    /** FK → sales.saleId (string natural key, mirrors sales.itemIds convention). */
    saleId: v.string(),
    ambassadorId: v.id('ambassadors'),
    amountCOP: v.number(),
    percentApplied: v.number(),
    status: v.union(
      v.literal('pending'),
      v.literal('approved'),
      v.literal('paid'),
      v.literal('cancelled'),
    ),
    createdAt: v.string(),
  })
    .index('by_saleId', ['saleId'])
    .index('by_ambassador', ['ambassadorId']),

  sales: defineTable({
    /**
     * "VB-0001"/"VC-0001", ... — globally unique, allocated via sequences.
     * Legacy rows captured before the multisede split have a plain
     * "V-NNNN" id; the optional `sede` field carries the sede.
     */
    saleId: v.string(),
    /**
     * Sede where the sale was recorded. Optional for legacy rows. Canonical
     * codes B/C/S/M; free text so a sanitized custom bóveda code (the saleId
     * prefix) can be saved via the venta UI's "Otra…" write-in.
     */
    sede: v.optional(v.string()),
    fechaVenta: v.string(),
    /** itemIds reference productInventory.itemId (string, not Convex id). */
    itemIds: v.array(v.string()),
    clientId: v.id('clients'),
    precioAcordadoCOP: v.number(),
    descuentoCOP: v.optional(v.number()),
    totalCOP: v.number(),
    comisionCOP: v.optional(v.number()),
    /**
     * Manual (non-inventory) line items — things the operator added to the sale
     * that aren't in productInventory (an accessory, a service, a piece not yet
     * captured). App-only: NOT in COLUMN_MAPS.sales (never pushed) nor in the
     * sales pull allowlist (never clobbered), like the cancellation audit fields.
     * Their prices are already folded into precioAcordadoCOP / totalCOP.
     */
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
    /**
     * Per-line price snapshot — the tier-resolved price each inventory item was
     * SOLD at, frozen at sale time. The Kardex comprobante reads these instead
     * of recomputing from live inventory, so a legal/financial document stays a
     * faithful record even if an item is later re-priced or the buyer's tier
     * flips. App-only like `manualItems`: NOT in COLUMN_MAPS.sales (never
     * pushed) nor in the sales pull allowlist (never clobbered). Optional:
     * legacy sales predate it and fall back to a live recompute.
     */
    lineItems: v.optional(
      v.array(
        v.object({
          itemId: v.string(),
          precioCOP: v.number(),
          tier: v.union(v.literal('embajador'), v.literal('final')),
        }),
      ),
    ),
    // Canonical: contado | credito | esmereogenesis | canje | bajo_pedido |
    // consignacion. Free text so the venta UI can save an operator write-in
    // ("Otra…"); the credito/contado/esmereogenesis branches no-op for customs.
    formaPago: v.string(),
    // Canonical: efectivo | transferencia | crypto. Free text for write-in parity.
    metodoContado: v.optional(v.string()),
    fechaVencimiento: v.optional(v.string()),
    numeroCuotas: v.optional(v.number()),
    adicionales: v.optional(v.string()),
    carnetUrl: v.optional(v.string()),
    certificadoUrl: v.optional(v.string()),
    estado: v.union(
      v.literal('reservada'),
      v.literal('confirmada'),
      v.literal('cancelada'),
    ),
    // Slice 3 · Cancellation audit trail. Populated by `sales.cancel`. Kept
    // on Convex only — Sheets sync of these fields is a follow-up that needs
    // a coordinated tab schema change (see COLUMN_MAPS.sales).
    cancelledAt: v.optional(v.string()),
    cancelledBy: v.optional(v.string()),
    cancellationReason: v.optional(v.string()),

    // ─── GHL commerce · Mercado Pago + ambassador attribution ────────
    // Additive + optional so legacy Fotosíntesis sales validate untouched.
    // A bot/web order is created `estado:"reservada"` (pending payment) and flips
    // to `confirmada` (= paid) by the mp-webhook → ghl.markOrderPaid path. The
    // `mp*` fields snapshot the Mercado Pago preference/payment; `external_reference`
    // on the MP preference is this row's `saleId`.
    ambassadorId: v.optional(v.id('ambassadors')),
    mpPreferenceId: v.optional(v.string()),
    mpPaymentId: v.optional(v.string()),
    mpStatus: v.optional(v.string()),
    /**
     * Provider-neutral payment snapshot. Additive + optional like the mp*
     * fields above, so legacy Fotosíntesis sales validate untouched. NOT in
     * COLUMN_MAPS.sales — Convex-only, the Sheets mirror never sees them.
     * `paymentProvider` is 'mercadopago' | 'wompi' | 'breb-manual'.
     */
    paymentProvider: v.optional(v.string()),
    providerTxId: v.optional(v.string()),
    providerStatus: v.optional(v.string()),
    paidAt: v.optional(v.string()),
    promotionCode: v.optional(v.string()),
    shippingAddress: v.optional(
      v.object({
        ciudad: v.optional(v.string()),
        direccion: v.optional(v.string()),
        codigoPostal: v.optional(v.string()),
      }),
    ),
    /** Set true when the post-paid GHL fan-out failed; a retry cron drains these. */
    pendingGhlSync: v.optional(v.boolean()),
    ...syncFields,
  })
    .index('by_saleId', ['saleId'])
    .index('by_client', ['clientId'])
    .index('by_estado', ['estado'])
    .index('by_rowIndex', ['rowIndex'])
    .index('by_syncStatus', ['syncStatus']),

  // ─── Fotosíntesis · Sub-lotes (sale-bundles) ─────────────────────
  //
  // A sub-lote is a named group of items drawn from ONE parent lote, built to
  // sell them together while keeping traceability to the source lote. Membership
  // lives as `itemIds` (mirrors sales.itemIds), so an item can belong to several
  // sub-lotes at once; the item keeps its own loteId — a sub-lote never rewrites
  // item ownership. Derived figures (`unidades`, `totalCostoCOP`) are recomputed
  // server-side on every mutation, never client-set (BR-S3). Mirrors a Google
  // Sheets "Sublotes" tab, push-only like lots/sales.
  subLotes: defineTable({
    /** "B-001-G1" — parentLoteId + "-G" + per-parent sequence value. */
    subLoteId: v.string(),
    /** FK → lots.loteId. The traceability link back to the source lote. */
    parentLoteId: v.string(),
    /** Sede inherited from the parent lote (free text for custom write-ins). */
    sede: v.optional(v.string()),
    nombre: v.string(),
    /** itemIds reference productInventory.itemId (string, not Convex id). */
    itemIds: v.array(v.string()),
    /** Derived: itemIds.length. */
    unidades: v.number(),
    /** Derived: Σ member productInventory.costoBaseCOP. Never user-set (BR-S3). */
    totalCostoCOP: v.number(),
    notas: v.optional(v.string()),
    estado: v.union(v.literal('activa'), v.literal('archivada')),
    createdAt: v.string(),
    // Catalog grouping. `fotoUrl` is Convex-only; `mostrarComoLote` IS synced
    // (COLUMN_MAPS.subLotes col K + WRITABLE.subLotes) so it can be toggled from
    // the sheet. When true and the sublote is `activa`, the customer catalog
    // shows this curated subset as ONE grouped card.
    fotoUrl: v.optional(v.string()),
    mostrarComoLote: v.optional(v.boolean()),
    ...syncFields,
  })
    .index('by_subLoteId', ['subLoteId'])
    .index('by_parentLote', ['parentLoteId'])
    .index('by_estado', ['estado'])
    .index('by_rowIndex', ['rowIndex'])
    .index('by_syncStatus', ['syncStatus']),

  /** Materials catalog populated inline by the inventory wizard (joyas). */
  materials: defineTable({
    name: v.string(),
    type: v.optional(v.string()),
  }).index('by_name', ['name']),

  // ─── Inventory stats singleton ───────────────────────────────────
  //
  // BANDWIDTH: `products.syncStats` used to `.take(1000)` the FULL
  // productInventory documents just to compute a count (`total`) and a
  // max-of-`lastPulledAt` (`lastPull`). Because that query *read* those
  // rows, it re-ran reactively on EVERY productInventory write for every
  // subscribed admin — a 1000-doc fan-out per keystroke-sync.
  //
  // productInventory rows are never deleted (cancel/remove only orphan;
  // pulls only insert/patch), so `total` is monotonically increasing and
  // can be maintained as a counter. This table holds a SINGLE row that the
  // four insert sites bump (+N) and the pull path stamps with `lastPull`.
  // `syncStats` then reads ONE doc instead of scanning 1000. No index
  // needed — fetch the lone row via `.first()`.
  inventoryStats: defineTable({
    total: v.number(),
    lastPull: v.optional(v.string()),
  }),

  // ─── Public catalog invalidation sentinel ────────────────────────────
  //
  // A SINGLE row holding a monotonic counter. It exists so the customer
  // catalog can be served from a client-side cache while still invalidating
  // within seconds of a real change — without any visitor holding a live
  // subscription to `products.publishedCatalog`.
  //
  // WHY: Convex bills Database I/O on documents SCANNED. `publishedCatalog`
  // was an anonymously-subscribed reactive query that re-scanned every
  // published 81-field row on each visitor connect AND on every write into its
  // read set — 759.76 MB in Aug 2026, 63% of the whole team's quota.
  // See docs/audits/2026-08-12-convex-usage-audit.md §4, Fix 1C.
  //
  // Visitors now subscribe to THIS table instead: one ~100-byte document.
  // When `v` changes they refetch the heavy catalog once, as a one-shot.
  //
  // Cheap to maintain and impossible to drift downward: writers only ever
  // increment. No index needed — fetch the lone row via `.first()`.
  catalogVersion: defineTable({
    /** Monotonic counter. Any change means "refetch the catalog". */
    v: v.number(),
    /** ms epoch of the last bump — diagnostics only, never used for control flow. */
    updatedAt: v.number(),
  }),

  // ─── Fotosynthia · AI copilot summaries ──────────────────────────
  //
  // One row per conversation thread. The full message history lives in
  // browser localStorage; this table stores a short summary so admins can
  // see "what was Fotosynthia asked yesterday" without re-fetching the
  // full transcript. Closed by the Vercel function when an SSE stream
  // completes; safe to fail silently (don't block the chat).
  aiConversations: defineTable({
    /** Stable UUID per browser thread — same value the client keeps. */
    threadId: v.string(),
    /** Email of the admin who owns this thread (from AuthContext). */
    userEmail: v.string(),
    userName: v.optional(v.string()),
    /** Route Maritza was on when the conversation started. */
    routeAtStart: v.string(),
    /** Latest route — kept fresh on each summary write. */
    routeLatest: v.string(),
    /** 1-2 sentence summary regenerated by the model on each turn. */
    summary: v.string(),
    /** Number of user turns so far. */
    turnCount: v.number(),
    /** Model id actually used (so we can audit free-tier vs paid swaps). */
    model: v.string(),
    /** ISO timestamps. */
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_threadId', ['threadId'])
    .index('by_userEmail', ['userEmail']),

  /**
   * El archivo de la doble corrida (SOT-V4 Fase 1, punto 8).
   *
   * `dobleCorrida:ejecutar` devolvía su reporte y se evaporaba, así que el número
   * que tiene que sostener el dictamen sobre el modelo de precios existía sólo en
   * la terminal de quien la corrió. **Un gate cuya evidencia no queda registrada no
   * es un gate:** no se puede comparar una corrida con la siguiente, ni auditar con
   * qué datos salió cada número.
   *
   * Guarda el resumen y **sólo los ítems comparables** — los que no se pudieron
   * comparar ya están contados y agrupados por motivo en `sinComparar`, y
   * archivarlos de a uno sería volumen sin información.
   *
   * Es append-only: cada corrida es una fila, y la gracia es poder mirarlas en
   * serie. Nada la borra.
   */
  dobleCorridas: defineTable({
    ts: v.number(),
    filasHojaLeidas: v.number(),
    comparables: v.number(),
    medianaDiferenciaPct: v.number(),
    sobre5Pct: v.number(),
    sobre10Pct: v.number(),
    sinComparar: v.array(
      v.object({ motivo: v.string(), cantidad: v.number() }),
    ),
    paraRevisarInferencia: v.array(v.string()),
    /**
     * Cuántos comparables se apoyan en una categoría fiscal INFERIDA. Decide
     * cuánta fe tenerle a la mediana: una comparación construida sobre inferencias
     * mide el motor Y la inferencia a la vez. En la corrida del 2026-08-12 los
     * cuatro comparables eran inferidos.
     */
    comparablesConCategoriaInferida: v.number(),
    comparaciones: v.array(
      v.object({
        itemId: v.string(),
        precioV3COP: v.optional(v.number()),
        precioV4COP: v.optional(v.number()),
        diferenciaCOP: v.optional(v.number()),
        diferenciaPct: v.optional(v.number()),
        motivo: v.optional(v.string()),
        categoriaFiscalOrigen: v.optional(
          v.union(
            v.literal('capturada'),
            v.literal('inferida'),
            v.literal('revisada'),
          ),
        ),
        revisarInferencia: v.boolean(),
      }),
    ),
  }).index('by_ts', ['ts']),

  /**
   * El registro de cada promoción de filas del riel viejo a casillas v4.
   *
   * Existe para que la decisión sea REVERSIBLE sin adivinar. La promoción sólo toca
   * filas donde `estadoCasilla` está ausente, así que deshacerla es volver a
   * ausentarlo; lo que se guarda es lo que se ESCRIBIÓ, para que el revertidor pueda
   * negarse a pisar una casilla que alguien clasificó después.
   *
   * `fuente` dice de dónde salió el criterio — hoy, el reparto juzgado dictaminado el
   * 2026-08-12. Si ese dictamen se revisa, esta tabla dice exactamente qué revisar.
   */
  promocionesV4: defineTable({
    ts: v.number(),
    fuente: v.string(),
    aplicadas: v.array(
      v.object({
        itemId: v.string(),
        estadoCasilla: v.string(),
        costoUnitarioRealCOP: v.optional(v.number()),
      }),
    ),
    revertidaEn: v.optional(v.number()),
  }).index('by_ts', ['ts']),
});
