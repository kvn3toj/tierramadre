/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Same hoisting rule as catalogAuthHeaders.test.ts — see the note there.
const auth = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('../utils/sessionToken', () => ({
  readFreshAuthToken: () => auth.token,
}));

import { treasureCacheKey, clearTreasureCaches } from './treasureCacheKey';
import { catalogUrl } from '../utils/catalogAuthHeaders';
import { STORAGE_KEYS, LEGACY_KEYS } from '../constants/storage-keys';

describe('treasureCacheKey', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.token = null;
  });
  afterEach(() => localStorage.clear());

  it('separates the signed-in cache from the anonymous one', () => {
    const anon = treasureCacheKey();
    auth.token = 'tms1.abc.def';
    expect(treasureCacheKey()).not.toBe(anon);
  });

  it('gives a vitrina visitor a key distinct from plain anonymous', () => {
    const anon = treasureCacheKey();
    const vitrina = treasureCacheKey('AB3K9P2Q4R7S');
    expect(vitrina).not.toBe(anon);
  });

  it('gives two different vitrina tokens two different keys', () => {
    const first = treasureCacheKey('AB3K9P2Q4R7S');
    const second = treasureCacheKey('ZZ9Q1W2E3R4T');
    expect(first).not.toBe(second);
  });

  it('staff wins over a vitrina token — a signed-in caller is not a guest', () => {
    auth.token = 'tms1.abc.def';
    const staff = treasureCacheKey();
    const staffWithVitrina = treasureCacheKey('AB3K9P2Q4R7S');
    expect(staffWithVitrina).toBe(staff);
  });

  it('is stable for the same vitrina token across calls', () => {
    expect(treasureCacheKey('AB3K9P2Q4R7S')).toBe(
      treasureCacheKey('AB3K9P2Q4R7S'),
    );
  });

  it('an id-list token is not a vitrina grant — it maps to the anon bucket', () => {
    // catalogUrl (catalogAuthHeaders.ts) never forwards an id-list as
    // ?vitrina=, so the server returns the anonymous payload for it. The
    // cache key must land on the SAME bucket, or an id-list would get its
    // own :vitrina:<idlist> bucket holding data that is, in fact, anonymous.
    const anon = treasureCacheKey();
    expect(treasureCacheKey('368')).toBe(anon);
    expect(treasureCacheKey('368,412')).toBe(anon);
    expect(treasureCacheKey('368-412')).toBe(anon);
  });

  it('agrees with catalogUrl on exactly what counts as a vitrina token', () => {
    // Same ID_LIST_RE import on both sides — this pins the two functions
    // together so they can't silently drift apart on the next edit.
    const anon = treasureCacheKey();

    expect(catalogUrl('/api/get-treasure-sheets', '368')).toBe(
      '/api/get-treasure-sheets',
    );
    expect(treasureCacheKey('368')).toBe(anon);

    expect(catalogUrl('/api/get-treasure-sheets', 'AB3K9P2Q4R7S')).toBe(
      '/api/get-treasure-sheets?vitrina=AB3K9P2Q4R7S',
    );
    expect(treasureCacheKey('AB3K9P2Q4R7S')).not.toBe(anon);
  });

  it('clears every treasure cache, whatever the grant', () => {
    localStorage.setItem(`${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:staff`, '1');
    localStorage.setItem(`${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:anon`, '1');
    localStorage.setItem(
      `${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:vitrina:AB3K9P2Q4R7S`,
      '1',
    );
    localStorage.setItem(
      `${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:vitrina:ZZ9Q1W2E3R4T`,
      '1',
    );
    localStorage.setItem(STORAGE_KEYS.TREASURE_SHEETS_CACHE, '1');
    localStorage.setItem(LEGACY_KEYS.INVENTORY_SHEETS_CACHE, '1');
    localStorage.setItem('unrelated-key', 'keep me');

    clearTreasureCaches();

    expect(
      localStorage.getItem(`${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:staff`),
    ).toBeNull();
    expect(
      localStorage.getItem(`${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:anon`),
    ).toBeNull();
    expect(
      localStorage.getItem(
        `${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:vitrina:AB3K9P2Q4R7S`,
      ),
    ).toBeNull();
    expect(
      localStorage.getItem(
        `${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:vitrina:ZZ9Q1W2E3R4T`,
      ),
    ).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.TREASURE_SHEETS_CACHE)).toBeNull();
    expect(localStorage.getItem(LEGACY_KEYS.INVENTORY_SHEETS_CACHE)).toBeNull();
    expect(localStorage.getItem('unrelated-key')).toBe('keep me');
  });
});
