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

import { catalogRequestInit } from './catalogAuthHeaders';

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
