/**
 * @vitest-environment jsdom
 *
 * Covers the fix from the Task 5 review: handleSessionExpired() is a real
 * forced sign-out path (session fully expired, >30 days without opening the
 * app) that used to clear the Google/session keys but leave the catalog
 * cache (tierramadre-treasure-sheets-cache:staff — full prices, asesor,
 * ubicación) sitting in localStorage. It must call clearTreasureCaches()
 * too, imported from the leaf module treasureCacheStorage.ts to avoid an
 * import cycle with hooks/treasureCacheKey.ts (which imports
 * readFreshAuthToken from THIS file).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Same hoisting rule as catalogAuthHeaders.test.ts — vi.mock is hoisted
// above imports, so the mock factory needs vi.hoisted's box.
const clearTreasureCachesMock = vi.hoisted(() => vi.fn());
vi.mock('./treasureCacheStorage', () => ({
  clearTreasureCaches: clearTreasureCachesMock,
  TREASURE_CACHE_BASE: 'tierramadre-treasure-sheets-cache',
}));

import { handleSessionExpired } from './sessionToken';

describe('handleSessionExpired', () => {
  beforeEach(() => {
    clearTreasureCachesMock.mockClear();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('clears the catalog cache on the real forced-expiry sign-out path', () => {
    handleSessionExpired();
    expect(clearTreasureCachesMock).toHaveBeenCalledTimes(1);
  });
});
