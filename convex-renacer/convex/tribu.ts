/**
 * El Mapa de la Tribu (§6.8): ver las necesidades de otros y sumarse con "+1".
 *
 * La regla de visibilidad del §10.3 vive acá y no en la pantalla: **el texto de la
 * necesidad se muestra; la identidad de quien la pidió, solo con `donorVisibilityConsent`
 * explícito.** Ponerla en el cliente sería mandar el nombre por la red y confiar en que
 * el JSX no lo pinte. Y cuando se muestra, es solo el nombre de pila (D-0831-5).
 *
 * Desde el 31-08 cada necesidad trae su **bolsa** (`categoria`) y su **prioridad**; la
 * pantalla agrupa por bolsa. El orden de despacho sigue siendo `createdAt` (§9).
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
          categoria: n.categoria ?? null,
          prioridad: n.prioridad ?? null,
          status: n.status,
          createdAt: n.createdAt,
          supportCount: n.supportCount,
          autorNombre: puedeVerse ? (autor.name.trim().split(/\s+/)[0] ?? autor.name) : null,
        };
      }),
    );
  },
});

/**
 * El "+1". **Quién se suma NO viene en el body**: se resuelve desde la credencial del
 * carnet. Idempotente por índice compuesto: la misma persona no suma dos veces.
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
