/**
 * `precioFinalCOP` entra al allowlist de `_saveEdit` — el fix del primer uso
 * real de `/datos` (2026-08-19, #555 «Nido»): el wizard mandaba `precioCOP`,
 * que es la columna L del riel LEGACY, retirada del espejo SOT en 2026-05-29.
 * Resultado: los 105.000 quedaron en un campo de Convex que ninguna query lee
 * y en NINGUNA celda de la hoja — «4 cambios guardados» con el precio perdido.
 *
 * El campo correcto para una fila SOT es `precioFinalCOP` (columna M), y al
 * escribirlo a mano hay que estampar `precioFinalManual: true` — el mismo
 * sello que deja el pull — para que ningún re-fan del lote lo devuelva a
 * costo × 2.6.
 */
import { describe, it, expect } from 'vitest';
import { _saveEdit } from '../convex/products';

type Handler<A> = (ctx: never, args: A) => Promise<Record<string, unknown>>;

const FILA = {
  _id: 'row_555',
  itemId: '555',
  nombre: 'Nido',
  loteId: 'TM-001',
  // Sin mostrarEnCatalogo: fila no publicada — bumpCatalogVersionIfPublished
  // retorna temprano y el ctx falso no necesita más superficie.
};

function ctxFalso() {
  const patches: Array<Record<string, unknown>> = [];
  const ctx = {
    db: {
      query: () => ({
        withIndex: () => ({ first: async () => FILA }),
      }),
      patch: async (_id: string, patch: Record<string, unknown>) => {
        patches.push(patch);
      },
      insert: async () => 'audit_1',
    },
    scheduler: { runAfter: async () => {} },
  } as never;
  return { ctx, patches };
}

const llamar = (ctx: never, patch: Record<string, unknown>) =>
  (
    _saveEdit as unknown as Handler<{
      itemId: string;
      editorEmail: string;
      patch: Record<string, unknown>;
    }>
  )(ctx, { itemId: '555', editorEmail: 'telegram:7', patch });

describe('_saveEdit — precioFinalCOP', () => {
  it('el precio viaja al espejo Y se estampa precioFinalManual', async () => {
    const { ctx, patches } = ctxFalso();
    const r = await llamar(ctx, { precioFinalCOP: 105000 });
    expect(r.changesCount).toBe(1);
    expect(patches).toHaveLength(1);
    expect(patches[0].precioFinalCOP).toBe(105000);
    expect(patches[0].precioFinalManual).toBe(true);
  });

  it('sin precio en el patch, NO se estampa el sello manual', async () => {
    const { ctx, patches } = ctxFalso();
    await llamar(ctx, { color: 'Azul turquesa' });
    expect(patches[0].color).toBe('Azul turquesa');
    expect(patches[0]).not.toHaveProperty('precioFinalManual');
  });
});
