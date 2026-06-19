import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ────────────────────────────────────────────────────────

/**
 * List all invitations by creator email (active, pending, and expired).
 * Replaces: GET /api/invitations?action=list-by-creator&creatorEmail=X
 */
export const listByCreator = query({
  args: { creatorEmail: v.string() },
  handler: async (ctx, { creatorEmail }) => {
    return await ctx.db
      .query("invitations")
      .withIndex("by_creatorEmail", (q) =>
        q.eq("creatorEmail", creatorEmail.toLowerCase().trim())
      )
      .order("desc")
      .collect();
  },
});

/**
 * Get a single invitation by shortCode.
 * Replaces: findInvitationByCode() in api/invitations.ts
 * Also used by CurrencyContext for live multiplier sync.
 */
export const getByShortCode = query({
  args: { shortCode: v.string() },
  handler: async (ctx, { shortCode }) => {
    return await ctx.db
      .query("invitations")
      .withIndex("by_shortCode", (q) =>
        q.eq("shortCode", shortCode.toUpperCase())
      )
      .first();
  },
});

/**
 * Check if a guest contact has previous invitations.
 * Replaces: GET /api/invitations?action=check-guest&guestContact=X
 */
export const checkGuestHistory = query({
  args: { guestContact: v.string() },
  handler: async (ctx, { guestContact }) => {
    const normalized = guestContact.toLowerCase().trim();
    const all = await ctx.db.query("invitations").collect();
    const matching = all.filter(
      (inv) => (inv.guestContact ?? "").toLowerCase().trim() === normalized
    );
    const uniqueCreators = new Set(matching.map((inv) => inv.creatorEmail));
    return {
      hasMultipleInviters: uniqueCreators.size > 1,
      totalInvitations: matching.length,
      uniqueCreators: uniqueCreators.size,
      invitations: matching.map((inv) => ({
        invitationId: inv.invitationId,
        creatorName: inv.creatorName,
        creatorEmail: inv.creatorEmail,
        creatorRole: inv.creatorRole ?? "Asesor",
        createdAt: inv.createdAt,
        status: inv.status,
      })),
    };
  },
});

// ─── Helpers ────────────────────────────────────────────────────────

/** Clamp and round multiplier to 0.1 steps within [1.0, 4.0] */
function sanitizeMultiplier(value: number): number {
  const clamped = Math.min(4.0, Math.max(1.0, value));
  return Math.round(clamped * 10) / 10;
}

// ─── Mutations ──────────────────────────────────────────────────────

/**
 * Create a new invitation.
 * Replaces: POST /api/invitations?action=generate
 */
export const generate = mutation({
  args: {
    creatorEmail: v.string(),
    creatorName: v.string(),
    creatorRole: v.optional(v.string()),
    pricingMode: v.optional(v.string()),
    guestName: v.optional(v.string()),
    guestContact: v.optional(v.string()),
    contactType: v.optional(v.string()),
    guestCurrencyMode: v.optional(v.string()),
    guestMultiplier: v.optional(v.float64()),
    pin: v.string(),
    shortCode: v.string(),
  },
  handler: async (ctx, args) => {
    const invitationId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const safeMultiplier =
      args.guestMultiplier != null ? sanitizeMultiplier(args.guestMultiplier) : undefined;

    await ctx.db.insert("invitations", {
      invitationId,
      shortCode: args.shortCode,
      creatorEmail: args.creatorEmail.toLowerCase().trim(),
      creatorName: args.creatorName,
      creatorRole: args.creatorRole ?? "Asesor",
      guestName: args.guestName,
      guestContact: args.guestContact,
      contactType: args.contactType,
      status: "pending",
      createdAt: new Date().toISOString(),
      pricingMode: args.pricingMode ?? "with_prices",
      durationHours: 876000, // ~100 years, matches INVITATION_DURATION_HOURS
      guestCurrencyMode: args.guestCurrencyMode,
      guestMultiplier: safeMultiplier,
      pin: args.pin,
    });

    return { invitationId, shortCode: args.shortCode, pin: args.pin };
  },
});

/**
 * Update the guest multiplier for an invitation.
 * Replaces: POST /api/invitations?action=update
 */
export const updateMultiplier = mutation({
  args: {
    shortCode: v.string(),
    creatorEmail: v.string(),
    guestMultiplier: v.float64(),
  },
  handler: async (ctx, { shortCode, creatorEmail, guestMultiplier }) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_shortCode", (q) => q.eq("shortCode", shortCode))
      .first();
    if (!invitation) throw new Error("Invitacion no encontrada");
    if (invitation.creatorEmail.toLowerCase() !== creatorEmail.toLowerCase().trim()) {
      throw new Error("No tienes permiso para editar esta invitacion");
    }
    if (invitation.status !== "active" && invitation.status !== "pending") {
      throw new Error("Solo se pueden editar invitaciones activas o pendientes");
    }
    const safe = sanitizeMultiplier(guestMultiplier);
    await ctx.db.patch(invitation._id, { guestMultiplier: safe });
    return { shortCode, guestMultiplier: safe };
  },
});

