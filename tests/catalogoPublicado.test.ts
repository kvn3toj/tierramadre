import { describe, it, expect } from 'vitest';
import { aplicarFiltroPublicado } from '../api/_lib/catalogoPublicado.js';
import type { TreasureItem } from '../src/types/index.ts';

const item = (n: number, nombre: string): TreasureItem =>
  ({ item: n, nombre }) as TreasureItem;

describe('aplicarFiltroPublicado', () => {
  it('saca los ítems que Convex no tiene publicados', () => {
    const items = [
      item(487, 'Caja de Sueños — RETIRADA (duplicada, vigente ítem 542)'),
      item(542, 'Caja de Sueños'),
      item(491, 'Cuarteto de Nos — RETIRADA (duplicada, vigente ítem 543)'),
      item(543, 'Cuarteto de Nos'),
    ];
    const visible = aplicarFiltroPublicado(items, new Set(['542', '543']));
    expect(visible.map((i) => i.item)).toEqual([542, 543]);
  });

  it('compara por string: la hoja da number y Convex da string', () => {
    // `item` viene de `parseInt` sobre la celda, `itemId` de Convex es texto.
    // Comparar sin normalizar dejaría el catálogo vacío en silencio.
    const visible = aplicarFiltroPublicado(
      [item(1, 'Rey Midas')],
      new Set(['1']),
    );
    expect(visible).toHaveLength(1);
  });

  it('no filtra nada si el conjunto viene vacío', () => {
    // Un cero es una falla de lectura de Convex, no un catálogo vacío. Vaciar
    // la vitrina por eso sería peor que servirla de más.
    const items = [item(487, 'retirada'), item(542, 'vigente')];
    expect(aplicarFiltroPublicado(items, new Set())).toEqual(items);
  });

  it('conserva el orden y la identidad de los objetos que deja pasar', () => {
    const a = item(1, 'A');
    const b = item(2, 'B');
    const c = item(3, 'C');
    const visible = aplicarFiltroPublicado([a, b, c], new Set(['3', '1']));
    expect(visible).toEqual([a, c]);
    expect(visible[0]).toBe(a);
  });

  it('un ítem publicado que no está en la hoja no inventa filas', () => {
    const visible = aplicarFiltroPublicado(
      [item(542, 'Caja de Sueños')],
      new Set(['542', '999']),
    );
    expect(visible.map((i) => i.item)).toEqual([542]);
  });
});
