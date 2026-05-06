import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
      v.literal("expired")
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
    peso: v.optional(v.string()),                  // string because of "Plata" / "Oro 18k"
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
    estado: v.union(
      v.literal("DISPONIBLE"),
      v.literal("VENDIDA"),
      v.literal("ASESOR"),
      v.literal("")
    ),
    qr: v.optional(v.string()),
    coleccion: v.optional(v.string()),
    caja: v.optional(v.string()),
    asesorActual: v.optional(v.string()),
    estadoAsesor: v.optional(v.string()),

    // Sync metadata
    /** ISO timestamp of last successful pull from Sheets */
    lastPulledAt: v.string(),
    /** ISO timestamp of last successful push to Sheets (null if never edited) */
    lastPushedAt: v.optional(v.string()),
    /** "synced" = mirror matches sheet | "pending" = local edit not yet written | "error" = push failed */
    syncStatus: v.union(
      v.literal("synced"),
      v.literal("pending"),
      v.literal("error")
    ),
    /** Last sync error message (if syncStatus === "error") */
    syncError: v.optional(v.string()),
  })
    .index("by_itemId", ["itemId"])
    .index("by_rowIndex", ["rowIndex"])
    .index("by_estado", ["estado"])
    .index("by_syncStatus", ["syncStatus"]),

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
      })
    ),
    /** "saved" once Sheets push succeeded, "pending" before */
    status: v.union(v.literal("saved"), v.literal("pending"), v.literal("failed")),
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
});
