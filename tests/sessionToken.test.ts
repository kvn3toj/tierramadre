/**
 * App-issued "tms1" session tokens (api/_lib/sessionToken.ts): the 30-day
 * identity proof that keeps invitation/vitrina/admin mutations working after
 * the ~1h Google credential dies. Covers the mint→verify round-trip plus the
 * fail-closed paths (tampering, expiry, missing secret) and the cross-runtime
 * mirror in convex/_lib/sessionToken.ts.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mintSessionToken,
  verifySessionToken,
  isSessionToken,
  SESSION_TTL_SECONDS,
} from '../api/_lib/sessionToken';
import { verifySessionToken as verifySessionTokenConvex } from '../convex/_lib/sessionToken';
import crypto from 'node:crypto';

const SECRET = 'test-admin-sync-token';
let savedSecret: string | undefined;

beforeEach(() => {
  savedSecret = process.env.ADMIN_SYNC_TOKEN;
  process.env.ADMIN_SYNC_TOKEN = SECRET;
});

afterEach(() => {
  if (savedSecret === undefined) delete process.env.ADMIN_SYNC_TOKEN;
  else process.env.ADMIN_SYNC_TOKEN = savedSecret;
});

describe('mintSessionToken / verifySessionToken', () => {
  it('round-trips a normalized email with a ~30-day expiry', () => {
    const token = mintSessionToken('  Staff@TierraMadre.App ');
    expect(token).not.toBeNull();
    expect(isSessionToken(token!)).toBe(true);

    const payload = verifySessionToken(token!);
    expect(payload).not.toBeNull();
    expect(payload!.email).toBe('staff@tierramadre.app');
    const now = Math.floor(Date.now() / 1000);
    expect(payload!.exp).toBeGreaterThan(now + SESSION_TTL_SECONDS - 60);
    expect(payload!.exp).toBeLessThanOrEqual(now + SESSION_TTL_SECONDS + 60);
  });

  it('rejects a tampered payload (signature no longer matches)', () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    const [prefix, b64, sig] = token.split('.');
    const forged = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    forged.email = 'attacker@evil.com';
    const forgedB64 = Buffer.from(JSON.stringify(forged), 'utf8').toString(
      'base64url',
    );
    expect(verifySessionToken(`${prefix}.${forgedB64}.${sig}`)).toBeNull();
  });

  it('rejects a tampered signature', () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    const flipped = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');
    expect(verifySessionToken(flipped)).toBeNull();
  });

  it('rejects an expired token', () => {
    // Forge an already-expired payload signed with the real secret.
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      email: 'staff@tierramadre.app',
      iat: now - 10,
      exp: now - 5,
    };
    const b64 = Buffer.from(JSON.stringify(payload), 'utf8').toString(
      'base64url',
    );
    const sig = crypto
      .createHmac('sha256', SECRET)
      .update(`tm-session-v1.${b64}`)
      .digest('hex');
    expect(verifySessionToken(`tms1.${b64}.${sig}`)).toBeNull();
  });

  it('rejects malformed inputs and Google-shaped JWTs', () => {
    expect(verifySessionToken('')).toBeNull();
    expect(verifySessionToken('tms1.only-two-parts')).toBeNull();
    expect(verifySessionToken('eyJhbGciOi.eyJzdWIiOi.signature')).toBeNull();
    expect(isSessionToken('eyJhbGciOi.eyJzdWIiOi.signature')).toBe(false);
  });

  it('fails closed when ADMIN_SYNC_TOKEN is not configured', () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    delete process.env.ADMIN_SYNC_TOKEN;
    expect(mintSessionToken('staff@tierramadre.app')).toBeNull();
    expect(verifySessionToken(token)).toBeNull();
  });
});

describe('convex/_lib/sessionToken mirror', () => {
  it('verifies a token minted by the Node side (cross-runtime format lock)', async () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    const payload = await verifySessionTokenConvex(token);
    expect(payload).not.toBeNull();
    expect(payload!.email).toBe('staff@tierramadre.app');
  });

  it('rejects tampering and wrong secrets like the Node side', async () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    const flipped = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');
    expect(await verifySessionTokenConvex(flipped)).toBeNull();

    process.env.ADMIN_SYNC_TOKEN = 'a-different-secret';
    expect(await verifySessionTokenConvex(token)).toBeNull();
  });
});
