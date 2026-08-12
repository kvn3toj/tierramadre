/**
 * La doble corrida ítem por ítem — SOT-V4-FASE1, punto 8.
 *
 * Compara, para cada ítem, lo que la operación cobra HOY en el SOT v3 vivo
 * (`precioFinalCOP`, columna M, solo lectura — cero escritura, cero consumo de
 * Convex prod) contra lo que el motor v4 recomendaría (`precioObjetivoUnidadCOP`,
 * calculado en dev con el divisor 88/$382.407 ya firme).
 *
 * **Es reporte, no corrección.** No es la llamada de esta rama decidir cuál
 * precio es el correcto en cada ítem — eso es de Kevin. Acá solo se mide y se
 * deja la evidencia, con el mismo criterio que el resto de la Fase 1: mediana y
 * buckets, nunca solo una suma (`_lib/dobleCorrida.ts`, y antes,
 * `2026-08-01-tabla-comparativa-divisor.md`).
 *
 * Toda la aritmética vive en `_lib/dobleCorrida.ts`, puro y testeado en
 * `tests/dobleCorrida.test.ts`. Acá solo hay IO: leer la hoja (mismo camino que
 * `migracionV4:leerTabla`) y los precios de dev (`preciosPorItemDb`, el mismo
 * cálculo que usa el espejo — no se reinventa).
 */
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { leerTabla } from './migracionV4';
import { preciosPorItemDb } from './precios';
import {
  compararPreciosItemV3vsV4,
  filaParaGuardar,
  mapearInventarioParaComparar,
  resumirComparacion,
  type ComparacionItem,
  type ResumenComparacion,
} from './_lib/dobleCorrida';

/**
 * Los `precioObjetivoUnidadCOP` de dev, en la forma serializable que una
 * action puede recibir de una query (un `Map` no cruza ese límite).
 */
export const _preciosV4 = internalQuery({
  args: {},
  handler: async (ctx) => {
    const porItem = await preciosPorItemDb(ctx);
    return [...porItem.entries()].map(([itemId, p]) => ({
      itemId,
      precioObjetivoUnidadCOP: p.precioObjetivoUnidadCOP,
      // El único origen que le importa al bonus de detección (§2d) es
      // 'inferida' — se lee del aviso que ya estampa `preciosDelLote`
      // (`_lib/motorUnidad.ts`), sin un join aparte a `lots`.
      categoriaFiscalOrigen: p.avisos?.includes('CATEGORIA_INFERIDA')
        ? ('inferida' as const)
        : undefined,
    }));
  },
});

/**
 * El ensayo del punto 8. Solo lee: la hoja del SOT v3 (gratis) y Convex dev.
 * Nunca escribe a ninguno de los dos.
 */
export const ejecutar = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    filasHojaLeidas: number;
    resumen: ResumenComparacion;
    comparaciones: ComparacionItem[];
  }> => {
    const filasInventario = await leerTabla('/api/get-inventory-rows');
    const filasV3 = mapearInventarioParaComparar(filasInventario);

    const preciosV4Array = await ctx.runQuery(
      internal.dobleCorrida._preciosV4,
      {},
    );
    const preciosV4 = new Map(
      preciosV4Array.map((p) => [
        p.itemId,
        {
          precioObjetivoUnidadCOP: p.precioObjetivoUnidadCOP,
          categoriaFiscalOrigen: p.categoriaFiscalOrigen,
        },
      ]),
    );

    const comparaciones = compararPreciosItemV3vsV4(filasV3, preciosV4);

    const resultado = {
      filasHojaLeidas: filasInventario.length,
      resumen: resumirComparacion(comparaciones),
      comparaciones,
    };

    /**
     * Se ARCHIVA antes de devolver. Hasta el 2026-08-12 esta action devolvía el
     * reporte y no dejaba rastro: el número que tiene que sostener el dictamen
     * sobre el modelo de precios existía sólo en la terminal de quien la corrió, y
     * no había forma de comparar una corrida con la siguiente ni de auditar con qué
     * datos salió cada una.
     *
     * El guardado NO puede tumbar la corrida: si la escritura falla, el reporte se
     * devuelve igual. Perder la copia es malo; perder también la medición que acaba
     * de leer 530 filas de la hoja es peor.
     */
    try {
      await ctx.runMutation(internal.dobleCorrida._guardar, {
        fila: filaParaGuardar(resultado, Date.now()),
      });
    } catch {
      // Silencio deliberado: ver arriba. El reporte sigue.
    }

    return resultado;
  },
});

/** El archivo de una corrida. Append-only: nada actualiza ni borra estas filas. */
export const _guardar = internalMutation({
  args: {
    fila: v.object({
      ts: v.number(),
      filasHojaLeidas: v.number(),
      comparables: v.number(),
      medianaDiferenciaPct: v.number(),
      sobre5Pct: v.number(),
      sobre10Pct: v.number(),
      sinComparar: v.array(
        v.object({ motivo: v.string(), cantidad: v.number() }),
      ),
      paraRevisarInferencia: v.array(v.string()),
      comparablesConCategoriaInferida: v.number(),
      comparaciones: v.array(
        v.object({
          itemId: v.string(),
          precioV3COP: v.optional(v.number()),
          precioV4COP: v.optional(v.number()),
          diferenciaCOP: v.optional(v.number()),
          diferenciaPct: v.optional(v.number()),
          motivo: v.optional(v.string()),
          categoriaFiscalOrigen: v.optional(
            v.union(
              v.literal('capturada'),
              v.literal('inferida'),
              v.literal('revisada'),
            ),
          ),
          revisarInferencia: v.boolean(),
        }),
      ),
    }),
  },
  handler: async (ctx, { fila }) => {
    await ctx.db.insert('dobleCorridas', fila);
  },
});
