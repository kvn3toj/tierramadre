/**
 * Unauthenticated-ops lockdown — the two Drive endpoints that answered HTTP
 * 200 to anonymous callers in production (2026-08-09), siblings of the
 * `/api/cotizacion-reports` PII leak (tests/cotizacionReportsPii.test.ts).
 *
 * 1. `/api/create-product-folders`
 *    GET returned a dry-run inventory report — every item number, every
 *    product name, and the raw Google Drive folder ids of the duplicates. Far
 *    worse: `?sync=auto` is treated as "cron" by the handler, so the GET that
 *    every catalog visitor's browser fires (useSheetsTreasure.ts:167) was an
 *    unauthenticated Drive MUTATION — it creates and renames folders. There is
 *    no `crons` entry in vercel.json, so no Vercel cron ever calls it; the
 *    browser fire-and-forget is the only trigger, and it now carries the
 *    asesor's `tms1` session (anonymous visitors simply stop mutating Drive).
 *    The ADMIN_SYNC_TOKEN bearer is accepted too so a future server-to-server
 *    cron has a credential — same dual path convex/ uses ("acepta el secreto
 *    del bot, no solo sesión de staff").
 *
 * 2. `/api/drive-diagnostics`
 *    Returned Drive folder metadata, shared-drive ids/names and the service
 *    account's capabilities to anyone. It has NO caller anywhere in `src/` —
 *    it is a pure operator tool — so it takes the server-to-server guard
 *    api/get-table.ts and api/get-inventory-rows.ts already use
 *    (`x-admin-sync-token`) rather than a browser session.
 *
 * Both gates sit BEFORE any Sheets or Drive call, so an unauthorized caller
 * costs zero Google API quota.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mintSessionToken } from '../api/_lib/sessionToken';
import { handleCreateProductFolders } from '../api/create-product-folders';
// @ts-expect-error — untyped `.js` ops endpoint, deliberately not converted to
// TypeScript: its guard is the plain-JS ADMIN_SYNC_TOKEN check, so it needs no
// `.ts`-only import (see the file header).
import { handleDriveDiagnostics } from '../api/drive-diagnostics.js';

const ADMIN_SECRET = 'test-admin-sync-token-drive-ops';
let savedAdminSecret: string | undefined;

beforeEach(() => {
  savedAdminSecret = process.env.ADMIN_SYNC_TOKEN;
  process.env.ADMIN_SYNC_TOKEN = ADMIN_SECRET;
});

afterEach(() => {
  if (savedAdminSecret === undefined) delete process.env.ADMIN_SYNC_TOKEN;
  else process.env.ADMIN_SYNC_TOKEN = savedAdminSecret;
});

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

// ─── /api/create-product-folders ────────────────────────────────────────────

const INVENTORY_ROWS = [
  ['Item', 'Vault', 'Nombre'],
  ['185', '', 'Bogota 1-V Montaña'],
];

function makeSheets() {
  return {
    spreadsheets: {
      get: vi.fn(async () => ({
        data: { sheets: [{ properties: { title: 'Inventario' } }] },
      })),
      values: {
        get: vi.fn(async () => ({ data: { values: INVENTORY_ROWS } })),
      },
    },
  };
}

function makeDrive() {
  return {
    files: {
      list: vi.fn(async () => ({ data: { files: [] } })),
      create: vi.fn(async () => ({ data: { id: 'new-folder-id' } })),
      update: vi.fn(async () => ({ data: {} })),
      get: vi.fn(async () => ({ data: { id: 'products-folder' } })),
    },
  };
}

function makeFolderReq(opts: {
  method: 'GET' | 'POST';
  query?: Record<string, string>;
  headers?: Record<string, string>;
}) {
  return {
    method: opts.method,
    query: opts.query ?? {},
    headers: opts.headers ?? {},
  };
}

describe('/api/create-product-folders rejects anonymous callers', () => {
  it('GET (dry-run inventory report + raw Drive folder ids) 401s with no credential', async () => {
    const sheets = makeSheets();
    const drive = makeDrive();
    const res = makeRes();
    await handleCreateProductFolders(
      makeFolderReq({ method: 'GET' }) as never,
      res as never,
      { sheets, drive, sharedDriveId: 'drive-1' } as never,
    );
    expect(res.statusCode).toBe(401);
    expect(sheets.spreadsheets.values.get).not.toHaveBeenCalled();
    expect(drive.files.list).not.toHaveBeenCalled();
  });

  it('GET ?sync=auto — the Drive-MUTATING path every catalog visitor fired — 401s and creates nothing', async () => {
    const sheets = makeSheets();
    const drive = makeDrive();
    const res = makeRes();
    await handleCreateProductFolders(
      makeFolderReq({ method: 'GET', query: { sync: 'auto' } }) as never,
      res as never,
      { sheets, drive, sharedDriveId: 'drive-1' } as never,
    );
    expect(res.statusCode).toBe(401);
    expect(drive.files.create).not.toHaveBeenCalled();
    expect(drive.files.update).not.toHaveBeenCalled();
  });

  it('POST (apply: creates + renames Drive folders) 401s with no credential', async () => {
    const sheets = makeSheets();
    const drive = makeDrive();
    const res = makeRes();
    await handleCreateProductFolders(
      makeFolderReq({ method: 'POST' }) as never,
      res as never,
      { sheets, drive, sharedDriveId: 'drive-1' } as never,
    );
    expect(res.statusCode).toBe(401);
    expect(drive.files.create).not.toHaveBeenCalled();
    expect(drive.files.update).not.toHaveBeenCalled();
  });

  it('a forged bearer token is not a credential either', async () => {
    const sheets = makeSheets();
    const drive = makeDrive();
    const res = makeRes();
    await handleCreateProductFolders(
      makeFolderReq({
        method: 'GET',
        headers: { authorization: 'Bearer not-a-real-token' },
      }) as never,
      res as never,
      { sheets, drive, sharedDriveId: 'drive-1' } as never,
    );
    expect(res.statusCode).toBe(401);
    expect(sheets.spreadsheets.values.get).not.toHaveBeenCalled();
  });

  it('an asesor holding a tms1 session gets the dry-run report (the real browser caller)', async () => {
    const sheets = makeSheets();
    const drive = makeDrive();
    const token = mintSessionToken('asesor@tierramadre.app');
    const res = makeRes();
    await handleCreateProductFolders(
      makeFolderReq({
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
      }) as never,
      res as never,
      { sheets, drive, sharedDriveId: 'drive-1' } as never,
    );
    expect(res.statusCode).toBe(200);
    expect(sheets.spreadsheets.values.get).toHaveBeenCalled();
  });

  it('the ADMIN_SYNC_TOKEN bearer works too, for a server-to-server caller', async () => {
    const sheets = makeSheets();
    const drive = makeDrive();
    const res = makeRes();
    await handleCreateProductFolders(
      makeFolderReq({
        method: 'GET',
        headers: { authorization: `Bearer ${ADMIN_SECRET}` },
      }) as never,
      res as never,
      { sheets, drive, sharedDriveId: 'drive-1' } as never,
    );
    expect(res.statusCode).toBe(200);
    expect(sheets.spreadsheets.values.get).toHaveBeenCalled();
  });
});

// ─── /api/drive-diagnostics ─────────────────────────────────────────────────

function makeDiagDrive() {
  return {
    about: {
      get: vi.fn(async () => ({
        data: { user: { emailAddress: 'svc@tierramadre.iam' } },
      })),
    },
    drives: {
      get: vi.fn(async () => ({
        data: { id: 'drive-1', name: 'tm-studio', capabilities: {} },
      })),
    },
    files: {
      get: vi.fn(async () => ({
        data: { id: 'folder-1', name: 'products', capabilities: {} },
      })),
      list: vi.fn(async () => ({ data: { files: [] } })),
    },
  };
}

function makeDiagReq(opts: {
  query?: Record<string, string>;
  headers?: Record<string, string>;
}) {
  return {
    method: 'GET',
    query: opts.query ?? {},
    headers: opts.headers ?? {},
  };
}

describe('/api/drive-diagnostics rejects anonymous callers', () => {
  it('401s with no x-admin-sync-token, and never touches Drive', async () => {
    const drive = makeDiagDrive();
    const res = makeRes();
    await handleDriveDiagnostics(makeDiagReq({}), res, {
      drive,
      oauthDrive: null,
      sharedDriveId: 'drive-1',
    });
    expect(res.statusCode).toBe(401);
    expect(drive.files.get).not.toHaveBeenCalled();
    expect(drive.drives.get).not.toHaveBeenCalled();
    expect(drive.about.get).not.toHaveBeenCalled();
  });

  it('401s with a wrong token', async () => {
    const drive = makeDiagDrive();
    const res = makeRes();
    await handleDriveDiagnostics(
      makeDiagReq({ headers: { 'x-admin-sync-token': 'wrong' } }),
      res,
      { drive, oauthDrive: null, sharedDriveId: 'drive-1' },
    );
    expect(res.statusCode).toBe(401);
    expect(drive.files.get).not.toHaveBeenCalled();
  });

  it('?folderId=… — the folder-metadata probe — is gated as well', async () => {
    const drive = makeDiagDrive();
    const res = makeRes();
    await handleDriveDiagnostics(
      makeDiagReq({ query: { folderId: 'x' } }),
      res,
      {
        drive,
        oauthDrive: null,
        sharedDriveId: 'drive-1',
      },
    );
    expect(res.statusCode).toBe(401);
    expect(drive.files.get).not.toHaveBeenCalled();
  });

  it('the operator credential still gets the diagnostic', async () => {
    const drive = makeDiagDrive();
    const res = makeRes();
    await handleDriveDiagnostics(
      makeDiagReq({
        query: { folderId: 'folder-1' },
        headers: { 'x-admin-sync-token': ADMIN_SECRET },
      }),
      res,
      { drive, oauthDrive: null, sharedDriveId: 'drive-1' },
    );
    expect(res.statusCode).toBe(200);
    expect(drive.files.get).toHaveBeenCalled();
  });
});
