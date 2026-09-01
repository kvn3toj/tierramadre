/**
 * Las raíces: los líderes comunitarios que invitan (pivote 2026-08-31).
 *
 * Cada raíz recibe un bloque de códigos numéricos y los reparte uno por persona. La
 * resolución de un código —"¿de qué raíz viene?"— es lo único público; emitir, listar y
 * cambiar de estado son actos de operador (ops-token).
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { exigirTokenDeApp, exigirTokenDeOps } from './lib/guardas';
import { bloqueValido, bloquesSeSolapan, codigoEnBloque, esCodigoDeRaiz } from './lib/codigos';
import { estadoRaiz } from './schema';

/** Cota de lectura para `listar`: las raíces se cuentan en decenas, no en miles. */
const RAICES_MAX = 500;

export const emitir = mutation({
  args: {
    secret: v.string(),
    codigoBase: v.number(),
    tamano: v.number(),
    nombre: v.string(),
    comunidad: v.string(),
    zona: v.optional(v.string()),
    contacto: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const bloque = { codigoBase: args.codigoBase, tamano: args.tamano };
    if (!bloqueValido(bloque)) {
      throw new Error('Bloque inválido: base ≥ 100, tamaño ≥ 2, y base + tamaño − 1 ≤ 9999.');
    }

    // Idempotente por base: repetir la emisión de la misma raíz no crea otra.
    const existente = await ctx.db
      .query('raices')
      .withIndex('by_codigoBase', (q) => q.eq('codigoBase', args.codigoBase))
      .unique();
    if (existente) return { raizId: existente._id, codigoBase: existente.codigoBase, yaExistia: true };

    const todas = await ctx.db.query('raices').withIndex('by_codigoBase').take(RAICES_MAX);
    const choque = todas.find((r) => bloquesSeSolapan(r, bloque));
    if (choque) {
      throw new Error(
        `El bloque ${bloque.codigoBase}–${bloque.codigoBase + bloque.tamano - 1} se solapa con ` +
          `la raíz "${choque.nombre}" (${choque.codigoBase}–${choque.codigoBase + choque.tamano - 1}).`,
      );
    }

    const raizId = await ctx.db.insert('raices', {
      codigoBase: args.codigoBase,
      tamano: args.tamano,
      nombre: args.nombre,
      comunidad: args.comunidad,
      zona: args.zona,
      contacto: args.contacto,
      estado: 'activa',
      registrados: 0,
      createdAt: Date.now(),
    });
    return { raizId, codigoBase: args.codigoBase, yaExistia: false };
  },
});

export const listar = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const filas = await ctx.db.query('raices').withIndex('by_codigoBase').take(RAICES_MAX);
    return filas.map((r) => ({
      id: r._id,
      codigoBase: r.codigoBase,
      tamano: r.tamano,
      nombre: r.nombre,
      comunidad: r.comunidad,
      zona: r.zona,
      estado: r.estado,
      registrados: r.registrados,
    }));
  },
});

export const marcarEstado = mutation({
  args: { secret: v.string(), codigoBase: v.number(), estado: estadoRaiz },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const raiz = await ctx.db
      .query('raices')
      .withIndex('by_codigoBase', (q) => q.eq('codigoBase', args.codigoBase))
      .unique();
    if (!raiz) throw new Error(`No existe la raíz ${args.codigoBase}.`);
    await ctx.db.patch(raiz._id, { estado: args.estado });
    return { codigoBase: raiz.codigoBase, estado: args.estado };
  },
});

/**
 * Encuentra la raíz cuyo bloque contiene `codigo`. Una sola lectura por índice: la raíz
 * con la mayor base ≤ código es la única candidata (los bloques no se solapan).
 */
export async function raizDeCodigo(ctx: { db: any }, codigo: number) {
  const candidata = await ctx.db
    .query('raices')
    .withIndex('by_codigoBase', (q: any) => q.lte('codigoBase', codigo))
    .order('desc')
    .first();
  if (!candidata) return null;
  if (codigoEnBloque(candidata, codigo) || esCodigoDeRaiz(candidata, codigo)) return candidata;
  return null;
}

/**
 * Resuelve un código para la pantalla del beneficiario. **Lo mínimo**: el código es
 * adivinable por diseño, así que lo que salga de acá queda expuesto a quien teclee un
 * número al azar. Nombre y comunidad de la raíz sí (es lo que la persona necesita para
 * reconocer "me invitó Pablo, de Casamangles"); contacto y conteos, nunca.
 */
export const resolverCodigo = query({
  args: { codigo: v.number(), secret: v.string() },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);

    const raiz = await raizDeCodigo(ctx, args.codigo);
    if (raiz) {
      if (esCodigoDeRaiz(raiz, args.codigo)) {
        // El código de la raíz misma no se reparte: identifica al líder, no a un invitado.
        return { existe: false as const, motivo: 'es_raiz' as const };
      }
      const usado = await ctx.db
        .query('beneficiaries')
        .withIndex('by_codigo', (q) => q.eq('codigo', args.codigo))
        .first();
      return {
        existe: true as const,
        origen: 'raiz' as const,
        raiz: { nombre: raiz.nombre, comunidad: raiz.comunidad },
        activa: raiz.estado === 'activa',
        usado: usado !== null,
      };
    }

    const kit = await ctx.db
      .query('kits')
      .withIndex('by_code', (q) => q.eq('code', args.codigo))
      .unique();
    if (kit) {
      return { existe: true as const, origen: 'kit' as const, activa: true, usado: false };
    }

    return { existe: false as const, motivo: 'no_existe' as const };
  },
});
