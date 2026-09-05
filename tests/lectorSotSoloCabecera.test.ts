/**
 * El lector del SOT resuelve por CABECERA NOMBRADA, nunca por posición.
 *
 * `get-treasure-sheets` traía fallbacks posicionales heredados de un layout
 * A:U que ya no existe: al 2026-09-05, `SPREADSHEET_ID` y
 * `FOTOSINTESIS_SPREADSHEET_ID` apuntan AL MISMO libro, de 59 columnas
 * (verificado comparando las dos variables y leyendo la fila 1).
 *
 * Contra ese layout, cada índice apuntaba a la columna de al lado:
 *
 *     idx 14 → UBICACIÓN     idx 17 → QR
 *     idx 15 → ASESOR        idx 19 → CAJA
 *     idx 16 → ESTADO        idx 20 → preponderancia
 *     idx 11 → costoBaseCOP
 *
 * Y como el fallback sólo dispara cuando la celda con nombre está VACÍA, el
 * daño caía justo en las filas incompletas: una sin `caja` recibía la URL del
 * QR, una sin `coleccion` recibía un ESTADO, una sin precio recibía el COSTO
 * DE COMPRA.
 *
 * Simulado contra las 576 filas vivas el 2026-09-05, el lector viejo producía:
 * 325 filas con `caja` ← QR, 227 con `coleccion` ← ESTADO, 195 con
 * `asesorActual` ← CAJA, 151 con `estadoAsesor` ← preponderancia y 31 con el
 * costo servido como precio. De esas, 57 y 19 ya estaban PERSISTIDAS en Convex
 * porque el botón «Resincronizar» las estampó.
 *
 * La regla que fija este archivo: con la celda nombrada vacía, el campo sale
 * vacío. Nunca con el valor del vecino.
 */
import { describe, it, expect } from 'vitest';
import { mapRowToTreasureItem } from '../api/get-treasure-sheets';

// Las 23 primeras cabeceras del SOT v3 real, en su orden real.
const HEADERS = [
  'Item', 'FECHA INGRESO INVENTARIO', 'Nombre', 'Peso (ct)', 'Color', 'Calidad',
  'Cant.', 'Corte', 'Medidas', 'Medidas (valores)', 'Categoría', 'costoBaseCOP',
  'precioFinalCOP', '(sin uso)', 'UBICACIÓN', 'ASESOR', 'ESTADO', 'QR',
  'Colección', 'CAJA', 'preponderancia', 'ASESOR ACTUAL', 'ESTADO ASESOR',
];

/**
 * Dos filas, porque una sola no alcanza: `CAJA` es a la vez un campo que se
 * prueba vacío y el vecino del que se alimentaba `asesorActual`. No puede estar
 * vacía y llena en la misma fila.
 */
function filaA(): string[] {
  // Campos propios VACÍOS, vecinos LLENOS.
  const r = new Array(HEADERS.length).fill('');
  r[0] = '999';
  r[2] = 'Pieza de prueba';
  r[11] = '400000';                        // costoBaseCOP — vecino del precio
  r[12] = '';                              // precioFinalCOP VACÍO
  r[14] = 'OFI.CALI';                      // UBICACIÓN
  r[15] = 'M.Gómez';                       // ASESOR — vecino de qr
  r[16] = 'VENDIDA';                       // ESTADO — vecino de colección
  r[17] = 'https://tierramadre.app/p/999'; // QR — vecino de caja
  r[18] = '';                              // Colección VACÍA
  r[19] = '';                              // CAJA VACÍA
  r[20] = '0.37';                          // preponderancia — vecino de estadoAsesor
  r[22] = '';                              // ESTADO ASESOR VACÍO
  return r;
}

function filaB(): string[] {
  // `asesorActual` vacío con su vecino CAJA lleno.
  const r = new Array(HEADERS.length).fill('');
  r[0] = '998';
  r[2] = 'Otra pieza';
  r[19] = 'Legalizada'; // CAJA — vecino de asesorActual
  r[21] = '';           // ASESOR ACTUAL VACÍO
  return r;
}

describe('el lector del SOT no toma la columna vecina', () => {
  const a = mapRowToTreasureItem(filaA(), HEADERS);
  const b = mapRowToTreasureItem(filaB(), HEADERS);

  it('`caja` vacía NO recibe la URL del QR', () => {
    expect(a.caja).toBe('');
    expect(a.caja).not.toContain('tierramadre.app');
  });

  it('`coleccion` vacía NO recibe un ESTADO', () => {
    expect(a.coleccion).toBe('');
    expect(a.coleccion).not.toBe('VENDIDA');
  });

  it('`estadoAsesor` vacío NO recibe la preponderancia', () => {
    expect(a.estadoAsesor).toBe('');
    expect(a.estadoAsesor).not.toBe('0.37');
  });

  it('`asesorActual` vacío NO recibe la CAJA', () => {
    expect(b.asesorActual).toBe('');
    expect(b.asesorActual).not.toBe('Legalizada');
  });

  it('sin precio NO se sirve el costo de compra como precio', () => {
    // El caso que llegaba a quien abre un link de vitrina y a staff: la pieza
    // se cotizaba al costo, ~38% de su precio real.
    expect(a.precioCOP).not.toBe(400000);
    expect(a.precioCOP).toBeFalsy();
  });

  it('lo que SÍ tiene cabecera con valor se lee bien', () => {
    expect(a.ubicacion).toBe('OFI.CALI');
    expect(a.asesor).toBe('M.Gómez');
    expect(a.estado).toBe('VENDIDA');
    expect(a.qr).toBe('https://tierramadre.app/p/999');
    expect(a.nombre).toBe('Pieza de prueba');
    expect(b.caja).toBe('Legalizada');
  });
});

/**
 * El id que viaja al espejo es el CRUDO, no el aplastado por parseInt.
 *
 * `mapRowToTreasureItem` expone dos: `item` (número, para ordenar y para la
 * URL) e `itemId` (crudo). `parseInt('93A')` es 93, así que clavear el upsert
 * del pull por `item` hacía que Romeo (93A) y Julieta (93B) se escribieran
 * las dos sobre la fila del PADRE #93 — que está RETIRADA desde la auditoría
 * de duplicados — y lo devolvía al inventario disponible, en silencio y sin
 * tocar a las hijas.
 *
 * Verificado el 2026-09-04 contra la respuesta viva: las dos filas llegaban con
 * `item: 93` y `itemId: "93A"` / `"93B"`.
 */
describe('las subdivisiones conservan su identidad', () => {
  const fila = (id: string) => {
    const r = new Array(HEADERS.length).fill('');
    r[0] = id;
    r[2] = id === '93A' ? 'Romeo' : 'Julieta';
    return r;
  };

  it('`item` aplasta la letra pero `itemId` la conserva', () => {
    const a = mapRowToTreasureItem(fila('93A'), HEADERS);
    const b = mapRowToTreasureItem(fila('93B'), HEADERS);
    expect(a.item).toBe(93);
    expect(b.item).toBe(93); // el mismo número: por eso colisionaban
    expect(a.itemId).toBe('93A');
    expect(b.itemId).toBe('93B');
    expect(a.itemId).not.toBe(b.itemId);
  });

  it('dos hijas distintas nunca comparten `itemId`', () => {
    const ids = ['93A', '93B'].map(
      (id) => mapRowToTreasureItem(fila(id), HEADERS).itemId,
    );
    expect(new Set(ids).size).toBe(2);
  });
});
