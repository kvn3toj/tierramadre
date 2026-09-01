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

/** Cota de lectura del tablero: la campaña se cuenta en cientos, no en miles. */
const TABLERO_MAX = 500;

/**
 * El tablero público de la campaña (31-08: "que se vea la data recolectada").
 *
 * Todo agregado, nada personal: conteos por bolsa, avance por comunidad, capacidades más
 * ofrecidas y los últimos pedidos sin nombre. Lecturas acotadas con `take` sobre índice;
 * si la campaña crece más allá de la cota, el agregado pasa a mantenerse incremental como
 * `stats` — no se sube la cota.
 */
export const tablero = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);

    const needs = await ctx.db.query('needs').withIndex('by_createdAt').order('desc').take(TABLERO_MAX);
    const porBolsa = new Map<string, { abiertas: number; resueltas: number; apoyos: number }>();
    for (const n of needs) {
      const k = n.categoria ?? 'Otras necesidades';
      const b = porBolsa.get(k) ?? { abiertas: 0, resueltas: 0, apoyos: 0 };
      if (n.status === 'open') b.abiertas++; else b.resueltas++;
      b.apoyos += n.supportCount;
      porBolsa.set(k, b);
    }
    const bolsas = [...porBolsa.entries()]
      .map(([nombre, x]) => ({ nombre, ...x }))
      .sort((a, b) => b.abiertas - a.abiertas || a.nombre.localeCompare(b.nombre, 'es'));

    const raices = await ctx.db.query('raices').withIndex('by_codigoBase').take(TABLERO_MAX);
    const comunidades = raices
      .filter((r) => r.estado !== 'cerrada')
      .map((r) => ({ comunidad: r.comunidad, zona: r.zona ?? null, registrados: r.registrados, cupo: r.tamano - 1, activa: r.estado === 'activa' }))
      .sort((a, b) => b.registrados - a.registrados);

    const caps = await ctx.db.query('capacities').take(TABLERO_MAX);
    const porCapacidad = new Map<string, { total: number; voluntarios: number; beneficiarios: number }>();
    for (const c of caps) {
      if (!c.isActive) continue;
      const k = c.title.trim();
      const x = porCapacidad.get(k) ?? { total: 0, voluntarios: 0, beneficiarios: 0 };
      x.total++;
      if (c.origen === 'voluntario') x.voluntarios++; else x.beneficiarios++;
      porCapacidad.set(k, x);
    }
    const capacidades = [...porCapacidad.entries()]
      .map(([titulo, x]) => ({ titulo, ...x }))
      .sort((a, b) => b.total - a.total || a.titulo.localeCompare(b.titulo, 'es'))
      .slice(0, 8);

    // Últimos pedidos, sin nombre: el tablero es la superficie más pública de todas.
    const ultimos = needs.slice(0, 6).map((n) => ({
      whatINeed: n.whatINeed,
      categoria: n.categoria ?? null,
      createdAt: n.createdAt,
      supportCount: n.supportCount,
    }));

    const doc = await ctx.db.query('stats').withIndex('by_key', (q) => q.eq('key', 'campana')).unique();

    return {
      totales: {
        familias: doc?.familias ?? 0,
        necesidadesAbiertas: doc?.necesidadesAbiertas ?? 0,
        raicesActivas: doc?.raicesActivas ?? 0,
        voluntarios: doc?.voluntarios ?? 0,
      },
      bolsas,
      comunidades,
      capacidades,
      ultimos,
      truncado: needs.length >= TABLERO_MAX || caps.length >= TABLERO_MAX,
      updatedAt: Date.now(),
    };
  },
});
