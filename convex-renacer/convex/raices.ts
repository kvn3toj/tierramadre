/**
 * Las raíces: los líderes comunitarios que invitan (pivote 2026-08-31).
 *
 * Cada raíz recibe un bloque de códigos numéricos y los reparte uno por persona. La
 * resolución de un código —"¿de qué raíz viene?"— es lo único público; emitir, listar y
 * cambiar de estado son actos de operador (ops-token).
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import {
  exigirTokenDeApp,
  exigirTokenDeOps,
  nuevoTokenOpaco,
  tokenCoincide,
} from './lib/guardas';
import {
  bloqueValido,
  bloquesSeSolapan,
  codigoEnBloque,
  codigosRepartibles,
  esCodigoDeRaiz,
  proximoLibre,
} from './lib/codigos';
import { estadoRaiz } from './schema';
import { sumarStat } from './stats';

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
    if (existente) {
      // Una raíz emitida antes del 2026-09-01 no tiene panel. Repetir `emitir` se lo
      // acuña — es la vía de migración, y por eso el token va en la respuesta: el
      // operador no puede leerlo de ningún otro lado después.
      let panelToken = existente.panelToken;
      if (!panelToken) {
        panelToken = nuevoTokenOpaco();
        await ctx.db.patch(existente._id, { panelToken });
      }
      return {
        raizId: existente._id,
        codigoBase: existente.codigoBase,
        panelToken,
        yaExistia: true,
      };
    }

    const todas = await ctx.db.query('raices').withIndex('by_codigoBase').take(RAICES_MAX);
    const choque = todas.find((r) => bloquesSeSolapan(r, bloque));
    if (choque) {
      throw new Error(
        `El bloque ${bloque.codigoBase}–${bloque.codigoBase + bloque.tamano - 1} se solapa con ` +
          `la raíz "${choque.nombre}" (${choque.codigoBase}–${choque.codigoBase + choque.tamano - 1}).`,
      );
    }

    const panelToken = nuevoTokenOpaco();
    const raizId = await ctx.db.insert('raices', {
      codigoBase: args.codigoBase,
      tamano: args.tamano,
      nombre: args.nombre,
      comunidad: args.comunidad,
      zona: args.zona,
      contacto: args.contacto,
      estado: 'activa',
      registrados: 0,
      panelToken,
      createdAt: Date.now(),
    });
    await sumarStat(ctx, 'raicesActivas', 1);
    // El token se devuelve acá y no se vuelve a servir: es lo que el operador le pasa a
    // la raíz, una vez, como el enlace de su panel.
    return { raizId, codigoBase: args.codigoBase, panelToken, yaExistia: false };
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
    const eraActiva = raiz.estado === 'activa';
    const seraActiva = args.estado === 'activa';
    if (eraActiva !== seraActiva) await sumarStat(ctx, 'raicesActivas', seraActiva ? 1 : -1);
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

/**
 * El panel de la raíz (2026-09-01) — la superficie que la reunión del 31-08 pidió primero
 * y que no existía.
 *
 * «Sol me habilita a mí las invitaciones y yo decido a quién le habilito el código.» Eso
 * es esto: la raíz ve su bloque, cuáles códigos ya se usaron, cuál sigue libre, y se lleva
 * el mensaje listo para pasárselo a la persona. Hasta hoy repartir un código dependía de
 * que un operador leyera Convex por ella (D-0831-13 nombra al humano; nadie había hecho la
 * pantalla).
 *
 * **Exige `panelToken`.** `codigoBase` es dictable por teléfono y por lo tanto adivinable;
 * esta query lee. Es el mismo argumento del carnet (D-1), aplicado a la otra punta.
 *
 * **Qué NO devuelve, y por qué:** el nombre de quien se registró sale solo con
 * `donorVisibilityConsent` (D-0831-5 · §10.3), igual que en la tribu y en el muro. La raíz
 * no necesita el nombre para hacer su trabajo —`usado: true` ya le impide repartir el
 * mismo código dos veces— y un token que se filtra no puede convertirse en la lista de
 * damnificados de una comunidad. Tampoco salen necesidades, ubicación ni teléfono.
 */
export const panel = query({
  args: { secret: v.string(), codigoBase: v.number(), token: v.string() },
  handler: async (ctx, args) => {
    exigirTokenDeApp(args.secret);

    const raiz = await ctx.db
      .query('raices')
      .withIndex('by_codigoBase', (q) => q.eq('codigoBase', args.codigoBase))
      .unique();

    // Misma respuesta para "no existe", "sin panel" y "token equivocado": distinguirlas
    // le confirmaría a quien tantea qué bloques están emitidos.
    if (!raiz || !tokenCoincide(raiz.panelToken, args.token)) return null;

    // Cota natural: los invitados de una raíz nunca pasan de `tamano - 1`.
    const invitados = await ctx.db
      .query('beneficiaries')
      .withIndex('by_raiz', (q) => q.eq('raizId', raiz._id))
      .take(raiz.tamano);

    const porCodigo = new Map(
      invitados.filter((b) => b.codigo !== undefined).map((b) => [b.codigo as number, b]),
    );

    // `codigosRepartibles` / `proximoLibre` viven en `lib/codigos.ts` y están bajo test
    // (`tests/renacerPanelRaiz.test.ts`): la regla de qué es repartible la comparte esta
    // pantalla con el resolvedor de códigos, en vez de repetirla acá.
    const codigos = codigosRepartibles(raiz).map((c) => {
      const quien = porCodigo.get(c);
      return {
        codigo: c,
        usado: quien !== undefined,
        // Nombre de pila SOLO con consentimiento; si no, la fila dice "usado" y nada más.
        nombre:
          quien && quien.donorVisibilityConsent
            ? (quien.name.trim().split(/\s+/)[0] ?? quien.name)
            : null,
      };
    });

    return {
      nombre: raiz.nombre,
      comunidad: raiz.comunidad,
      zona: raiz.zona ?? null,
      estado: raiz.estado,
      codigoBase: raiz.codigoBase,
      desde: raiz.codigoBase + 1,
      hasta: raiz.codigoBase + raiz.tamano - 1,
      cupo: raiz.tamano - 1,
      usados: codigos.filter((c) => c.usado).length,
      // El siguiente código libre del bloque. `null` = cupo agotado: hay que pedir más.
      proximoCodigo: proximoLibre(raiz, new Set(porCodigo.keys())),
      codigos,
    };
  },
});
