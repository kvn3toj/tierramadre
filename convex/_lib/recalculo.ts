/**
 * El recálculo del gasto fijo unitario cuando el inventario cambia de tamaño.
 *
 * El fijo por lote (`configPrecios ÷ lotes activos`) es **dinámico**: entra un
 * lote y baja para todos, se agota un lote y sube. En la hoja eso se hace a
 * mano, que es exactamente cómo se llega a un `E6` viejo cotizando el catálogo
 * entero.
 *
 * Puro, sin IO de Convex y sin reloj: la mutation cuenta los lotes antes y
 * después, le pasa los dos números a `planificarRecalculo`, y este decide. Toda
 * la parte branchy —la que se equivoca— vive aquí, testeada.
 *
 * Dos candados que este módulo existe para sostener:
 *
 *  1. **Consignación y devolución no recalculan.** La pieza sigue viva en el
 *     inventario, solo cambió de manos. Es una regla del TIPO de evento, no del
 *     conteo: aunque los números vinieran distintos, la respuesta es no.
 *  2. **Nada retroactivo sobre lo VENDIDA** (`unidadesAReprecificar`). Una venta
 *     cerrada tiene su precio; moverlo cambiaría márgenes y comisiones ya
 *     liquidados.
 */
import { costoFijoUnitario, type ConfigPrecios } from './motorPrecios';

/** Estados en que puede estar una unidad. `VENDIDA` es el único terminal. */
export type EstadoUnidad =
  | 'DISPONIBLE'
  | 'RESERVADA'
  | 'EN_CONSIGNACION'
  | 'ASESOR'
  | 'VENDIDA'
  | (string & {});

/** Los eventos que la operación puede producir sobre el inventario. */
export type EventoRecalculo =
  'ALTA_LOTE' | 'VENTA' | 'CONSIGNACION' | 'DEVOLUCION' | 'CANCELACION_LOTE';

/**
 * Eventos que pueden mover el divisor. El resto no se evalúa siquiera: la regla
 * es del tipo de evento, para que un conteo mal calculado aguas arriba no pueda
 * disparar un recálculo que el modelo no autoriza.
 */
const EVENTOS_QUE_MUEVEN_INVENTARIO: ReadonlySet<EventoRecalculo> = new Set([
  'ALTA_LOTE',
  'VENTA',
  'CANCELACION_LOTE',
]);

/**
 * Un lote está activo si tiene **al menos una unidad no vendida** (decisión D2).
 *
 * Un lote sin unidades todavía —recién creado, casillas aún sin llenar— no está
 * activo: no hay nada que cotizar, así que no debe absorber gasto fijo ni
 * diluir el de los demás.
 */
export function loteEstaActivo(unidades: { estado: EstadoUnidad }[]): boolean {
  return unidades.some((u) => u.estado !== 'VENDIDA');
}

/** Cuántos lotes de la lista están activos. Es el divisor de D2. */
export function contarLotesActivos(
  lotes: { estado: EstadoUnidad }[][],
): number {
  return lotes.reduce(
    (acc, unidades) => acc + (loteEstaActivo(unidades) ? 1 : 0),
    0,
  );
}

/**
 * La fila que queda en `recalculos`. Existe para poder responder después «¿por
 * qué cambió este precio?» sin reconstruirlo de memoria.
 */
export interface TrazaRecalculo {
  ts: number;
  evento: EventoRecalculo;
  /** El divisor efectivamente aplicado: lotes activos (D2). */
  divisorUsado: number;
  /**
   * Piezas no vendidas. **Informativo, no es el divisor.** Se traza porque el
   * conteo alterno (unidades en vez de lotes) fue la decisión que D2 descartó, y
   * guardarlo permite auditar después qué habría pasado con el otro criterio sin
   * volver a inventar el número.
   */
  unidadesActivas: number;
  valorAnterior: number;
  valorNuevo: number;
}

export interface PlanRecalculo {
  recalcula: boolean;
  /** Por qué sí o por qué no — se registra también cuando la respuesta es no. */
  motivo: string;
  /** Presente solo cuando `recalcula` es true. */
  traza?: TrazaRecalculo;
}

export interface PlanificarRecalculoInput {
  evento: EventoRecalculo;
  config: ConfigPrecios;
  lotesActivosAntes: number;
  lotesActivosDespues: number;
  unidadesActivas: number;
  ts: number;
}

/**
 * Decide si un evento mueve el gasto fijo unitario, y con qué traza.
 *
 * El orden de las guardas importa: primero el TIPO de evento (candado 1), luego
 * si el conteo se movió de verdad. Una venta que deja piezas vivas en su lote no
 * cambia nada — recalcular ahí repreciaría el catálogo en cada venta suelta.
 */
export function planificarRecalculo(
  input: PlanificarRecalculoInput,
): PlanRecalculo {
  const { evento, config, lotesActivosAntes, lotesActivosDespues } = input;

  if (!EVENTOS_QUE_MUEVEN_INVENTARIO.has(evento)) {
    return {
      recalcula: false,
      motivo:
        `${evento} no cambia el inventario activo: la pieza sigue viva y solo ` +
        `cambió de manos. El divisor no se mueve.`,
    };
  }

  if (lotesActivosDespues === lotesActivosAntes) {
    return {
      recalcula: false,
      motivo:
        `${evento} dejó el conteo de lotes activos en ${lotesActivosAntes}: ` +
        `el lote sigue con unidades sin vender.`,
    };
  }

  if (lotesActivosDespues <= 0) {
    // Sin lotes activos el fijo no tiene entre qué repartirse. Dejar el último
    // valor vigente es más honesto que dividir por cero.
    return {
      recalcula: false,
      motivo:
        `sin lotes activos tras ${evento}: no hay entre qué repartir el gasto ` +
        `fijo, se conserva el último valor vigente.`,
    };
  }

  const valorAnterior =
    lotesActivosAntes > 0
      ? costoFijoUnitario(config.gastosFijosMensualesCOP, lotesActivosAntes)
      : 0;
  const valorNuevo = costoFijoUnitario(
    config.gastosFijosMensualesCOP,
    lotesActivosDespues,
  );

  return {
    recalcula: true,
    motivo:
      `${evento} movió los lotes activos de ${lotesActivosAntes} a ` +
      `${lotesActivosDespues}: el gasto fijo por lote pasa de ${valorAnterior} ` +
      `a ${valorNuevo}.`,
    traza: {
      ts: input.ts,
      evento,
      divisorUsado: lotesActivosDespues,
      unidadesActivas: input.unidadesActivas,
      valorAnterior,
      valorNuevo,
    },
  };
}

/**
 * Las unidades a las que se les aplica el fijo nuevo: todas menos las vendidas.
 *
 * Devuelve una lista nueva; no toca la que recibe. La pieza en consignación SÍ
 * entra —todavía no se vendió, su precio aún puede moverse—; la vendida no.
 */
export function unidadesAReprecificar<T extends { estado: EstadoUnidad }>(
  unidades: readonly T[],
): T[] {
  return unidades.filter((u) => u.estado !== 'VENDIDA');
}
