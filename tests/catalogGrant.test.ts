import { describe, it, expect, vi } from 'vitest';
import { resolveGrant, bearerWasRejected } from '../api/_lib/catalogGrant';
import { mintSessionToken } from '../api/_lib/sessionToken';

process.env.ADMIN_SYNC_TOKEN = 'test-secret-for-grants';
// resolveGrant only reaches the Google ID token branch when at least one
// audience is configured — set one so the mocked google-auth-library path
// below actually gets exercised instead of short-circuiting to null first.
process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-google-client-id';

// google-auth-library is loaded via dynamic `await import(...)` inside
// resolveGrant's Google ID token branch (never for session tokens or the
// no-credentials/vitrina-id-list paths already covered above). Mock it so
// the "staff via Google ID token" tests never hit the real network — vi.mock
// factories are hoisted above imports by vitest's transform (including above
// the static `resolveGrant` import), and the mock applies to dynamic imports
// of the same module id, not just static ones.
const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

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

  it('is staff for a raw Google ID token with a verified email', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ email: 'a@b.co', email_verified: true }),
    });
    const g = await resolveGrant(
      req({ authorization: 'Bearer raw-google-id-token' }),
      { lookupVitrina: neverCalled },
    );
    expect(g).toEqual({ kind: 'staff' });
  });

  it('is anon for a raw Google ID token with an UNverified email — an unverified email must never unlock staff-level catalog data', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ email: 'a@b.co', email_verified: false }),
    });
    const g = await resolveGrant(
      req({ authorization: 'Bearer raw-google-id-token' }),
      { lookupVitrina: neverCalled },
    );
    expect(g).toEqual({ kind: 'anon' });
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
