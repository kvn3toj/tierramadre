/**
 * W2 «Cerebro Creativo» — las reglas de la casilla.
 *
 * Una casilla es una pieza del lote esperando ser clasificada. Se llena en otro
 * momento y posiblemente por otra persona que la que compró el lote: clasificar
 * es corregir defaults heredados, no digitar de cero.
 *
 * Los dos candados que este módulo sostiene:
 *
 *  1. **El costo unitario se CAPTURA, nunca se deriva.** Prorratear el costo del
 *     lote cotizó «Choker + Piedra» en $67.499 cuando había costado $119.999.
 *     Por eso `costoUnitarioRealCOP` es obligatorio para considerar completa una
 *     casilla, y por eso `conciliarCostos` no devuelve ningún valor corregido.
 *  2. **La diferencia contra el costo del lote se MUESTRA.** Hay 5 lotes (7, 15,
 *     17, 19, 30) con diferencias reales sin explicación entre las dos fuentes.
 *     Cuadrarlas automáticamente las escondería; el wizard las señala y espera
 *     que un humano decida cuál manda.
 */

/**
 * Cuánto puede desviarse la suma de las casillas del costo del lote antes de
 * dejar de ser redondeo.
 *
 * Calibrada contra los casos reales: el lote 52 (+$630 sobre $1.057.063 =
 * 0,06%) y el lote 50 (−$3.000 sobre $826.846 = 0,36%) son redondeo; el lote 15
 * (+$110.000 = 17%) no lo es. Relativa y no absoluta, porque $630 sobre un
 * millón es ruido y sobre diez mil es un error.
 */
export const TOLERANCIA_RELATIVA = 0.005;

/**
 * Techo absoluto de la tolerancia. Sin él, el 0,5% relativo se vuelve absurdo en
 * la cola alta: sobre un lote de $100.000.000 dejaría pasar $500.000 de
 * descuadre como «redondeo», y este módulo existe justamente para no esconder
 * descuadres. $20.000 es holgado para el redondeo real observado (el peor caso
 * medido es el lote 50, con $3.000) y muy por debajo de las diferencias reales
 * (la menor es el lote 15, con $110.000).
 */
export const TOLERANCIA_TOPE_COP = 20_000;

export type CategoriaFiscalCasilla = 'gema' | 'joya';

export interface CasillaW2 {
  itemId: string;
  estadoCasilla: string;
  categoriaFiscal?: CategoriaFiscalCasilla;
  /** CAPTURADO. Nunca derivado del lote. */
  costoUnitarioRealCOP?: number;
  renombre?: string;
  calidad?: string;
  color?: string;
  corte?: string;
  ct?: number;
  gradoRareza?: string;
  tipoJoya?: string;
  gramaje?: number;
  /** Una intención comercial, no un dato de la pieza: opcional. */
  rangoVentaEsperadoCOP?: number;
}

/**
 * Lo que falta para que la casilla se considere completa.
 *
 * Devuelve la lista en vez de un booleano para que la UI pueda decir QUÉ falta;
 * «incompleta» sin más obliga a adivinar.
 */
export function camposFaltantes(casilla: CasillaW2): string[] {
  const faltan: string[] = [];

  // Cero no cuenta como capturado: es indistinguible de «todavía no lo sé», y
  // así quedaron 25 piezas con Costo Unit. = 0 en EQUIVALENTES.
  if (
    typeof casilla.costoUnitarioRealCOP !== 'number' ||
    !Number.isFinite(casilla.costoUnitarioRealCOP) ||
    casilla.costoUnitarioRealCOP <= 0
  ) {
    faltan.push('costoUnitarioRealCOP');
  }

  if (
    casilla.categoriaFiscal !== 'gema' &&
    casilla.categoriaFiscal !== 'joya'
  ) {
    faltan.push('categoriaFiscal');
  }

  if (!casilla.calidad?.trim()) faltan.push('calidad');

  if (casilla.categoriaFiscal === 'joya') {
    if (!casilla.tipoJoya?.trim()) faltan.push('tipoJoya');
    if (typeof casilla.gramaje !== 'number' || casilla.gramaje <= 0) {
      faltan.push('gramaje');
    }
  }

  return faltan;
}

