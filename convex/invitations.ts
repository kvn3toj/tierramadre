import { query, mutation, action, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { requireAccessLevel } from './_lib/authz';

/** Staff who are allowed to mint/manage guest invitations. */
const STAFF_LEVELS = ['admin', 'embajador', 'asesor'] as const;

// ─── Queries ────────────────────────────────────────────────────────

/**
 * List all invitations by creator email (active, pending, and expired).
 * Replaces: GET /api/invitations?action=list-by-creator&creatorEmail=X
 */
export const listByCreator = query({
  args: { creatorEmail: v.string() },
  handler: async (ctx, { creatorEmail }) => {
    const rows = await ctx.db
      .query('invitations')
      .withIndex('by_creatorEmail', (q) =>
        q.eq('creatorEmail', creatorEmail.toLowerCase().trim()),
      )
      .order('desc')
      .collect();
    // `creatorEmail` here is a client-supplied string, not a verified
    // session identity (queries can't call Google's tokeninfo endpoint — no
    // network access), so anyone who guesses/knows another advisor's email
    // can call this today. `guestName`/`guestContact` stay (GuestDetailPage
    // needs them for the legitimate owner), but the actual access
    // credentials — PIN and the bound device token — are stripped, so a
    // guessed email leaks contact metadata at worst, never a working guest
    // session.
    return rows.map(({ pin: _pin, boundToken: _boundToken, ...safe }) => safe);
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
    const doc = await ctx.db
      .query('invitations')
      .withIndex('by_shortCode', (q) =>
        q.eq('shortCode', shortCode.toUpperCase()),
      )
      .first();
    if (!doc) return null;
    // Never return the raw PIN or device-binding token to callers — this
    // query is public and reachable from any guest's browser. Callers that
    // only need to know whether a PIN gate exists use `isPinBound`.
    const { pin: _pin, boundToken, ...safe } = doc;
    return { ...safe, isPinBound: !!boundToken };
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
    const all = await ctx.db.query('invitations').collect();
    const matching = all.filter(
      (inv) => (inv.guestContact ?? '').toLowerCase().trim() === normalized,
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
        creatorRole: inv.creatorRole ?? 'Asesor',
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
 * Internal: the actual insert. Only reachable via the `generate` action
 * below, which verifies the caller is staff server-side first — see
 * convex/_lib/authz.ts. `creatorEmail`/`creatorName`/`creatorRole` come from
 * the verified caller, never from client-supplied args, so a guest can't
 * mint an invitation impersonating another advisor.
 */
export const _generate = internalMutation({
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
      args.guestMultiplier != null
        ? sanitizeMultiplier(args.guestMultiplier)
        : undefined;

    await ctx.db.insert('invitations', {
      invitationId,
      shortCode: args.shortCode,
      creatorEmail: args.creatorEmail.toLowerCase().trim(),
      creatorName: args.creatorName,
      creatorRole: args.creatorRole ?? 'Asesor',
      guestName: args.guestName,
      guestContact: args.guestContact,
      contactType: args.contactType,
      status: 'pending',
      createdAt: new Date().toISOString(),
      pricingMode: args.pricingMode ?? 'with_prices',
      durationHours: 24 * 30, // 30 days
      guestCurrencyMode: args.guestCurrencyMode,
      guestMultiplier: safeMultiplier,
      pin: args.pin,
    });

    return {
      invitationId,
      shortCode: args.shortCode,
      pin: args.pin,
      creatorEmail: args.creatorEmail.toLowerCase().trim(),
      creatorName: args.creatorName,
      creatorRole: args.creatorRole ?? 'Asesor',
      pricingMode: args.pricingMode ?? 'with_prices',
      guestCurrencyMode: args.guestCurrencyMode ?? null,
      guestMultiplier: safeMultiplier ?? null,
    };
  },
});

/**
 * Create a new invitation.
 * Replaces: POST /api/invitations?action=generate
 */
export const generate = action({
  args: {
    idToken: v.string(),
    pricingMode: v.optional(v.string()),
    guestName: v.optional(v.string()),
    guestContact: v.optional(v.string()),
    contactType: v.optional(v.string()),
    guestCurrencyMode: v.optional(v.string()),
    guestMultiplier: v.optional(v.float64()),
    pin: v.string(),
    shortCode: v.string(),
  },
  handler: async (
    ctx,
    { idToken, ...args },
  ): Promise<{
    invitationId: string;
    shortCode: string;
    pin: string;
    creatorEmail: string;
    creatorName: string;
    creatorRole: string;
    pricingMode: string;
    guestCurrencyMode: string | null;
    guestMultiplier: number | null;
  }> => {
    const caller = await requireAccessLevel(idToken, [...STAFF_LEVELS]);
    return await ctx.runMutation(internal.invitations._generate, {
      ...args,
      creatorEmail: caller.email,
      creatorName: caller.rosterName ?? caller.name ?? caller.email,
      creatorRole: caller.rosterRole ?? caller.accessLevel,
    });
  },
});

/**
 * Internal: the actual patch. Only reachable via the `updateMultiplier`
 * action below, which verifies the caller server-side first. `creatorEmail`
 * is the VERIFIED caller (from the token), never a client-supplied string —
 * ownership can no longer be spoofed by guessing another advisor's email.
 */
export const _updateMultiplier = internalMutation({
  args: {
    shortCode: v.string(),
    creatorEmail: v.string(),
    isAdmin: v.boolean(),
    guestMultiplier: v.float64(),
  },
  handler: async (
    ctx,
    { shortCode, creatorEmail, isAdmin, guestMultiplier },
  ) => {
    const invitation = await ctx.db
      .query('invitations')
      .withIndex('by_shortCode', (q) => q.eq('shortCode', shortCode))
      .first();
    if (!invitation) throw new Error('Invitacion no encontrada');
    if (!isAdmin && invitation.creatorEmail.toLowerCase() !== creatorEmail) {
      throw new Error('No tienes permiso para editar esta invitacion');
    }
    if (invitation.status !== 'active' && invitation.status !== 'pending') {
      throw new Error(
        'Solo se pueden editar invitaciones activas o pendientes',
      );
    }
    const safe = sanitizeMultiplier(guestMultiplier);
    await ctx.db.patch(invitation._id, { guestMultiplier: safe });
    return { shortCode, guestMultiplier: safe };
  },
});

/**
 * Update the guest multiplier for an invitation.
 * Replaces: POST /api/invitations?action=update
 */
export const updateMultiplier = action({
  args: {
    idToken: v.string(),
    shortCode: v.string(),
    guestMultiplier: v.float64(),
  },
  handler: async (
    ctx,
    { idToken, shortCode, guestMultiplier },
  ): Promise<{ shortCode: string; guestMultiplier: number }> => {
    const caller = await requireAccessLevel(idToken, [...STAFF_LEVELS]);
    return await ctx.runMutation(internal.invitations._updateMultiplier, {
      shortCode,
      creatorEmail: caller.email,
      isAdmin: caller.accessLevel === 'admin',
      guestMultiplier,
    });
  },
});

/**
 * Internal: the actual revoke. Only reachable via the `expire` action below.
 */
export const _expire = internalMutation({
  args: {
    shortCode: v.string(),
    creatorEmail: v.string(),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, { shortCode, creatorEmail, isAdmin }) => {
    const invitation = await ctx.db
      .query('invitations')
      .withIndex('by_shortCode', (q) => q.eq('shortCode', shortCode))
      .first();
    if (!invitation) throw new Error('Invitacion no encontrada');
    if (!isAdmin && invitation.creatorEmail.toLowerCase() !== creatorEmail) {
      throw new Error('No tienes permiso para expirar esta invitacion');
    }
    if (invitation.status === 'expired') return { success: true };
    if (invitation.status !== 'active' && invitation.status !== 'pending') {
      throw new Error(
        'Solo se pueden expirar invitaciones activas o pendientes',
      );
    }
    await ctx.db.patch(invitation._id, {
      status: 'expired' as const,
      expiresAt: new Date().toISOString(),
    });
    return { success: true };
  },
});

/**
 * Expire/revoke an invitation.
 * Replaces: POST /api/invitations?action=expire
 */
export const expire = action({
  args: { idToken: v.string(), shortCode: v.string() },
  handler: async (
    ctx,
    { idToken, shortCode },
  ): Promise<{ success: boolean }> => {
    const caller = await requireAccessLevel(idToken, [...STAFF_LEVELS]);
    return await ctx.runMutation(internal.invitations._expire, {
      shortCode,
      creatorEmail: caller.email,
      isAdmin: caller.accessLevel === 'admin',
    });
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
      .query('invitations')
      .withIndex('by_shortCode', (q) => q.eq('shortCode', shortCode))
      .first();
    if (!invitation || invitation.status !== 'pending') return null;
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + invitation.durationHours * 60 * 60 * 1000,
    );
    await ctx.db.patch(invitation._id, {
      status: 'active' as const,
      activatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
    // Same rationale as getByShortCode: this mutation is public, so strip
    // the raw PIN/device-binding token before returning.
    const { pin: _pin, boundToken, ...safe } = invitation;
    return {
      ...safe,
      status: 'active' as const,
      activatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isPinBound: !!boundToken,
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
  handler: async (
    ctx,
    { invitationId, guestName, guestContact, contactType },
  ) => {
    const invitation = await ctx.db
      .query('invitations')
      .filter((q) => q.eq(q.field('invitationId'), invitationId))
      .first();
    if (!invitation) throw new Error('Invitacion no encontrada');
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
      .query('invitations')
      .withIndex('by_shortCode', (q) => q.eq('shortCode', shortCode))
      .first();
    if (!invitation) {
      return { success: false, error: 'Invitacion no encontrada' };
    }
    if (!invitation.pin || invitation.pin !== String(pin)) {
      return { success: true, isPinWrong: true, error: 'PIN incorrecto' };
    }
    if (invitation.boundToken) {
      if (!deviceToken || deviceToken !== invitation.boundToken) {
        return {
          success: true,
          isIpBlocked: true,
          error: 'Acceso restringido a otro dispositivo',
        };
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
 *
 * internalMutation: zero app callers (only scripts/normalize-inviter-names.ts,
 * a one-off dev script). If it needs to run again, invoke it via
 * `npx convex run invitations:_normalizeCreatorName '{...}'` with a deploy
 * key — it is intentionally unreachable from any public client.
 */
export const _normalizeCreatorName = internalMutation({
  args: { oldName: v.string(), newName: v.string() },
  handler: async (ctx, { oldName, newName }) => {
    const all = await ctx.db.query('invitations').collect();
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
 *
 * internalMutation: zero app callers (only scripts/migrate-sheets-to-convex.ts,
 * a one-off dev script). Previously a public `mutation` — the underscore
 * prefix was cosmetic and it was directly callable by anyone with the
 * deployment URL, letting an attacker mint an arbitrary 'active' invitation
 * with no PIN. If the migration script needs to run again, invoke it via
 * `npx convex run invitations:_migrateInsert '{...}'` with a deploy key.
 */
export const _migrateInsert = internalMutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('invitations', args);
    return { success: true, invitationId: args.invitationId };
  },
});
