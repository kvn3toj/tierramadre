/**
 * Client side of the app-issued "tms1" session token.
 *
 * Why this exists: the app keeps you signed in via the stored profile
 * (GOOGLE_USER, re-validated by email), but privileged mutations — guest
 * invitations, Vitrina catalog shares, admin edits — must PROVE identity with
 * a cryptographically verified token. The raw Google ID token dies ~1h after
 * the last real sign-in and cannot be silently renewed on iOS/Safari, so
 * exactly those features hit "Tu sesión expiró" while everything else stayed
 * logged in.
 *
 * Fix: while the Google token IS fresh (right after sign-in, or after a
 * successful silent renewal on desktop), we exchange it server-side
 * (/api/validate?action=mint-session — verifies the token with Google and the
 * caller against the Sheets roster) for a 30-day HMAC-signed session token.
 * Privileged calls send whichever proof is available via readFreshAuthToken();
 * every server verifier accepts both. The session token also rolling-refreshes
 * itself before it expires, so anyone who opens the app at least every ~10
 * days simply never sees "session expired" again.
 *
 * Server counterparts: api/_lib/sessionToken.ts (mint + verify) and
 * convex/_lib/sessionToken.ts (verify).
 */

import { googleLogout } from '@react-oauth/google';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { readFreshGoogleIdToken } from './googleIdToken';
import { createLogger } from './logger';

const log = createLogger('AppSession');

/** Re-mint/refresh whenever fewer than 20 of the 30 days remain. */
const REFRESH_AHEAD_SECONDS = 20 * 24 * 60 * 60;
/** Same freshness safety margin as readFreshGoogleIdToken. */
const FRESHNESS_MARGIN_MS = 30_000;

interface StoredSession {
  token: string;
  /** Unix seconds. */
  exp: number;
}

/**
 * Parses the stored session token's (unsigned, client-readable) payload.
 * Returns null when missing/malformed/expired. The signature is only
 * verifiable server-side — this is just for expiry bookkeeping.
 */
function readStoredSession(): StoredSession | null {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.APP_SESSION_TOKEN);
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'tms1') return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64)) as { exp?: number };
    if (
      typeof payload.exp !== 'number' ||
      payload.exp * 1000 <= Date.now() + FRESHNESS_MARGIN_MS
    ) {
      return null;
    }
    return { token, exp: payload.exp };
  } catch {
    return null;
  }
}

/** The stored app session token, iff it hasn't expired. */
export function readFreshSessionToken(): string | null {
  return readStoredSession()?.token ?? null;
}

/**
 * The freshest identity proof available for privileged calls: the raw Google
 * ID token when it's still alive (strongest, also covers the
 * VITE_TEST_MODE stub), else the 30-day app session token. Null only when
 * neither exists — i.e. the user genuinely must sign in with Google again.
 *
 * Use THIS (not readFreshGoogleIdToken) everywhere a mutation needs an
 * identity token; every server verifier accepts both forms.
 */
export function readFreshAuthToken(): string | null {
  return readFreshGoogleIdToken() ?? readFreshSessionToken();
}

export function clearAppSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.APP_SESSION_TOKEN);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/**
 * sessionStorage flag set by handleSessionExpired() and read by
 * GoogleAuthContext after the forced reload, so the login screen can explain
 * WHY the user landed there ("Tu sesión expiró…") via the existing authError
 * Alert in WelcomeScreen.
 */
export const SESSION_EXPIRED_FLAG = 'tierramadre-session-expired';

let redirectingToLogin = false;

/**
 * Terminal "session expired" handler: full sign-out + redirect to the login
 * screen. Only for privileged flows with NO inline re-login UI — dialogs that
 * embed their own GoogleLogin fallback (InvitationGenerator,
 * VitrinaShareDialog) recover in place instead, which preserves form state.
 *
 * Clearing GOOGLE_USER before reloading is what makes the redirect work:
 * main.tsx's GoogleWrapper sees no stored user, loads the GSI script, and
 * App's auth gate falls through to the WelcomeScreen sign-in.
 */
export function handleSessionExpired(): void {
  if (redirectingToLogin) return; // several callers can race on one click
  redirectingToLogin = true;
  log.warn('Session fully expired — signing out and redirecting to login');
  try {
    googleLogout(); // disable GSI auto-select; safe no-op when GSI absent
  } catch {
    /* best-effort */
  }
  try {
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_USER);
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_PREFS);
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.APP_SESSION_TOKEN);
    sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1');
  } catch {
    /* storage unavailable — reload still lands on the login gate */
  }
  window.location.assign('/');
}

/**
 * readFreshAuthToken(), but a fully-expired session (no Google token AND no
 * app session token — i.e. >30 days without opening the app) signs the user
 * out and redirects to the login screen instead of leaving the feature stuck
 * on an error banner. Returns null exactly when the redirect fired.
 */
export function requireAuthTokenOrLogout(): string | null {
  const token = readFreshAuthToken();
  if (!token) handleSessionExpired();
  return token;
}

let inFlight: Promise<void> | null = null;

/**
 * Best-effort mint/refresh of the app session token. Safe to call often
 * (sign-in, app load, focus, every silent-refresh tick): it no-ops unless the
 * session is missing or inside its refresh window AND a usable exchange
 * credential exists, and it never throws or disturbs the Google session.
 */
export function ensureAppSession(): Promise<void> {
  if (import.meta.env.VITE_TEST_MODE === '1') return Promise.resolve();
  if (inFlight) return inFlight;
  inFlight = mintOrRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function mintOrRefresh(): Promise<void> {
  const nowSeconds = Date.now() / 1000;
  const session = readStoredSession();
  const sessionNeedsRenewal =
    !session || session.exp - nowSeconds < REFRESH_AHEAD_SECONDS;
  if (!sessionNeedsRenewal) return;

  // Prefer a fresh Google token (also the only option when no session exists);
  // fall back to the still-valid session itself for the rolling refresh.
  const googleToken = readFreshGoogleIdToken();
  const body = googleToken
    ? { idToken: googleToken }
    : session
      ? { sessionToken: session.token }
      : null;
  if (!body) return; // Nothing to exchange — visible re-auth is the only path.

  try {
    const response = await fetch('/api/validate?action=mint-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      // 401/403 = credential rejected or not on the roster; anything else is
      // transient. Either way keep whatever we had — never degrade the session.
      log.debug('mint-session declined', { status: response.status });
      return;
    }
    const data = (await response.json()) as {
      success?: boolean;
      sessionToken?: string;
    };
    if (data?.success && typeof data.sessionToken === 'string') {
      localStorage.setItem(STORAGE_KEYS.APP_SESSION_TOKEN, data.sessionToken);
      log.debug('App session token minted/refreshed');
    }
  } catch (error) {
    log.debug('mint-session unavailable', error);
  }
}
