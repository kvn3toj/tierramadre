import { describe, it, expect } from 'vitest';
import { projectFotoUrls } from '../convex/_lib/fotoUrls';

/**
 * Proyección de `products.fotoUrls` (la query que consume el overlay de
 * get-treasure-sheets). Dos pines:
 *
 * 1. Solo viajan filas CON foto — la query barre todo productInventory y la
 *    mayoría de filas legacy no tienen `fotoUrl`.
 * 2. Solo viajan `itemId` y `fotoUrl` — nada de precios, costos ni estado.
 *    Es la misma disciplina de PUBLIC_KEYS: lo que no está aquí es invisible.
 */
describe('projectFotoUrls', () => {
  const row = (itemId: string, extra: Record<string, unknown> = {}) => ({
    itemId,
    nombre: 'X',
    costoBaseCOP: 999999,
    precioFinalCOP: 111111,
    estado: 'DISPONIBLE',
    ...extra,
  });

  it('filtra las filas sin fotoUrl (ausente o vacía)', () => {
    const out = projectFotoUrls([
      row('1'),
      row('2', { fotoUrl: '' }),
      row('3', { fotoUrl: '   ' }),
      row('4', { fotoUrl: 'https://drive/x.jpg' }),
    ]);
    expect(out).toEqual([{ itemId: '4', fotoUrl: 'https://drive/x.jpg' }]);
  });

  it('no proyecta NINGÚN campo comercial', () => {
    const [out] = projectFotoUrls([
      row('233', { fotoUrl: 'https://drive/x.jpg' }),
    ]);
    expect(Object.keys(out).sort()).toEqual(['fotoUrl', 'itemId']);
  });
});
