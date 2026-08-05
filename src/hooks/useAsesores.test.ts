/**
 * @vitest-environment jsdom
 *
 * Same leak class as F6 (2026-08 fix round), found while verifying F5's
 * consumers: get-asesores.ts now withholds email/vaultCode from anon
 * callers, so useAsesores' localStorage cache (previously a single unscoped
 * `tm-asesores` key) must be grant-scoped and cleared on logout, or a staff
 * device's full roster survives to paint for the next anonymous visitor.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const auth = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('../utils/sessionToken', () => ({
  readFreshSessionToken: () => auth.token,
}));

const fetchWithRetryMock = vi.hoisted(() => vi.fn());
vi.mock('../utils/fetchWithRetry', () => ({
  fetchWithRetry: fetchWithRetryMock,
}));

import { useAsesores } from './useAsesores';
import { STORAGE_KEYS } from '../constants/storage-keys';

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

describe('useAsesores — grant-scoped cache', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.token = null;
    fetchWithRetryMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('caches a staff response under a `:staff` key, not the pre-fix bare key', async () => {
    auth.token = 'tms1.abc.def';
    fetchWithRetryMock.mockResolvedValue(
      jsonResponse({
        success: true,
        asesores: [{ id: 'a1', name: 'Maria', slug: 'maria', email: 'm@x.co' }],
      }),
    );

    renderHook(() => useAsesores());

    await waitFor(() => {
      expect(
        localStorage.getItem(`${STORAGE_KEYS.ASESORES_CACHE}:staff`),
      ).not.toBeNull();
    });
    expect(localStorage.getItem('tm-asesores')).toBeNull();
  });

  it('does NOT hand an anonymous visitor the staff-cached roster (with email)', () => {
    auth.token = 'tms1.abc.def';
    localStorage.setItem(
      `${STORAGE_KEYS.ASESORES_CACHE}:staff`,
      JSON.stringify([
        { id: 'a1', name: 'Maria', slug: 'maria', email: 'm@x.co' },
      ]),
    );

    // Same device, logged out.
    auth.token = null;
    fetchWithRetryMock.mockResolvedValue(
      jsonResponse({ success: true, asesores: [] }),
    );

    const { result } = renderHook(() => useAsesores());

    // Synchronous init reads the `:anon` key, never written — not the
    // `:staff` key holding the priced/identifying roster.
    expect(result.current.asesores).toEqual([]);
  });
});
