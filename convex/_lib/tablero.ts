/**
 * La pestaña Tablero — el motor agregado, calculado por Convex.
 *
 * En el xlsx el Tablero tenía 8 indicadores y **solo 1 vivo**, y ese estaba
 * inflado porque sumaba C-010 dos veces. Otro sumaba la columna equivocada
 * (`AA`, texto «Sí/No», en vez de `AB`, el dinero). Acá los valores no son
 * fórmulas de hoja que alguien pueda romper desde una celda: la hoja es una
 * vista, Convex es la fuente.
 *
 * **Una fila por mes** (`idFila = AAAA-MM`, decisión de Kevin, 2026-08-01). El
 * modelo ya es por período —`configPrecios` versiona los gastos fijos justamente
 * para que un cambio de tasa no reprecie el pasado—, y doce filas muestran lo
 * que una sola fila viva no puede: cómo se movió el fijo unitario cuando entró
 * inventario, si las ventas van contra la estimada, y cuándo cambió la regla
 * vigente. La fila del mes corriente se reescribe en cada recálculo; cuando el
 * mes cierra queda congelada sola, sin ningún job de «cerrar mes».
 *
 * Puro: sin IO. El reloj entra por `periodoDeBogota`, que recibe el timestamp.
 */
import {
  configVigenteEn,
  costoFijoUnitario,
  type ConfigPrecios,
} from './motorPrecios';

/** Bogotá es UTC−05:00 todo el año: Colombia no tiene horario de verano. */
const OFFSET_BOGOTA_MS = 5 * 60 * 60 * 1000;

/**
 * El período `AAAA-MM` al que pertenece un instante, **en hora de Bogotá**.
 *
 * Con UTC, todo lo que pasara después de las 19:00 del último día del mes caería
 * en el mes siguiente: un recálculo a las 23:00 del 31 quedaría contado en
 * octubre. La frontera del mes es la del negocio, no la del servidor.
 */
export function periodoDeBogota(ts: number): string {
  return new Date(ts - OFFSET_BOGOTA_MS).toISOString().slice(0, 7);
}

/** El primer día del período, en ISO — con lo que se resuelve la config. */
export function primerDiaDelPeriodo(periodo: string): string {
  return `${periodo}-01`;
}

export interface VentaDelPeriodo {
  precioVentaRealCOP: number;
  /** El K de la unidad vendida: costo capturado + su parte del overhead. */
  KUnidadCOP: number;
  categoriaFiscal: 'gema' | 'joya';
}

export interface ConstruirTableroInput {
  /** `AAAA-MM`. */
  periodo: string;
  config: ConfigPrecios;
  lotesActivos: number;
  /** Σ costos CAPTURADOS de las casillas OPERACIONALES no vendidas. */
  inventarioActivoCOP: number;
  /**
   * Σ costos CAPTURADOS de las casillas de COLECCIÓN no vendidas (punto 5,
   * 2026-08-02). Es OTRA celda, no una nota al pie de la operacional: son
   * dos negocios, y sumarlos en uno solo es justo el defecto que infló el
   * titular «25× arriba» — medía los dos con una sola vara.
   */
  inventarioColeccionCOP?: number;
  ventas: readonly VentaDelPeriodo[];
}

export interface Tablero {
  periodo: string;
  gastosFijosMesCOP: number;
  lotesActivos: number;
  costoFijoUnitarioCOP?: number;
  inventarioActivoCOP: number;
  /** Otro negocio, otra celda — nunca sumado al operativo (punto 5). */
  inventarioColeccionCOP: number;
  ventasMesCOP: number;
  margenBrutoMesCOP: number;
  utilidadNetaEstimadaCOP: number;
  /** Ausente sin ventas: un 0 se leería como «el mes ya se cubrió». */
  puntoEquilibrioUnidades?: number;
  /** Dato de ENTRADA de `configPrecios`. Ausente si Kevin no lo dictó. */
  ventasEstimadasMesCOP?: number;
  /** `estimadas − reales`. Ausente si no hay estimadas — nunca 0 inventado. */
  brechaVsVentasEstimadasCOP?: number;
  reglaVigente: 'remate' | 'objetivo';
}

export function construirTablero(input: ConstruirTableroInput): Tablero {
  const {
    periodo,
    config,
    lotesActivos,
    inventarioActivoCOP,
    inventarioColeccionCOP = 0,
    ventas,
  } = input;

  const ventasMesCOP = ventas.reduce((a, v) => a + v.precioVentaRealCOP, 0);

  // El hecho que la hoja ignoraba: la comisión y el IVA se pagan SOBRE EL PRECIO
  // DE VENTA, no sobre el costo. Lo que queda de cada venta es `precio ×
  // retenido`, y de ahí sale el K de la pieza.
  const margenBrutoMesCOP = Math.round(
    ventas.reduce((a, v) => {
      const retenido =
        1 -
        config.comisionPct -
        (v.categoriaFiscal === 'joya' ? config.ivaJoyaPct : 0);
      return a + (v.precioVentaRealCOP * retenido - v.KUnidadCOP);
    }, 0),
  );

  // El gasto fijo del MES entero, no el unitario: el reparto por lote ya está
  // dentro de cada `KUnidadCOP`, así que descontar el unitario acá lo contaría
  // dos veces.
  const utilidadNetaEstimadaCOP =
    margenBrutoMesCOP - config.gastosFijosMensualesCOP;

  const margenPorUnidad = ventas.length ? margenBrutoMesCOP / ventas.length : 0;
  const puntoEquilibrioUnidades =
    margenPorUnidad > 0
      ? config.gastosFijosMensualesCOP / margenPorUnidad
      : undefined;

  // Dato de entrada, versionado por período igual que los gastos fijos. El `B11`
  // del xlsx era `=B4*2,5` —un multiplicador hardcodeado que nadie decidió— y
  // eso muere acá. Ausente ⇒ celda VACÍA, jamás un cero inventado.
  const ventasEstimadasMesCOP = config.ventasEstimadasMesCOP;
  const brechaVsVentasEstimadasCOP =
    ventasEstimadasMesCOP === undefined
      ? undefined
      : ventasEstimadasMesCOP - ventasMesCOP;

  return {
    periodo,
    gastosFijosMesCOP: config.gastosFijosMensualesCOP,
    lotesActivos,
    costoFijoUnitarioCOP:
      lotesActivos > 0
        ? costoFijoUnitario(config.gastosFijosMensualesCOP, lotesActivos)
        : undefined,
    inventarioActivoCOP,
    inventarioColeccionCOP,
    ventasMesCOP,
    margenBrutoMesCOP,
    utilidadNetaEstimadaCOP,
    puntoEquilibrioUnidades,
    ventasEstimadasMesCOP,
    brechaVsVentasEstimadasCOP,
    // El régimen del PERÍODO, resuelto contra su primer día: agosto dirá
    // `remate` y septiembre `objetivo`, y esa transición queda visible en la
    // hoja sin que nadie la anote.
    reglaVigente:
      primerDiaDelPeriodo(periodo) <= config.remateHasta
        ? 'remate'
        : 'objetivo',
  };
}

/** Reexportado para que el llamador resuelva la config del período en un lugar. */
export function configDelPeriodo(
  configs: readonly ConfigPrecios[],
  periodo: string,
): ConfigPrecios {
  return configVigenteEn(configs, primerDiaDelPeriodo(periodo));
}
