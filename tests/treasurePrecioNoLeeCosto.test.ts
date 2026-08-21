import { describe, it, expect } from 'vitest';
import { mapRowToTreasureItem } from '../api/get-treasure-sheets';

/**
 * El catálogo NUNCA debe servir `costoBaseCOP` como precio de venta.
 *
 * `precioCOP` se resolvía con la cadena
 *   'precio cop' → 'preciofinalcop' → 'precioembajadorcop' → getByIndex(11)
 * y ese respaldo posicional es, en el SOT v3, la columna L: el COSTO. El
 * comentario del código ya lo advertía ("en el SOT el índice 11 es
 * costoBaseCOP") dando por hecho que el respaldo sólo aplicaba al libro legacy
 * — pero `SPREADSHEET_ID` apunta hoy al MISMO libro que
 * `FOTOSINTESIS_SPREADSHEET_ID` (1oRw1KSh…), así que caía siempre.
 *
 * Medido contra producción el 2026-08-21: 22 ítems sin precio servían su costo
 * como precio de venta, $151.243.284 en total. El peor, #544 "Viaje Estelar",
 * se ofertaba a $41.340.039 — su costo exacto, margen cero, y nada en la ficha
 * que lo delatara.
 *
 * Sin precio, `precioCOP` debe quedar en 0: useTreasureFiltering pinta
 * "Consultar precio", que es la verdad, en vez de un número que invita a
 * vender a pérdida.
 */
const HEADERS = [
  'Item', // 0
  'FECHA INGRESO INVENTARIO', // 1
  'Nombre', // 2
  'Peso (ct)', // 3
  'Color', // 4
  'Calidad', // 5
  'Cant.', // 6
  'Corte', // 7
  'Medidas', // 8
  'Medidas (valores)', // 9
  'Categoría', // 10
  'costoBaseCOP', // 11  ← el que se colaba
  'precioFinalCOP', // 12
];

const fila = (costo: string, precioFinal: string) => [
  '544',
  '2026-08-12',
  'Viaje Estelar',
  '4.11',
  'Verde Muzo',
  'F1',
  '1',
  'Esmeralda',
  '10.09 x 5.59',
  '',
  'Gema',
  costo,
  precioFinal,
];

describe('get-treasure-sheets — el costo no se sirve como precio', () => {
  it('sin precioFinalCOP, precioCOP queda en 0 (no cae a la columna L)', () => {
    const item = mapRowToTreasureItem(fila('41340039', ''), HEADERS);
    expect(
      item.precioCOP,
      'el catálogo está sirviendo costoBaseCOP como precio de venta',
    ).toBe(0);
  });

  it('con precioFinalCOP, lo usa', () => {
    const item = mapRowToTreasureItem(fila('41340039', '107484101'), HEADERS);
    expect(item.precioCOP).toBe(107484101);
  });

  it('el libro legacy sigue resolviendo por su encabezado nombrado', () => {
    // La legacy de 21 columnas trae "Precio COP": la cadena por nombre la
    // encuentra sin necesidad de ningún respaldo posicional.
    const legacyHeaders = ['Item', 'Nombre', 'Precio COP'];
    const item = mapRowToTreasureItem(
      ['12', 'Rey Midas', '830116'],
      legacyHeaders,
    );
    expect(item.precioCOP).toBe(830116);
  });
});
