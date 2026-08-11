import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  FOTO_INVENTARIO_COLUMNS,
  FOTO_INVENTARIO_LAST_COL,
} from '../api/_lib/fotosintesis-inventory-columns.js';

/**
 * El rango con el que se lee la pestaña Inventario ya se quedó corto DOS veces,
 * y las dos fallaron en silencio — la hoja tenía el dato, el endpoint devolvía
 * el campo vacío y los tests seguían en verde:
 *
 *   - `A:Z`  dejaba fuera `fotoUrl` (AL): las fotos de Fotosíntesis nunca
 *     llegaban al catálogo.
 *   - `A:AP` dejaba fuera `tallaAnillo` (BF) el 2026-08-11, justo después de
 *     migrar la columna: los 37 anillos salían sin talla en producción.
 *
 * El array de columnas es la fuente de verdad del ancho, así que el rango tiene
 * que derivarse de él. Estos tests fallan si alguien vuelve a fijarlo a mano.
 */

const HANDLERS = [
  'api/get-treasure-sheets.ts',
  'api/ambassador-products.ts', // comparte mapRowToTreasureItem
];

const src = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');

describe('rango de lectura de la pestaña Inventario', () => {
  it.each(HANDLERS)('%s deriva el rango de FOTO_INVENTARIO_LAST_COL', (rel) => {
    const code = src(rel);
    expect(code).toContain('FOTO_INVENTARIO_LAST_COL');
    expect(code).toContain('!A:${FOTO_INVENTARIO_LAST_COL}');
  });

  it.each(HANDLERS)('%s no fija el rango a mano', (rel) => {
    // Acotado a la lectura del INVENTARIO: estos handlers también leen la
    // pestaña Asesores con un `!A:Z` que es correcto y no debe disparar acá.
    // El bug es una letra literal tras el nombre de la hoja de inventario,
    // p. ej. `${inventorySheet}!A:AP` o `${targetSheet}!A:AP`.
    const hardcoded = src(rel).match(
      /\$\{(?:inventorySheet|targetSheet)\}!A:[A-Z]{1,2}`/g,
    );
    expect(hardcoded, `rango fijo encontrado: ${hardcoded?.join(', ')}`).toBe(
      null,
    );
  });

  it('el rango derivado llega hasta la última columna del mapa', () => {
    const lastIndex = FOTO_INVENTARIO_COLUMNS.length - 1;
    // Reimplementado a propósito: si columnIndexToLetter se rompe, este test lo
    // ve en vez de comparar el bug consigo mismo.
    const expected = (() => {
      let n = lastIndex;
      let s = '';
      do {
        s = String.fromCharCode((n % 26) + 65) + s;
        n = Math.floor(n / 26) - 1;
      } while (n >= 0);
      return s;
    })();
    expect(FOTO_INVENTARIO_LAST_COL).toBe(expected);
  });

  it('tallaAnillo (BF) cae dentro del rango que se lee', () => {
    const idx = FOTO_INVENTARIO_COLUMNS.findIndex(
      (c: { key: string }) => c.key === 'tallaAnillo',
    );
    expect(idx).toBeGreaterThan(-1);
    expect(idx).toBeLessThanOrEqual(FOTO_INVENTARIO_COLUMNS.length - 1);
  });
});
