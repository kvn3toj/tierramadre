/**
 * Ambassadors (asesores / embajadores) — the referral + commission layer for
 * the GoHighLevel funnel. Created here (or by a future invite flow), attributed
 * to a sale at order time (ghl.createOrder, first-touch), and scored nightly by
 * the `ambassador-scoring` cron.
 */

import { query, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import {
  commissionPercentForNivel,
  type AmbassadorNivel,
} from './_lib/commission';

const nivelValidator = v.union(
  v.literal('bronce'),
  v.literal('plata'),
  v.literal('oro'),
  v.literal('diamante'),
);

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query('ambassadors').collect(),
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) =>
    ctx.db
      .query('ambassadors')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first(),
});

// internalMutation: zero app callers today (no invite flow wires this up
// yet). Was previously a public `mutation` reachable by anyone with the
// deployment URL. When the invite flow ships, add a public `action` wrapper
// here that verifies the caller via `requireAccessLevel` first, mirroring
// products.saveEdit in convex/products.ts.
export const create = internalMutation({
  args: {
    slug: v.string(),
    nombre: v.string(),
    email: v.string(),
    celular: v.optional(v.string()),
    instagramHandle: v.optional(v.string()),
    nivel: v.optional(nivelValidator),
    comisionPercent: v.optional(v.number()),
    referidoPor: v.optional(v.id('ambassadors')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('ambassadors')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();
    if (existing) throw new Error('EMAIL_EXISTS');

    const slugTaken = await ctx.db
      .query('ambassadors')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();
    if (slugTaken) throw new Error('SLUG_TAKEN');

    const nivel: AmbassadorNivel = args.nivel ?? 'bronce';
    const id = await ctx.db.insert('ambassadors', {
      slug: args.slug,
      nombre: args.nombre,
      email: args.email,
      celular: args.celular,
      instagramHandle: args.instagramHandle,
      nivel,
      comisionPercent: args.comisionPercent ?? commissionPercentForNivel(nivel),
      score: 0,
      status: 'invited' as const,
      referidoPor: args.referidoPor,
      createdAt: new Date().toISOString(),
    });
    return { id };
  },
});

/**
 * Nightly cron target. Recomputes each active ambassador's `score` from their
 * accumulated commissions. Level-up policy (bronce→plata→…) is a documented
 * follow-up; for MVP the score is the signal and the tier is set on create/invite.
 */
export const calculateScore = internalMutation({
  args: {},
  handler: async (ctx) => {
    const active = await ctx.db
      .query('ambassadors')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();

    let updated = 0;
    for (const amb of active) {
      const comms = await ctx.db
        .query('commissions')
        .withIndex('by_ambassador', (q) => q.eq('ambassadorId', amb._id))
        .collect();
      const totalCommissionCOP = comms.reduce((s, c) => s + c.amountCOP, 0);
      // 1 point per 10k COP of lifetime commission — a simple monotonic signal.
      const score = Math.round(totalCommissionCOP / 10_000);
      if (score !== amb.score) {
        await ctx.db.patch(amb._id, { score });
        updated += 1;
      }
    }
    return { updated, scanned: active.length };
  },
});
