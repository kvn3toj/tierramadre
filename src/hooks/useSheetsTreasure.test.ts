/**
 * @vitest-environment jsdom
 *
 * Covers Amendment B from Task 5: the module-level in-flight fetch dedup
 * must be keyed by the same grant identity as treasureCacheKey(), not a
 * single shared slot. Otherwise navigating between two vitrina links while
 * VitrinaContent stays mounted (code changes, component doesn't remount)
 * can hand a fetch for token B the in-flight promise started for token A —
 * one client receiving another client's grant.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Same hoisting rule as catalogAuthHeaders.test.ts — vi.mock is hoisted
// above imports, so the mock factory needs vi.hoisted's box, not a plain let.
const fetchWithRetryMock = vi.hoisted(() => vi.fn());
vi.mock('../utils/fetchWithRetry', () => ({
  fetchWithRetry: fetchWithRetryMock,
}));

import { useSheetsTreasure } from './useSheetsTreasure';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

describe('useSheetsTreasure — in-flight fetch dedup', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchWithRetryMock.mockReset();
    // Fire-and-forget Drive folder sync in fetchFromSheets — keep it inert.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ success: true })),
    );
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('does NOT share an in-flight promise between two different vitrina tokens', async () => {
    const deferredA = createDeferred<Response>();
    const deferredB = createDeferred<Response>();

    fetchWithRetryMock.mockImplementation((url: string) => {
      if (url.includes('vitrinaA')) return deferredA.promise;
      if (url.includes('vitrinaB')) return deferredB.promise;
      throw new Error(`unexpected url in test: ${url}`);
    });

    const { result: resultA } = renderHook(() => useSheetsTreasure('vitrinaA'));
    const { result: resultB } = renderHook(() => useSheetsTreasure('vitrinaB'));

    // Two distinct grants in flight — never coalesced into one fetch.
    expect(fetchWithRetryMock).toHaveBeenCalledTimes(2);
    const urls = fetchWithRetryMock.mock.calls.map((call) => call[0]);
    expect(urls[0]).not.toBe(urls[1]);

    await act(async () => {
      deferredA.resolve(
        jsonResponse({ success: true, treasure: [{ item: 'A' }] }),
      );
      deferredB.resolve(
        jsonResponse({ success: true, treasure: [{ item: 'B' }] }),
      );
    });

    // Each hook ends up with ITS OWN token's payload — not the other's.
    await waitFor(() => {
      expect(resultA.current.sheetsTreasure).toEqual([{ item: 'A' }]);
      expect(resultB.current.sheetsTreasure).toEqual([{ item: 'B' }]);
    });
  });

  it('DOES dedupe two concurrent requests for the same vitrina token', async () => {
    const deferred = createDeferred<Response>();
    fetchWithRetryMock.mockImplementation(() => deferred.promise);

    renderHook(() => useSheetsTreasure('vitrinaA'));
    renderHook(() => useSheetsTreasure('vitrinaA'));

    // Same grant, mounted twice — one network call, shared promise.
    expect(fetchWithRetryMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve(jsonResponse({ success: true, treasure: [] }));
    });
  });
});
