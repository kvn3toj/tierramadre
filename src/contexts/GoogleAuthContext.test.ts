/**
 * @vitest-environment jsdom
 *
 * Covers the fix from the Task 5 review: `AuthContext.logout()` was dead
 * code — nothing in the app calls it. The real "Cerrar Sesión" paths are
 * GoogleAuthContext's `signOut()` (UserProfileCard, GoogleLoginButton) and
 * its forced "account removed" branch (re-validation on mount finds the
 * user no longer on the roster). Both must clear the catalog cache, or a
 * staff member's full-price cache survives clicking "Cerrar Sesión".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Same hoisting rule as catalogAuthHeaders.test.ts — vi.mock is hoisted
// above imports, so the mock factory needs vi.hoisted's box.
const clearTreasureCachesMock = vi.hoisted(() => vi.fn());
vi.mock('../hooks/treasureCacheKey', () => ({
  clearTreasureCaches: clearTreasureCachesMock,
  treasureCacheKey: () => 'tierramadre-treasure-sheets-cache:anon',
}));

import { GoogleAuthProvider, useGoogleAuth } from './GoogleAuthContext';
import { STORAGE_KEYS } from '../constants/storage-keys';

describe('GoogleAuthContext — sign-out clears the catalog cache', () => {
  beforeEach(() => {
    localStorage.clear();
    clearTreasureCachesMock.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('signOut() clears the treasure cache — the real "Cerrar Sesión" path', async () => {
    const { result } = renderHook(() => useGoogleAuth(), {
      wrapper: GoogleAuthProvider,
    });

    await act(async () => {
      result.current.signOut();
    });

    expect(clearTreasureCachesMock).toHaveBeenCalled();
  });

  it('the forced "account removed" sign-out also clears the treasure cache', async () => {
    localStorage.setItem(
      STORAGE_KEYS.GOOGLE_USER,
      JSON.stringify({
        id: '1',
        email: 'removed@tierramadre.app',
        name: 'Removed Staff',
        givenName: 'Removed',
        familyName: 'Staff',
        picture: '',
      }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          isAuthorized: false,
          isProvider: false,
          reason: 'not_in_sheet',
        }),
      }),
    );

    renderHook(() => useGoogleAuth(), { wrapper: GoogleAuthProvider });

    await waitFor(() => {
      expect(clearTreasureCachesMock).toHaveBeenCalled();
    });
  });
});
