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
import { exigirTokenDeApp, resolverBeneficiario } from './lib/guardas';

export const necesidades = query({
  args: { limite: v.optional(v.number()), secret: v.string() },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);
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

/**
 * El "+1".
 *
 * **Quién se suma NO viene en el body.** Recibir un `beneficiaryId` es recibir una
 * afirmación del cliente, no una identidad: cualquiera podría inflar el apoyo de una
 * necesidad en nombre de otro — y `supportCount` alimenta cómo operaciones prioriza.
 * Se resuelve desde la credencial del carnet.
 *
 * Idempotente por índice compuesto: la misma persona no suma dos veces.
 */
export const sumarse = mutation({
  args: {
    secret: v.string(),
    needId: v.id('needs'),
    cardNumber: v.number(),
    cardToken: v.string(),
  },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);
    const yo = await resolverBeneficiario(ctx, args.cardNumber, args.cardToken);

    const yaEstaba = await ctx.db
      .query('needSupports')
      .withIndex('by_need_and_beneficiary', (q) =>
        q.eq('needId', args.needId).eq('beneficiaryId', yo._id),
      )
      .unique();

    const need = await ctx.db.get(args.needId);
    if (!need) throw new Error('Esa necesidad no existe.');

    if (yaEstaba) return { supportCount: need.supportCount, yaEstaba: true };

    await ctx.db.insert('needSupports', {
      needId: args.needId,
      beneficiaryId: yo._id,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.needId, { supportCount: need.supportCount + 1 });

    return { supportCount: need.supportCount + 1, yaEstaba: false };
  },
});
