import { describe, it, expect, vi } from 'vitest';
import { resolveGrant, bearerWasRejected } from '../api/_lib/catalogGrant';
import { mintSessionToken } from '../api/_lib/sessionToken';

const SYNC_SECRET = 'test-admin-sync-token';
process.env.ADMIN_SYNC_TOKEN = SYNC_SECRET;

const req = (headers = {}, query = {}) => ({ headers, query }) as never;

const neverCalled = vi.fn(async () => {
  throw new Error('vitrina lookup must not be called');
});

describe('resolveGrant', () => {
  it('is anon with no credentials at all', async () => {
    expect(await resolveGrant(req(), { lookupVitrina: neverCalled })).toEqual({
      kind: 'anon',
    });
  });

  it('is anon for a malformed bearer token', async () => {
    const g = await resolveGrant(
      req({ authorization: 'Bearer not-a-real-token' }),
      { lookupVitrina: neverCalled },
    );
    expect(g).toEqual({ kind: 'anon' });
  });

  it('is staff for a valid session token', async () => {
    const token = mintSessionToken('asesor@tierramadre.app');
    const g = await resolveGrant(req({ authorization: `Bearer ${token}` }), {
      lookupVitrina: neverCalled,
    });
    expect(g).toEqual({ kind: 'staff' });
  });

  it('is anon when ?vitrina is an id-list — a number is not a credential', async () => {
    for (const guessable of ['368', '368,412', '368-412']) {
      const g = await resolveGrant(req({}, { vitrina: guessable }), {
        lookupVitrina: neverCalled,
      });
      expect(g).toEqual({ kind: 'anon' });
    }
  });

  it('is vitrina for a stateful token that resolves', async () => {
    const lookupVitrina = vi.fn(async () => ({ itemIds: [368, 412] }));
    const g = await resolveGrant(req({}, { vitrina: 'AB3K9P2Q4R7S' }), {
      lookupVitrina,
    });
    expect(g).toEqual({ kind: 'vitrina', itemIds: [368, 412] });
    expect(lookupVitrina).toHaveBeenCalledWith('AB3K9P2Q4R7S');
  });

  it('is anon when the stateful token does not resolve', async () => {
    const g = await resolveGrant(req({}, { vitrina: 'DEADBEEF1234' }), {
      lookupVitrina: async () => null,
    });
    expect(g).toEqual({ kind: 'anon' });
  });

  it('is anon — never throws — when the lookup itself fails', async () => {
    const g = await resolveGrant(req({}, { vitrina: 'AB3K9P2Q4R7S' }), {
      lookupVitrina: async () => {
        throw new Error('convex down');
      },
    });
    expect(g).toEqual({ kind: 'anon' });
  });

  it('prefers staff over vitrina when both are present', async () => {
    const token = mintSessionToken('asesor@tierramadre.app');
    const g = await resolveGrant(
      req({ authorization: `Bearer ${token}` }, { vitrina: 'AB3K9P2Q4R7S' }),
      { lookupVitrina: neverCalled },
    );
    expect(g).toEqual({ kind: 'staff' });
  });

  // 2026-08 fix round: the Google-ID-token path was removed entirely. It
  // only ever proved "some Google account with the right audience" — not
  // roster membership, since the OAuth client ID is public (ships in the
  // frontend bundle). Any Gmail user could mint one and read the
  // unprojected catalog. Only a `tms1` session token (proof of a verified
  // mint-session roster check) or the ADMIN_SYNC_TOKEN service grant now
  // resolve `staff`.
  it('is anon for a raw Google ID token — Google tokens no longer grant staff, whatever their shape', async () => {
    const g = await resolveGrant(
      req({ authorization: 'Bearer raw-google-id-token' }),
      { lookupVitrina: neverCalled },
    );
    expect(g).toEqual({ kind: 'anon' });
  });

  it('never calls out to Google at all — no network dependency left in the staff check', async () => {
    // If catalogGrant.ts still imported google-auth-library, an unmocked
    // import in this test file would either throw or attempt real network
    // I/O. Reaching `anon` cleanly and synchronously-ish proves the path is
    // gone, not just failing to verify.
    const g = await resolveGrant(
      req({ authorization: 'Bearer ya29.a0-fake-google-access-token-shape' }),
      { lookupVitrina: neverCalled },
    );
    expect(g).toEqual({ kind: 'anon' });
  });

  describe('service grant (ADMIN_SYNC_TOKEN)', () => {
    it('is staff when the bearer exactly matches ADMIN_SYNC_TOKEN', async () => {
      const g = await resolveGrant(
        req({ authorization: `Bearer ${SYNC_SECRET}` }),
        { lookupVitrina: neverCalled },
      );
      expect(g).toEqual({ kind: 'staff' });
    });

    it('is anon for a near-miss — not a substring/prefix match', async () => {
      const g = await resolveGrant(
        req({ authorization: `Bearer ${SYNC_SECRET}-extra` }),
        { lookupVitrina: neverCalled },
      );
      expect(g).toEqual({ kind: 'anon' });
    });

    it('is anon when ADMIN_SYNC_TOKEN is not configured on the server', async () => {
      const saved = process.env.ADMIN_SYNC_TOKEN;
      delete process.env.ADMIN_SYNC_TOKEN;
      try {
        const g = await resolveGrant(
          req({ authorization: `Bearer ${SYNC_SECRET}` }),
          { lookupVitrina: neverCalled },
        );
        expect(g).toEqual({ kind: 'anon' });
      } finally {
        process.env.ADMIN_SYNC_TOKEN = saved;
      }
    });

    it('wins even without a session token — this is how the Convex sync authenticates', async () => {
      const g = await resolveGrant(
        req(
          { authorization: `Bearer ${SYNC_SECRET}` },
          { vitrina: 'AB3K9P2Q4R7S' },
        ),
        { lookupVitrina: neverCalled },
      );
      expect(g).toEqual({ kind: 'staff' });
    });
  });
});

describe('bearerWasRejected', () => {
  it('is false when no token was ever offered', async () => {
    const r = req();
    expect(
      bearerWasRejected(
        r,
        await resolveGrant(r, { lookupVitrina: neverCalled }),
      ),
    ).toBe(false);
  });

  it('is true when a token was offered and refused', async () => {
    const r = req({ authorization: 'Bearer expired-or-forged' });
    expect(
      bearerWasRejected(
        r,
        await resolveGrant(r, { lookupVitrina: neverCalled }),
      ),
    ).toBe(true);
  });

  it('is false for a token that verified', async () => {
    const r = req({ authorization: `Bearer ${mintSessionToken('a@b.co')}` });
    expect(
      bearerWasRejected(
        r,
        await resolveGrant(r, { lookupVitrina: neverCalled }),
      ),
    ).toBe(false);
  });
});
