/**
 * Ata la frontera de Fotosíntesis a las dos fuentes que pueden moverse sin que
 * nadie mire: el espejo posicional del SOT y el código de las queries.
 *
 * El riesgo real no es que alguien borre `omitFotosintesisOnly` — eso se ve en
 * la review. Es que alguien agregue la columna BF al SOT dentro de seis meses,
 * la sume al espejo, y esa columna empiece a salir por la ficha de producto sin
 * que ningún test se queje, porque las dos queries devuelven el documento
 * entero y ensanchan solas.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  FOTOSINTESIS_ONLY_FIELDS,
  omitFotosintesisOnly,
} from '../convex/_lib/saleSafe';
import { WRITABLE } from '../convex/_lib/sheetPullMaps';
import { FOTO_INVENTARIO_COLUMNS } from '../api/_lib/fotosintesis-inventory-columns.js';

const COLS = FOTO_INVENTARIO_COLUMNS as Array<{
  key: string;
  header: string;
  preserve?: boolean;
}>;
/**
 * AQ→BE — el bloque hoja-primero. AS no cuenta: es un hueco sin key real.
 * El corte de la derecha se ancla a `notasConflictos` (BE) y no al final del
 * array: desde 2026-08-11 hay columnas DESPUÉS del bloque (BF `tallaAnillo`)
 * que sí son de la app y por tanto no llevan preserve.
 */
const AQ_INDEX = 42;
const BE_INDEX = COLS.findIndex((c) => c.key === 'notasConflictos');
const SHEET_OWNED_COLS = COLS.slice(AQ_INDEX, BE_INDEX + 1);
const SHEET_OWNED = SHEET_OWNED_COLS.map((c) => c.key).filter(
  (k) => k !== '_sinUso2',
);

describe('frontera Fotosíntesis ↔ ficha de producto', () => {
  it('las 14 columnas AQ→BE están todas en la lista', () => {
    // Si mañana se agrega BF al espejo y no acá, esto falla — que es el punto.
    for (const key of SHEET_OWNED) {
      expect(FOTOSINTESIS_ONLY_FIELDS as readonly string[], key).toContain(key);
    }
    expect(FOTOSINTESIS_ONLY_FIELDS).toHaveLength(SHEET_OWNED.length);
  });

  it('todas se sincronizan (si no, filtrarlas no significa nada)', () => {
    for (const key of FOTOSINTESIS_ONLY_FIELDS) {
      expect(Object.keys(WRITABLE.inventory), key).toContain(key);
    }
  });

  it('ninguna la puede escribir la app: todas van con preserve', () => {
    // Sin `preserve`, el merge de admin-product-update reconstruye la fila y
    // borra 513 filas de dato humano.
    for (const c of SHEET_OWNED_COLS) {
      expect(c.preserve, `${c.key} sin preserve`).toBe(true);
    }
  });

  it('omitFotosintesisOnly las saca y no toca el resto', () => {
    const row = {
      itemId: '472',
      nombre: 'Mellizas del Alba',
      precioCOP: 830116,
      ...Object.fromEntries(FOTOSINTESIS_ONLY_FIELDS.map((k) => [k, 'X'])),
    };
    const out = omitFotosintesisOnly(row) as Record<string, unknown>;
    for (const k of FOTOSINTESIS_ONLY_FIELDS) expect(out).not.toHaveProperty(k);
    expect(out.itemId).toBe('472');
    expect(out.nombre).toBe('Mellizas del Alba');
    expect(out.precioCOP).toBe(830116);
  });

  it('las tres queries que devuelven la fila entera aplican el filtro', () => {
    // Chequeo sobre el fuente a propósito: montar convex-test para esto es
    // desproporcionado, y lo que se quiere evitar es que alguien reemplace el
    // `.map(omitFotosintesisOnly)` por un return pelado.
    const root = path.resolve(__dirname, '..');
    const products = fs.readFileSync(
      path.join(root, 'convex/products.ts'),
      'utf8',
    );
    const lotItems = fs.readFileSync(
      path.join(root, 'convex/lotItems.ts'),
      'utf8',
    );
    // Acotar el bloque hasta el SIGUIENTE `export const`, no hasta el primer
    // `});`: ese cierre aparece antes, dentro del callback del filter, y dejaba
    // el `.map(...)` fuera de la ventana.
    const bloque = (src: string, nombre: string) => {
      const i = src.indexOf(`export const ${nombre}`);
      expect(i, `no se encontró ${nombre}`).toBeGreaterThan(-1);
      const resto = src.slice(i + 10);
      const j = resto.indexOf('\nexport const ');
      return j === -1 ? resto : resto.slice(0, j);
    };
    expect(
      bloque(products, 'getByItem'),
      'products:getByItem devuelve la fila sin filtrar',
    ).toContain('omitFotosintesisOnly');
    expect(
      bloque(lotItems, 'search'),
      'lotItems:search devuelve la fila sin filtrar',
    ).toContain('omitFotosintesisOnly');
    // `get` es la tercera, y estuvo sin filtro hasta 2026-07-30. Devolvía el
    // documento crudo —53 campos— a cualquiera: verificado contra producción
    // con un POST anónimo a /api/query, que contestó con cajaComprador (nombre
    // de un comprador real), cajaValorPagadoCOP y costoBaseCOP. La ficha de
    // producto se salvaba sola porque ProductDetailPage pasa 'skip' cuando el
    // viewer no es admin — pero eso es la app absteniéndose de preguntar, no el
    // servidor negándose a contestar, y la URL del deployment viaja en el
    // bundle.
    //
    // `get = query` desambigua: `get` a secas también prefijea a `getByItem` y
    // `getManyByItemIds`.
    expect(
      bloque(products, 'get = query'),
      'products:get devuelve la fila sin filtrar',
    ).toContain('omitFotosintesisOnly');
  });
});

describe('mostrarEnCatalogo lo maneja Convex, no la hoja', () => {
  it('NO está en el allowlist de pull', () => {
    // Si vuelve al allowlist, el próximo sync pisa la bandera con la columna Y
    // y despublica de cara al cliente todo lo que la hoja no sepa que está
    // publicado. Pasó: Convex 416 vs hoja 131, 285 piezas a ocultar.
    expect(Object.keys(WRITABLE.inventory)).not.toContain('mostrarEnCatalogo');
  });

  it('sigue siendo columna del espejo y SIN preserve, para que el push la escriba', () => {
    const col = COLS.find((c) => c.key === 'mostrarEnCatalogo');
    expect(col, 'mostrarEnCatalogo salió del espejo posicional').toBeTruthy();
    expect(
      col!.preserve,
      'con preserve el push dejaría de reflejarla',
    ).toBeFalsy();
  });
});
