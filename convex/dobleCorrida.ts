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
import { contarLotesActivosDb } from './precios';
import { configVigenteEn, costoFijoUnitario } from './_lib/motorPrecios';
import { preciosDelLote } from './_lib/motorUnidad';
import {
  agruparMotivos,
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

/**
 * Por qué NO cotiza lo que no cotiza — el diagnóstico que parte el «484» en causas.
 *
 * La doble corrida agrupa todo lo no comparable bajo un motivo único que junta tres
 * cosas distintas: sin casilla, sin costo capturado, o lote sin categoría fiscal. Con
 * eso no se puede decidir qué sigue, porque una inferencia mejor y clasificar
 * quinientas piezas a mano son proyectos distintos.
 *
 * Camina los mismos datos que `preciosPorItemDb` y le pregunta al MOTOR, en vez de
 * reimplementar sus reglas: los motivos son los que emite `preciosDelLote`. Sólo
 * lectura.
 */
export const _porQueNoCotiza = internalQuery({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query('configPrecios').collect();
    const { lotesActivos } = await contarLotesActivosDb(ctx);
    const lotes = await ctx.db.query('lots').collect();
    const casillas = await ctx.db.query('lotItems').collect();

    const porLote = new Map<string, typeof casillas>();
    for (const c of casillas) {
      if (!c.estadoCasilla) continue;
      porLote.set(c.loteId, [...(porLote.get(c.loteId) ?? []), c]);
    }

    /**
     * `loteId` duplicados. Se cuenta acá porque este mismo diagnóstico los delata:
     * al recorrer `lots` fila por fila, dos documentos con el MISMO `loteId` miran
     * las mismas casillas y las cuentan dos veces, así que las casillas por motivo
     * suman más que las que existen. Es la deuda ya conocida — `allocateNext` puede
     * entregar un `loteId` que ya existe, y el duplicado es silencioso.
     */
    const vecesPorLoteId = new Map<string, number>();
    for (const l of lotes) {
      vecesPorLoteId.set(l.loteId, (vecesPorLoteId.get(l.loteId) ?? 0) + 1);
    }
    const duplicados = [...vecesPorLoteId.entries()]
      .filter(([, veces]) => veces > 1)
      .map(([loteId, veces]) => ({ loteId, veces }))
      .sort((a, b) => b.veces - a.veces);

    const conEstado = casillas.filter((c) => c.estadoCasilla);
    const estructura = {
      lotes: lotes.length,
      loteIdsDistintos: vecesPorLoteId.size,
      loteIdsDuplicados: duplicados.length,
      /** Filas de `lots` de más por duplicación: infla toda cuenta por lote. */
      filasDeMasPorDuplicado: lotes.length - vecesPorLoteId.size,
      lotesConCategoriaFiscal: lotes.filter((l) => l.categoriaFiscal).length,
      /**
       * `origenModelo === 'v4'` es lo que `casillas._publicar` exige para dejar
       * publicar. Sólo lo estampa `lotsV4._create`: la migración de Fase 2 no lo
       * pone, así que un lote migrado se puede clasificar pero NO publicar.
       */
      lotesMarcadosV4: lotes.filter((l) => l.origenModelo === 'v4').length,
      lotesConCasillas: [...porLote.keys()].length,
      casillas: casillas.length,
      casillasV4: conEstado.length,
      casillasConCostoCapturado: conEstado.filter(
        (c) => c.costoUnitarioRealCOP !== undefined,
      ).length,
    };

    const motivos: { motivo: string; casillas: number }[] = [];
    // Qué lote está detrás de cada motivo: sin esto no se puede saber si el lote
    // que más piezas bloquea es una oportunidad real o el C-077 conocido.
    const bloqueados: { loteId: string; casillas: number; motivo: string }[] = [];
    let lotesQueCotizan = 0;
    let itemsCotizados = 0;
    let sinConfigVigente = 0;
    // Los IDs, no sólo las cuentas: sin ellos no se puede cruzar contra una fuente
    // externa (una hoja, un inventario) para saber si el hueco se puede llenar.
    const sinCasillas: string[] = [];
    const anterioresAConfig: string[] = [];

    for (const lote of lotes) {
      const delLote = porLote.get(lote.loteId);
      if (!delLote?.length) {
        motivos.push({ motivo: 'el lote no tiene casillas v4', casillas: 0 });
        sinCasillas.push(lote.loteId);
        continue;
      }
      let config;
      try {
        config = configVigenteEn(configs, lote.fechaRecepcion);
      } catch {
        sinConfigVigente++;
        anterioresAConfig.push(lote.loteId);
        motivos.push({
          motivo: 'el lote es anterior a toda la configuración de precios',
          casillas: delLote.length,
        });
        continue;
      }
      const { cotiza, motivo, porItem } = preciosDelLote({
        costoCompraLoteCOP: lote.costoCompraCOP ?? lote.costoTotalCOP,
        casillas: delLote.map((c) => ({
          itemId: c.itemId,
          costoUnitarioRealCOP: c.costoUnitarioRealCOP,
          categoriaFiscal: c.categoriaFiscal,
        })),
        categoriaFiscalLote: lote.categoriaFiscal,
        categoriaFiscalOrigen: lote.categoriaFiscalOrigen,
        segmento: lote.segmento,
        costosVariablesLoteCOP: (lote.costosVariables ?? []).reduce(
          (a, c) => a + c.montoCOP,
          0,
        ),
        // El mismo cálculo que `preciosPorItemDb`, para que el diagnóstico no
        // mida un motor distinto del que descarta los ítems.
        costoFijoUnitarioLoteCOP: costoFijoUnitario(
          config.gastosFijosMensualesCOP,
          lotesActivos,
        ),
        config,
      });
      if (cotiza) {
        lotesQueCotizan++;
        itemsCotizados += porItem.size;
      } else {
        motivos.push({
          motivo: motivo ?? 'sin motivo declarado por el motor',
          casillas: delLote.length,
        });
        bloqueados.push({
          loteId: lote.loteId,
          casillas: delLote.length,
          motivo: motivo ?? 'sin motivo',
        });
      }
    }

    return {
      estructura,
      cotizacion: {
        lotesQueCotizan,
        lotesQueNo: lotes.length - lotesQueCotizan,
        itemsCotizados,
        sinConfigVigente,
      },
      porMotivo: agruparMotivos(motivos),
      duplicados: duplicados.slice(0, 15),
      sinCasillas: sinCasillas.sort(),
      anterioresAConfig: anterioresAConfig.sort(),
      bloqueados: bloqueados.sort((a, b) => b.casillas - a.casillas).slice(0, 10),
    };
  },
});
