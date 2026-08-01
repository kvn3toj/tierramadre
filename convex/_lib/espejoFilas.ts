/**
 * Las filas del espejo v4, por CABECERA NOMBRADA.
 *
 * Regla heredada de v3 con sangre: prohibido leer o escribir la hoja por índice
 * posicional. El incidente «Ubicación: 150820» —un precio donde iba una
 * ubicación— salió de leer por posición un layout de 42 columnas que se movió.
 * Acá una fila es un `Record<cabecera, valor>`, y el orden de las columnas en la
 * hoja es problema del escritor, no del que arma el dato.
 *
 * Todo se serializa a texto: la hoja es una VISTA. Los tipos viven en Convex,
 * que es la fuente. Que la hoja reciba `"442787"` en vez de un número evita que
 * Sheets reinterprete formatos (la fecha que se vuelve número, el id que pierde
 * el cero de la izquierda).
 */

/** Las cabeceras de la pestaña Lotes, en el orden en que se crean. */
export const CABECERAS_LOTES = [
  'loteId',
  'fecha',
  'proveedor',
  'categoriaFiscal',
  'costoCompraCOP',
  'costosVariablesCOP',
  'costoTotalCOP',
  'unidades',
  'abonoCOP',
  'saldoCOP',
  'formaPago',
  'estado',
  'sede',
  'renombre',
] as const;

/** Las cabeceras de la pestaña Casillas. */
export const CABECERAS_CASILLAS = [
  'itemId',
  'loteId',
  'orden',
  'estadoCasilla',
  'categoriaFiscal',
  'costoUnitarioRealCOP',
  'renombre',
  'calidad',
  'color',
  'corte',
  'ct',
  'gradoRareza',
  'rangoVentaEsperadoCOP',
] as const;

/** Las cabeceras de la pestaña Movimientos (W3). */
export const CABECERAS_MOVIMIENTOS = [
  'movimientoId',
  'kardexEventId',
  'tipo',
  'fecha',
  'items',
  'entregadoPor',
  'recibidoPor',
  'cliente',
  'precioVentaRealCOP',
  'comisionPct',
  'formaPago',
  'origenKardexEventId',
  'condicion',
] as const;

export interface FilaLote {
  loteId: string;
  fechaRecepcion: string;
  proveedor: string;
  categoriaFiscal: string;
  costoCompraCOP: number;
  costosVariablesCOP: number;
  costoTotalCOP: number;
  unidadesDeclaradas: number;
  abonoCOP: number;
  saldoCOP: number;
  formaPago: string;
  estado: string;
  sede?: string;
  renombreLote?: string;
}

const texto = (v: unknown): string =>
  v === undefined || v === null ? '' : String(v);

export function filaLoteParaEspejo(lote: FilaLote): Record<string, string> {
  return {
    loteId: texto(lote.loteId),
    fecha: texto(lote.fechaRecepcion),
    proveedor: texto(lote.proveedor),
    categoriaFiscal: texto(lote.categoriaFiscal),
    costoCompraCOP: texto(lote.costoCompraCOP),
    costosVariablesCOP: texto(lote.costosVariablesCOP),
    costoTotalCOP: texto(lote.costoTotalCOP),
    unidades: texto(lote.unidadesDeclaradas),
    abonoCOP: texto(lote.abonoCOP),
    saldoCOP: texto(lote.saldoCOP),
    formaPago: texto(lote.formaPago),
    estado: texto(lote.estado),
    sede: texto(lote.sede),
    renombre: texto(lote.renombreLote),
  };
}

export interface FilaCasilla {
  itemId: string;
  loteId: string;
  ordenEnLote: number;
  estadoCasilla: string;
  categoriaFiscal?: string;
  costoUnitarioRealCOP?: number;
  renombre?: string;
  calidad?: string;
  color?: string;
  corte?: string;
  ct?: number;
  gradoRareza?: string;
  rangoVentaEsperadoCOP?: number;
}

export function filaCasillaParaEspejo(
  casilla: FilaCasilla,
): Record<string, string> {
  return {
    itemId: texto(casilla.itemId),
    loteId: texto(casilla.loteId),
    orden: texto(casilla.ordenEnLote),
    estadoCasilla: texto(casilla.estadoCasilla),
    categoriaFiscal: texto(casilla.categoriaFiscal),
    costoUnitarioRealCOP: texto(casilla.costoUnitarioRealCOP),
    renombre: texto(casilla.renombre),
    calidad: texto(casilla.calidad),
    color: texto(casilla.color),
    corte: texto(casilla.corte),
    ct: texto(casilla.ct),
    gradoRareza: texto(casilla.gradoRareza),
    rangoVentaEsperadoCOP: texto(casilla.rangoVentaEsperadoCOP),
  };
}
