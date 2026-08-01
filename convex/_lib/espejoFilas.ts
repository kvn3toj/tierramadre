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
  // Desglose informativo. El total sigue siendo `costosVariablesCOP`.
  'viaticosCOP',
  'packingCOP',
  'domicilioCOP',
  'otrosVariablesCOP',
  'costosVariablesCOP',
  'costoTotalCOP',
  'unidades',
  // Bloque Joya. Vacío en un lote de gema.
  'tipoJoya',
  'mineralJoya',
  'gramajeJoya',
  'cantidadJoyas',
  'costoPorGramoCOP',
  'presupuestoJoyaCOP',
  'abonoCOP',
  'saldoCOP',
  'formaPago',
  'estado',
  'sede',
  'renombre',
  // ── Motor de precios · SOLO LECTURA, escritas por el recálculo ──
  //
  // Vacías cuando el lote no cotiza (sin costo capturado, o `mixta`, o sin
  // categoría fiscal). `precioEquilibrioCOP` es **K**, que NO es el punto de
  // equilibrio: vender ahí pierde plata, porque la comisión y el IVA salen del
  // precio. El piso de verdad es `equilibrioRealCOP`.
  //
  // Las cuatro últimas se calculan sobre el OBJETIVO aunque `reglaVigente` diga
  // `remate`: es lo que la fórmula E10–E12 dice. El Léeme lo aclara.
  'costoFijoUnitarioCOP',
  'costoVariableUnitarioCOP',
  'precioEquilibrioCOP',
  'equilibrioRealCOP',
  'precioObjetivoCOP',
  'multiplicadorMinimo',
  'multiplicadorObjetivo',
  'margenBrutoEstimadoCOP',
  'utilidadNetaEstimadaCOP',
  'puntoEquilibrioUnidades',
  'reglaVigente',
  'recalculadoEn',
] as const;

/**
 * Las cabeceras de la pestaña Tablero — el motor agregado, una fila por mes.
 *
 * `periodo` va primero porque es la clave del upsert: sin una columna donde
 * buscar el id, la fila no se puede ubicar. Son 13 contra las 12 del canon, y la
 * diferencia es exactamente esa clave.
 *
 * `brechaVsVentasEstimadasCOP` vive ACÁ y no en Lotes: por lote nunca tuvo
 * sentido — en el xlsx era modelo-global (E13).
 */
export const CABECERAS_TABLERO = [
  'periodo',
  'gastosFijosMesCOP',
  'lotesActivos',
  'costoFijoUnitarioCOP',
  'inventarioActivoCOP',
  'ventasMesCOP',
  'margenBrutoMesCOP',
  'utilidadNetaEstimadaCOP',
  'puntoEquilibrioUnidades',
  'ventasEstimadasMesCOP',
  'brechaVsVentasEstimadasCOP',
  'reglaVigente',
  'actualizadoEn',
] as const;

/** Las cabeceras de la pestaña Casillas. */
export const CABECERAS_CASILLAS = [
  'itemId',
  'loteId',
  'orden',
  'renombreLote',
  'estadoCasilla',
  'categoriaFiscal',
  'costoUnitarioRealCOP',
  'renombre',
  'calidad',
  'color',
  'corte',
  'ct',
  'gradoRareza',
  'tipoJoya',
  'gramaje',
  'rangoVentaEsperadoCOP',
  // ── Motor por unidad · SOLO LECTURA ──
  //
  // Vacías cuando la casilla no tiene costo capturado o el lote no pasó la
  // conciliación (regla de Kevin, 2026-08-01). Una celda vacía se lee como
  // «pendiente»; un número calculado sobre datos incompletos se lee como precio.
  //
  // `equilibrioReal*` es el PISO real (K/0,90 gema · K/0,71 joya), no K. La
  // nomenclatura es carga estructural: `precioEquilibrio*` significa K y solo
  // existe a nivel lote. K disfrazado de «equilibrio» fue el habilitador del
  // defecto ③ de la hoja —el lote 14 ofrecido a $27.080 de perder plata— y no
  // vuelve, así que K_unidad NO tiene columna acá.
  'equilibrioRealUnidadCOP',
  'precioObjetivoUnidadCOP',
] as const;

/**
 * Reparte los costos variables en los tres conceptos nombrados del canon, más
 * un cajón para el resto.
 *
 * El mapeo por palabra clave no es una adivinanza: `CostosVariablesEditor`
 * ofrece exactamente «Viáticos · Packing · Domicilio» como sugerencias, así que
 * son los mismos tres. Lo que el operador escriba a mano cae en `otros`.
 *
 * El desglose es INFORMATIVO y siempre suma el total: si una clasificación
 * fallara, `costosVariablesCOP` sigue siendo la cifra autoritativa y no se mueve.
 */
