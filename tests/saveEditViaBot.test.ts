/**
 * `products.saveEditViaBot` — la puerta del bot al riel de edición que ya usa
 * la web: `_saveEdit` (patch + audit `productEdits`) que a su vez agenda
 * `pushToSheet` (localiza por columna A, append si la pieza no está en la
 * hoja). El bot NO recibe un riel propio: recibe una cáscara con
 * `requireBotSecret`, igual que `updateMediaByItemViaBot` (PR #118).
 *
 * Nace para el flujo /datos de anima-bot: completar la ficha de las piezas
 * creadas por el fotoálbum (lote contenedor), que `/casilla` rechaza a
 * propósito por no ser casillas v4.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveEditViaBot } from '../convex/products';

const BOT_SECRET = 'test-anima-bot-secret';
let savedBotSecret: string | undefined;

beforeEach(() => {
  savedBotSecret = process.env.ANIMA_BOT_SECRET;
  process.env.ANIMA_BOT_SECRET = BOT_SECRET;
});
afterEach(() => {
  if (savedBotSecret === undefined) delete process.env.ANIMA_BOT_SECRET;
  else process.env.ANIMA_BOT_SECRET = savedBotSecret;
});

type Handler<A> = (ctx: never, args: A) => Promise<Record<string, unknown>>;

interface Llamada {
  ref: unknown;
  args: Record<string, unknown>;
}

const ctxQueCaptura = (llamadas: Llamada[], resultado: unknown) =>
  ({
    runMutation: async (ref: unknown, args: Record<string, unknown>) => {
      llamadas.push({ ref, args });
      return resultado;
    },
  }) as never;

const llamar = (
  ctx: never,
  args: {
    botSecret: string;
    telegramUserId: number;
    itemId: string;
    patch: Record<string, unknown>;
  },
) => (saveEditViaBot as unknown as Handler<typeof args>)(ctx, args);

describe('saveEditViaBot', () => {
  it('rechaza un secreto incorrecto sin tocar la mutation', async () => {
    const llamadas: Llamada[] = [];
    await expect(
      llamar(ctxQueCaptura(llamadas, {}), {
        botSecret: 'incorrecto',
        telegramUserId: 7,
        itemId: '555',
        patch: { color: 'Verde' },
      }),
    ).rejects.toThrow(/no autorizado/i);
    expect(llamadas).toHaveLength(0);
  });

  it('rutea a _saveEdit con el editor `telegram:<id>` y el patch intacto', async () => {
    const llamadas: Llamada[] = [];
    const resultado = { itemId: '555', changesCount: 2, auditId: 'a1' };
    const r = await llamar(ctxQueCaptura(llamadas, resultado), {
      botSecret: BOT_SECRET,
      telegramUserId: 1048831833,
      itemId: '555',
      patch: { color: 'Verde vivo', peso: '1.2' },
    });
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].args).toMatchObject({
      itemId: '555',
      editorEmail: 'telegram:1048831833',
      patch: { color: 'Verde vivo', peso: '1.2' },
    });
    expect(r).toEqual(resultado);
  });
});
