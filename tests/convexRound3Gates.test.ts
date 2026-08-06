/**
 * Round 3 review (2026-08-05) found four more ungated/under-gated Convex
 * reads after the F7/F7b lockdown: C1 `ghl.getClientByPhone` (no gate at
 * all), C2 `products.listByLote` (gated but leaking the 14 Fotosíntesis-only
 * columns via a raw spread), I2 `providers.list`'s bot path (full documents,
 * including supplier cédulas), and I3 (`subLotes`, `commissions`,
 * `ambassadors`, `products.editHistory`/`recentEdits` — all previously
 * ungated). This file spot-checks the two Criticals plus the I2 redaction;
 * the I3 queries reuse the exact `isStaffSession` gate already covered by
 * `tests/requireStaffSession.test.ts`, so they aren't re-proven here one by
 * one — this file targets what's actually NEW: a different gate mechanism
 * (C1's `requireServerSecret`, which throws) and a field-level redaction
 * (I2) rather than an all-or-nothing empty form.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mintSessionToken } from '../api/_lib/sessionToken';
import { getClientByPhone } from '../convex/ghl';
import { listByLote } from '../convex/products';
import { list as providersList } from '../convex/providers';
import { FOTOSINTESIS_ONLY_FIELDS } from '../convex/_lib/saleSafe';

const ADMIN_SECRET = 'test-admin-sync-token';
const BOT_SECRET = 'test-anima-bot-secret';
let savedAdminSecret: string | undefined;
let savedBotSecret: string | undefined;

beforeEach(() => {
  savedAdminSecret = process.env.ADMIN_SYNC_TOKEN;
  process.env.ADMIN_SYNC_TOKEN = ADMIN_SECRET;
  savedBotSecret = process.env.ANIMA_BOT_SECRET;
  process.env.ANIMA_BOT_SECRET = BOT_SECRET;
});

afterEach(() => {
  if (savedAdminSecret === undefined) delete process.env.ADMIN_SYNC_TOKEN;
  else process.env.ADMIN_SYNC_TOKEN = savedAdminSecret;
  if (savedBotSecret === undefined) delete process.env.ANIMA_BOT_SECRET;
  else process.env.ANIMA_BOT_SECRET = savedBotSecret;
});

describe('C1 — ghl.getClientByPhone requires the server secret', () => {
  const fakeCtxNoDb = {} as never;
  type Handler = (
    ctx: never,
    args: { celular: string; secret: string },
  ) => Promise<unknown>;

  it('throws (fails closed) with no secret, never touching ctx.db', async () => {
    await expect(
      (getClientByPhone as unknown as Handler)(fakeCtxNoDb, {
        celular: '3001234567',
        secret: '',
      }),
    ).rejects.toThrow();
  });

  it('throws with a wrong secret', async () => {
    await expect(
      (getClientByPhone as unknown as Handler)(fakeCtxNoDb, {
        celular: '3001234567',
        secret: 'not-the-real-secret',
      }),
    ).rejects.toThrow();
  });

  it('returns the client doc with the correct secret', async () => {
    const fakeClient = {
      _id: 'client_1',
      nombre: 'Ana',
      telefono: '3001234567',
    };
    const fakeCtxWithData = {
      db: {
        query: () => ({
          withIndex: () => ({ first: async () => fakeClient }),
        }),
      },
    } as never;
    const result = await (getClientByPhone as unknown as Handler)(
      fakeCtxWithData,
      { celular: '3001234567', secret: ADMIN_SECRET },
    );
    expect(result).toEqual(fakeClient);
  });
});

describe('C2 — products.listByLote strips the 14 Fotosíntesis-only columns', () => {
  const rawRow = {
    _id: 'prod_1',
    itemId: '001',
    loteId: 'B-001',
    nombre: 'Esmeralda',
    // Every Fotosíntesis-only column, populated — proves the filter
    // actually strips them rather than the fixture happening to omit them.
    ...Object.fromEntries(FOTOSINTESIS_ONLY_FIELDS.map((k) => [k, 'X'])),
  };
  const fakeCtx = {
    db: {
      query: () => ({
        withIndex: () => ({ collect: async () => [rawRow] }),
      }),
    },
  } as never;
  type Handler = (
    ctx: never,
    args: { loteId: string; sessionToken?: string },
  ) => Promise<Array<Record<string, unknown>>>;

  it('a valid staff session gets the row with every FOTOSINTESIS_ONLY_FIELDS key stripped', async () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    const result = await (listByLote as unknown as Handler)(fakeCtx, {
      loteId: 'B-001',
      sessionToken: token,
    });
    expect(result).toHaveLength(1);
    expect(result[0].itemId).toBe('001'); // ordinary fields survive
    for (const key of FOTOSINTESIS_ONLY_FIELDS) {
      expect(result[0], key).not.toHaveProperty(key);
    }
  });

  it('a non-staff caller gets [] without needing the filter at all', async () => {
    const result = await (listByLote as unknown as Handler)(fakeCtx, {
      loteId: 'B-001',
    });
    expect(result).toEqual([]);
  });

  it("is wired to omitFotosintesisOnly in source (mirrors saleSafe.test.ts's check for get/getByItem)", async () => {
    const fs = await import('fs');
    const path = await import('path');
    const root = path.resolve(__dirname, '..');
    const src = fs.readFileSync(path.join(root, 'convex/products.ts'), 'utf8');
    const i = src.indexOf('export const listByLote');
    expect(i, 'no se encontró listByLote').toBeGreaterThan(-1);
    const rest = src.slice(i + 10);
    const j = rest.indexOf('\nexport const ');
    const block = j === -1 ? rest : rest.slice(0, j);
    expect(
      block,
      'products:listByLote ya no filtra omitFotosintesisOnly',
    ).toContain('omitFotosintesisOnly');
    expect(
      block,
      'products:listByLote perdió el gate de sesión de staff',
    ).toContain('isStaffSession');
  });
});

describe('I2 — providers.list redacts PII for the bot-secret path', () => {
  const fakeProviderRow = {
    _id: 'provider_1',
    nombreORazonSocial: 'Esmeraldas del Oriente',
    nit: '900123456-7',
    cedula: '1234567890',
    direccion: 'Calle 10 #5-30',
    telefono: '3009998877',
    email: 'contacto@esmeraldas.co',
    notas: 'Paga a 30 días',
  };
  const fakeCtxWithData = {
    db: { query: () => ({ collect: async () => [fakeProviderRow] }) },
  } as never;
  type Handler = (
    ctx: never,
    args: { search?: string; sessionToken?: string; botSecret?: string },
  ) => Promise<Array<Record<string, unknown>>>;

  it('a bot-secret caller gets nombreORazonSocial + nit, but cedula/direccion/telefono/email/notas are undefined', async () => {
    const result = await (providersList as unknown as Handler)(
      fakeCtxWithData,
      { botSecret: BOT_SECRET },
    );
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('provider_1');
    expect(result[0].nombreORazonSocial).toBe('Esmeraldas del Oriente');
    expect(result[0].nit).toBe('900123456-7'); // deliberately NOT redacted — see providers.ts doc comment
    expect(result[0].cedula).toBeUndefined();
    expect(result[0].direccion).toBeUndefined();
    expect(result[0].telefono).toBeUndefined();
    expect(result[0].email).toBeUndefined();
    expect(result[0].notas).toBeUndefined();
  });

  it('a valid staff session gets the full, unredacted document', async () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    const result = await (providersList as unknown as Handler)(
      fakeCtxWithData,
      { sessionToken: token },
    );
    expect(result).toEqual([fakeProviderRow]);
  });

  it('a bad staff token does NOT fall back to the bot projection just because botSecret is also absent', async () => {
    const result = await (providersList as unknown as Handler)(
      fakeCtxWithData,
      { sessionToken: 'not-a-real-session-token' },
    );
    expect(result).toEqual([]);
  });
});
