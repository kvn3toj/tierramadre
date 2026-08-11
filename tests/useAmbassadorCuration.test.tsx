/**
 * useAmbassadorCuration — qué manda realmente al servidor.
 *
 * El caso que motiva este archivo es un bug latente que introduje en el #94 y
 * que salió al cablear el interruptor de reventa:
 *
 *   `clearOverride` encolaba un DELETE, y el DELETE borra la FILA ENTERA de
 *   curación — que también lleva `isFavorite` y ahora `forResale`. O sea que
 *   un embajador que quitaba el nombre personalizado de una pieza perdía en
 *   silencio, en el servidor, que fuera favorita y que estuviera ofrecida.
 *   En su pantalla no pasaba nada raro: el estado local sólo quitaba el
 *   override. Lo veía al recargar, sin saber por qué.
 *
 * Por eso estos tests miran la PETICIÓN, no el estado local. El estado local
 * estaba bien; lo que estaba mal era lo que viajaba.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../src/utils/sessionToken', () => ({
  readFreshSessionToken: () => 'tms1.fake.token',
}));

import { useAmbassadorCuration } from '../src/hooks/useAmbassadorCuration';

interface Sent {
  method: string;
  body: Record<string, unknown>;
}

let sent: Sent[] = [];

beforeEach(() => {
  sent = [];
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method) {
        sent.push({
          method: init.method,
          body: JSON.parse(String(init.body)),
        });
        return { ok: true, status: 200, json: async () => ({}) };
      }
      // GET inicial: el servidor todavía no sabe nada de esta pieza.
      return {
        ok: true,
        status: 200,
        json: async () => ({
          slug: 'alvaro-pelaez',
          favorites: [],
          resale: [],
          overrides: {},
        }),
      };
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('clearOverride', () => {
  it('limpia SÓLO los campos de override, no la fila entera', async () => {
    const { result } = renderHook(() =>
      useAmbassadorCuration('alvaro-pelaez', true),
    );

    act(() => {
      result.current.setOverrideValues('101', { customName: 'La Verde' });
    });
    await waitFor(() => expect(sent.length).toBeGreaterThan(0));

    act(() => {
      result.current.clearOverride('101');
    });
    await waitFor(() => expect(sent.length).toBeGreaterThan(1));

    const last = sent[sent.length - 1];
    // Un DELETE aquí se llevaría por delante isFavorite y forResale.
    expect(last.method).not.toBe('DELETE');
    expect(last.method).toBe('PUT');
    expect(last.body).toMatchObject({
      itemId: '101',
      customName: null,
      customPriceCOP: null,
    });
    // Y no menciona los otros campos, así que el upsert los deja intactos.
    expect(last.body.isFavorite).toBeUndefined();
    expect(last.body.forResale).toBeUndefined();
  });
});

describe('setForResale', () => {
  it('manda la oferta al servidor', async () => {
    const { result } = renderHook(() =>
      useAmbassadorCuration('alvaro-pelaez', true),
    );

    act(() => {
      result.current.setForResale('101', true);
    });
    await waitFor(() => expect(sent.length).toBeGreaterThan(0));

    expect(sent[0].method).toBe('PUT');
    expect(sent[0].body).toMatchObject({ itemId: '101', forResale: true });
    expect(result.current.resale).toContain('101');
  });

  it('no manda nada si el estado ya es el pedido', async () => {
    const { result } = renderHook(() =>
      useAmbassadorCuration('alvaro-pelaez', true),
    );
    act(() => {
      result.current.setForResale('101', false);
    });
    // Ya estaba apagado: una petición aquí sería ruido, y con mala señal
    // ocuparía sitio en la cola por nada.
    expect(sent).toHaveLength(0);
  });

  it('no escribe cuando el visitante no es el dueño', async () => {
    const { result } = renderHook(() =>
      useAmbassadorCuration('alvaro-pelaez', false),
    );
    act(() => {
      result.current.setForResale('101', true);
    });
    // El servidor igual devolvería 403; esto sólo evita el viaje.
    expect(sent).toHaveLength(0);
  });
});
