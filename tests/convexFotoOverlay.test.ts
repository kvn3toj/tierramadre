import { describe, it, expect } from 'vitest';
import { applyFotoOverlay } from '../api/_lib/convex-foto-overlay';
import type { TreasureItem } from '../src/types/index.ts';

const item = (n: number, extra: Partial<TreasureItem> = {}) =>
  ({ item: n, nombre: `Pieza ${n}`, ...extra }) as TreasureItem;

/**
 * El overlay server-side de get-treasure-sheets: Convex es la fuente VIVA de
 * `fotoUrl` (el bot escribe ahí), y la columna AL de la hoja solo se refresca
 * cuando corre un push — que puede estar congelado (incidente 2026-08-15) o
 * simplemente ir detrás. Sin esto, una foto recién subida no aparece hasta el
 * próximo sync.
 */
describe('applyFotoOverlay', () => {
  it('pisa imagen y thumbnailUrl con la fotoUrl de Convex', () => {
    const items = [
      item(233, {
        imagen: 'https://drive/al-viejo.jpg',
        thumbnailUrl: 'https://drive/al-viejo.jpg',
      }),
    ];
    const out = applyFotoOverlay(items, [
      { itemId: '233', fotoUrl: 'https://drive/nueva.jpg' },
    ]);
    expect(out[0].imagen).toBe('https://drive/nueva.jpg');
    expect(out[0].thumbnailUrl).toBe('https://drive/nueva.jpg');
  });

  it('también la pone cuando la hoja no tenía nada (celda AL vacía)', () => {
    const out = applyFotoOverlay(
      [item(89)],
      [{ itemId: '89', fotoUrl: 'https://drive/hadas.jpg' }],
    );
    expect(out[0].imagen).toBe('https://drive/hadas.jpg');
  });

  it('un ítem sin fotoUrl en Convex queda como estaba', () => {
    const out = applyFotoOverlay(
      [item(97, { imagen: 'https://drive/al.jpg' })],
      [{ itemId: '233', fotoUrl: 'https://drive/nueva.jpg' }],
    );
    expect(out[0].imagen).toBe('https://drive/al.jpg');
  });

  it('tolera una lista vacía de fotos sin tocar nada', () => {
    const items = [item(1, { imagen: 'https://drive/x.jpg' })];
    expect(applyFotoOverlay(items, [])).toBe(items);
  });
});
