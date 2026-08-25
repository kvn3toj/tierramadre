/**
 * La "tabla madre" del §7.3, ahora en Convex.
 *
 * Vivía en `scripts/.data/renacer-registro-codigos.json`, pero la app no puede leer un
 * JSON local en runtime y `/renacer/k/{codigo}` tiene que resolver el código para servir
 * la pantalla. Convex es la fuente de verdad; el script queda como CLI de operador y
 * escribe por acá (decisión D-3 del plan).
 *
 * Las guardas de la compuerta §3.4 · G-A.2, hechas cumplir por código:
 *  - secuencial desde 101, techo 9999, **sin huecos y sin reutilizar**;
 *  - `manillasTotal` DERIVADO de `tipo`, nunca tomado del argumento;
 *  - una venta, un código: `saleId` duplicado aborta.
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { kitTipo, producto } from './schema';

/** Compuerta §3.4 · G-A.2 — ratificada 2026-08-25. No cambiar sin una compuerta nueva. */
const CODIGO_INICIAL = 101;
const CODIGO_TECHO = 9999;

/** Decisión ratificada #4: 4 kits fijos. El total incluye la manilla propia del aportador. */
const MANILLAS_POR_KIT = { '1+1': 2, '1+5': 6, '1+10': 11, '1+100': 101 } as const;

/**
 * Lee-incrementa-escribe sobre `sequences`. Es seguro ante concurrencia porque las
 * mutations de Convex son transaccionales: dos compras simultáneas no pueden sacar el
 * mismo número.
 */
async function siguienteDeSecuencia(
  ctx: { db: any },
  name: string,
  inicial: number,
): Promise<number> {
  const fila = await ctx.db
    .query('sequences')
    .withIndex('by_name', (q: any) => q.eq('name', name))
    .unique();

  if (!fila) {
    await ctx.db.insert('sequences', { name, value: inicial });
    return inicial;
  }
  const siguiente = fila.value + 1;
  await ctx.db.patch(fila._id, { value: siguiente });
  return siguiente;
}

/**
 * Emite el código de un kit. **Se llama al CONFIRMAR el pago** (webhook → venta
 * confirmada), nunca antes: por eso `saleId` y `fechaPago` son obligatorios.
 */
export const emitir = mutation({
  args: {
    tipo: kitTipo,
    producto,
    saleId: v.string(),
    aportadorContact: v.string(),
    fechaPago: v.string(),
  },
  handler: async (ctx, args) => {
    const yaEmitido = await ctx.db
      .query('kits')
      .withIndex('by_saleId', (q) => q.eq('saleId', args.saleId))
      .unique();

    if (yaEmitido) {
      // Idempotente a propósito: un webhook que se reintenta no debe quemar un código.
      return { code: yaEmitido.code, yaExistia: true };
    }

    const code = await siguienteDeSecuencia(ctx, 'kitCode', CODIGO_INICIAL);

    if (code > CODIGO_TECHO) {
      throw new Error(
        `Secuencia agotada en ${CODIGO_TECHO}. Ampliar el rango es una compuerta nueva ` +
          `(§3.4 · G-A.2), no un cambio de constante: cambia el formato de lo impreso.`,
      );
    }

    await ctx.db.insert('kits', {
      code,
      tipo: args.tipo,
      producto: args.producto,
      saleId: args.saleId,
      aportadorContact: args.aportadorContact,
      fechaPago: args.fechaPago,
      // Derivado, no recibido. Un total tecleado a mano es un dato inventado con forma de dato.
      manillasTotal: MANILLAS_POR_KIT[args.tipo],
      manillasRegistradas: 0,
      estado: 'emitido',
    });

    return { code, yaExistia: false };
  },
});

/**
 * Resuelve un código para la pantalla del beneficiario.
 *
 * Devuelve **lo mínimo**: si existe y de qué tipo es. Nunca el contacto del aportador ni
 * nada de otros beneficiarios — el código es adivinable por diseño (§3.4), así que todo
 * lo que esta query exponga queda expuesto a quien teclee un número al azar.
 */
export const porCodigo = query({
  args: { code: v.number() },
  handler: async (ctx, args) => {
    const kit = await ctx.db
      .query('kits')
      .withIndex('by_code', (q) => q.eq('code', args.code))
      .unique();

    if (!kit) return { existe: false as const };

    return {
      existe: true as const,
      tipo: kit.tipo,
      producto: kit.producto,
      estado: kit.estado,
    };
  },
});

/** Progreso agregado del aportador (§4.9): "8 de tus 10 manillas ya fueron registradas". */
export const progreso = query({
  args: { saleId: v.string() },
  handler: async (ctx, args) => {
    const kit = await ctx.db
      .query('kits')
      .withIndex('by_saleId', (q) => q.eq('saleId', args.saleId))
      .unique();

    if (!kit) return null;

    // Identidades NO: el default del §10.3 es agregado, y las identidades solo salen
    // con `donorVisibilityConsent` explícito — eso vive en su propio endpoint.
    return {
      code: kit.code,
      tipo: kit.tipo,
      manillasTotal: kit.manillasTotal,
      manillasRegistradas: kit.manillasRegistradas,
      estado: kit.estado,
    };
  },
});

export const marcarEstado = mutation({
  args: {
    code: v.number(),
    estado: v.union(
      v.literal('emitido'),
      v.literal('impreso'),
      v.literal('entregando'),
      v.literal('cerrado'),
    ),
  },
  handler: async (ctx, args) => {
    const kit = await ctx.db
      .query('kits')
      .withIndex('by_code', (q) => q.eq('code', args.code))
      .unique();

    if (!kit) throw new Error(`No existe el kit ${args.code}.`);

    await ctx.db.patch(kit._id, { estado: args.estado });
    return { code: kit.code, estado: args.estado };
  },
});
