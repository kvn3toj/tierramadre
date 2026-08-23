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
import { describe, it, expect, vi } from 'vitest';
import vitrinaHandler, { verifiedSessionEmail } from '../api/vitrina';
import { mintSessionToken } from '../api/_lib/sessionToken';

process.env.ADMIN_SYNC_TOKEN = 'test-secret-for-vitrina';
process.env.VITRINA_SHARED_SECRET = 'test-vitrina-shared-secret';

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

/**
 * Fix round 1: the 5 `puedeFijarMultiplicador` unit tests only cover the pure
 * predicate (role in, boolean out). Nothing exercised the gate itself — the
 * `Number(body.multiplier ?? 1)` coercion, the gate sitting above the
 * PATCH/POST branch, or the fail-closed behaviour — so a refactor of those
 * ten lines in `api/vitrina.ts` could break the invariant with nothing red.
 * These call the real default-exported handler (mocking only Convex + the
 * roster fetch), matching the pattern `tests/ambassadorCuration.test.ts`
 * (Convex mock) and `tests/driveOpsEndpointsAuth.test.ts` (fake req/res)
 * already use elsewhere in this suite.
 */
/** Mutable so each test can inspect exactly what reached Convex. */
const convexMutations: { args: Record<string, unknown> }[] = [];

/** Mutable per-test fixture for `vitrinas.getByToken` — the PATCH ownership
 *  gate's only Convex read. `undefined` unless a test sets it. */
let vitrinaFixture: { createdByEmail?: string } | null | undefined;

vi.mock('../api/_lib/convex-client.js', () => ({
  isConvexEnabled: true,
  convexClient: {
    mutation: async (_ref: unknown, args: Record<string, unknown>) => {
      convexMutations.push({ args });
      return { token: 'ABCDEFGHIJKL' };
    },
    query: async () => vitrinaFixture ?? null,
  },
}));

interface FakeRes {
  statusCode: number;
  body: unknown;
  setHeader: (k: string, v: string) => void;
  status: (code: number) => FakeRes;
  json: (payload: unknown) => FakeRes;
}

function makeRes(): FakeRes {
  const res = {
    statusCode: 200,
    body: undefined,
    setHeader: () => {},
  } as FakeRes;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload: unknown) => {
    res.body = payload;
    return res;
  };
  return res;
}

/** Stubs global fetch so `accessLevelFor`'s call to `/api/validate` resolves
 *  to a roster hit at the given accessLevel, without a real network call. */
function mockRosterFetch(accessLevel: string) {
  const fn = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          success: true,
          isAuthorized: true,
          user: { accessLevel },
        }),
        { status: 200 },
      ),
  );
  // @ts-expect-error — install our stub as the global fetch for the test
  globalThis.fetch = fn;
  return fn;
}

describe('multiplier gate (api/vitrina.ts default handler)', () => {
  it('an asesor posting multiplier "2.6" (string coercion) is refused with 403 — nothing minted', async () => {
    mockRosterFetch('asesor');
    const token = mintSessionToken('asesor-gate@tierramadre.app');
    const before = convexMutations.length;
    const res = makeRes();

    await vitrinaHandler(
      {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: {
          itemIds: [101],
          currency: 'COP',
          multiplier: '2.6',
          senderSlug: 'x',
        },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(403);
    expect(convexMutations.length).toBe(before);
  });

  it('an asesor posting multiplier 1 still mints — sharing must survive the gate', async () => {
    mockRosterFetch('asesor');
    const token = mintSessionToken('asesor-share@tierramadre.app');
    const res = makeRes();

    await vitrinaHandler(
      {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: {
          itemIds: [101],
          currency: 'COP',
          multiplier: 1,
          senderSlug: 'x',
        },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, token: 'ABCDEFGHIJKL' });
    const last = convexMutations.at(-1);
    expect(last?.args.multiplier).toBe(1);
    expect(last?.args.createdByEmail).toBe('asesor-share@tierramadre.app');
  });
});

/**
 * PATCH ownership (final whole-branch review, checkout-in-app): `update` had
 * no ownership check, and the multiplier gate above only fires when the
 * REQUESTED multiplier isn't 1 — so PATCHing someone else's vitrina to x1
 * always sailed through. This is exactly that exploit, reproduced end to
 * end: an asesor forwarded an admin's x2.6 link PATCHes it to x1.
 */
describe('PATCH ownership gate (api/vitrina.ts default handler)', () => {
  it("SEGURIDAD: a non-owner asesor PATCHing someone else's vitrina to x1 is refused with 403 — nothing patched", async () => {
    vitrinaFixture = { createdByEmail: 'admin@tierramadre.app' };
    mockRosterFetch('asesor');
    const token = mintSessionToken('asesor-outsider@tierramadre.app');
    const before = convexMutations.length;
    const res = makeRes();

    await vitrinaHandler(
      {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}` },
        body: { token: 'ABCDEFGHIJKL', multiplier: 1 },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(403);
    expect(convexMutations.length).toBe(before);
  });

  it('the vitrina owner CAN PATCH their own link to x1', async () => {
    vitrinaFixture = { createdByEmail: 'owner@tierramadre.app' };
    mockRosterFetch('asesor');
    const token = mintSessionToken('owner@tierramadre.app');
    const res = makeRes();

    await vitrinaHandler(
      {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}` },
        body: { token: 'ABCDEFGHIJKL', multiplier: 1 },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(200);
  });

  it("an admin CAN PATCH someone else's vitrina", async () => {
    vitrinaFixture = { createdByEmail: 'owner@tierramadre.app' };
    mockRosterFetch('admin');
    const token = mintSessionToken('admin@tierramadre.app');
    const res = makeRes();

    await vitrinaHandler(
      {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}` },
        body: { token: 'ABCDEFGHIJKL', currency: 'USD' },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(200);
  });

  it('a non-owner PATCHing a vitrina with no recorded owner (legacy row) is refused unless admin — fails closed', async () => {
    vitrinaFixture = {}; // no createdByEmail
    mockRosterFetch('embajador');
    const token = mintSessionToken('embajador@tierramadre.app');
    const res = makeRes();

    await vitrinaHandler(
      {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}` },
        body: { token: 'ABCDEFGHIJKL', multiplier: 1 },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(403);
  });

  it('PATCH on a token that does not exist is a 404, not a silent pass', async () => {
    vitrinaFixture = null;
    mockRosterFetch('admin');
    const token = mintSessionToken('admin@tierramadre.app');
    const res = makeRes();

    await vitrinaHandler(
      {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}` },
        body: { token: 'DOESNOTEXIST', multiplier: 1 },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(404);
  });
});
