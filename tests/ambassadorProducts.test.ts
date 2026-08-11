/**
 * S1 — `/api/ambassador-products` (2026-08-11).
 *
 * Measured against production before this endpoint existed: an anonymous
 * `GET /api/get-treasure-sheets` returns 523 rows carrying 11 keys, and
 * `asesor`, `asesorActual`, `estado` and `precioCOP` appear in 0 of them.
 * The profile decides ownership client-side by filtering on `asesor` /
 * `asesorActual` (asesorProductOwnership.ts:67), so every non-staff visitor
 * saw an empty profile: 0 pieces, $0, no categories.
 *
 * This endpoint hands the page the item numbers instead. The tests below pin
 * the two things that matter: it resolves ownership the same way the client
 * does (including transfers), and it does not become a new hole in the PII
 * lockdown the previous nine PRs closed.
 */
import { describe, it, expect, vi } from 'vitest';
import { handleAmbassadorProducts } from '../api/ambassador-products';
import { WITHHELD_KEYS } from '../api/_lib/catalogProjection';

const ROSTER = [
  ['Nombre', 'Rol', 'Email', 'Estado'],
  ['ALVARO PELAEZ', 'Embajador', 'alvaro@tierramadre.app', 'activo'],
  ['Juan Manuel Escobar Ramirez', 'Asesor', 'juanm@tierramadre.app', 'activo'],
  ['Retirada Perez', 'Asesor', 'retirada@tierramadre.app', 'inactivo'],
];

/**
 * Column layout mirrors the real Inventario sheet headers that
 * mapRowToTreasureItem resolves by exact name (get-treasure-sheets.ts:74+).
 */
const INVENTORY_HEADERS = [
  'item',
  'nombre',
  'peso',
  'categoría',
  'precio cop',
  'asesor',
  'estado',
  'asesor actual',
  'estado asesor',
];

const INVENTORY = [
  INVENTORY_HEADERS,
  // Álvaro's, available
  [
    '101',
    'Muzo Clásica',
    '2.4',
    'Esmeralda',
    '12000000',
    'Álvaro Pelaéz',
    'DISPONIBLE',
    '',
    '',
  ],
  // Álvaro's, sold
  [
    '102',
    'Chivor Profunda',
    '3.1',
    'Esmeralda',
    '18000000',
    'Álvaro Pelaéz',
    'VENDIDA',
    '',
    '',
  ],
  // Álvaro's, a ring (jewelry)
  [
    '103',
    'Anillo Aurora',
    '1.2',
    'Anillo en Oro',
    '9000000',
    'Álvaro Pelaéz',
    'DISPONIBLE',
    '',
    '',
  ],
  // Someone else's entirely
  [
    '104',
    'Coscuez Menor',
    '0.9',
    'Esmeralda',
    '4000000',
    'Juan Manuel Escobar Ramirez',
    'DISPONIBLE',
    '',
    '',
  ],
  // Originally Álvaro's, transferred TO Juan — Álvaro must see it as VENDIDA
  [
    '105',
    'Muzo Trébol',
    '2.0',
    'Esmeralda',
    '15000000',
    'Álvaro Pelaéz',
    'DISPONIBLE',
    'Juan Manuel Escobar Ramirez',
    'DISPONIBLE',
  ],
  // Transferred TO Álvaro from Juan — Álvaro owns it now
  [
    '106',
    'Chivor Gota',
    '1.7',
    'Esmeralda',
    '11000000',
    'Juan Manuel Escobar Ramirez',
    'DISPONIBLE',
    'Álvaro Pelaéz',
    'DISPONIBLE',
  ],
  // Abbreviated owner form — matchesAsesorName resolves "JM.Escobar"
  [
    '107',
    'Muzo Sombra',
    '2.2',
    'Esmeralda',
    '13000000',
    'JM.Escobar',
    'DISPONIBLE',
    '',
    '',
  ],
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
        get: vi.fn(async ({ range }: { range: string }) => {
          if (range.startsWith('Asesores')) return { data: { values: ROSTER } };
          return { data: { values: INVENTORY } };
        }),
      },
    },
  };
}

function mockRes() {
  const res = {
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
  return res;
}

async function call(slug?: string) {
  const sheets = mockSheets();
  const res = mockRes();
  await handleAmbassadorProducts(
    {
      query: slug === undefined ? {} : { slug },
      headers: {},
      method: 'GET',
    } as never,
    res as never,
    { sheets } as never,
  );
  return res;
}

/** sendSuccess wraps the payload; unwrap whichever shape it used. */
function data(res: { body: unknown }) {
  const body = res.body as Record<string, unknown>;
  return (body?.data ?? body) as Record<string, unknown>;
}

describe('/api/ambassador-products', () => {
  it('returns the ambassador pieces the client can no longer resolve', async () => {
    const res = await call('alvaro-pelaez');
    expect(res.statusCode).toBe(200);
    // 101, 102, 103 owned outright; 105 originally his (transferred away, still
    // listed); 106 transferred to him. Never 104 or 107 — those are Juan's.
    expect(data(res).itemIds).toEqual([101, 102, 103, 105, 106]);
  });

  it('counts a piece transferred away as sold, matching what the owner sees', async () => {
    const res = await call('alvaro-pelaez');
    const d = data(res);
    // 105 went to Juan, so it is NOT available to Álvaro even though its own
    // estado says DISPONIBLE — getEffectiveEstado's transfer rule.
    expect(d.availableItemIds).toEqual([101, 103, 106]);
    expect(d.counts).toEqual({
      total: 5,
      disponible: 3,
      vendida: 2,
      loose: 4,
      jewelry: 1,
    });
  });

  it('resolves abbreviated owner names the same way the client does', async () => {
    const res = await call('juan-manuel-escobar-ramirez');
    // 104 outright, 105 transferred to him, 106 originally his, and 107 under
    // the abbreviated "JM.Escobar" form.
    expect(data(res).itemIds).toEqual([104, 105, 106, 107]);
  });

  it('leaks nothing the catalog lockdown withholds', async () => {
    const res = await call('alvaro-pelaez');
    const serialized = JSON.stringify(res.body);
    // The whole point of answering in item numbers: no withheld field may
    // appear anywhere in the response, at any depth.
    for (const key of WITHHELD_KEYS) {
      expect(serialized).not.toContain(`"${key}"`);
    }
    // And no price value, even unkeyed.
    expect(serialized).not.toContain('12000000');
    expect(serialized).not.toContain('18000000');
  });

  it('does not expose the roster: no email, no other ambassador name', async () => {
    const res = await call('alvaro-pelaez');
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('alvaro@tierramadre.app');
    expect(serialized).not.toContain('Juan Manuel Escobar Ramirez');
    // Its own display name is fine — /api/get-asesores already returns it
    // publicly to anonymous callers. Note the roster fixture spells it
    // WITHOUT accents while the inventory rows use them: that mismatch is
    // exactly what used to return an empty profile, and it resolves now only
    // because normalizeName folds accents instead of deleting them.
    expect(data(res).name).toBe('ALVARO PELAEZ');
  });

  it('404s for an unknown slug instead of pretending the profile is empty', async () => {
    const res = await call('no-existe');
    expect(res.statusCode).toBe(404);
  });

  it('404s for an inactive ambassador', async () => {
    const res = await call('retirada-perez');
    expect(res.statusCode).toBe(404);
  });

  it('400s when the slug is missing', async () => {
    const res = await call(undefined);
    expect(res.statusCode).toBe(400);
  });
});
