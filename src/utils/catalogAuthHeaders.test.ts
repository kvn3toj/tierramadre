/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted above the imports, so its factory cannot close over a
// plain `let` (TDZ). vi.hoisted gives it a box that exists early enough.
// vi.spyOn on an ESM named export does NOT reliably intercept — use this.
const auth = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('./sessionToken', () => ({
  readFreshAuthToken: () => auth.token,
}));

import { catalogRequestInit, catalogUrl } from './catalogAuthHeaders';

describe('catalogRequestInit', () => {
  beforeEach(() => {
    auth.token = null;
  });

  it('returns undefined when there is no token — anonymous stays anonymous', () => {
    expect(catalogRequestInit()).toBeUndefined();
  });

  it('attaches a Bearer header when signed in', () => {
    auth.token = 'tms1.abc.def';
    expect(catalogRequestInit()).toEqual({
      headers: { Authorization: 'Bearer tms1.abc.def' },
    });
  });
});

describe('catalogUrl — vitrina passthrough', () => {
  it('appends the token so the server can resolve the grant', () => {
    expect(catalogUrl('/api/get-treasure-sheets', 'AB3K9P2Q4R7S')).toBe(
      '/api/get-treasure-sheets?vitrina=AB3K9P2Q4R7S',
    );
  });

  it('leaves the URL alone with no vitrina token', () => {
    expect(catalogUrl('/api/get-treasure-sheets')).toBe(
      '/api/get-treasure-sheets',
    );
  });

  it('does not forward an id-list — a number is not a credential', () => {
    expect(catalogUrl('/api/get-treasure-sheets', '368')).toBe(
      '/api/get-treasure-sheets',
    );
    expect(catalogUrl('/api/get-treasure-sheets', '368,412')).toBe(
      '/api/get-treasure-sheets',
    );
  });
});
