/**
 * El riel legacy no puede escribir lo que el delta sync tiene prohibido.
 *
 * Había DOS caminos hoja→Convex sobre `productInventory`:
 *
 *   A) el delta sync — Apps Script → /sync/foto → fotoSync.upsertTable, que
 *      filtra por `WRITABLE.inventory` (el allowlist);
 *   B) el pull legacy — botón «Resincronizar» → products:_pullFromSheet →
 *      _upsertManyFromSheet, que armaba su patch A MANO, sin mirar el allowlist.
 *
 * Y el riel B no está deprecado: no tiene ningún marcador, la acción pública
 * `pullFromSheet` la llama la pantalla de inventario, y se estaba usando (572
 * filas con `lastPulledAt` del 1-sep).
 *
 * Peor: lee `SPREADSHEET_ID`, que apunta AL MISMO libro que
 * `FOTOSINTESIS_SPREADSHEET_ID` — el SOT v3 vivo, de 59 columnas — con un
 * lector escrito para un layout de 21. Ésa es la combinación que estampó el QR
 * en `caja` de 57 filas y un ESTADO en `coleccion` de 19.
 */
import { describe, it, expect } from 'vitest';
import { WRITABLE } from '../convex/_lib/sheetPullMaps';

/** Los 19 campos que el pull legacy arma a mano en `_upsertManyFromSheet`. */
const CAMPOS_DEL_PULL_LEGACY = [
  'nombre', 'peso', 'color', 'calidad', 'cantidad', 'talla', 'tallaAnillo',
  'medidas', 'medidasValores', 'categoria', 'precioCOP', 'ubicacion', 'asesor',
  'estado', 'qr', 'coleccion', 'caja', 'asesorActual', 'estadoAsesor',
];

describe('el allowlist gobierna los dos rieles', () => {
  const permitido = (k: string) =>
    Object.prototype.hasOwnProperty.call(WRITABLE.inventory, k);

  it('`precioCOP` NO está permitido — y el pull legacy lo escribía', () => {
    // El riel muerto: sin columna en el espejo desde 2026-05-29, y el mismo
    // que dejó doce piezas de TM-001 sin precio público.
    expect(permitido('precioCOP')).toBe(false);
    // Estaba en la lista que el pull armaba a mano: por eso hacía falta el filtro.
    expect(CAMPOS_DEL_PULL_LEGACY).toContain('precioCOP');
  });

  it('el campo VIVO sí está permitido', () => {
    expect(permitido('precioFinalCOP')).toBe(true);
    expect(permitido('precioFinalUSD')).toBe(true);
  });

  it('las exclusiones compradas con incidentes siguen excluidas', () => {
    // fotoUrl y certificadoUrl: excluidos el 2026-08-15, costó 9 fotos.
    expect(permitido('fotoUrl')).toBe(false);
    expect(permitido('certificadoUrl')).toBe(false);
    // mostrarEnCatalogo: excluido el 2026-07-30, casi despublica 285 piezas.
    expect(permitido('mostrarEnCatalogo')).toBe(false);
  });

  it('filtrar los campos del pull legacy deja fuera exactamente lo prohibido', () => {
    const pasan = CAMPOS_DEL_PULL_LEGACY.filter(permitido);
    const quedan = CAMPOS_DEL_PULL_LEGACY.filter((k) => !permitido(k));
    // Hoy el único que cae es `precioCOP`; si mañana alguien agrega otro campo
    // prohibido a esa lista, este test lo nombra en vez de dejarlo pasar.
    expect(quedan).toEqual(['precioCOP']);
    expect(pasan).toHaveLength(CAMPOS_DEL_PULL_LEGACY.length - 1);
    // Y lo que pasa, pasa entero: no se pierde ningún campo legítimo.
    expect(pasan).toContain('estado');
    expect(pasan).toContain('coleccion');
    expect(pasan).toContain('caja');
  });
});
