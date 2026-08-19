import { describe, it, expect } from 'vitest';
import { overlayConvexCatalogFields } from '../src/utils/catalogOverlay';

/**
 * Regresión del 2026-08-19: los 11 ítems de C-090, publicados con todas las
 * de la ley en Convex (`mostrarEnCatalogo: true`, `publishedAt` estampado),
 * no aparecían en el treasure browser.
 *
 * La cadena: desde la centralización del 2026-07-21, get-treasure-sheets lee
 * el MISMO SOT donde viven esos ítems, así que llegan por las dos ramas. El
 * merge de useTreasure descarta la rama Convex cuando el id ya vino de la
 * hoja — y la fila de hoja no trae `publishedAt`. Sin el sello, el gate de
 * useTreasureFiltering ("precio 0 se oculta, salvo publicado por
 * Fotosíntesis") no tenía cómo eximirla y la ocultaba.
 *
 * El overlay repara el sello por id sobre la fila ganadora — mismo patrón
 * que `precioEspecial`, que se perdía por el mismo mecanismo.
 */
const fila = (item: number, extra: Record<string, unknown> = {}) => ({
  item,
  nombre: `item-${item}`,
  ...extra,
});

describe('overlayConvexCatalogFields — lo que sólo Convex sabe sobrevive al merge', () => {
  it('publishedAt de la rama Convex se estampa sobre la fila de hoja ganadora (caso C-090)', () => {
    const hoja = [fila(544), fila(2, { precioCOP: 635000 })];
    const convex = [{ item: 544, publishedAt: 1787154998006 }];

    const out = overlayConvexCatalogFields(hoja, convex);

    expect(out[0]).toMatchObject({ item: 544, publishedAt: 1787154998006 });
    // La fila sin gemelo Convex queda intacta (misma referencia, ni un render de más).
    expect(out[1]).toBe(hoja[1]);
  });

  it('un publishedAt propio (la rama Convex ganó el merge) no se pisa', () => {
    const base = [fila(600, { publishedAt: 111 })];
    const out = overlayConvexCatalogFields(base, [
      { item: 600, publishedAt: 222 },
    ]);
    expect(out[0].publishedAt).toBe(111);
  });

  it('precioEspecial sigue superponiéndose igual que antes de la extracción', () => {
    const promo = { tipo: 'cierre-temporada' };
    const out = overlayConvexCatalogFields(
      [fila(97)],
      [{ item: 97, precioEspecial: promo }],
    );
    expect(out[0]).toMatchObject({ item: 97, precioEspecial: promo });
  });

  it('ambos campos a la vez, del mismo gemelo Convex', () => {
    const out = overlayConvexCatalogFields(
      [fila(550)],
      [{ item: 550, publishedAt: 999, precioEspecial: { p: 1 } }],
    );
    expect(out[0]).toMatchObject({
      publishedAt: 999,
      precioEspecial: { p: 1 },
    });
  });
});
