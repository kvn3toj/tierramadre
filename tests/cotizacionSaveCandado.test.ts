/**
 * El candado de `/api/cotizacion-save` — hallazgo #2 de la auditoría de rieles
 * (docs/audits/2026-08-21-rieles-precio-costo.md §2).
 *
 * El endpoint hermano (`cotizacion-reports.ts`) ya tuvo exactamente este
 * incidente y lo cerró el 2026-08-09. La misma información vive en
 * `CotizacionesAsesores` y ahí la puerta nunca se puso. Medido contra
 * producción el 2026-08-21, sin credencial de ningún tipo:
 *
 *   GET ?action=stats  → 200, 35 cotizaciones, $240.512.535 de valor total,
 *                        20 registros recientes con correo del asesor y
 *                        nombre del cliente, + ranking con 11 correos.
 *   GET ?email=<uno>   → 200, 10 cotizaciones con nombre y TELÉFONO del
 *                        cliente, más el `id` y el `driveFileId` de cada una.
 *   DELETE ?id&email   → con el par que el paso anterior acaba de entregar,
 *                        borra el PDF de Drive de forma PERMANENTE (no a la
 *                        papelera) y limpia la fila de la hoja. Sin bitácora,
 *                        sin respaldo, sin vuelta atrás.
 *
 * Es una cadena, no tres agujeros sueltos: el paso 1 entrega el roster que el
 * paso 2 necesita, y el paso 2 entrega el par que el paso 3 necesita.
 *
 * Tres cosas se atan acá:
 *
 *  1. LA PUERTA. Sesión `tms1` verificada en GET, POST y DELETE, ANTES de
 *     tocar Sheets o Drive — un no autorizado no debe costar ni cuota.
 *  2. EL DUEÑO SALE DEL TOKEN, NO DEL PARÁMETRO. `?email=` dejaba que
 *     cualquiera se declarara dueño de las cotizaciones de otro. Ahora el
 *     parámetro se ignora: manda el correo del token verificado.
 *  3. EL BORRADO DEJA RASTRO. Drive a la papelera (recuperable), y la fila se
 *     marca anulada en vez de limpiarse.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mintSessionToken } from '../api/_lib/sessionToken';
import {
  handleCotizacionSave,
  verifiedSessionEmail,
} from '../api/cotizacion-save';

const ADMIN_SECRET = 'test-admin-sync-token-cotizacion-save';
let savedAdminSecret: string | undefined;

beforeEach(() => {
  savedAdminSecret = process.env.ADMIN_SYNC_TOKEN;
  process.env.ADMIN_SYNC_TOKEN = ADMIN_SECRET;
});
afterEach(() => {
  if (savedAdminSecret === undefined) delete process.env.ADMIN_SYNC_TOKEN;
  else process.env.ADMIN_SYNC_TOKEN = savedAdminSecret;
});

const DUENA = 'asesora@tierramadre.app';
const OTRA = 'otra@tierramadre.app';

const HEADERS_ROW = [
  'ID',
  'QuotationNumber',
  'AsesorEmail',
  'AsesorName',
  'ClientName',
  'ClientPhone',
  'ProductsCount',
  'Total',
  'ImageUrl',
  'DriveFileId',
  'CreatedAt',
  'ExpiryDate',
];

/** Con la forma de las filas que producción está sirviendo hoy. */
const FILA_DUENA = [
  'cot-1754000000000-abc123def',
  'TM-2026-0001',
  DUENA,
  'Ana Asesora',
  'Cliente Real',
  '+57 300 000 0000',
  '3',
  '12500000',
  '/api/serve-drive-image?fileId=drive-file-1',
  'drive-file-1',
  '2026-08-01T00:00:00.000Z',
  '2026-09-01T00:00:00.000Z',
];
const FILA_AJENA = [
  'cot-1754000000001-zzz999xxx',
  'TM-2026-0002',
  OTRA,
  'Otra Asesora',
  'Cliente Ajeno',
  '+57 311 111 1111',
  '1',
  '9000000',
  '/api/serve-drive-image?fileId=drive-file-2',
  'drive-file-2',
  '2026-08-02T00:00:00.000Z',
  '',
];

