/**
 * Reads the stored Google Sign-In ID token, iff it hasn't expired (30s safety
 * margin). Used to authenticate admin/staff-only mutations server-side (see
 * convex/_lib/authz.ts) — the JWT itself proves the caller's identity,
 * unlike a plain email string the client could otherwise spoof.
 *
 * Extracted from VitrinaShareDialog's original `readFreshIdToken` so every
 * caller of an identity-verified Convex action shares one implementation.
 */
import { STORAGE_KEYS } from '../constants/storage-keys';

export function readFreshGoogleIdToken(): string | null {
  // Test-mode bypass — mirrors AdminRoute's VITE_TEST_MODE gate. Playwright
  // specs don't do a real Google OAuth handshake, so there's no genuine JWT
  // to read; the stubbed Convex client (convex-safe.test-stub.ts) doesn't
  // verify this value either, it just needs to be non-null.
  if (import.meta.env.VITE_TEST_MODE === '1') return 'test-mode-id-token';
  try {
    const token = localStorage.getItem(STORAGE_KEYS.GOOGLE_TOKEN);
    if (!token) return null;
    // JWTs are base64url — normalize before atob or valid tokens fail to parse.
    const b64 = (token.split('.')[1] ?? '')
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const payload = JSON.parse(atob(b64)) as { exp?: number };
    return typeof payload.exp === 'number' &&
      payload.exp * 1000 > Date.now() + 30_000
      ? token
      : null;
  } catch {
    return null;
  }
}
