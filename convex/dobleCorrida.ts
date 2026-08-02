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
import { internalAction, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { leerTabla } from './migracionV4';
import { preciosPorItemDb } from './precios';
import {
  compararPreciosItemV3vsV4,
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

    return {
      filasHojaLeidas: filasInventario.length,
      resumen: resumirComparacion(comparaciones),
      comparaciones,
    };
  },
});
