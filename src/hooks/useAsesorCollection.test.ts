/**
 * @vitest-environment jsdom
 *
 * F6 (2026-08 fix round): useAsesorCollection's localStorage cache must be
 * scoped by grant, same as the main treasure cache (treasureCacheKey.ts) —
 * otherwise a staff device's priced collection payload survives logout and
 * paints for the next anonymous visitor on that device.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const auth = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('../utils/sessionToken', () => ({
  readFreshSessionToken: () => auth.token,
}));

import { useAsesorCollection } from './useAsesorCollection';
import { STORAGE_KEYS } from '../constants/storage-keys';

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

describe('useAsesorCollection — grant-scoped cache', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.token = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('caches a staff response under a `:staff:` key, not the bare folder key', async () => {
    auth.token = 'tms1.abc.def';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          collection: { name: 'CEO', description: '', asesorEmail: '' },
          products: [{ item: 1, precioCOP: 15000000 }],
        }),
      ),
    );

    renderHook(() => useAsesorCollection('ceo-coomunity'));

    await waitFor(() => {
      expect(
        localStorage.getItem(
          `${STORAGE_KEYS.ASESOR_COLLECTION_CACHE}:staff:ceo-coomunity`,
        ),
      ).not.toBeNull();
    });
    // Never written under the pre-fix unscoped key.
    expect(localStorage.getItem('collection_v2_ceo-coomunity')).toBeNull();
  });

  it('does NOT hand an anonymous visitor the staff-cached priced payload', async () => {
    auth.token = 'tms1.abc.def';
    localStorage.setItem(
      `${STORAGE_KEYS.ASESOR_COLLECTION_CACHE}:staff:ceo-coomunity`,
      JSON.stringify({
        collection: { name: 'CEO', description: '', asesorEmail: '' },
        products: [{ item: 1, precioCOP: 15000000 }],
        timestamp: Date.now(),
      }),
    );

    // Now simulate the same device, logged out.
    auth.token = null;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          collection: { name: 'CEO', description: '', asesorEmail: '' },
          products: [{ item: 1, precioCOP: 15000000 }],
        }),
      ),
    );

    const { result } = renderHook(() => useAsesorCollection('ceo-coomunity'));

    // The initial synchronous read (anti-blink cache read on mount) must
    // come back empty — it reads the `:anon:` key, which was never
    // written — never the `:staff:` key's priced data.
    expect(result.current.products).toEqual([]);
  });
});
