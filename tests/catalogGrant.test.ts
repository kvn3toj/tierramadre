import { describe, it, expect, vi } from 'vitest';
import { resolveGrant } from '../api/_lib/catalogGrant';
import { mintSessionToken } from '../api/_lib/sessionToken';

process.env.ADMIN_SYNC_TOKEN = 'test-secret-for-grants';

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
});