export function casillaEstaCompleta(casilla: CasillaW2): boolean {
  return camposFaltantes(casilla).length === 0;
}

export interface CompletenessLote {
  completas: number;
  total: number;
  pct: number;
  listoParaPublicar: boolean;
  /** itemIds de las casillas que faltan, para poder saltar directo a ellas. */
  incompletas: string[];
}

/** El score X/N que decide si el lote puede publicarse. */
export function completenessDelLote(
  casillas: readonly CasillaW2[],
): CompletenessLote {
  const incompletas = casillas
    .filter((c) => !casillaEstaCompleta(c))
    .map((c) => c.itemId);
  const completas = casillas.length - incompletas.length;

  return {
    completas,
    total: casillas.length,
    pct: casillas.length ? Math.round((completas / casillas.length) * 100) : 0,
    // Un lote sin casillas no está listo: no hay nada que publicar.
    listoParaPublicar: casillas.length > 0 && incompletas.length === 0,
    incompletas,
  };
}

export interface ConciliacionCostos {
  suma: number;
  /** `suma − costoLote`. Positiva = las casillas suman de más. */
  diferencia: number;
  cuadra: boolean;
  /** Cuántas casillas todavía no tienen costo capturado. */
  sinCosto: number;
  /** Texto para el aviso persistente. Vacío cuando cuadra. */
  aviso: string;
}

/**
 * Compara la suma de los costos capturados contra el costo del lote.
 *
 * **No devuelve ningún costo corregido, y es a propósito.** La firma es el
 * candado: sin un campo «costoAjustado» nadie puede cuadrar la diferencia sin
 * darse cuenta. Lo único que produce es el hecho y un aviso.
 */
export function conciliarCostos(
  costoLoteCOP: number,
  costosUnitarios: readonly (number | undefined)[],
): ConciliacionCostos {
  const capturados = costosUnitarios.filter(
    (c): c is number => typeof c === 'number' && Number.isFinite(c) && c > 0,
  );
  const sinCosto = costosUnitarios.length - capturados.length;
  const suma = capturados.reduce((acc, c) => acc + c, 0);
  const diferencia = suma - costoLoteCOP;
  const margen = Math.min(
    Math.abs(costoLoteCOP * TOLERANCIA_RELATIVA),
    TOLERANCIA_TOPE_COP,
  );

  // Un lote sin casillas todavía no tiene nada que conciliar. Reportar «suman 0
  // contra $X» sería inventar un descuadre del tamaño del lote entero.
  if (costosUnitarios.length === 0) {
    return {
      suma: 0,
      diferencia: 0,
      cuadra: false,
      sinCosto: 0,
      aviso: 'el lote todavía no tiene casillas que conciliar.',
    };
  }

  if (sinCosto > 0) {
    return {
      suma,
      diferencia,
      cuadra: false,
      sinCosto,
      aviso:
        `${sinCosto} casilla(s) todavía sin costo capturado: la suma no se ` +
        `puede comparar con el costo del lote hasta que estén todas.`,
    };
  }

  const cuadra = Math.abs(diferencia) <= margen;
  const formato = new Intl.NumberFormat('es-CO');

  return {
    suma,
    diferencia,
    cuadra,
    sinCosto: 0,
    aviso: cuadra
      ? ''
      : `Los costos de las casillas suman ${formato.format(suma)} contra ` +
        `${formato.format(costoLoteCOP)} del lote: una diferencia de ` +
        `${formato.format(Math.abs(diferencia))}. No se ajusta sola — revisá ` +
        `cuál de las dos fuentes manda antes de publicar.`,
  };
}
