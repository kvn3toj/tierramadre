/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const CACHE_KEY = 'tierra-madre-trm-cache';

/** The store is module-level, so each case needs a fresh import. */
async function loadHook() {
  vi.resetModules();
  const mod = await import('../src/hooks/useTRM');
  return mod.useTRM;
}

function officialResponse(valor: string, vigenciahasta = '2099-01-01T00:00:00.000') {
  return [{ valor, unidad: 'COP', vigenciadesde: '2020-01-01T00:00:00.000', vigenciahasta }];
}

function jsonOk(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);
}

describe('useTRM — source selection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefers /api/trm, the shared CDN-cached endpoint', async () => {
    const fetchSpy = vi.fn((url: string) =>
      url.startsWith('/api/trm')
        ? jsonOk({ rate: 3213.97, source: 'official', validThrough: '2099-01-01' })
        : jsonOk(officialResponse('9999')),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const useTRM = await loadHook();
    const { result } = renderHook(() => useTRM());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.trmRate).toBe(3213.97);
    expect(result.current.source).toBe('official');
    // The government API is never touched directly when the endpoint answers.
    expect(fetchSpy.mock.calls.every(([u]) => String(u).startsWith('/api/trm'))).toBe(true);
  });

  it('falls back to calling datos.gov.co directly when /api/trm is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.startsWith('/api/trm')) return Promise.reject(new Error('502'));
        return url.includes('datos.gov.co')
          ? jsonOk(officialResponse('3213.97'))
          : jsonOk({ rates: { COP: 9999 } });
      }),
    );

    const useTRM = await loadHook();
    const { result } = renderHook(() => useTRM());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.trmRate).toBe(3213.97);
    expect(result.current.source).toBe('official');
    expect(result.current.isStale).toBe(false);
    expect(result.current.isFallback).toBe(false);
  });

  it('falls back to the market rate when the official feed returns nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.startsWith('/api/trm')) return Promise.reject(new Error('502'));
        return url.includes('datos.gov.co')
          ? jsonOk([])
          : jsonOk({ rates: { COP: 3190.5 } });
      }),
    );

    const useTRM = await loadHook();
    const { result } = renderHook(() => useTRM());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.trmRate).toBe(3190.5);
    expect(result.current.source).toBe('market');
    expect(result.current.isStale).toBe(false);
  });

  it('keeps an expired cache over the hardcoded constant, and marks it stale', async () => {
    // A real rate measured three days ago beats a constant from whenever.
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        rate: 3100.25,
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
        source: 'official',
        validThrough: '2020-01-01',
      }),
    );
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));

    const useTRM = await loadHook();
    const { result } = renderHook(() => useTRM());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.trmRate).toBe(3100.25);
    expect(result.current.source).toBe('stale');
    expect(result.current.isStale).toBe(true);
    expect(result.current.isFallback).toBe(false);
  });

  it('flags the constant as a fallback when there is no cache and no network', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));

    const useTRM = await loadHook();
    const { result } = renderHook(() => useTRM());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isFallback).toBe(true);
    expect(result.current.isStale).toBe(true);
    // The number must never present itself as a live reading.
    expect(result.current.source).toBe('fallback');
  });

  it('serves a fresh cache without hitting the network at all', async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        rate: 3205,
        timestamp: Date.now(),
        source: 'official',
        validThrough: '2099-01-01',
      }),
    );
    const fetchSpy = vi.fn(() => jsonOk(officialResponse('1111')));
    vi.stubGlobal('fetch', fetchSpy);

    const useTRM = await loadHook();
    const { result } = renderHook(() => useTRM());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.trmRate).toBe(3205);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
