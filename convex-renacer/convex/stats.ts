/**
 * Los contadores de la campaña (31-08: "cuántos líderes, cuántas familias inscritas").
 *
 * Un solo documento, mantenido por las mutations que cambian el mundo (registrar,
 * emitir raíz, enlistar voluntario). Leerlo cuesta **1 documento**, no un `collect()` —
 * la regla del plan gratis del CLAUDE.md. El recaudo NO vive acá: el dinero está en el
 * Convex de TM (D-0831-7) y llegará por su propio camino en Fase 3.
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { exigirTokenDeApp, exigirTokenDeOps } from './lib/guardas';

const UN_DIA = 86_400_000;

/**
 * "Cuántos días va la campaña" (pedido en la reunión del 31-08).
 *
 * Devuelve `null` mientras nadie haya fijado el arranque — y la pantalla entonces no
 * pinta el contador. **No se deriva del primer registro ni de `Date.now()`** (D-0901-3):
 * el arranque es un hecho del negocio, y un default que rellena un campo vacío es un dato
 * inventado con forma de dato; a las 24 horas ya no se distingue de uno medido.
 */
export function diasDeCampana(iniciadaEn: number | undefined): number | null {
  if (!iniciadaEn) return null;
  return Math.max(1, Math.floor((Date.now() - iniciadaEn) / UN_DIA) + 1);
}

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
      diasDeCampana: diasDeCampana(doc?.iniciadaEn),
      updatedAt: doc?.updatedAt ?? null,
    };
  },
});

/**
 * Fija el día en que arrancó la campaña. Acto de operador: es el dato que hace que el
 * contador de días exista, y nadie más que Kevin sabe cuál es.
 */
export const fijarInicio = mutation({
  args: { secret: v.string(), iniciadaEn: v.number() },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const doc = await ctx.db
      .query('stats')
      .withIndex('by_key', (q) => q.eq('key', 'campana'))
      .unique();
    if (!doc) {
      await ctx.db.insert('stats', {
        key: 'campana',
        raicesActivas: 0,
        familias: 0,
        necesidadesAbiertas: 0,
        voluntarios: 0,
        iniciadaEn: args.iniciadaEn,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(doc._id, { iniciadaEn: args.iniciadaEn, updatedAt: Date.now() });
    }
    return { iniciadaEn: args.iniciadaEn, dias: diasDeCampana(args.iniciadaEn) };
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
    const OTRAS = 'Otras necesidades';
    const bolsas = [...porBolsa.entries()]
      .map(([nombre, x]) => ({ nombre, ...x }))
      // "Otras" siempre al final: no compite con una bolsa nombrada (mismo criterio que /tribu).
      .sort((a, b) => (a.nombre === OTRAS ? 1 : b.nombre === OTRAS ? -1 : 0) || b.abiertas - a.abiertas || a.nombre.localeCompare(b.nombre, 'es'));

    const raices = await ctx.db.query('raices').withIndex('by_codigoBase').take(TABLERO_MAX);
    const comunidades = raices
      // Solo las activas: una raíz en pausa (o de prueba) no es un dato público de la campaña.
      .filter((r) => r.estado === 'activa')
      .map((r) => ({ comunidad: r.comunidad, zona: r.zona ?? null, registrados: r.registrados, cupo: r.tamano - 1, activa: true }))
      .sort((a, b) => b.registrados - a.registrados);

    const caps = await ctx.db.query('capacities').take(TABLERO_MAX);
    const porCapacidad = new Map<string, { total: number; voluntarios: number; beneficiarios: number; titulo: string }>();
    for (const c of caps) {
      if (!c.isActive) continue;
      // Normalizar: "Cocinar", "cocinar " y "Cocinar para muchos" no son tres capacidades.
      const k = c.title.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+(para|de|a|en)\s+/)[0].trim();
      const x = porCapacidad.get(k) ?? { total: 0, voluntarios: 0, beneficiarios: 0, titulo: c.title.trim() };
      x.total++;
      if (c.origen === 'voluntario') x.voluntarios++; else x.beneficiarios++;
      porCapacidad.set(k, x);
    }
    const capacidades = [...porCapacidad.values()]
      .map((x) => ({ titulo: x.titulo.charAt(0).toUpperCase() + x.titulo.slice(1), total: x.total, voluntarios: x.voluntarios, beneficiarios: x.beneficiarios }))
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
        diasDeCampana: diasDeCampana(doc?.iniciadaEn),
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
