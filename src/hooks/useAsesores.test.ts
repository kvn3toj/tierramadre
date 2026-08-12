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

describe('useAsesores — grant-keyed in-flight promise', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.token = null;
    fetchWithRetryMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does NOT hand an anon consumer the in-flight STAFF promise (signOut does not reload the page)', async () => {
    const staffRoster = [
      {
        id: 'a1',
        name: 'Maria',
        slug: 'maria',
        email: 'm@x.co',
        vaultCode: 'A-7',
      },
    ];
    const anonRoster = [{ id: 'a1', name: 'Maria', slug: 'maria' }];

    let releaseStaff: (r: Response) => void = () => {};
    const staffInFlight = new Promise<Response>((resolve) => {
      releaseStaff = resolve;
    });

    fetchWithRetryMock
      .mockImplementationOnce(() => staffInFlight)
      .mockImplementationOnce(async () =>
        jsonResponse({ success: true, asesores: anonRoster }),
      );

    // A staff roster fetch starts and stays in flight.
    auth.token = 'tms1.abc.def';
    const staff = renderHook(() => useAsesores());

    // The user signs out mid-flight — GoogleAuthContext.signOut() clears
    // caches but does NOT reload, so the staff promise survives — and a
    // public consumer (useWhatsAppContact / AmbassadorDirectory /
    // VitrinaPage) mounts the hook.
    auth.token = null;
    const anon = renderHook(() => useAsesores());

    // The anon mount issued its OWN request instead of awaiting the staff one.
    await waitFor(() => expect(fetchWithRetryMock).toHaveBeenCalledTimes(2));

    releaseStaff(jsonResponse({ success: true, asesores: staffRoster }));

    await waitFor(() => {
      expect(anon.result.current.asesores).toEqual(anonRoster);
    });
    await waitFor(() => {
      expect(staff.result.current.asesores).toEqual(staffRoster);
    });

    // The `:anon` bucket never receives email/vaultCode.
    expect(localStorage.getItem(`${STORAGE_KEYS.ASESORES_CACHE}:anon`)).toBe(
      JSON.stringify(anonRoster),
    );
    expect(localStorage.getItem(`${STORAGE_KEYS.ASESORES_CACHE}:staff`)).toBe(
      JSON.stringify(staffRoster),
    );
  });

  it('releases the key on failure, so a rejected fetch does not wedge the grant forever', async () => {
    fetchWithRetryMock.mockRejectedValueOnce(new Error('network down'));

    const first = renderHook(() => useAsesores());
    await waitFor(() => expect(first.result.current.error).not.toBeNull());

    // A later mount under the SAME grant re-fetches rather than re-awaiting
    // the settled (rejected) promise.
    fetchWithRetryMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        asesores: [{ id: 'a1', name: 'Maria', slug: 'maria' }],
      }),
    );
    const second = renderHook(() => useAsesores());
    await waitFor(() => {
      expect(second.result.current.asesores).toHaveLength(1);
    });
    expect(fetchWithRetryMock).toHaveBeenCalledTimes(2);
  });
});
