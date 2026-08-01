/**
 * El proveedor centinela de las agrupaciones reconstruidas.
 *
 * Los 28 lotes `reconstruido` que la migración de ensayo crea no traen proveedor
 * en la hoja: son agrupaciones retroactivas armadas desde colecciones legadas,
 * no compras. `providerId` es una FK obligatoria, así que había que elegir entre
 * inventar un proveedor o no crear los lotes — y no crearlos deja el divisor del
 * gasto fijo repartido entre menos lotes de los que existen.
 *
 * La salida es una TERCERA opción: **una sola fila centinela**, explícita, que
 * dice en su propio nombre que el dato falta. Ponerle un proveedor real le
 * atribuiría piedras ajenas a alguien que nunca las vendió, y ese error es
 * invisible una vez guardado (dictamen de Kevin, 2026-08-01).
 *
 * Cada lote que la apunte va al reporte de excepciones, para que Kevin la
 * reemplace cuando se sepa el proveedor real.
 *
 * Puro y sin IO. La fila se inserta desde `convex/migracionV4.ts`.
 */

/**
 * El nombre viaja al espejo y a la ficha del lote, así que tiene que leerse como
 * lo que es. Uno neutro («Sin proveedor») se lee como un proveedor que se llama
 * así; este se lee como una fila pendiente de reemplazo.
 */
export const NOMBRE_PROVEEDOR_CENTINELA =
  '— RECONSTRUIDO (sin dato de compra) —';

/** Lo mínimo que hace falta para clasificar una fila de `providers`. */
export interface ProveedorClasificable {
  nombreORazonSocial: string;
  centinela?: boolean;
}

/**
 * Si esta fila es el centinela.
 *
 * Mira la BANDERA, no el nombre. Si la marca fuera el nombre, renombrar la fila
 * —a mano, o por un pull— la convertiría en un proveedor normal y volvería a
 * aparecer en los pickers, disponible para que alguien le atribuya una compra.
 */
export function esProveedorCentinela(p: ProveedorClasificable): boolean {
  return p.centinela === true;
}

/**
 * Saca el centinela de una lista.
 *
 * Va en los PICKERS y en los reportes de proveedores: nadie tiene que poder
 * elegirlo al capturar un lote nuevo, ni verlo sumado como si le hubiera vendido
 * algo a la empresa.
 *
 * NO va en la búsqueda por id (`providers.get`): en la ficha del lote el nombre
 * tiene que verse, que es justamente el punto de que exista.
 */
export function filtrarCentinelas<T extends ProveedorClasificable>(
  proveedores: readonly T[],
): T[] {
  return proveedores.filter((p) => !esProveedorCentinela(p));
}
