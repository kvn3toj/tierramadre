/**
 * El Mapa de la Tribu (§6.8): ver las necesidades de otros y sumarse con "+1".
 *
 * La regla de visibilidad del §10.3 vive acá y no en la pantalla: **el texto de la
 * necesidad se muestra; la identidad de quien la pidió, solo con `donorVisibilityConsent`
 * explícito.** Ponerla en el cliente sería mandar el nombre por la red y confiar en que
 * el JSX no lo pinte.
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const necesidades = query({
  args: { limite: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const filas = await ctx.db
      .query('needs')
      .withIndex('by_createdAt')
      .order('desc')
      .take(args.limite ?? 50);

    return Promise.all(
      filas.map(async (n) => {
        const autor = await ctx.db.get(n.reporterId);
        // Fail-closed: si el registro no existe o no consintió, no hay nombre. Nunca `!== false`.
        const puedeVerse = autor?.donorVisibilityConsent === true;

        return {
          id: n._id,
          whatINeed: n.whatINeed,
          whyItMatters: n.whyItMatters,
          status: n.status,
          createdAt: n.createdAt,
          supportCount: n.supportCount,
          autorNombre: puedeVerse ? autor.name : null,
        };
      }),
    );
  },
});

/** El "+1". Idempotente por índice compuesto: la misma persona no suma dos veces. */
export const sumarse = mutation({
  args: { needId: v.id('needs'), beneficiaryId: v.id('beneficiaries') },
  handler: async (ctx, args) => {
    const yaEstaba = await ctx.db
      .query('needSupports')
      .withIndex('by_need_and_beneficiary', (q) =>
        q.eq('needId', args.needId).eq('beneficiaryId', args.beneficiaryId),
      )
      .unique();

    if (yaEstaba) {
      const need = await ctx.db.get(args.needId);
      return { supportCount: need?.supportCount ?? 0, yaEstaba: true };
    }

    const need = await ctx.db.get(args.needId);
    if (!need) throw new Error('Esa necesidad no existe.');

    await ctx.db.insert('needSupports', {
      needId: args.needId,
      beneficiaryId: args.beneficiaryId,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.needId, { supportCount: need.supportCount + 1 });

    return { supportCount: need.supportCount + 1, yaEstaba: false };
  },
});