/**
 * Expire/revoke an invitation.
 * Replaces: POST /api/invitations?action=expire
 */
export const expire = mutation({
  args: { shortCode: v.string(), creatorEmail: v.string() },
  handler: async (ctx, { shortCode, creatorEmail }) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_shortCode", (q) => q.eq("shortCode", shortCode))
      .first();
    if (!invitation) throw new Error("Invitacion no encontrada");
    if (invitation.creatorEmail.toLowerCase() !== creatorEmail.toLowerCase().trim()) {
      throw new Error("No tienes permiso para expirar esta invitacion");
    }
    if (invitation.status === "expired") return { success: true };
    if (invitation.status !== "active" && invitation.status !== "pending") {
      throw new Error("Solo se pueden expirar invitaciones activas o pendientes");
    }
    await ctx.db.patch(invitation._id, {
      status: "expired" as const,
      expiresAt: new Date().toISOString(),
    });
    return { success: true };
  },
});

/**
 * Activate a pending invitation (first visit by guest).
 * Replaces: activation logic inside validateInvitation() in api/invitations.ts
 */
export const activate = mutation({
  args: { shortCode: v.string() },
  handler: async (ctx, { shortCode }) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_shortCode", (q) => q.eq("shortCode", shortCode))
      .first();
    if (!invitation || invitation.status !== "pending") return null;
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + invitation.durationHours * 60 * 60 * 1000
    );
    await ctx.db.patch(invitation._id, {
      status: "active" as const,
      activatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
    return {
      ...invitation,
      status: "active" as const,
      activatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  },
});

/**
 * Register guest name/contact on an invitation.
 * Replaces: POST /api/invitations?action=register
 */
export const registerGuest = mutation({
  args: {
    invitationId: v.string(),
    guestName: v.string(),
    guestContact: v.optional(v.string()),
    contactType: v.optional(v.string()),
  },
  handler: async (ctx, { invitationId, guestName, guestContact, contactType }) => {
    const invitation = await ctx.db
      .query("invitations")
      .filter((q) => q.eq(q.field("invitationId"), invitationId))
      .first();
    if (!invitation) throw new Error("Invitacion no encontrada");
    await ctx.db.patch(invitation._id, {
      guestName,
      ...(guestContact != null && { guestContact }),
      ...(contactType != null && { contactType }),
    });
    return { success: true, guestName };
  },
});

/**
 * Verify PIN and bind device token.
 * Replaces: POST /api/invitations?action=verify-pin
 */
export const verifyPin = mutation({
  args: {
    shortCode: v.string(),
    pin: v.string(),
    deviceToken: v.optional(v.string()),
  },
  handler: async (ctx, { shortCode, pin, deviceToken }) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_shortCode", (q) => q.eq("shortCode", shortCode))
      .first();
    if (!invitation) {
      return { success: false, error: "Invitacion no encontrada" };
    }
    if (!invitation.pin || invitation.pin !== String(pin)) {
      return { success: true, isPinWrong: true, error: "PIN incorrecto" };
    }
    if (invitation.boundToken) {
      if (!deviceToken || deviceToken !== invitation.boundToken) {
        return { success: true, isIpBlocked: true, error: "Acceso restringido a otro dispositivo" };
      }
    }
    let tokenToReturn = deviceToken;
    if (!invitation.boundToken) {
      tokenToReturn = `tk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
      await ctx.db.patch(invitation._id, { boundToken: tokenToReturn });
    }
    return {
      success: true,
      pinVerified: true,
      deviceToken: tokenToReturn,
      guestName: invitation.guestName ?? null,
      guestContact: invitation.guestContact ?? null,
    };
  },
});

// ─── Migration-only ─────────────────────────────────────────────────

/**
 * Rename all invitations matching an old creatorName to the canonical name.
 * Migration-only — fixes historical data where creatorName was stored as the
 * Google profile name instead of the canonical Asesor name.
 */
export const _normalizeCreatorName = mutation({
  args: { oldName: v.string(), newName: v.string() },
  handler: async (ctx, { oldName, newName }) => {
    const all = await ctx.db.query("invitations").collect();
    let patched = 0;
    for (const doc of all) {
      if (doc.creatorName === oldName) {
        await ctx.db.patch(doc._id, { creatorName: newName });
        patched++;
      }
    }
    return { patched };
  },
});

/**
 * Insert an invitation with all original fields preserved (for migration).
 * NOT for production use — use generate() instead.
 */
export const _migrateInsert = mutation({
  args: {
    invitationId: v.string(),
    shortCode: v.string(),
    creatorEmail: v.string(),
    creatorName: v.string(),
    creatorRole: v.optional(v.string()),
    guestName: v.optional(v.string()),
    guestContact: v.optional(v.string()),
    contactType: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("pending"), v.literal("expired")),
    createdAt: v.string(),
    activatedAt: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    pricingMode: v.string(),
    durationHours: v.number(),
    guestCurrencyMode: v.optional(v.string()),
    guestMultiplier: v.optional(v.float64()),
    pin: v.optional(v.string()),
    boundToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("invitations", args);
    return { success: true, invitationId: args.invitationId };
  },
});