function makeSheets(rows: unknown[][] = [HEADERS_ROW, FILA_DUENA, FILA_AJENA]) {
  return {
    spreadsheets: {
      get: vi.fn(async () => ({
        data: { sheets: [{ properties: { title: 'CotizacionesAsesores' } }] },
      })),
      batchUpdate: vi.fn(async () => ({})),
      values: {
        get: vi.fn(async () => ({ data: { values: rows } })),
        update: vi.fn(async () => ({})),
        append: vi.fn(async () => ({})),
        clear: vi.fn(async () => ({})),
      },
    },
  };
}

function makeDrive() {
  return {
    files: {
      list: vi.fn(async () => ({ data: { files: [{ id: 'folder-1' }] } })),
      create: vi.fn(async () => ({
        data: {
          id: 'nuevo-file',
          name: 'x.png',
          webViewLink: '',
          webContentLink: '',
        },
      })),
      delete: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    permissions: { create: vi.fn(async () => ({})) },
  };
}

function makeReq(opts: {
  method: 'GET' | 'POST' | 'DELETE';
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  token?: string;
}) {
  return {
    method: opts.method,
    query: opts.query ?? {},
    body: opts.body,
    headers: opts.token ? { authorization: `Bearer ${opts.token}` } : {},
  };
}

interface FakeRes {
  statusCode: number;
  body: unknown;
  setHeader: (k: string, v: string) => void;
  status: (c: number) => FakeRes;
  json: (p: unknown) => FakeRes;
}
function makeRes(): FakeRes {
  const res = {
    statusCode: 200,
    body: undefined,
    setHeader: () => {},
  } as FakeRes;
  res.status = (c) => {
    res.statusCode = c;
    return res;
  };
  res.json = (p) => {
    res.body = p;
    return res;
  };
  return res;
}

const llamar = (req: unknown, res: FakeRes, sheets: unknown, drive: unknown) =>
  handleCotizacionSave(req as never, res as never, {
    sheets: sheets as never,
    oauthDrive: drive as never,
    sharedDriveId: 'shared-drive-1',
  });

/** Ni una sola llamada a Sheets o a Drive: un no autorizado no cuesta cuota. */
function nadaTocado(
  sheets: ReturnType<typeof makeSheets>,
  drive: ReturnType<typeof makeDrive>,
) {
  expect(sheets.spreadsheets.get).not.toHaveBeenCalled();
  expect(sheets.spreadsheets.values.get).not.toHaveBeenCalled();
  expect(sheets.spreadsheets.values.append).not.toHaveBeenCalled();
  expect(sheets.spreadsheets.values.clear).not.toHaveBeenCalled();
  expect(drive.files.create).not.toHaveBeenCalled();
  expect(drive.files.delete).not.toHaveBeenCalled();
  expect(drive.files.update).not.toHaveBeenCalled();
}

describe('verifiedSessionEmail (api/cotizacion-save.ts)', () => {
  it('es null sin bearer', () => {
    expect(verifiedSessionEmail(undefined)).toBeNull();
  });
  it('es null para un token de Google crudo', () => {
    expect(verifiedSessionEmail('Bearer raw-google-id-token')).toBeNull();
  });
  it('es null para un token forjado', () => {
    expect(verifiedSessionEmail('Bearer tms1.forjado.deadbeef')).toBeNull();
  });
  it('devuelve el correo de un tms1 válido', () => {
    expect(verifiedSessionEmail(`Bearer ${mintSessionToken(DUENA)}`)).toBe(
      DUENA,
    );
  });
});

describe('puerta 1 — GET ?action=stats', () => {
  it('401 sin credencial, y no cuesta ni una llamada', async () => {
    const s = makeSheets(),
      d = makeDrive(),
      res = makeRes();
    await llamar(
      makeReq({ method: 'GET', query: { action: 'stats' } }),
      res,
      s,
      d,
    );
    expect(res.statusCode).toBe(401);
    nadaTocado(s, d);
  });

  it('no filtra correo de asesor ni nombre de cliente al anónimo', async () => {
    const s = makeSheets(),
      d = makeDrive(),
      res = makeRes();
    await llamar(
      makeReq({ method: 'GET', query: { action: 'stats' } }),
      res,
      s,
      d,
    );
    const txt = JSON.stringify(res.body);
    expect(txt).not.toContain(DUENA);
    expect(txt).not.toContain('Cliente Real');
    expect(txt).not.toContain('12500000');
  });

  it('con sesión válida sí responde las estadísticas', async () => {
    const s = makeSheets(),
      d = makeDrive(),
      res = makeRes();
    await llamar(
      makeReq({
        method: 'GET',
        query: { action: 'stats' },
        token: mintSessionToken(DUENA)!,
      }),
      res,
      s,
      d,
    );
    expect(res.statusCode).toBe(200);
    const body = res.body as { totalCotizaciones?: number };
    expect(body.totalCotizaciones).toBe(2);
  });
});

describe('puerta 2 — GET ?email=', () => {
  it('401 sin credencial, sin tocar la hoja', async () => {
    const s = makeSheets(),
      d = makeDrive(),
      res = makeRes();
    await llamar(
      makeReq({ method: 'GET', query: { email: DUENA } }),
      res,
      s,
      d,
    );
    expect(res.statusCode).toBe(401);
    nadaTocado(s, d);
  });

  it('no filtra el teléfono del cliente al anónimo', async () => {
    const s = makeSheets(),
      d = makeDrive(),
      res = makeRes();
    await llamar(
      makeReq({ method: 'GET', query: { email: DUENA } }),
      res,
      s,
      d,
    );
    expect(JSON.stringify(res.body)).not.toContain('+57 300 000 0000');
  });

  it('EL IDOR: con sesión propia, `?email=` de otra NO entrega las de la otra', async () => {
    const s = makeSheets(),
      d = makeDrive(),
      res = makeRes();
    await llamar(
      makeReq({
        method: 'GET',
        query: { email: OTRA },
        token: mintSessionToken(DUENA)!,
      }),
      res,
      s,
      d,
    );
    expect(res.statusCode).toBe(200);
    const txt = JSON.stringify(res.body);
    expect(txt).not.toContain('Cliente Ajeno');
    expect(txt).not.toContain('+57 311 111 1111');
    expect(txt).toContain('Cliente Real');
  });

  it('sin `?email=` igual devuelve las propias — el token alcanza', async () => {
    const s = makeSheets(),
      d = makeDrive(),
      res = makeRes();
    await llamar(
      makeReq({ method: 'GET', token: mintSessionToken(DUENA)! }),
      res,
      s,
      d,
    );
    expect(res.statusCode).toBe(200);
    const body = res.body as { count?: number };
    expect(body.count).toBe(1);
  });
});

describe('puerta 3 — DELETE', () => {
  it('401 sin credencial, y el PDF sigue en Drive', async () => {
    const s = makeSheets(),
      d = makeDrive(),
      res = makeRes();
    await llamar(
      makeReq({ method: 'DELETE', query: { id: FILA_DUENA[0], email: DUENA } }),
      res,
      s,
      d,
    );
    expect(res.statusCode).toBe(401);
    nadaTocado(s, d);
  });

  it('con sesión propia NO puede borrar la cotización de otra asesora', async () => {
    const s = makeSheets(),
      d = makeDrive(),
      res = makeRes();
    await llamar(
      makeReq({
        method: 'DELETE',
        query: { id: FILA_AJENA[0], email: OTRA },
        token: mintSessionToken(DUENA)!,
      }),
      res,
      s,
      d,
    );
    expect(res.statusCode).not.toBe(200);
    expect(d.files.delete).not.toHaveBeenCalled();
    expect(d.files.update).not.toHaveBeenCalled();
    expect(s.spreadsheets.values.clear).not.toHaveBeenCalled();
  });

  it('la propia se borra: a la PAPELERA de Drive, nunca con files.delete', async () => {
    const s = makeSheets(),
      d = makeDrive(),
      res = makeRes();
    await llamar(
      makeReq({
        method: 'DELETE',
        query: { id: FILA_DUENA[0], email: DUENA },
        token: mintSessionToken(DUENA)!,
      }),
      res,
      s,
      d,
    );
    expect(res.statusCode).toBe(200);
    expect(d.files.delete).not.toHaveBeenCalled();
    expect(d.files.update).toHaveBeenCalledTimes(1);
    const arg = d.files.update.mock.calls[0][0] as {
      fileId: string;
      requestBody: { trashed: boolean };
    };
    expect(arg.fileId).toBe('drive-file-1');
    expect(arg.requestBody.trashed).toBe(true);
  });

  it('la fila queda ANULADA, no limpiada — un borrado deja rastro', async () => {
    const s = makeSheets(),
      d = makeDrive(),
      res = makeRes();
    await llamar(
      makeReq({
        method: 'DELETE',
        query: { id: FILA_DUENA[0], email: DUENA },
        token: mintSessionToken(DUENA)!,
      }),
      res,
      s,
      d,
    );
    expect(s.spreadsheets.values.clear).not.toHaveBeenCalled();
    expect(s.spreadsheets.values.update).toHaveBeenCalled();
    const escrito = JSON.stringify(
      s.spreadsheets.values.update.mock.calls.map((c) => c[0]),
    );
    expect(escrito).toContain('anulada');
  });

  it('una fila anulada deja de aparecer en la lista de la asesora', async () => {
    const anulada = [...FILA_DUENA];
    const s = makeSheets([HEADERS_ROW, [...anulada, 'anulada'], FILA_AJENA]);
    const d = makeDrive(),
      res = makeRes();
    await llamar(
      makeReq({ method: 'GET', token: mintSessionToken(DUENA)! }),
      res,
      s,
      d,
    );
    const body = res.body as { count?: number };
    expect(body.count).toBe(0);
  });
});

describe('puerta 4 — POST', () => {
  const CUERPO = {
    quotationNumber: 'TM-2026-0003',
    asesorEmail: DUENA,
    asesorName: 'Ana Asesora',
    clientName: 'Cliente Nuevo',
    clientPhone: '+57 322 222 2222',
    productsCount: 1,
    total: 1000,
    imageBase64: 'data:image/png;base64,aGVsbG8=',
  };

  it('401 sin credencial: no sube nada a Drive ni escribe la hoja', async () => {
    const s = makeSheets(),
      d = makeDrive(),
      res = makeRes();
    await llamar(makeReq({ method: 'POST', body: CUERPO }), res, s, d);
    expect(res.statusCode).toBe(401);
    nadaTocado(s, d);
  });

  it('con sesión, la cotización se archiva bajo el correo del TOKEN, no el del cuerpo', async () => {
    const s = makeSheets(),
      d = makeDrive(),
      res = makeRes();
    await llamar(
      makeReq({
        method: 'POST',
        body: { ...CUERPO, asesorEmail: OTRA },
        token: mintSessionToken(DUENA)!,
      }),
      res,
      s,
      d,
    );
    expect(res.statusCode).toBe(201);
    const fila = s.spreadsheets.values.append.mock.calls[0][0] as {
      requestBody: { values: unknown[][] };
    };
    expect(fila.requestBody.values[0][2]).toBe(DUENA);
  });
});

describe('la vista pública sigue contestando 404, no 401', () => {
  it('el QR de una cotización responde "no encontrada" sin pedir sesión', async () => {
    const s = makeSheets(),
      d = makeDrive(),
      res = makeRes();
    await llamar(
      makeReq({
        method: 'GET',
        query: { action: 'public', quotationNumber: 'TM-2026-0001' },
      }),
      res,
      s,
      d,
    );
    // El IDOR ya estaba cerrado con un 404 incondicional. Mantenerlo ANTES del
    // candado es lo que le deja al visitante la pantalla "no encontrada" en vez
    // de un error crudo — y no lee nada, así que no filtra nada.
    expect(res.statusCode).toBe(404);
    nadaTocado(s, d);
  });
});
