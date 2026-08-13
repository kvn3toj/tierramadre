/**
 * PII lockdown — `/api/cotizacion-reports` (2026-08-09).
 *
 * Measured against production before this fix: `GET
 * https://tierramadre.app/api/cotizacion-reports` answered HTTP 200 with 19
 * client-mismatch records to a caller presenting no credential of any kind.
 * Each record carries `asesorEmail`, `asesorName`, `clientNameEntered`,
 * `clientPhone`, `clientEmail`, `expectedGuests` and `quotationNumber` — real
 * Tierra Madre customers (7 phone numbers, 3 emails). The file's own header
 * said "GET: List reports (admin only)"; the guard was never written.
 *
 * The nine access-control PRs of 2026-08-05/06/09 never covered it because it
 * is not a catalog endpoint — it is the same class of "sibling door" as
 * api/product-views.ts (tests/productViewsPii.test.ts), and the fix is the
 * same idiom: `verifiedSessionEmail` + a gate placed BEFORE any Sheets call.
 *
 * POST is gated too, not just GET. It APPENDS customer name/phone/email into
 * the sheet, so leaving it open leaves an anonymous PII-injection door on the
 * very row set GET was leaking. Its only caller
 * (CotizacionGenerator.tsx:579) fires exclusively when
 * `invitedGuests.length > 0`, and `invitedGuests` comes from
 * useCreatorInvitations → `/api/invitations?action=list-by-creator`, which has
 * required a `tms1` session since PR #88. So every request that reaches the
 * POST already proved a staff session moments earlier — the gate cannot break
 * it.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mintSessionToken } from '../api/_lib/sessionToken';
import {
  handleCotizacionReports,
  verifiedSessionEmail,
} from '../api/cotizacion-reports';

const ADMIN_SECRET = 'test-admin-sync-token-cotizacion-reports';
let savedAdminSecret: string | undefined;

beforeEach(() => {
  savedAdminSecret = process.env.ADMIN_SYNC_TOKEN;
  process.env.ADMIN_SYNC_TOKEN = ADMIN_SECRET;
});

afterEach(() => {
  if (savedAdminSecret === undefined) delete process.env.ADMIN_SYNC_TOKEN;
  else process.env.ADMIN_SYNC_TOKEN = savedAdminSecret;
});

const HEADERS_ROW = [
  'id',
  'timestamp',
  'asesorEmail',
  'asesorName',
  'clientNameEntered',
  'clientPhone',
  'clientEmail',
  'expectedGuests',
  'quotationNumber',
  'actionTaken',
];

/** Shaped like the real production rows this endpoint was serving. */
const DATA_ROW = [
  'report_1754000000000_abc123',
  '2026-08-01T00:00:00.000Z',
  'asesor@tierramadre.app',
  'Ana Asesora',
  'Cliente Real',
  '+57 300 000 0000',
  'cliente@example.com',
  '["Invitada Uno"]',
  'TM-0001',
  'logged',
];

