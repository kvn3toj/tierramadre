/**
 * PII lockdown — the product-views REST "sibling door" (2026-08-06).
 *
 * convex/productViews.ts's `guestActivity`/`byInviterAndGuest` were already
 * gated on a `tms1` staff session (tests/convexPiiInvitados.test.ts, item 1).
 * This file's REST twin — GET /api/product-views with action=by-inviter /
 * action=recent / action=user / action=product — served the SAME
 * userEmail/userName/userRole rows, keyed on the same guessable
 * inviterName/email/name/itemId, with NO auth at all.
 * `verifiedSessionEmail` + `handleProductViews`'s session gate
 * (api/product-views.js) is the fix, mirroring the exact pattern
 * api/invitations.ts's `list-by-creator` action already uses.
 *
 * action=track (POST) is intentionally left untouched: anonymous writes are
 * the entire point of view tracking, and gating it would break analytics for
 * every guest browsing the catalog.
 *
 * action=stats stays publicly readable for its aggregate `views` counts
 * (every catalog visitor reads this via
 * useProductViews→useTreasureBrowserController), but the server strips the
 * embedded per-user PII fields (`topViewers`, `recentActivity`) unless the
 * caller holds a verified session.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mintSessionToken } from '../api/_lib/sessionToken';
import { handleProductViews, verifiedSessionEmail } from '../api/product-views';

const ADMIN_SECRET = 'test-admin-sync-token-product-views';
let savedAdminSecret: string | undefined;
let savedConvexUrl: string | undefined;

beforeEach(() => {
  savedAdminSecret = process.env.ADMIN_SYNC_TOKEN;
  process.env.ADMIN_SYNC_TOKEN = ADMIN_SECRET;
  // Force the Sheets path for action=track (isConvexEnabled is computed
  // once at module load from CONVEX_URL, so this only matters if something
  // upstream ever sets it — belt and suspenders for test isolation).
  savedConvexUrl = process.env.CONVEX_URL;
  delete process.env.CONVEX_URL;
});

afterEach(() => {
  if (savedAdminSecret === undefined) delete process.env.ADMIN_SYNC_TOKEN;
  else process.env.ADMIN_SYNC_TOKEN = savedAdminSecret;
  if (savedConvexUrl === undefined) delete process.env.CONVEX_URL;
  else process.env.CONVEX_URL = savedConvexUrl;
});

const HEADERS_ROW = [
  'timestamp',
  'itemId',
  'productName',
  'sessionId',
  'referrer',
  'deviceType',
  'browser',
  'country',
  'userName',
  'userEmail',
  'userRole',
  'inviterName',
];

const DATA_ROW = [
  '2026-08-01T00:00:00.000Z',
  '5',
  'Esmeralda Test',
  'sess_1',
  'https://instagram.com',
  'mobile',
  'Safari',
  'CO',
  'Guest Guy',
  'guest@example.com',
  'Invitado',
  'Ana Advisor',
];

function makeSheets(rows: unknown[][] = [HEADERS_ROW, DATA_ROW]) {
  return {
    spreadsheets: {
      get: vi.fn(async () => ({
        data: { sheets: [{ properties: { title: 'ProductViews' } }] },
      })),
      batchUpdate: vi.fn(async () => ({})),
      values: {
        get: vi.fn(async () => ({ data: { values: rows } })),
        update: vi.fn(async () => ({})),
        append: vi.fn(async () => ({})),
      },
    },
  };
}

interface FakeReq {
  method: 'GET' | 'POST';
  query: Record<string, string>;
  body?: Record<string, unknown>;
  headers: Record<string, string>;
}

function makeReq(opts: {
  method: 'GET' | 'POST';
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): FakeReq {
  return {
    method: opts.method,
    query: opts.query ?? {},
    body: opts.body,
    headers: opts.headers ?? {},
  };
}

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

describe('verifiedSessionEmail (api/product-views.js)', () => {
  it('is null with no bearer at all — the handler turns this into a 401', () => {
    expect(verifiedSessionEmail(undefined)).toBeNull();
  });

  it('is null for a raw Google ID token, whatever its shape', () => {
    expect(verifiedSessionEmail('Bearer raw-google-id-token')).toBeNull();
  });

  it('is null for a malformed/forged token', () => {
    expect(verifiedSessionEmail('Bearer not-a-real-token')).toBeNull();
  });

  it('returns the email for a valid tms1 session token', () => {
    const token = mintSessionToken('asesor@tierramadre.app');
    expect(verifiedSessionEmail(`Bearer ${token}`)).toBe(
      'asesor@tierramadre.app',
    );
  });
});

describe('GET action=by-inviter requires a staff session', () => {
  it('401s with no Authorization header, and never touches Sheets (zero quota cost)', async () => {
    const sheets = makeSheets();
    const req = makeReq({
      method: 'GET',
      query: { action: 'by-inviter', inviterName: 'Ana Advisor' },
    });
    const res = makeRes();
    await handleProductViews(req as never, res as never, {
      sheets: sheets as never,
    });
    expect(res.statusCode).toBe(401);
    expect(sheets.spreadsheets.get).not.toHaveBeenCalled();
    expect(sheets.spreadsheets.values.get).not.toHaveBeenCalled();
  });

  it('401s with a forged/garbage bearer token too', async () => {
    const sheets = makeSheets();
    const req = makeReq({
      method: 'GET',
      query: { action: 'by-inviter', inviterName: 'Ana Advisor' },
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    const res = makeRes();
    await handleProductViews(req as never, res as never, {
      sheets: sheets as never,
    });
    expect(res.statusCode).toBe(401);
    expect(sheets.spreadsheets.values.get).not.toHaveBeenCalled();
  });

  it('a valid staff session gets the real rows, keyed by inviterName', async () => {
    const sheets = makeSheets();
    const token = mintSessionToken('staff@tierramadre.app');
    const req = makeReq({
      method: 'GET',
      query: { action: 'by-inviter', inviterName: 'Ana Advisor' },
      headers: { authorization: `Bearer ${token}` },
    });
    const res = makeRes();
    await handleProductViews(req as never, res as never, {
      sheets: sheets as never,
    });
    expect(res.statusCode).toBe(200);
    const body = res.body as {
      success: boolean;
      views: Array<Record<string, unknown>>;
    };
    expect(body.success).toBe(true);
    expect(body.views).toHaveLength(1);
    expect(body.views[0]).toMatchObject({
      userEmail: 'guest@example.com',
      userName: 'Guest Guy',
    });
  });
});

describe('GET action=recent requires a staff session', () => {
  it('401s with no Authorization header, never touches Sheets', async () => {
    const sheets = makeSheets();
    const req = makeReq({ method: 'GET', query: { action: 'recent' } });
    const res = makeRes();
    await handleProductViews(req as never, res as never, {
      sheets: sheets as never,
    });
    expect(res.statusCode).toBe(401);
    expect(sheets.spreadsheets.values.get).not.toHaveBeenCalled();
  });

  it('a valid session gets the real rows across all advisors', async () => {
    const sheets = makeSheets();
    const token = mintSessionToken('staff@tierramadre.app');
    const req = makeReq({
      method: 'GET',
      query: { action: 'recent' },
      headers: { authorization: `Bearer ${token}` },
    });
    const res = makeRes();
    await handleProductViews(req as never, res as never, {
      sheets: sheets as never,
    });
    expect(res.statusCode).toBe(200);
    const body = res.body as {
      activity: Array<Record<string, unknown>>;
    };
    expect(body.activity[0]).toMatchObject({ userEmail: 'guest@example.com' });
  });
});

describe('GET action=user requires a staff session', () => {
  it('401s with no Authorization header, never touches Sheets', async () => {
    const sheets = makeSheets();
    const req = makeReq({
      method: 'GET',
      query: { action: 'user', email: 'guest@example.com' },
    });
    const res = makeRes();
    await handleProductViews(req as never, res as never, {
      sheets: sheets as never,
    });
    expect(res.statusCode).toBe(401);
    expect(sheets.spreadsheets.values.get).not.toHaveBeenCalled();
  });

  it('a valid session gets the real user history', async () => {
    const sheets = makeSheets();
    const token = mintSessionToken('staff@tierramadre.app');
    const req = makeReq({
      method: 'GET',
      query: { action: 'user', email: 'guest@example.com' },
      headers: { authorization: `Bearer ${token}` },
    });
    const res = makeRes();
    await handleProductViews(req as never, res as never, {
      sheets: sheets as never,
    });
    expect(res.statusCode).toBe(200);
    const body = res.body as { user: { email: string | null } };
    expect(body.user.email).toBe('guest@example.com');
  });
});

describe('GET action=product requires a staff session', () => {
  it('401s with no Authorization header, never touches Sheets', async () => {
    const sheets = makeSheets();
    const req = makeReq({
      method: 'GET',
      query: { action: 'product', itemId: '5' },
    });
    const res = makeRes();
    await handleProductViews(req as never, res as never, {
      sheets: sheets as never,
    });
    expect(res.statusCode).toBe(401);
    expect(sheets.spreadsheets.values.get).not.toHaveBeenCalled();
  });

  it('a valid session gets the real viewer list for that product', async () => {
    const sheets = makeSheets();
    const token = mintSessionToken('staff@tierramadre.app');
    const req = makeReq({
      method: 'GET',
      query: { action: 'product', itemId: '5' },
      headers: { authorization: `Bearer ${token}` },
    });
    const res = makeRes();
    await handleProductViews(req as never, res as never, {
      sheets: sheets as never,
    });
    expect(res.statusCode).toBe(200);
    const body = res.body as {
      viewers: Array<Record<string, unknown>>;
    };
    expect(body.viewers[0]).toMatchObject({
      email: 'guest@example.com',
      name: 'Guest Guy',
    });
  });
});

describe('GET action=stats stays public but strips the embedded per-user PII', () => {
  it('an anonymous caller gets aggregate counts with topViewers/recentActivity stripped', async () => {
    const sheets = makeSheets();
    const req = makeReq({ method: 'GET', query: { action: 'stats' } });
    const res = makeRes();
    await handleProductViews(req as never, res as never, {
      sheets: sheets as never,
    });
    expect(res.statusCode).toBe(200);
    const body = res.body as {
      success: boolean;
      views: Record<string, number>;
      topViewers: unknown[];
      recentActivity: unknown[];
    };
    expect(body.success).toBe(true);
    expect(body.views['5']).toBe(1);
    expect(body.topViewers).toEqual([]);
    expect(body.recentActivity).toEqual([]);
  });

  it('a valid staff session gets the full shape, including the PII fields', async () => {
    const sheets = makeSheets();
    const token = mintSessionToken('staff@tierramadre.app');
    const req = makeReq({
      method: 'GET',
      query: { action: 'stats' },
      headers: { authorization: `Bearer ${token}` },
    });
    const res = makeRes();
    await handleProductViews(req as never, res as never, {
      sheets: sheets as never,
    });
    expect(res.statusCode).toBe(200);
    const body = res.body as {
      topViewers: Array<Record<string, unknown>>;
      recentActivity: Array<Record<string, unknown>>;
    };
    expect(body.topViewers.length).toBeGreaterThan(0);
    expect(body.recentActivity[0]).toMatchObject({
      userEmail: 'guest@example.com',
    });
  });
});

describe('POST action=track stays anonymous — the whole point of view tracking', () => {
  it('a request with no Authorization header still records the view', async () => {
    const sheets = makeSheets([HEADERS_ROW]);
    const req = makeReq({
      method: 'POST',
      query: { action: 'track' },
      body: { itemId: '5', productName: 'Esmeralda Test' },
    });
    const res = makeRes();
    await handleProductViews(req as never, res as never, {
      sheets: sheets as never,
    });
    expect(res.statusCode).toBe(200);
    const body = res.body as { success: boolean; tracked: boolean };
    expect(body.success).toBe(true);
    expect(body.tracked).toBe(true);
    expect(sheets.spreadsheets.values.append).toHaveBeenCalledTimes(1);
  });
});
