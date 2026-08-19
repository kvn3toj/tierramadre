/**
 * Dónde escribir la fila de una tabla keyed por clave natural en la columna A
 * (Lotes, Proveedores, Clientes, Ventas, SubLotes, MovimientosAsesor).
 *
 * Hermana de `sheet-row-target.js` (que hace lo mismo para el Inventario),
 * con la vuelta extra del RENAME: cuando la clave natural cambia (providers.
 * nombreORazonSocial, clients.nombre), la hoja aún tiene el valor VIEJO en la
 * columna A — se localiza por él, y si no está (el rename ya aterrizó en un
 * intento anterior), por el NUEVO. Sólo si ninguno aparece la fila es nueva.
 *
 * Existe por el incidente TM-001 (2026-08-19): el modo "append" de
 * admin-table-update escribía en el `rowIndex` del caller sin mirar la
 * columna A, y un push de C-090 con hint viejo pisó la fila de TM-001. La
 * columna A manda; el hint del caller es sólo un eco de debugging.
 */

import { resolveRowTarget } from './sheet-row-target.js';

export type TableRowTarget = {
  /** Fila física destino (1-based). */
  targetRow: number;
  /** true = la fila es nueva; false = se actualiza una existente. */
  willAppend: boolean;
  /** Con qué valor de columna A se localizó la fila existente (null si es nueva). */
  matchedKey: string | null;
};

export function resolveTableRowTarget(
  colA: string[][],
  idValue: string,
  previousIdValue?: string,
): TableRowTarget {
  const clavePrimaria = previousIdValue ?? idValue;
  const primero = resolveRowTarget(colA, clavePrimaria);
  if (primero.foundRow > 0) {
    return {
      targetRow: primero.foundRow,
      willAppend: false,
      matchedKey: clavePrimaria,
    };
  }
  if (previousIdValue) {
    const porNuevo = resolveRowTarget(colA, idValue);
    if (porNuevo.foundRow > 0) {
      return {
        targetRow: porNuevo.foundRow,
        willAppend: false,
        matchedKey: idValue,
      };
    }
  }
  return { targetRow: primero.targetRow, willAppend: true, matchedKey: null };
}
