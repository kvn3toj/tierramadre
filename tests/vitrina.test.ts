/**
 * N1 (2026-08 fix round 3): `/api/vitrina` used to also accept a raw Google
 * ID token, verified only against `audience` — that proves "some Gmail
 * account", not roster membership (the OAuth client ID is public, ships in
 * the frontend bundle). Any Gmail account could mint a vitrina token for up
 * to 50 caller-chosen itemIds, and `projectForGrant` returns the FULL
 * unprojected row for every granted id — so this was the same bypass F1
 * closed on catalogGrant.ts, reopened through a different door.
 *
 * `verifiedSessionEmail` (api/vitrina.ts) IS the fix: mint/PATCH now
 * requires a `tms1` session token, exactly like the catalog grant.
 */
import { describe, it, expect } from 'vitest';
import { verifiedSessionEmail } from '../api/vitrina';
import { mintSessionToken } from '../api/_lib/sessionToken';

process.env.ADMIN_SYNC_TOKEN = 'test-secret-for-vitrina';

describe('verifiedSessionEmail (api/vitrina.ts)', () => {
  it('is null with no bearer at all — the handler turns this into a 401', () => {
    expect(verifiedSessionEmail(undefined)).toBeNull();
  });

  it('is null for a raw Google ID token, whatever its shape — the bypass this fix closes', () => {
    expect(
      verifiedSessionEmail('Bearer ya29.a0-fake-google-access-token-shape'),
    ).toBeNull();
    expect(verifiedSessionEmail('Bearer raw-google-id-token')).toBeNull();
  });

  it('is null for a malformed/forged token', () => {
    expect(verifiedSessionEmail('Bearer not-a-real-token')).toBeNull();
  });

  it('returns the email for a valid tms1 session token — roster members still mint', () => {
    const token = mintSessionToken('asesor@tierramadre.app');
    expect(verifiedSessionEmail(`Bearer ${token}`)).toBe(
      'asesor@tierramadre.app',
    );
  });
});
