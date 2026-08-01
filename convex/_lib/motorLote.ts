/**
 * Las métricas del motor a nivel LOTE — las trece columnas de solo lectura.
 *
 * Ocho salían ya de `motorPrecios.ts`. Las otras cinco no tenían definición en
 * ninguna parte, y escribirlas «a medias» habría sido el defecto que este
 * proyecto vino a matar: un número con forma de verdad que nadie decidió. Kevin
 * las cerró el 2026-08-01 apuntando a las fórmulas auditadas del xlsx (§2 de
 * `tierramadre-modelo-fijacion-precios-v2`):
 *
 *   multiplicadorMinimo     = K ÷ costoCompraCOP                        (E5 = E4/B4)
 *   margenBrutoEstimadoCOP  = objetivo − compra − variables
 *                             − objetivo×comisión − objetivo×impuestos  (E10)
 *   utilidadNetaEstimadaCOP = margenBruto − costoFijoUnitarioCOP        (E11)
 *   puntoEquilibrioUnidades = fijo ÷ (margenBruto / unidades)           (E12 adaptada)
 *
 * Y la quinta, `brechaVsVentasEstimadasCOP`, **se muda al Tablero**: por lote
 * nunca tuvo sentido — en la hoja era modelo-global (E13) y necesita las ventas
 * estimadas del mes, que son un dato de la operación, no del lote.
 *
 * ## La salvedad del remate, que el Léeme repite
 *
 * Las cuatro se calculan **sobre el objetivo**, que es lo que la fórmula dice.
 * Hasta el 2026-08-31 lo que se cobra es el remate (K×1,3 gema · K×1,6 joya), así
 * que mientras `reglaVigente` diga `remate` el margen bruto estimado describe el
 * escenario objetivo y no lo que está entrando por caja. `reglaVigente` viaja
 * justamente para que esa diferencia se pueda ver.
 *
 * Puro: sin IO y sin reloj — la fecha entra por parámetro.
 */
import {
  calcularK,
  divisorObjetivo,
  exigeCategoriaFiscal,
  pisoReal,
  precioVenta,
  type CategoriaFiscal,
  type ConfigPrecios,
} from './motorPrecios';

export interface MetricasDelLoteInput {
  /** El costo de compra PURO. El multiplicador mínimo se mide contra ESTE. */
  costoCompraCOP: number;
  costosVariablesCOP?: number;
  /** UN solo fijo por lote (D2). */
  costoFijoUnitarioCOP: number;
  unidadesDeclaradas: number;
  categoriaFiscal: CategoriaFiscal;
  config: ConfigPrecios;
  /** `AAAA-MM-DD`. Decide `reglaVigente`. Por defecto, el día del remate. */
  fecha?: string;
}

export interface MetricasDelLote {
  /** `K` = compra + variables + fijo. **No es el punto de equilibrio.** */
  precioEquilibrioCOP: number;
  /** El piso de margen cero: `K/0,90` gema · `K/0,71` joya. */
  equilibrioRealCOP: number;
  precioObjetivoCOP: number;
  costoFijoUnitarioCOP: number;
  costoVariableUnitarioCOP: number;
  /** `K ÷ costo de compra` (E5). */
  multiplicadorMinimo: number;
  /** `objetivo ÷ costo de compra`. Informativo, jamás un insumo. */
  multiplicadorObjetivo: number;
  /** E10. La comisión y el IVA salen DEL PRECIO, no del costo. */
  margenBrutoEstimadoCOP: number;
  /** E11: margen bruto menos UN fijo del lote. */
  utilidadNetaEstimadaCOP: number;
  /**
   * E12 adaptada: cuántas unidades del lote cubren SU fijo asignado.
   *
   * Ausente cuando el margen bruto no es positivo o no hay unidades: un lote que
   * no gana plata no tiene punto de equilibrio, y un 0 se leería como «se cubre
   * sin vender nada».
   */
  puntoEquilibrioUnidades?: number;
  reglaVigente: 'remate' | 'objetivo';
}

export function metricasDelLote(input: MetricasDelLoteInput): MetricasDelLote {
  const categoria = exigeCategoriaFiscal(input.categoriaFiscal);
  const variables = input.costosVariablesCOP ?? 0;
  const fecha = input.fecha ?? input.config.remateHasta;

  const K = calcularK({
    costoCompraCOP: input.costoCompraCOP,
    costosVariablesCOP: variables,
    costoFijoUnitarioCOP: input.costoFijoUnitarioCOP,
  });

  const objetivo = Math.round(K / divisorObjetivo(categoria, input.config));
  const impuestos = categoria === 'joya' ? input.config.ivaJoyaPct : 0;

  // E10 — el hecho que la hoja ignoraba: la comisión y el IVA se pagan sobre el
  // PRECIO DE VENTA, no sobre el costo. Se llevan un pedazo de lo que cobrás.
  const margenBrutoEstimadoCOP = Math.round(
    objetivo -
      input.costoCompraCOP -
      variables -
      objetivo * input.config.comisionPct -
      objetivo * impuestos,
  );

  // E11 — UN fijo, el del lote. Si acá fuera `fijo × unidades`, un lote de 122
  // piezas cargaría 122 veces la estructura y ningún lote grande cerraría nunca.
  const utilidadNetaEstimadaCOP =
    margenBrutoEstimadoCOP - input.costoFijoUnitarioCOP;

  // Al objetivo, el margen bruto es `K × margenDeseado / divisor + fijo`, o sea
  // estrictamente positivo por construcción: el objetivo se DERIVA de K, así que
  // un lote no queda deficitario por ser caro. La guarda de abajo es defensiva
  // —cubre una config degenerada, no un lote real— y existe para que
  // `puntoEquilibrioUnidades` no pueda salir en 0 («se cubre sin vender nada»)
  // ni en Infinity, que ni siquiera es serializable a la hoja.
  const margenPorUnidad =
    input.unidadesDeclaradas > 0
      ? margenBrutoEstimadoCOP / input.unidadesDeclaradas
      : 0;
  const puntoEquilibrioUnidades =
    margenPorUnidad > 0
      ? input.costoFijoUnitarioCOP / margenPorUnidad
      : undefined;

  return {
    precioEquilibrioCOP: K,
    equilibrioRealCOP: pisoReal(K, categoria, input.config),
    precioObjetivoCOP: objetivo,
    costoFijoUnitarioCOP: input.costoFijoUnitarioCOP,
    costoVariableUnitarioCOP:
      input.unidadesDeclaradas > 0
        ? Math.round(variables / input.unidadesDeclaradas)
        : 0,
    multiplicadorMinimo: K / input.costoCompraCOP,
    multiplicadorObjetivo: objetivo / input.costoCompraCOP,
    margenBrutoEstimadoCOP,
    utilidadNetaEstimadaCOP,
    puntoEquilibrioUnidades,
    reglaVigente: precioVenta({ K, categoria, fecha, config: input.config })
      .regla,
  };
}
