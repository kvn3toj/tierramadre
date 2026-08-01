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

/**
 * Las cabeceras de la pestaña Movimientos (W3).
 *
 * Los condicionales de pago viajan **enmascarados**. Ver la regla completa en
 * `filaMovimientoParaEspejo`.
 *
 * `fechaIngresoCaja`, que el canon pide en el bloque de efectivo, todavía no
 * existe: W3 no la captura. No se agrega la columna vacía a propósito — una
 * columna que nunca se llena invita a llenarla a mano, y el espejo es push-only:
 * esa edición se reporta como deriva y el próximo cambio la borra. Entra cuando
 * la capture el wizard.
 */
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
  'pagoComisionesA',
  'formaPago',
  // ── condicionales por método de pago ──
  'creditoFechaInicio',
  'creditoFechaPago',
  'bancoOBilletera',
  'refTransaccion',
  'reciboCaja',
  'quienRecibio',
  'ubicacionEfectivo',
  // ─────────────────────────────────────
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

/**
 * Deja ver los últimos cuatro caracteres y tapa el resto.
 *
 * Lo corto pasa entero: un número de recibo de dos dígitos no es un secreto, y
 * enmascararlo lo volvería inútil sin proteger nada.
 */
export function enmascaraCola(valor?: string): string {
  const v = texto(valor);
  return v.length <= 4 ? v : `••••${v.slice(-4)}`;
}

/**
 * Enmascara las tiradas largas de dígitos dentro de un texto libre, dejando el
 * resto intacto.
 *
 * El canon lo pide para `pagoComisionesA`: «nombre sí, cuenta enmascarada». Como
 * el campo es texto libre —el operador escribe lo que quiere— la regla no puede
 * mirar el nombre del campo, tiene que mirar la FORMA: siete dígitos seguidos o
 * más es un número de cuenta, no una fecha ni un porcentaje ni un recibo.
 */
export function enmascaraCuentasEnTexto(valor?: string): string {
  return texto(valor).replace(/\d{7,}/g, (d) => `••••${d.slice(-4)}`);
}

/**
 * El movimiento tal como lo ve la hoja.
 *
 * **Regla de datos sensibles (canon 2026-08-01, obligatoria).** W3 SÍ captura el
 * número de cuenta completo y el titular: el negocio los necesita para conciliar.
 * Al espejo no viajan nunca. El motivo no es teórico — la hoja la ve todo el que
 * tenga el libro, y en este mismo repo se acaba de cerrar una query pública que
 * exponía exactamente cuenta + titular. Acá va el banco y una referencia con los
 * últimos cuatro; lo demás vive en Convex, detrás del gate de rol.
 *
 * La fila devuelve SIEMPRE todas las cabeceras, con `''` en las que no aplican:
 * el drenaje rechaza una fila a la que le falte una columna, y una clave de más
 * no se escribiría en ningún lado.
 */
export function filaMovimientoParaEspejo(
  mov: FilaMovimiento,
): Record<string, string> {
  const venta = mov.venta;
  const t = venta?.transferencia;
  const e = venta?.efectivo;
  const c = venta?.credito;

  return {
    movimientoId: texto(mov.movimientoId),
    kardexEventId: texto(mov.kardexEventId),
    tipo: texto(mov.tipo),
    fecha: texto(mov.fecha),
    items: (mov.itemIds ?? []).join(', '),
    entregadoPor: texto(mov.entregadoPor),
    recibidoPor: texto(mov.recibidoPor),
    cliente: texto(venta?.cliente),
    precioVentaRealCOP: texto(venta?.precioVentaRealCOP),
    comisionPct: texto(venta?.comisionPct),
    pagoComisionesA: enmascaraCuentasEnTexto(venta?.pagoComisionesA),
    formaPago: texto(venta?.formaPago),

    creditoFechaInicio: texto(c?.fechaInicio),
    creditoFechaPago: texto(c?.fechaPago),
    // `numeroCuenta` y `titular` NO se leen. No es un olvido.
    bancoOBilletera: texto(t?.banco),
    refTransaccion: enmascaraCola(t?.numeroTransaccion),
    reciboCaja: texto(e?.numeroRecibo),
    quienRecibio: texto(e?.recibidoPor),
    ubicacionEfectivo: texto(e?.ubicacion),

    origenKardexEventId: texto(mov.origenKardexEventId),
    condicion: texto(mov.condicion),
  };
}

export interface FilaMovimiento {
  movimientoId: string;
  kardexEventId: string;
  tipo: string;
  fecha: string;
  itemIds: string[];
  entregadoPor: string;
  recibidoPor: string;
  condicion?: string;
  origenKardexEventId?: string;
  venta?: {
    cliente: string;
    precioVentaRealCOP: number;
    comisionPct?: number;
    pagoComisionesA?: string;
    formaPago: string;
    efectivo?: {
      numeroRecibo: string;
      recibidoPor: string;
      ubicacion?: string;
    };
    /** Se lee `banco` y `numeroTransaccion`. Lo demás se queda en Convex. */
    transferencia?: {
      numeroCuenta: string;
      titular: string;
      banco: string;
      numeroTransaccion: string;
    };
    credito?: { fechaInicio: string; fechaPago: string };
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
