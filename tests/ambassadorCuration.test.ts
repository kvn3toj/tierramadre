/**
 * `/api/ambassador-curation` — the store that gets an ambassador's curation
 * out of their own browser (2026-08-11).
 *
 * Favourites lived under `tm-ambassador-favorites-{slug}` and overrides under
 * `tm:ambassador-overrides:{slug}`, both localStorage. The dialog worked, the
 * validation worked, and the result was visible to exactly one browser — not
 * the ambassador's phone, and not the client the feature exists for.
 *
 * Two things here must never regress, so they get the most tests:
 *
 *  1. ONLY the owner writes. The check resolves the caller's verified session
 *     email against the Sheets roster; `isProfileOwner` from the client is a
 *     rendering hint computed from a payload the client also holds, and proves
 *     nothing about who is calling.
 *  2. A custom price is still a price. Reads follow the catalog's existing
 *     grant rule exactly — anonymous callers never receive one.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mintSessionToken } from '../api/_lib/sessionToken';

const ADMIN_SECRET = 'test-admin-sync-token-curation';

/** Mutable so each test can pose as a different backend state. */
const convex = {
  enabled: true,
  rows: [] as Record<string, unknown>[],
  mutations: [] as { args: Record<string, unknown> }[],
};

vi.mock('../api/_lib/convex-client.js', () => ({
  get isConvexEnabled() {
    return convex.enabled;
  },
  convexClient: {
    query: async () => convex.rows,
    // The first arg is a Convex function-reference proxy that throws on
    // primitive conversion, so it is deliberately not recorded — the args are
    // what these tests assert on.
    mutation: async (_ref: unknown, args: Record<string, unknown>) => {
      convex.mutations.push({ args });
      return 'id';
    },
  },
}));

const { handleAmbassadorCuration } = await import('../api/ambassador-curation');

const ROSTER = [
  ['Nombre', 'Rol', 'Email', 'Estado'],
  ['Álvaro Pelaéz', 'Embajador', 'alvaro@tierramadre.app', 'activo'],
  ['Juan Escobar Ramirez', 'Asesor', 'juan@tierramadre.app', 'activo'],
];

const INVENTORY = [
  ['item', 'nombre', 'precio cop', 'asesor', 'estado'],
  ['101', 'Muzo', '10000000', 'Álvaro Pelaéz', 'DISPONIBLE'],
];

function mockSheets() {
  return {
    spreadsheets: {
      get: vi.fn().mockResolvedValue({
        data: {
          sheets: [
            { properties: { title: 'Inventario' } },
            { properties: { title: 'Asesores' } },
          ],
        },
      }),
      values: {
        get: vi.fn(async ({ range }: { range: string }) =>
          range.startsWith('Asesores')
            ? { data: { values: ROSTER } }
            : { data: { values: INVENTORY } },
        ),
      },
    },
  };
}

function mockRes() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader: vi.fn(),
    end: vi.fn(),
  };
}

async function call(opts: {
  method: string;
  query?: Record<string, string>;
  body?: unknown;
  token?: string;
}) {
  const res = mockRes();
  await handleAmbassadorCuration(
    {
      method: opts.method,
      query: opts.query ?? {},
      headers: opts.token ? { authorization: `Bearer ${opts.token}` } : {},
      body: opts.body,
    } as never,
    res as never,
    { sheets: mockSheets() } as never,
  );
  return res;
}

function data(res: { body: unknown }) {
  const body = res.body as Record<string, unknown>;
  return (body?.data ?? body) as Record<string, unknown>;
}

let saved: string | undefined;
beforeEach(() => {
  saved = process.env.ADMIN_SYNC_TOKEN;
  process.env.ADMIN_SYNC_TOKEN = ADMIN_SECRET;
  convex.enabled = true;
  convex.rows = [];
  convex.mutations = [];
});
afterEach(() => {
  if (saved === undefined) delete process.env.ADMIN_SYNC_TOKEN;
  else process.env.ADMIN_SYNC_TOKEN = saved;
});

const alvaro = () => mintSessionToken('alvaro@tierramadre.app');
const juan = () => mintSessionToken('juan@tierramadre.app');

