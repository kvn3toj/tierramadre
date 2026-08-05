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

// Mocked (never vi.spyOn — these are ESM named exports) so the
// tokenRejected-retry tests below can assert call counts without actually
// minting a session. readFreshAuthToken (treasureCacheKey.ts) and
// readFreshSessionToken (catalogAuthHeaders.ts) both live in this module and
// both get exercised by mounting the hook, so both need a stub here even
// though most tests don't assert on either directly.
//
// `auth.token` is MUTABLE (not a fixed `vi.fn(() => null)`) so the N2/N3
// tests below can flip it mid-test — simulating a session mint or sign-out
// landing while a fetch is in flight — the exact race those fixes close.
const auth = vi.hoisted(() => ({ token: null as string | null }));
const ensureAppSessionMock = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('../utils/sessionToken', () => ({
  ensureAppSession: ensureAppSessionMock,
  readFreshAuthToken: () => auth.token,
  readFreshSessionToken: () => auth.token,
}));

import { useSheetsTreasure } from './useSheetsTreasure';
import { STORAGE_KEYS } from '../constants/storage-keys';

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
    ensureAppSessionMock.mockClear();
    auth.token = null;
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
    // Awaited (N2, 2026-08 fix round 3: loadFromSheets now awaits
    // ensureAppSession() before firing) — the call lands a tick after mount,
    // not synchronously.
    await waitFor(() => {
      expect(fetchWithRetryMock).toHaveBeenCalledTimes(2);
    });
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

    // Same grant, mounted twice — one network call, shared promise. Awaited
    // for the same reason as the test above.
    await waitFor(() => {
      expect(fetchWithRetryMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      deferred.resolve(jsonResponse({ success: true, treasure: [] }));
    });
  });
});

describe('useSheetsTreasure — tokenRejected retry', () => {
  // Deferred from Task 6 (unreachable before the server-side projection
  // shipped: bearerWasRejected only starts firing once a real caller
  // presents an expired/forged bearer against a grant-aware endpoint). An
  // asesor's 30-day session token can die silently; the server flags
  // `tokenRejected: true` instead of just degrading to `anon`, so the
  // client can call ensureAppSession() and retry once — recovering price
  // visibility instead of looking broken. `isRetry` must stop this from
  // looping if the refresh doesn't help.
  beforeEach(() => {
    localStorage.clear();
    fetchWithRetryMock.mockReset();
    ensureAppSessionMock.mockClear();
    auth.token = null;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ success: true })),
    );
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('triggers exactly one ensureAppSession() call and one retry', async () => {
    fetchWithRetryMock
      .mockResolvedValueOnce(
        jsonResponse({ success: true, treasure: [], tokenRejected: true }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          treasure: [{ item: 1, nombre: 'Rey Midas' }],
        }),
      );

    const { result } = renderHook(() => useSheetsTreasure());

    await waitFor(() => {
      expect(result.current.sheetsTreasure).toEqual([
        { item: 1, nombre: 'Rey Midas' },
      ]);
    });

    expect(fetchWithRetryMock).toHaveBeenCalledTimes(2);
    // 2, not 1: one upfront (N2, 2026-08 fix round 3 — loadFromSheets now
    // awaits ensureAppSession() BEFORE the first request, every mount, not
    // just on tokenRejected) + one from the tokenRejected retry inside
    // fetchFromSheets itself.
    expect(ensureAppSessionMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT loop when the retry is ALSO tokenRejected', async () => {
    fetchWithRetryMock
      .mockResolvedValueOnce(
        jsonResponse({ success: true, treasure: [], tokenRejected: true }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ success: true, treasure: [], tokenRejected: true }),
      );

    const { result } = renderHook(() => useSheetsTreasure());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Exactly the initial call + the single session-refresh retry — a third
    // call would mean the tokenRejected branch looped instead of stopping
    // once isRetry is true.
    expect(fetchWithRetryMock).toHaveBeenCalledTimes(2);
    // 2, not 1 — see the note in the test above (upfront N2 call + the one
    // retry call; still exactly 2, so the loop guard still holds).
    expect(ensureAppSessionMock).toHaveBeenCalledTimes(2);
    expect(result.current.sheetsTreasure).toEqual([]);
  });
});

describe('useSheetsTreasure — write-time cache key (N2/N3, 2026-08 fix round 3)', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchWithRetryMock.mockReset();
    ensureAppSessionMock.mockReset();
    ensureAppSessionMock.mockImplementation(async () => {});
    auth.token = null;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ success: true })),
    );
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('N2(b): a session token minted DURING ensureAppSession() is used for the very first request', async () => {
    // Simulates GoogleAuthContext's sign-in landing a session moments after
    // mount: ensureAppSession() (now AWAITED, not fire-and-forget) is what
    // actually mints it here.
    ensureAppSessionMock.mockImplementation(async () => {
      auth.token = 'tms1.minted-during-ensure';
    });
    fetchWithRetryMock.mockResolvedValue(
      jsonResponse({ success: true, treasure: [{ item: 1, precioCOP: 5 }] }),
    );

    renderHook(() => useSheetsTreasure());

    await waitFor(() => {
      expect(fetchWithRetryMock).toHaveBeenCalledTimes(1);
    });
    // The request itself carries the newly-minted token — not fired before
    // ensureAppSession() settled.
    const [, init] = fetchWithRetryMock.mock.calls[0];
    expect(init).toEqual({
      headers: { Authorization: 'Bearer tms1.minted-during-ensure' },
    });

    await waitFor(() => {
      expect(
        localStorage.getItem(`${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:staff`),
      ).not.toBeNull();
    });
    // Never the anon bucket — the key must reflect the SAME settled state
    // the request used, not whatever was true before ensureAppSession ran.
    expect(
      localStorage.getItem(`${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:anon`),
    ).toBeNull();
  });

  it('N2(a)/N3: a sign-out mid-flight does NOT write the staff (priced) response into the anon bucket', async () => {
    // Already signed in when the fetch starts.
    auth.token = 'tms1.staff-session';
    const deferred = createDeferred<Response>();
    fetchWithRetryMock.mockReturnValue(deferred.promise);

    renderHook(() => useSheetsTreasure());

    await waitFor(() => {
      expect(fetchWithRetryMock).toHaveBeenCalledTimes(1);
    });

    // Sign out WHILE the staff-authenticated request is still in flight —
    // clearTreasureCaches() would remove the `:staff` key right about now.
    auth.token = null;
    localStorage.removeItem(`${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:staff`);

    await act(async () => {
      deferred.resolve(
        jsonResponse({
          success: true,
          treasure: [{ item: 1, precioCOP: 15000000 }],
        }),
      );
    });

    // The write must still target `:staff` — the bucket THIS fetch actually
    // authenticated as when it was sent — not `:anon`, which would paint
    // the next anonymous visitor with priced data.
    await waitFor(() => {
      expect(
        localStorage.getItem(`${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:staff`),
      ).not.toBeNull();
    });
    expect(
      localStorage.getItem(`${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:anon`),
    ).toBeNull();
  });
});
