/**
 * vitrinaSelection — el contrato puro de la selección múltiple del catálogo.
 *
 * Lo que se fija acá no es estética:
 *
 *   1. **El tope de 50 es del servidor, no nuestro.** `api/vitrina.ts:282` rechaza
 *      un enlace con más de 50 ids. Si el cliente deja pasar el 51, el asesor
 *      arma sesenta piezas y descubre el techo recién al presionar Compartir,
 *      con el cliente ya esperando.
 *
 *   2. **El orden es el orden en que el asesor tocó.** Es el orden en que el
 *      cliente va a ver las piezas en /v/<token>. Un Set lo perdería.
 *
 *   3. **Quitar SIEMPRE se puede, incluso en el tope.** Un tope que también
 *      bloquea la deselección deja al asesor encerrado en 50 piezas sin forma
 *      de cambiar una.
 *
 *   4. **Podar es por existencia, no por filtro.** La selección sobrevive a los
 *      cambios de filtro a propósito (curar tres de Muzo y luego dos de
 *      Chivor); sólo se cae un id cuando la pieza desaparece del catálogo.
 */
import { describe, it, expect } from 'vitest';
import {
  VITRINA_MAX_ITEMS,
  toggleId,
  pruneIds,
  toShareItems,
  selectionLabel,
} from '../src/utils/vitrinaSelection';

describe('VITRINA_MAX_ITEMS', () => {
  it('es 50 — el mismo techo que impone /api/vitrina', () => {
    expect(VITRINA_MAX_ITEMS).toBe(50);
  });
});

describe('toggleId', () => {
  it('agrega al final, preservando el orden de toque', () => {
    const a = toggleId([], 7, 50);
    const b = toggleId(a.ids, 3, 50);
    const c = toggleId(b.ids, 9, 50);
    expect(c.ids).toEqual([7, 3, 9]);
    expect(c.rejected).toBe(false);
  });

  it('quita el id ya presente sin alterar el orden de los demás', () => {
    const { ids, rejected } = toggleId([7, 3, 9], 3, 50);
    expect(ids).toEqual([7, 9]);
    expect(rejected).toBe(false);
  });

  it('rechaza el que sobrepasa el tope y devuelve la lista intacta', () => {
    const lleno = Array.from({ length: 50 }, (_, i) => i + 1);
    const { ids, rejected } = toggleId(lleno, 999, 50);
    expect(rejected).toBe(true);
    expect(ids).toHaveLength(50);
    expect(ids).toEqual(lleno);
    expect(ids).not.toContain(999);
  });

  it('en el tope SÍ deja quitar — si no, el asesor queda encerrado en 50', () => {
    const lleno = Array.from({ length: 50 }, (_, i) => i + 1);
    const { ids, rejected } = toggleId(lleno, 25, 50);
    expect(rejected).toBe(false);
    expect(ids).toHaveLength(49);
    expect(ids).not.toContain(25);
  });

  it('acepta el que llega exactamente al tope (el 50, no el 51)', () => {
    const casi = Array.from({ length: 49 }, (_, i) => i + 1);
    const { ids, rejected } = toggleId(casi, 777, 50);
    expect(rejected).toBe(false);
    expect(ids).toHaveLength(50);
    expect(ids[49]).toBe(777);
  });

  it('no muta la lista que recibe', () => {
    const original = [1, 2];
    const copia = [...original];
    toggleId(original, 3, 50);
    toggleId(original, 1, 50);
    expect(original).toEqual(copia);
  });
});

describe('pruneIds', () => {
  it('deja caer los ids cuya pieza ya no existe, conservando el orden', () => {
    const vivos = new Set([7, 9]);
    expect(pruneIds([7, 3, 9], (id) => vivos.has(id))).toEqual([7, 9]);
  });

  it('devuelve la MISMA referencia cuando no hay nada que podar', () => {
    // Identidad estable: el hook deriva estado de esto en un efecto, y una
    // referencia nueva en cada render sería un bucle de re-render.
    const ids = [7, 9];
    expect(pruneIds(ids, () => true)).toBe(ids);
  });

  it('vacía la lista cuando ninguna pieza sobrevive', () => {
    expect(pruneIds([1, 2, 3], () => false)).toEqual([]);
  });
});

describe('toShareItems', () => {
  const byId = new Map([
    [7, { item: 7, nombre: 'Aura', precioCOP: 1_716_000, color: 'Verde' }],
    [9, { item: 9, nombre: 'Venus', precioCOP: 2_400_000, color: 'Azul' }],
  ]);

  it('construye el ShareItem con nombre y precio, en el orden de la selección', () => {
    expect(toShareItems([9, 7], byId)).toEqual([
      { item: 9, nombre: 'Venus', precioCOP: 2_400_000 },
      { item: 7, nombre: 'Aura', precioCOP: 1_716_000 },
    ]);
  });

  it('omite los ids sin pieza en el mapa en vez de emitir un hueco', () => {
    expect(toShareItems([7, 404], byId)).toEqual([
      { item: 7, nombre: 'Aura', precioCOP: 1_716_000 },
    ]);
  });
});

describe('selectionLabel', () => {
  it('usa el singular con una sola pieza', () => {
    expect(selectionLabel(1)).toBe('1 pieza seleccionada');
  });

  it('usa el plural con más de una', () => {
    expect(selectionLabel(3)).toBe('3 piezas seleccionadas');
  });

  it('usa el plural también en cero', () => {
    expect(selectionLabel(0)).toBe('0 piezas seleccionadas');
  });
});