describe('who may write', () => {
  it('rejects a caller with no session', async () => {
    const res = await call({
      method: 'PUT',
      body: { slug: 'alvaro-pelaez', itemId: '101', isFavorite: true },
    });
    expect(res.statusCode).toBe(401);
    expect(convex.mutations).toHaveLength(0);
  });

  it('rejects a valid session writing to SOMEONE ELSE’s profile', async () => {
    // The acceptance criterion. Juan is genuinely staff with a genuine
    // session — and still cannot touch Álvaro's showcase.
    const res = await call({
      method: 'PUT',
      token: juan(),
      body: { slug: 'alvaro-pelaez', itemId: '101', customName: 'Mía' },
    });
    expect(res.statusCode).toBe(403);
    expect(convex.mutations).toHaveLength(0);
  });

  it('rejects a session whose email is not on the roster at all', async () => {
    const res = await call({
      method: 'PUT',
      token: mintSessionToken('desconocido@gmail.com'),
      body: { slug: 'alvaro-pelaez', itemId: '101', isFavorite: true },
    });
    expect(res.statusCode).toBe(401);
    expect(convex.mutations).toHaveLength(0);
  });

  it('ignores a client claiming ownership in the body', async () => {
    const res = await call({
      method: 'PUT',
      token: juan(),
      body: {
        slug: 'alvaro-pelaez',
        itemId: '101',
        isFavorite: true,
        isProfileOwner: true,
        owner: true,
      },
    });
    expect(res.statusCode).toBe(403);
    expect(convex.mutations).toHaveLength(0);
  });

  it('lets the owner write their own profile', async () => {
    const res = await call({
      method: 'PUT',
      token: alvaro(),
      body: { slug: 'alvaro-pelaez', itemId: '101', isFavorite: true },
    });
    expect(res.statusCode).toBe(200);
    expect(convex.mutations).toHaveLength(1);
    expect(convex.mutations[0].args).toMatchObject({
      slug: 'alvaro-pelaez',
      itemId: '101',
      updatedByEmail: 'alvaro@tierramadre.app',
    });
  });

  it('guards DELETE with the same rule', async () => {
    expect(
      (
        await call({
          method: 'DELETE',
          body: { slug: 'alvaro-pelaez', itemId: '101' },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await call({
          method: 'DELETE',
          token: juan(),
          body: { slug: 'alvaro-pelaez', itemId: '101' },
        })
      ).statusCode,
    ).toBe(403);
    expect(convex.mutations).toHaveLength(0);
  });
});

describe('server-side price validation', () => {
  it('refuses a price below the canonical one and writes nothing', async () => {
    // Base is 10,000,000. Anti-devaluation floor is 1.0×.
    const res = await call({
      method: 'PUT',
      token: alvaro(),
      body: { slug: 'alvaro-pelaez', itemId: '101', customPriceCOP: 5_000_000 },
    });
    expect(res.statusCode).toBe(400);
    expect(convex.mutations).toHaveLength(0);
  });

  it('refuses a price above 10x and writes nothing', async () => {
    const res = await call({
      method: 'PUT',
      token: alvaro(),
      body: {
        slug: 'alvaro-pelaez',
        itemId: '101',
        customPriceCOP: 200_000_000,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(convex.mutations).toHaveLength(0);
  });

  it('accepts a price inside the band', async () => {
    const res = await call({
      method: 'PUT',
      token: alvaro(),
      body: {
        slug: 'alvaro-pelaez',
        itemId: '101',
        customPriceCOP: 25_000_000,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(convex.mutations[0].args).toMatchObject({
      customPriceCOP: 25_000_000,
    });
  });

  it('validates against the price the SERVER read, not one the client sent', async () => {
    // A client claiming a huge base price must not thereby unlock a huge
    // override — the base is never taken from the request.
    const res = await call({
      method: 'PUT',
      token: alvaro(),
      body: {
        slug: 'alvaro-pelaez',
        itemId: '101',
        precioCOP: 500_000_000,
        basePriceCOP: 500_000_000,
        customPriceCOP: 400_000_000,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(convex.mutations).toHaveLength(0);
  });
});

describe('reads', () => {
  beforeEach(() => {
    convex.rows = [
      {
        slug: 'alvaro-pelaez',
        itemId: '101',
        isFavorite: true,
        sortOrder: 1,
        customPriceCOP: 25_000_000,
        customName: 'La Verde',
        updatedAt: 'x',
      },
      {
        slug: 'alvaro-pelaez',
        itemId: '102',
        isFavorite: true,
        sortOrder: 0,
        updatedAt: 'x',
      },
      {
        slug: 'alvaro-pelaez',
        itemId: '103',
        isFavorite: false,
        customPriceCOP: 9_000_000,
        updatedAt: 'x',
      },
    ];
  });

  it('returns favourites in the order the ambassador arranged them', async () => {
    const res = await call({ method: 'GET', query: { slug: 'alvaro-pelaez' } });
    expect(res.statusCode).toBe(200);
    expect(data(res).favorites).toEqual(['102', '101']);
  });

  it('never gives an anonymous caller a custom price', async () => {
    const res = await call({ method: 'GET', query: { slug: 'alvaro-pelaez' } });
    const overrides = data(res).overrides as Record<
      string,
      Record<string, unknown>
    >;
    // The name is public — it is the showcase label. The price is not.
    expect(overrides['101'].customName).toBe('La Verde');
    expect(overrides['101'].customPriceCOP).toBeUndefined();
    expect(overrides['103']).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('25000000');
    expect(JSON.stringify(res.body)).not.toContain('9000000');
  });

  it('gives staff the custom price', async () => {
    const res = await call({
      method: 'GET',
      query: { slug: 'alvaro-pelaez' },
      token: alvaro(),
    });
    const overrides = data(res).overrides as Record<
      string,
      Record<string, unknown>
    >;
    expect(overrides['101'].customPriceCOP).toBe(25_000_000);
  });

  it('degrades to empty curation when the store is unavailable', async () => {
    // Every preview deploy: VITE_CONVEX_URL is set but CONVEX_URL is not, so
    // isConvexEnabled is false. The profile must still render its pieces.
    convex.enabled = false;
    const res = await call({ method: 'GET', query: { slug: 'alvaro-pelaez' } });
    expect(res.statusCode).toBe(200);
    expect(data(res)).toMatchObject({ favorites: [], overrides: {} });
  });

  it('400s without a slug', async () => {
    expect((await call({ method: 'GET' })).statusCode).toBe(400);
  });
});

describe('writes when the store is unavailable', () => {
  it('fails loudly instead of pretending to save', async () => {
    // A silent 200 here is how an ambassador rearranges their showcase, sees
    // it work, and finds it gone on reload.
    convex.enabled = false;
    const res = await call({
      method: 'PUT',
      token: alvaro(),
      body: { slug: 'alvaro-pelaez', itemId: '101', isFavorite: true },
    });
    expect(res.statusCode).toBe(503);
  });
});

describe('favourites reordering', () => {
  it('sends the whole row as one statement', async () => {
    const res = await call({
      method: 'PUT',
      token: alvaro(),
      body: { slug: 'alvaro-pelaez', favorites: ['103', '101', '102'] },
    });
    expect(res.statusCode).toBe(200);
    expect(convex.mutations).toHaveLength(1);
    expect(convex.mutations[0].args).toMatchObject({
      itemIds: ['103', '101', '102'],
    });
  });
});


describe('reventa (forResale)', () => {
  it('el GET publica qué piezas están ofrecidas', async () => {
    convex.rows = [
      { slug: 'alvaro-pelaez', itemId: '101', isFavorite: false, forResale: true, updatedAt: 'x' },
      { slug: 'alvaro-pelaez', itemId: '102', isFavorite: true, forResale: false, updatedAt: 'x' },
    ];
    const res = await call({ method: 'GET', query: { slug: 'alvaro-pelaez' } });
    expect(data(res).resale).toEqual(['101']);
  });

  it('el dueño puede ofrecer una pieza', async () => {
    const res = await call({
      method: 'PUT',
      token: alvaro(),
      body: { slug: 'alvaro-pelaez', itemId: '101', forResale: true },
    });
    expect(res.statusCode).toBe(200);
    expect(convex.mutations[0].args).toMatchObject({
      itemId: '101',
      forResale: true,
    });
  });

  it('otro embajador NO puede ofrecer una pieza ajena', async () => {
    // El control más importante: ofrecer una pieza la publica en el catálogo
    // con el nombre de su dueño encima.
    const res = await call({
      method: 'PUT',
      token: juan(),
      body: { slug: 'alvaro-pelaez', itemId: '101', forResale: true },
    });
    expect(res.statusCode).toBe(403);
    expect(convex.mutations).toHaveLength(0);
  });

  it('sin sesión tampoco', async () => {
    const res = await call({
      method: 'PUT',
      body: { slug: 'alvaro-pelaez', itemId: '101', forResale: true },
    });
    expect(res.statusCode).toBe(401);
    expect(convex.mutations).toHaveLength(0);
  });

  it('se puede retirar la oferta', async () => {
    const res = await call({
      method: 'PUT',
      token: alvaro(),
      body: { slug: 'alvaro-pelaez', itemId: '101', forResale: false },
    });
    expect(res.statusCode).toBe(200);
    expect(convex.mutations[0].args).toMatchObject({ forResale: false });
  });
});
