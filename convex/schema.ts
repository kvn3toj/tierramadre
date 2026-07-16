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
    talla: v.optional(v.string()),
    medidas: v.optional(v.string()),
    medidasValores: v.optional(v.string()),
    categoria: v.optional(v.string()),
    // ── Price block — grouped to mirror the SOT "Inventario" tab layout
    // (Sheets columns L–N). costoBaseCOP = lot.costoTotalCOP × preponderancia%;
    // the embajador/consciente tiers are the x1–x4 prices.
    // APP-ONLY (audit 2026-05-29): `precioCOP` lost its Sheets column ("Precio
    // COP" / former column L, ~82% empty). It is still written by the capture
    // UI and read by the patrones analytics, but is NO LONGER mirrored to or
    // pulled from the SOT sheet. Kept optional for existing docs.
    precioCOP: v.optional(v.number()),
    costoBaseCOP: v.optional(v.number()), // L
    precioEmbajadorCOP: v.optional(v.number()), // M
    // DEPRECATED (audit F4): no Sheets column, no UI writer, never pushed or
    // pulled. The create + updateGemaFields write surfaces were removed; the
    // field is retained (optional) ONLY so any pre-existing docs validate.
    // Do not write to it — remove via a data migration if ever cleaned up.
    precioPotencialCOP: v.optional(v.number()),
    precioConscienteCOP: v.optional(v.number()), // N
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
    // Captured at lotItems.create, editable via lotItems.updateGemaFields, and
    // synced to the SOT "Inventario" tab (target="fotosintesis") through the
    // extended layout in api/_lib/fotosintesis-inventory-columns.js.
    procedencia: v.optional(v.string()),
    observacion: v.optional(v.string()),
    // Bruto (rough/unworked parcel) metadata — populated only for tipo "bruto"
    // lotItems. `cantidadEstimada` is a rough piece-count; `rendimientoEsperado`
    // is the % yield Maritza expects after sorting. Both informational only;
    // costoBaseCOP still derives from lot.costoTotalCOP × preponderancia.
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
    ),
    // Catalog grouping (Convex-only, NOT synced to Sheets — see COLUMN_MAPS.lots).
    // When `mostrarComoLote` is true and the lot is `publicado`, the customer
    // catalog shows the whole lote as ONE grouped card (hero photo + total
    // price + per-item gallery) instead of one card per item.
    fotoLoteUrl: v.optional(v.string()),
    mostrarComoLote: v.optional(v.boolean()),
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
    // Catalog grouping (Convex-only, NOT synced to Sheets — see COLUMN_MAPS.subLotes).
    // When `mostrarComoLote` is true and the sublote is `activa`, the customer
    // catalog shows this curated subset as ONE grouped card.
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
});
