/**
 * F7 lockdown: `isStaffSession` (convex/_lib/requireStaffSession.ts) is the
 * gate every internal-only Convex query (clients, providers, sales, lots,
 * lotItems, asesorMovements, fotosintesisAi, products.list) now calls before
 * touching the database. It must resolve `true` ONLY for a `tms1` session
 * token that verifies (see convex/_lib/sessionToken.ts), and `false` — never
 * throw — for everything else: absent, malformed, tampered, or expired.
 *
 * The second describe block proves the gate is actually wired into a real
 * query, not just that the helper itself is correct — `clients.list` is
 * invoked directly (Convex's queryGeneric wraps a handler you can call like a
 * plain function; see node_modules/convex/dist/esm/server/impl/
 * registration_impl.js — `dontCallDirectly` still runs the real handler, it
 * only warns) with no `sessionToken`, and must return the empty form ([])
 * without ever touching `ctx.db`.
 *
 * F7b (2026-08-05): a confirmed subset of these queries — `lots.list`,
 * `lots.peekNextLoteId`, `lotItems.search`, `lotItems.sumPreponderancia`,
 * `lotItems.getByItemId`, `providers.list`, `products.list` — is also read
 * directly by the anima-bot Telegram bridge, which has no staff session but
 * already holds `ANIMA_BOT_SECRET`. `isBotSecret` (convex/_lib/botAuth.ts) is
 * the non-throwing check for that secret, and `isStaffOrBotSession` is the
 * combined either/or gate those 7 queries use instead of `isStaffSession`
 * alone. The third/fourth describe blocks cover both, plus one query
 * (`providers.list`) proven end-to-end.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mintSessionToken } from '../api/_lib/sessionToken';
import {
  isStaffSession,
  isStaffOrBotSession,
} from '../convex/_lib/requireStaffSession';
import { isBotSecret } from '../convex/_lib/botAuth';
import { list as clientsList } from '../convex/clients';
import { list as providersList } from '../convex/providers';

const SECRET = 'test-admin-sync-token';
const BOT_SECRET = 'test-anima-bot-secret';
let savedSecret: string | undefined;
let savedBotSecret: string | undefined;

beforeEach(() => {
  savedSecret = process.env.ADMIN_SYNC_TOKEN;
  process.env.ADMIN_SYNC_TOKEN = SECRET;
  savedBotSecret = process.env.ANIMA_BOT_SECRET;
  process.env.ANIMA_BOT_SECRET = BOT_SECRET;
});

afterEach(() => {
  if (savedSecret === undefined) delete process.env.ADMIN_SYNC_TOKEN;
  else process.env.ADMIN_SYNC_TOKEN = savedSecret;
  if (savedBotSecret === undefined) delete process.env.ANIMA_BOT_SECRET;
  else process.env.ANIMA_BOT_SECRET = savedBotSecret;
});

describe('isStaffSession', () => {
  it('true for a valid tms1 session token', async () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    expect(await isStaffSession(token)).toBe(true);
  });

  it('false for an expired token', async () => {
    const crypto = await import('node:crypto');
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
    expect(await isStaffSession(`tms1.${b64}.${sig}`)).toBe(false);
  });

  it('false for a malformed token', async () => {
    expect(await isStaffSession('not-a-real-token')).toBe(false);
    expect(await isStaffSession('tms1.only-two-parts')).toBe(false);
    expect(await isStaffSession('eyJhbGciOi.eyJzdWIiOi.signature')).toBe(false);
  });

  it('false for a tampered signature', async () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    const flipped = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');
    expect(await isStaffSession(flipped)).toBe(false);
  });

  it('false when absent (undefined or empty string)', async () => {
    expect(await isStaffSession(undefined)).toBe(false);
    expect(await isStaffSession('')).toBe(false);
  });

  it('never throws even when ADMIN_SYNC_TOKEN is unset (fails closed)', async () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    delete process.env.ADMIN_SYNC_TOKEN;
    await expect(isStaffSession(token)).resolves.toBe(false);
  });
});

describe('internal-only query gate wired end-to-end (clients.list)', () => {
  it('a non-staff caller gets [] and the handler never touches ctx.db', async () => {
    // No `db` on the fake ctx at all — if the gate didn't short-circuit
    // before any `ctx.db.query(...)` call, this throws instead of the test
    // failing on a wrong value, which is the point: it proves early return.
    const fakeCtx = {} as never;
    const result = await (
      clientsList as unknown as (
        ctx: never,
        args: { sessionToken?: string },
      ) => Promise<unknown>
    )(fakeCtx, {});
    expect(result).toEqual([]);
  });

  it('an expired session token also gets []', async () => {
    const fakeCtx = {} as never;
    const crypto = await import('node:crypto');
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
    const result = await (
      clientsList as unknown as (
        ctx: never,
        args: { sessionToken?: string },
      ) => Promise<unknown>
    )(fakeCtx, { sessionToken: `tms1.${b64}.${sig}` });
    expect(result).toEqual([]);
  });
});

describe('isBotSecret', () => {
  it('true for the correct ANIMA_BOT_SECRET', () => {
    expect(isBotSecret(BOT_SECRET)).toBe(true);
  });

  it('false for a wrong secret', () => {
    expect(isBotSecret('not-the-right-secret')).toBe(false);
    // Also false for a wrong secret of the SAME length — proves it's a real
    // byte-compare, not just a length check.
    expect(isBotSecret('x'.repeat(BOT_SECRET.length))).toBe(false);
  });

  it('false when absent', () => {
    expect(isBotSecret(undefined)).toBe(false);
    expect(isBotSecret('')).toBe(false);
  });

  it('never throws even when ANIMA_BOT_SECRET is unset (fails closed)', () => {
    delete process.env.ANIMA_BOT_SECRET;
    expect(() => isBotSecret(BOT_SECRET)).not.toThrow();
    expect(isBotSecret(BOT_SECRET)).toBe(false);
  });
});

describe('isStaffOrBotSession (either/or gate)', () => {
  it('true with a valid staff session and no bot secret', async () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    expect(
      await isStaffOrBotSession({ sessionToken: token, botSecret: undefined }),
    ).toBe(true);
  });

  it('true with a valid bot secret and no staff session', async () => {
    expect(
      await isStaffOrBotSession({
        sessionToken: undefined,
        botSecret: BOT_SECRET,
      }),
    ).toBe(true);
  });

  it('false when both credentials are wrong/absent', async () => {
    expect(
      await isStaffOrBotSession({
        sessionToken: 'garbage',
        botSecret: 'also garbage',
      }),
    ).toBe(false);
    expect(
      await isStaffOrBotSession({
        sessionToken: undefined,
        botSecret: undefined,
      }),
    ).toBe(false);
  });
});

describe('bot-or-staff query gate wired end-to-end (providers.list)', () => {
  const fakeProviderRow = {
    _id: 'provider_1',
    nombreORazonSocial: 'Esmeraldas del Oriente',
    nit: '900123456-7',
  };
  const fakeCtxWithData = {
    db: {
      query: () => ({
        collect: async () => [fakeProviderRow],
      }),
    },
  } as never;

  it('a valid bot secret returns the real data', async () => {
    const result = await (
      providersList as unknown as (
        ctx: never,
        args: { search?: string; sessionToken?: string; botSecret?: string },
      ) => Promise<unknown>
    )(fakeCtxWithData, { botSecret: BOT_SECRET });
    expect(result).toEqual([fakeProviderRow]);
  });

  it('a wrong bot secret gets [] and never touches ctx.db', async () => {
    const fakeCtxNoDb = {} as never;
    const result = await (
      providersList as unknown as (
        ctx: never,
        args: { search?: string; sessionToken?: string; botSecret?: string },
      ) => Promise<unknown>
    )(fakeCtxNoDb, { botSecret: 'wrong-secret' });
    expect(result).toEqual([]);
  });

  it('no credential at all gets [] and never touches ctx.db', async () => {
    const fakeCtxNoDb = {} as never;
    const result = await (
      providersList as unknown as (
        ctx: never,
        args: { search?: string; sessionToken?: string; botSecret?: string },
      ) => Promise<unknown>
    )(fakeCtxNoDb, {});
    expect(result).toEqual([]);
  });
});
