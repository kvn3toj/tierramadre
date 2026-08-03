import { describe, it, expect } from 'vitest';
// @ts-expect-error — lib JS con .d.ts hermano, igual que sus vecinas en api/_lib
import { resolveRowTarget } from '../api/_lib/sheet-row-target.js';

/**
 * Regresión del incidente del 2026-08-03 en el tab Inventario del SOT.
 *
 * `api/admin-product-update.ts` creaba filas nuevas con `values.append` sobre un
 * rango abierto (`Inventario!A:BE`). Sheets ancla la "tabla" donde ella decide:
 * con un grid de 102 columnas y un mapa de 57, ancló en AT — las 57 celdas
 * cayeron en AT:CX y la columna A quedó VACÍA.
 *
 * El endpoint devolvió 200 en las 23 llamadas y Convex marcó `syncStatus:
 * 'synced'` en las 13 filas. Por eso lo que se verifica acá es DÓNDE cae el
 * itemId, no que la llamada haya "funcionado": el 200 ya mintió una vez.
 *
 * Y el daño real fue el bucle: sin itemId en A, el push siguiente tampoco lo
 * encontraba, decidía "es nuevo" y appendeaba otra vez. Diez ítems → 21 filas.
 */
const cabecera = [['Item']];
const filas = (...ids: string[]) => [...cabecera, ...ids.map((i) => [i])];

describe('resolveRowTarget — el itemId cae en la columna A o no cae', () => {
  it('encuentra un itemId existente y apunta a SU fila (ruta patch)', () => {
    const colA = filas('520', '521', '522');
    expect(resolveRowTarget(colA, '521')).toEqual({
      foundRow: 3,
      targetRow: 3,
      willAppend: false,
    });
  });

  it('para un itemId nuevo apunta a la primera fila libre, nunca a "donde Sheets quiera"', () => {
    const colA = filas('522', '523', '524');
    const t = resolveRowTarget(colA, '525');
    expect(t.willAppend).toBe(true);
    expect(t.foundRow).toBe(0);
    expect(t.targetRow).toBe(5); // cabecera + 3 datos = 4 → siguiente es 5
  });

  it('EL BUCLE: tras escribir el ítem, el push siguiente lo ENCUENTRA y no vuelve a crear fila', () => {
    const colA = filas('523', '524');
    const primero = resolveRowTarget(colA, '525');
    expect(primero.willAppend).toBe(true);
    expect(primero.targetRow).toBe(4);

    // El itemId aterrizó en la columna A de la fila 4 — que es justo lo que NO
    // pasaba con el append descolocado.
    colA[primero.targetRow - 1] = ['525'];

    const segundo = resolveRowTarget(colA, '525');
    expect(segundo.willAppend).toBe(false);
    expect(segundo.targetRow).toBe(primero.targetRow);
  });

  it('diez ítems nuevos consumen diez filas consecutivas, no veintiuna', () => {
    const colA = filas('524');
    const usadas: number[] = [];
    for (let n = 525; n <= 534; n++) {
      const t = resolveRowTarget(colA, String(n));
      expect(t.willAppend).toBe(true);
      usadas.push(t.targetRow);
      colA[t.targetRow - 1] = [String(n)];
    }
    expect(usadas).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(new Set(usadas).size).toBe(10); // ninguna fila reusada
    // Y re-empujar los diez no crea ni una fila más.
    for (let n = 525; n <= 534; n++) {
      expect(resolveRowTarget(colA, String(n)).willAppend).toBe(false);
    }
  });

  it('ignora filas de cola vacías que devuelve values.get', () => {
    const colA = [...filas('524'), [''], [], ['   ']];
    expect(resolveRowTarget(colA, '525').targetRow).toBe(3);
  });

  it('no confunde la cabecera ni una celda vacía con un itemId', () => {
    expect(resolveRowTarget(filas('524'), 'Item').willAppend).toBe(true);
    expect(resolveRowTarget([['Item'], [''], ['524']], '').willAppend).toBe(true);
  });

  it('tolera espacios y number vs string', () => {
    const colA = [['Item'], ['  524  ']];
    expect(resolveRowTarget(colA, 524).foundRow).toBe(2);
    expect(resolveRowTarget(colA, '524').foundRow).toBe(2);
  });

  it('una hoja sin datos escribe en la fila 2, debajo de la cabecera', () => {
    expect(resolveRowTarget(cabecera, '1').targetRow).toBe(2);
  });
});
