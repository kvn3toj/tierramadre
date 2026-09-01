/**
 * Los contadores de la campaña (31-08: "cuántos líderes, cuántas familias inscritas").
 *
 * Un solo documento, mantenido por las mutations que cambian el mundo (registrar,
 * emitir raíz, enlistar voluntario). Leerlo cuesta **1 documento**, no un `collect()` —
 * la regla del plan gratis del CLAUDE.md. El recaudo NO vive acá: el dinero está en el
 * Convex de TM (D-0831-7) y llegará por su propio camino en Fase 3.
 */

import { query } from './_generated/server';
import { v } from 'convex/values';
import { exigirTokenDeApp } from './lib/guardas';

export type CampoStat = 'raicesActivas' | 'familias' | 'necesidadesAbiertas' | 'voluntarios';

export async function sumarStat(ctx: { db: any }, campo: CampoStat, delta: number) {
  const doc = await ctx.db
    .query('stats')
    .withIndex('by_key', (q: any) => q.eq('key', 'campana'))
    .unique();
  if (!doc) {
    await ctx.db.insert('stats', {
      key: 'campana',
      raicesActivas: 0,
      familias: 0,
      necesidadesAbiertas: 0,
      voluntarios: 0,
      updatedAt: Date.now(),
      [campo]: Math.max(0, delta),
    });
    return;
  }
  await ctx.db.patch(doc._id, { [campo]: Math.max(0, doc[campo] + delta), updatedAt: Date.now() });
}

export const leer = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);
    const doc = await ctx.db
      .query('stats')
      .withIndex('by_key', (q) => q.eq('key', 'campana'))
      .unique();
    return {
      raicesActivas: doc?.raicesActivas ?? 0,
      familias: doc?.familias ?? 0,
      necesidadesAbiertas: doc?.necesidadesAbiertas ?? 0,
      voluntarios: doc?.voluntarios ?? 0,
      updatedAt: doc?.updatedAt ?? null,
    };
  },
});