export function desglosaCostosVariables(
  costos?: { concepto: string; montoCOP: number }[],
): {
  viaticosCOP: number;
  packingCOP: number;
  domicilioCOP: number;
  otrosVariablesCOP: number;
} {
  const out = {
    viaticosCOP: 0,
    packingCOP: 0,
    domicilioCOP: 0,
    otrosVariablesCOP: 0,
  };
  for (const { concepto, montoCOP } of costos ?? []) {
    // Sin tildes ni mayúsculas: «Viáticos», «viaticos» y «VIÁTICOS» son uno.
    const c = concepto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (c.includes('viatico')) out.viaticosCOP += montoCOP;
    else if (c.includes('packing')) out.packingCOP += montoCOP;
    else if (c.includes('domicilio')) out.domicilioCOP += montoCOP;
    else out.otrosVariablesCOP += montoCOP;
  }
  return out;
}

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
  /** El desglose sale de acá; el total sigue viniendo en `costosVariablesCOP`. */
  costosVariables?: { concepto: string; montoCOP: number }[];
  joya?: {
    tipoJoya: string;
    mineral: string;
    gramaje: number;
    costoPorGramoCOP: number;
    cantidadJoyas?: number;
    presupuestoJoyaCOP?: number;
  };
  /**
   * Las trece del motor. **Ausente ⇒ todas las celdas vacías**: el lote no
   * cotiza (sin costo capturado, `mixta`, o sin categoría fiscal). Vacío se lee
   * como pendiente; un número a medias se lee como precio.
   */
  motor?: MotorParaEspejo;
}

/** Lo que el motor aporta a la fila del lote. Ver `_lib/motorLote.ts`. */
export interface MotorParaEspejo {
  costoFijoUnitarioCOP: number;
  costoVariableUnitarioCOP: number;
  /** `K`. NO es el punto de equilibrio — vender ahí pierde la comisión. */
  precioEquilibrioCOP: number;
  /** El piso real: `K/0,90` gema · `K/0,71` joya. */
  equilibrioRealCOP: number;
  precioObjetivoCOP: number;
  multiplicadorMinimo: number;
  multiplicadorObjetivo: number;
  margenBrutoEstimadoCOP: number;
  utilidadNetaEstimadaCOP: number;
  puntoEquilibrioUnidades?: number;
  reglaVigente: 'remate' | 'objetivo';
  /** ISO. Cuándo se calculó esta fila. */
  recalculadoEn: string;
}

const texto = (v: unknown): string =>
  v === undefined || v === null ? '' : String(v);

export function filaLoteParaEspejo(lote: FilaLote): Record<string, string> {
  const desglose = desglosaCostosVariables(lote.costosVariables);
  return {
    loteId: texto(lote.loteId),
    fecha: texto(lote.fechaRecepcion),
    proveedor: texto(lote.proveedor),
    categoriaFiscal: texto(lote.categoriaFiscal),
    costoCompraCOP: texto(lote.costoCompraCOP),
    viaticosCOP: texto(desglose.viaticosCOP),
    packingCOP: texto(desglose.packingCOP),
    domicilioCOP: texto(desglose.domicilioCOP),
    otrosVariablesCOP: texto(desglose.otrosVariablesCOP),
    costosVariablesCOP: texto(lote.costosVariablesCOP),
    costoTotalCOP: texto(lote.costoTotalCOP),
    unidades: texto(lote.unidadesDeclaradas),
    tipoJoya: texto(lote.joya?.tipoJoya),
    mineralJoya: texto(lote.joya?.mineral),
    gramajeJoya: texto(lote.joya?.gramaje),
    cantidadJoyas: texto(lote.joya?.cantidadJoyas),
    costoPorGramoCOP: texto(lote.joya?.costoPorGramoCOP),
    presupuestoJoyaCOP: texto(lote.joya?.presupuestoJoyaCOP),
    abonoCOP: texto(lote.abonoCOP),
    saldoCOP: texto(lote.saldoCOP),
    formaPago: texto(lote.formaPago),
    estado: texto(lote.estado),
    sede: texto(lote.sede),
    renombre: texto(lote.renombreLote),
    // Los multiplicadores van con dos decimales: son ratios, no pesos, y
    // `2,4501×` dice algo que `2×` esconde.
    costoFijoUnitarioCOP: texto(lote.motor?.costoFijoUnitarioCOP),
    costoVariableUnitarioCOP: texto(lote.motor?.costoVariableUnitarioCOP),
    precioEquilibrioCOP: texto(lote.motor?.precioEquilibrioCOP),
    equilibrioRealCOP: texto(lote.motor?.equilibrioRealCOP),
    precioObjetivoCOP: texto(lote.motor?.precioObjetivoCOP),
    multiplicadorMinimo: decimales(lote.motor?.multiplicadorMinimo),
    multiplicadorObjetivo: decimales(lote.motor?.multiplicadorObjetivo),
    margenBrutoEstimadoCOP: texto(lote.motor?.margenBrutoEstimadoCOP),
    utilidadNetaEstimadaCOP: texto(lote.motor?.utilidadNetaEstimadaCOP),
    puntoEquilibrioUnidades: decimales(lote.motor?.puntoEquilibrioUnidades),
    reglaVigente: texto(lote.motor?.reglaVigente),
    recalculadoEn: texto(lote.motor?.recalculadoEn),
  };
}

