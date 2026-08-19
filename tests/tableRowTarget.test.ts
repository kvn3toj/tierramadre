import { describe, it, expect } from 'vitest';
import { resolveTableRowTarget } from '../api/_lib/table-row-target';

/**
 * Regresión del incidente TM-001 (2026-08-19).
 *
 * `api/admin-table-update.ts` en modo "append" escribía POSICIONALMENTE en el
 * `rowIndex` que mandaba el caller, sin verificar la columna A — el guard sólo
 * corría en "patch". Un push de C-090 con hint viejo (111) PISÓ la fila de
 * TM-001, que ocupaba esa fila desde el 15-ago. Se restauró desde Convex
 * (los lotes no tienen pull; la hoja es espejo puro), pero la mina quedaba:
 * cualquier alta con contador de filas atrasado podía pisar una fila ajena.
 *
 * El tratamiento es el mismo que admin-product-update recibió el 2026-08-03 y
 * el 2026-08-18: la fila destino se LOCALIZA por la clave natural en la
 * columna A — nunca por el hint del caller — y una fila nueva va a la primera
 * libre real. El hint queda como eco de debugging.
 */
const cabecera = [['loteId']];
const filas = (...ids: string[]) => [...cabecera, ...ids.map((i) => [i])];

describe('resolveTableRowTarget — la columna A manda, no el hint del caller', () => {
  it('el caso TM-001: un id nuevo con hint viejo va a la primera fila LIBRE, no al hint', () => {
    // La hoja real del incidente: 111 filas con dato, TM-001 en la última.
    const colA = filas(
      ...Array.from({ length: 109 }, (_, i) => `C-${String(i + 1).padStart(3, '0')}`),
      'TM-001',
    );
    const t = resolveTableRowTarget(colA, 'C-090-BIS');
    expect(t.willAppend).toBe(true);
    expect(t.targetRow).toBe(112); // después de TM-001 — jamás encima
  });

  it('un id que YA está se actualiza en SU fila (retry de append idempotente, no duplica)', () => {
    const colA = filas('C-088', 'C-089', 'TM-001');
    const t = resolveTableRowTarget(colA, 'TM-001');
    expect(t).toEqual({ targetRow: 4, willAppend: false, matchedKey: 'TM-001' });
  });

  it('rename: localiza por el valor VIEJO que aún vive en la columna A', () => {
    const colA = filas('Proveedor Antiguo SA', 'Otro');
    const t = resolveTableRowTarget(colA, 'Proveedor Nuevo SAS', 'Proveedor Antiguo SA');
    expect(t).toEqual({
      targetRow: 2,
      willAppend: false,
      matchedKey: 'Proveedor Antiguo SA',
    });
  });

  it('rename ya aterrizado (retry): el viejo no está pero el NUEVO sí — su fila, sin duplicar', () => {
    const colA = filas('Proveedor Nuevo SAS', 'Otro');
    const t = resolveTableRowTarget(colA, 'Proveedor Nuevo SAS', 'Proveedor Antiguo SA');
    expect(t).toEqual({
      targetRow: 2,
      willAppend: false,
      matchedKey: 'Proveedor Nuevo SAS',
    });
  });

  it('ni el viejo ni el nuevo están → fila nueva al final (el espejo es la fuente y recrea)', () => {
    const colA = filas('A-001');
    const t = resolveTableRowTarget(colA, 'B-002', 'B-001');
    expect(t.willAppend).toBe(true);
    expect(t.targetRow).toBe(3);
  });
});
