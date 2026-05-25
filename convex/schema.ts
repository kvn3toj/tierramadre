import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Shared envelope for tables that mirror a Google Sheets tab.
// Fotosíntesis v2: providers/lots/clients/sales reuse the same sync
// metadata pattern that productInventory established.
const syncFields = {
  rowIndex: v.number(),
  lastPulledAt: v.string(),
  lastPushedAt: v.optional(v.string()),
  syncStatus: v.union(
    v.literal("synced"),
    v.literal("pending"),
    v.literal("error"),
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
      v.literal("active"),
      v.literal("pending"),
      v.literal("expired"),
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
    .index("by_creatorEmail", ["creatorEmail"])
    .index("by_shortCode", ["shortCode"])
    .index("by_status", ["status"]),

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
    .index("by_itemId", ["itemId"])
    .index("by_inviterName", ["inviterName"])
    .index("by_userEmail", ["userEmail"]),

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
    precioCOP: v.optional(v.number()),
    ubicacion: v.optional(v.string()),
    asesor: v.optional(v.string()),
    // 9 values: the 4 we always handled + 5 inherited from the legacy
    // sheet's ESTADO dropdown (Retornado, ESMEREOGENESIS, ESMERO,
    // DISPONIBLE ADOPTADA, LOTE X CT). Keeps existing rows in
    // `1mghR6...!INVENTARIO Tierra.Madre` validating on pull without a
    // migration pass. Mirror in `src/data/vocabularies.ts#PRODUCT_ESTADOS`.
    estado: v.union(
      v.literal("DISPONIBLE"),
      v.literal("VENDIDA"),
      v.literal("ASESOR"),
      v.literal("Retornado"),
      v.literal("ESMEREOGENESIS"),
      v.literal("ESMERO"),
      v.literal("DISPONIBLE ADOPTADA"),
      v.literal("LOTE X CT"),
      v.literal(""),
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
    preponderancia: v.optional(v.number()),
    costoBaseCOP: v.optional(v.number()),
    mostrarEnCatalogo: v.optional(v.boolean()),
    // Convex-only metadata (not synced to Sheets yet — extending the legacy
    // sheet with two new columns is its own slice). Captured at lotItems.create
    // and editable via lotItems.updateGemaFields. Surfaced in admin UI only.
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
    precioEmbajadorCOP: v.optional(v.number()),
    precioPotencialCOP: v.optional(v.number()),
    precioConscienteCOP: v.optional(v.number()),
    /** ISO timestamp of last successful pull from Sheets */
    lastPulledAt: v.string(),
    /** ISO timestamp of last successful push to Sheets (null if never edited) */
    lastPushedAt: v.optional(v.string()),
    /** "synced" = mirror matches sheet | "pending" = local edit not yet written | "error" = push failed */
    syncStatus: v.union(
      v.literal("synced"),
      v.literal("pending"),
      v.literal("error"),
    ),
    /** Last sync error message (if syncStatus === "error") */
    syncError: v.optional(v.string()),
    /** Legacy hash from older sync writer — kept optional so existing docs validate. */
    fieldsHash: v.optional(v.string()),
  })
    .index("by_itemId", ["itemId"])
    .index("by_rowIndex", ["rowIndex"])
    .index("by_estado", ["estado"])
    .index("by_syncStatus", ["syncStatus"])
    .index("by_loteId", ["loteId"]),

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
      v.literal("saved"),
      v.literal("pending"),
      v.literal("failed"),
    ),
    /** Failure reason if status === "failed" */
    error: v.optional(v.string()),
  })
    .index("by_itemId", ["itemId"])
    .index("by_editor", ["editorEmail"]),

  productLocks: defineTable({
    /** Item being held open in the drawer */
    itemId: v.string(),
    /** Admin who claimed the lock */
    holderEmail: v.string(),
    holderName: v.optional(v.string()),
    /** ISO timestamp; lock auto-expires after 5 minutes */
    claimedAt: v.string(),
    expiresAt: v.string(),
  }).index("by_itemId", ["itemId"]),

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
  }).index("by_name", ["name"]),

  providers: defineTable({
    nombreORazonSocial: v.string(),
    nit: v.optional(v.string()),
    cedula: v.optional(v.string()),
    direccion: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    tipo: v.union(
      v.literal("gemas"),
      v.literal("joyas"),
      v.literal("insumos"),
      v.literal("otros"),
    ),
    notas: v.optional(v.string()),
    /**
     * Set when a rename is in flight: holds the prior natural-key value so
     * the Sheets safety check can validate column A against the OLD name
     * before overwriting it. Cleared on successful push.
     */
    pendingPreviousIdValue: v.optional(v.string()),
    ...syncFields,
  })
    .index("by_nit", ["nit"])
    .index("by_nombre", ["nombreORazonSocial"])
    .index("by_rowIndex", ["rowIndex"])
    .index("by_syncStatus", ["syncStatus"]),

  lots: defineTable({
    /**
     * "B-001"/"C-001", ... — globally unique, allocated via sequences.
     * Prefix encodes the sede (B = Bogotá, C = Cali). Pre-multisede rows
     * have a B- id; the optional `sede` field carries the same info for
     * filtering/group-by queries.
     */
    loteId: v.string(),
    /** Sede where the lot was captured. Optional for legacy rows. */
    sede: v.optional(
      v.union(v.literal("B"), v.literal("C"), v.literal("S"), v.literal("M")),
    ),
    providerId: v.id("providers"),
    fechaRecepcion: v.string(),
    renombreLote: v.optional(v.string()),
    tratamiento: v.optional(v.string()),
    mina: v.optional(v.string()),
    operadorNombre: v.optional(v.string()),
    operadorRol: v.optional(v.string()),
    pesoTotalQuilates: v.optional(v.number()),
    costoTotalCOP: v.number(),
    unidadesDeclaradas: v.number(),
    formaPago: v.union(
      v.literal("contado"),
      v.literal("credito"),
      v.literal("esmereogenesis"),
      v.literal("bajo_pedido"),
      v.literal("consignacion"),
    ),
    metodoContado: v.optional(
      v.union(v.literal("efectivo"), v.literal("transferencia")),
    ),
    fechaVencimiento: v.optional(v.string()),
    numeroCuotas: v.optional(v.number()),
    numeroFactura: v.optional(v.string()),
    urlFactura: v.optional(v.string()),
    notas: v.optional(v.string()),
    estado: v.union(
      v.literal("abierto"),
      v.literal("cerrado"),
      v.literal("publicado"),
      v.literal("cancelado"),
    ),
    ...syncFields,
  })
    .index("by_loteId", ["loteId"])
    .index("by_provider", ["providerId"])
    .index("by_estado", ["estado"])
    .index("by_rowIndex", ["rowIndex"])
    .index("by_syncStatus", ["syncStatus"]),

  /** Convex-only join between lots and productInventory. Not synced to Sheets. */
  lotItems: defineTable({
    loteId: v.string(),
    itemId: v.string(),
    preponderancia: v.number(),
    costoBaseCOP: v.number(),
    ordenEnLote: v.number(),
  })
    .index("by_loteId", ["loteId"])
    .index("by_itemId", ["itemId"]),

  clients: defineTable({
    nombre: v.string(),
    nit: v.optional(v.string()),
    cedula: v.optional(v.string()),
    direccion: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    tipo: v.union(v.literal("embajador"), v.literal("final")),
    /** Free-form id pointing to the asesores directory (when tipo = "embajador"). */
    asesorId: v.optional(v.string()),
    /** See providers.pendingPreviousIdValue — same rename-safety mechanism. */
    pendingPreviousIdValue: v.optional(v.string()),
    ...syncFields,
  })
    .index("by_nit", ["nit"])
    .index("by_email", ["email"])
    .index("by_nombre", ["nombre"])
    .index("by_rowIndex", ["rowIndex"])
    .index("by_syncStatus", ["syncStatus"]),

  sales: defineTable({
    /**
     * "VB-0001"/"VC-0001", ... — globally unique, allocated via sequences.
     * Legacy rows captured before the multisede split have a plain
     * "V-NNNN" id; the optional `sede` field carries the sede.
     */
    saleId: v.string(),
    /** Sede where the sale was recorded. Optional for legacy rows. */
    sede: v.optional(
      v.union(v.literal("B"), v.literal("C"), v.literal("S"), v.literal("M")),
    ),
    fechaVenta: v.string(),
    /** itemIds reference productInventory.itemId (string, not Convex id). */
    itemIds: v.array(v.string()),
    clientId: v.id("clients"),
    precioAcordadoCOP: v.number(),
    descuentoCOP: v.optional(v.number()),
    totalCOP: v.number(),
    comisionCOP: v.optional(v.number()),
    formaPago: v.union(
      v.literal("contado"),
      v.literal("credito"),
      v.literal("esmereogenesis"),
      v.literal("canje"),
      v.literal("bajo_pedido"),
      v.literal("consignacion"),
    ),
    metodoContado: v.optional(
      v.union(
        v.literal("efectivo"),
        v.literal("transferencia"),
        v.literal("crypto"),
      ),
    ),
    fechaVencimiento: v.optional(v.string()),
    numeroCuotas: v.optional(v.number()),
    adicionales: v.optional(v.string()),
    carnetUrl: v.optional(v.string()),
    certificadoUrl: v.optional(v.string()),
    estado: v.union(
      v.literal("reservada"),
      v.literal("confirmada"),
      v.literal("cancelada"),
    ),
    // Slice 3 · Cancellation audit trail. Populated by `sales.cancel`. Kept
    // on Convex only — Sheets sync of these fields is a follow-up that needs
    // a coordinated tab schema change (see COLUMN_MAPS.sales).
    cancelledAt: v.optional(v.string()),
    cancelledBy: v.optional(v.string()),
    cancellationReason: v.optional(v.string()),
    ...syncFields,
  })
    .index("by_saleId", ["saleId"])
    .index("by_client", ["clientId"])
    .index("by_estado", ["estado"])
    .index("by_rowIndex", ["rowIndex"])
    .index("by_syncStatus", ["syncStatus"]),

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
    estado: v.union(v.literal("activa"), v.literal("archivada")),
    createdAt: v.string(),
    ...syncFields,
  })
    .index("by_subLoteId", ["subLoteId"])
    .index("by_parentLote", ["parentLoteId"])
    .index("by_estado", ["estado"])
    .index("by_rowIndex", ["rowIndex"])
    .index("by_syncStatus", ["syncStatus"]),

  /** Materials catalog populated inline by the inventory wizard (joyas). */
  materials: defineTable({
    name: v.string(),
    type: v.optional(v.string()),
  }).index("by_name", ["name"]),

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
    .index("by_threadId", ["threadId"])
    .index("by_userEmail", ["userEmail"]),
});