function makeSheets(rows: unknown[][] = [HEADERS_ROW, DATA_ROW]) {
  return {
    spreadsheets: {
      get: vi.fn(async () => ({
        data: { sheets: [{ properties: { title: 'CotizacionReports' } }] },
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
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): FakeReq {
  return {
    method: opts.method,
    query: {},
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

const VALID_POST_BODY = {
  asesorEmail: 'asesor@tierramadre.app',
  asesorName: 'Ana Asesora',
  clientNameEntered: 'Cliente Real',
  clientPhone: '+57 300 000 0000',
  clientEmail: 'cliente@example.com',
  expectedGuests: ['Invitada Uno'],
  quotationNumber: 'TM-0001',
};

describe('verifiedSessionEmail (api/cotizacion-reports.ts)', () => {
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

describe('GET /api/cotizacion-reports requires a staff session', () => {
  it('401s with no Authorization header, and never touches Sheets (zero quota cost)', async () => {
    const sheets = makeSheets();
    const res = makeRes();
    await handleCotizacionReports(
      makeReq({ method: 'GET' }) as never,
      res as never,
      { sheets: sheets as never },
    );
    expect(res.statusCode).toBe(401);
    expect(sheets.spreadsheets.get).not.toHaveBeenCalled();
    expect(sheets.spreadsheets.values.get).not.toHaveBeenCalled();
  });

  it('401s with a forged/garbage bearer token too', async () => {
    const sheets = makeSheets();
    const res = makeRes();
    await handleCotizacionReports(
      makeReq({
        method: 'GET',
        headers: { authorization: 'Bearer not-a-real-token' },
      }) as never,
      res as never,
      { sheets: sheets as never },
    );
    expect(res.statusCode).toBe(401);
    expect(sheets.spreadsheets.values.get).not.toHaveBeenCalled();
  });

  it('never leaks a customer phone or email to an anonymous caller', async () => {
    const sheets = makeSheets();
    const res = makeRes();
    await handleCotizacionReports(
      makeReq({ method: 'GET' }) as never,
      res as never,
      { sheets: sheets as never },
    );
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('+57 300 000 0000');
    expect(serialized).not.toContain('cliente@example.com');
    expect(serialized).not.toContain('asesor@tierramadre.app');
  });

  it('a valid staff session gets the real reports', async () => {
    const sheets = makeSheets();
    const token = mintSessionToken('staff@tierramadre.app');
    const res = makeRes();
    await handleCotizacionReports(
      makeReq({
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
      }) as never,
      res as never,
      { sheets: sheets as never },
    );
    expect(res.statusCode).toBe(200);
    const body = res.body as {
      success: boolean;
      total: number;
      reports: Array<Record<string, unknown>>;
    };
    expect(body.success).toBe(true);
    expect(body.total).toBe(1);
    expect(body.reports[0]).toMatchObject({
      clientEmail: 'cliente@example.com',
      clientPhone: '+57 300 000 0000',
      expectedGuests: ['Invitada Uno'],
    });
  });
});

describe('POST /api/cotizacion-reports requires a staff session', () => {
  it('401s with no Authorization header, and appends nothing', async () => {
    const sheets = makeSheets([HEADERS_ROW]);
    const res = makeRes();
    await handleCotizacionReports(
      makeReq({ method: 'POST', body: VALID_POST_BODY }) as never,
      res as never,
      { sheets: sheets as never },
    );
    expect(res.statusCode).toBe(401);
    expect(sheets.spreadsheets.values.append).not.toHaveBeenCalled();
    expect(sheets.spreadsheets.get).not.toHaveBeenCalled();
  });

  it('401s with a forged bearer token too', async () => {
    const sheets = makeSheets([HEADERS_ROW]);
    const res = makeRes();
    await handleCotizacionReports(
      makeReq({
        method: 'POST',
        body: VALID_POST_BODY,
        headers: { authorization: 'Bearer not-a-real-token' },
      }) as never,
      res as never,
      { sheets: sheets as never },
    );
    expect(res.statusCode).toBe(401);
    expect(sheets.spreadsheets.values.append).not.toHaveBeenCalled();
  });

  it('the real caller — an asesor holding a tms1 session — still logs the report', async () => {
    const sheets = makeSheets([HEADERS_ROW]);
    const token = mintSessionToken('asesor@tierramadre.app');
    const res = makeRes();
    await handleCotizacionReports(
      makeReq({
        method: 'POST',
        body: VALID_POST_BODY,
        headers: { authorization: `Bearer ${token}` },
      }) as never,
      res as never,
      { sheets: sheets as never },
    );
    expect(res.statusCode).toBe(200);
    const body = res.body as { success: boolean; reportId: string };
    expect(body.success).toBe(true);
    expect(body.reportId).toMatch(/^report_/);
    expect(sheets.spreadsheets.values.append).toHaveBeenCalledTimes(1);
  });
});