/** Un ratio con dos decimales. Ausente ⇒ celda vacía, nunca «0,00». */
function decimales(v?: number): string {
  return v === undefined || v === null || !Number.isFinite(v)
    ? ''
    : v.toFixed(2);
}

export interface FilaTablero {
  periodo: string;
  gastosFijosMesCOP: number;
  lotesActivos: number;
  costoFijoUnitarioCOP?: number;
  inventarioActivoCOP: number;
  ventasMesCOP: number;
  margenBrutoMesCOP: number;
  utilidadNetaEstimadaCOP: number;
  puntoEquilibrioUnidades?: number;
  ventasEstimadasMesCOP?: number;
  brechaVsVentasEstimadasCOP?: number;
  reglaVigente: string;
  actualizadoEn: string;
}

/**
 * El Tablero del período.
 *
 * `ventasEstimadasMesCOP` y `brechaVsVentasEstimadasCOP` van VACÍAS mientras
 * Kevin no dicte la estimada del mes. El `B11` del xlsx la derivaba con un ×2,5
 * hardcodeado y por eso la brecha era un número sin dueño; un cero acá sería el
 * mismo defecto con otra cara.
 */
export function filaTableroParaEspejo(t: FilaTablero): Record<string, string> {
  return {
    periodo: texto(t.periodo),
    gastosFijosMesCOP: texto(t.gastosFijosMesCOP),
    lotesActivos: texto(t.lotesActivos),
    costoFijoUnitarioCOP: texto(t.costoFijoUnitarioCOP),
    inventarioActivoCOP: texto(t.inventarioActivoCOP),
    ventasMesCOP: texto(t.ventasMesCOP),
    margenBrutoMesCOP: texto(t.margenBrutoMesCOP),
    utilidadNetaEstimadaCOP: texto(t.utilidadNetaEstimadaCOP),
    puntoEquilibrioUnidades: decimales(t.puntoEquilibrioUnidades),
    ventasEstimadasMesCOP: texto(t.ventasEstimadasMesCOP),
    brechaVsVentasEstimadasCOP: texto(t.brechaVsVentasEstimadasCOP),
    reglaVigente: texto(t.reglaVigente),
    actualizadoEn: texto(t.actualizadoEn),
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
  /** Del lote, denormalizado: la hoja se lee sin hacer el join a mano. */
  renombreLote?: string;
  tipoJoya?: string;
  gramaje?: number;
  /**
   * Del motor por unidad. **Ausentes ⇒ celda vacía**, nunca cero: el lote no
   * conciliaba o a la casilla le falta el costo. Ver `_lib/motorUnidad.ts`.
   */
  equilibrioRealUnidadCOP?: number;
  precioObjetivoUnidadCOP?: number;
}

export function filaCasillaParaEspejo(
  casilla: FilaCasilla,
): Record<string, string> {
  return {
    itemId: texto(casilla.itemId),
    loteId: texto(casilla.loteId),
    orden: texto(casilla.ordenEnLote),
    renombreLote: texto(casilla.renombreLote),
    estadoCasilla: texto(casilla.estadoCasilla),
    categoriaFiscal: texto(casilla.categoriaFiscal),
    costoUnitarioRealCOP: texto(casilla.costoUnitarioRealCOP),
    renombre: texto(casilla.renombre),
    calidad: texto(casilla.calidad),
    color: texto(casilla.color),
    corte: texto(casilla.corte),
    ct: texto(casilla.ct),
    gradoRareza: texto(casilla.gradoRareza),
    tipoJoya: texto(casilla.tipoJoya),
    gramaje: texto(casilla.gramaje),
    rangoVentaEsperadoCOP: texto(casilla.rangoVentaEsperadoCOP),
    equilibrioRealUnidadCOP: texto(casilla.equilibrioRealUnidadCOP),
    precioObjetivoUnidadCOP: texto(casilla.precioObjetivoUnidadCOP),
  };
}
