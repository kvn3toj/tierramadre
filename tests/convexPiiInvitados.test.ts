/**
 * PII lockdown, branch fix/convex-pii-invitados (2026-08-06) — the three
 * remaining holes after F7/F7b/Round 3 (see
 * .superpowers/sdd/convex-lockdown-report.md):
 *
 * 1. `productViews.guestActivity`/`byInviterAndGuest` — bulk guest PII
 *    (userEmail/userName/browser/country/sessionId/referrer) keyed only on
 *    an advisor's guessable display name, with no gate at all.
 * 2. `providers.list`'s bot-secret path — `search` matched `cedula`/`email`
 *    BEFORE the bot redaction, letting a bot-secret caller use it as a
 *    substring oracle; the redaction itself was a fail-open spread.
 * 3. `invitations.listByCreator` (Convex query) and the REST wrapper
 *    (`GET /api/invitations?action=list-by-creator`) — both ungated, either
 *    one alone leaking `guestName`/`guestContact` for any guessed advisor
 *    email. `invitations.checkGuestHistory` closed too (server-secret —
 *    verified it has no browser Convex caller).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mintSessionToken } from '../api/_lib/sessionToken';
import { guestActivity, byInviterAndGuest } from '../convex/productViews';
import { list as providersList } from '../convex/providers';
import { listByCreator, checkGuestHistory } from '../convex/invitations';
import { verifiedSessionEmail } from '../api/invitations';

const ADMIN_SECRET = 'test-admin-sync-token';
let savedAdminSecret: string | undefined;

beforeEach(() => {
  savedAdminSecret = process.env.ADMIN_SYNC_TOKEN;
  process.env.ADMIN_SYNC_TOKEN = ADMIN_SECRET;
});

afterEach(() => {
  if (savedAdminSecret === undefined) delete process.env.ADMIN_SYNC_TOKEN;
  else process.env.ADMIN_SYNC_TOKEN = savedAdminSecret;
});

// ─── Item 1: productViews.guestActivity / byInviterAndGuest ──────────────

describe('item 1 — productViews.guestActivity requires a staff session', () => {
  const fakeRow = {
    _id: 'view_1',
    inviterName: 'Ana Advisor',
    userName: 'Guest Guy',
    userEmail: 'guest@example.com',
    userRole: 'Invitado',
    browser: 'Safari',
    country: 'CO',
    sessionId: 'sess_1',
    referrer: 'https://instagram.com',
    itemId: '001',
    productName: 'Esmeralda',
    timestamp: '2026-08-01T00:00:00.000Z',
  };
  const fakeCtxWithData = {
    db: {
      query: () => ({
        withIndex: () => ({
          order: () => ({ take: async () => [fakeRow] }),
        }),
      }),
    },
  } as never;
  type Handler = (
    ctx: never,
    args: { inviterName: string; limit?: number; sessionToken?: string },
  ) => Promise<unknown>;

  it('a valid staff session gets the real rows', async () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    const result = await (guestActivity as unknown as Handler)(
      fakeCtxWithData,
      { inviterName: 'Ana Advisor', sessionToken: token },
    );
    expect(result).toEqual([fakeRow]);
  });

  it('no sessionToken gets [] and never touches ctx.db', async () => {
    const fakeCtxNoDb = {} as never;
    const result = await (guestActivity as unknown as Handler)(fakeCtxNoDb, {
      inviterName: 'Ana Advisor',
    });
    expect(result).toEqual([]);
  });

  it('a wrong/forged sessionToken also gets []', async () => {
    const fakeCtxNoDb = {} as never;
    const result = await (guestActivity as unknown as Handler)(fakeCtxNoDb, {
      inviterName: 'Ana Advisor',
      sessionToken: 'not-a-real-token',
    });
    expect(result).toEqual([]);
  });
});

describe('item 1 — productViews.byInviterAndGuest requires a staff session', () => {
  const fakeRow = {
    _id: 'view_1',
    inviterName: 'Ana Advisor',
    userName: 'Guest Guy',
    sessionId: 'sess_1',
    referrer: 'https://instagram.com',
    itemId: '001',
    productName: 'Esmeralda',
    timestamp: '2026-08-01T00:00:00.000Z',
  };
  const fakeCtxWithData = {
    db: {
      query: () => ({
        withIndex: () => ({
          filter: () => ({
            order: () => ({ take: async () => [fakeRow] }),
          }),
        }),
      }),
    },
  } as never;
  type Handler = (
    ctx: never,
    args: {
      inviterName: string;
      guestName: string;
      limit?: number;
      sessionToken?: string;
    },
  ) => Promise<unknown>;

  it('a valid staff session gets the real rows', async () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    const result = await (byInviterAndGuest as unknown as Handler)(
      fakeCtxWithData,
      {
        inviterName: 'Ana Advisor',
        guestName: 'Guest Guy',
        sessionToken: token,
      },
    );
    expect(result).toEqual([fakeRow]);
  });

  it('no sessionToken gets [] and never touches ctx.db', async () => {
    const fakeCtxNoDb = {} as never;
    const result = await (byInviterAndGuest as unknown as Handler)(
      fakeCtxNoDb,
      { inviterName: 'Ana Advisor', guestName: 'Guest Guy' },
    );
    expect(result).toEqual([]);
  });
});

// ─── Item 2: providers.list — search oracle + constructed projection ─────

describe('item 2 — providers.list bot path cannot use search as a PII oracle', () => {
  const BOT_SECRET = 'test-anima-bot-secret';
  let savedBotSecret: string | undefined;

  beforeEach(() => {
    savedBotSecret = process.env.ANIMA_BOT_SECRET;
    process.env.ANIMA_BOT_SECRET = BOT_SECRET;
  });
  afterEach(() => {
    if (savedBotSecret === undefined) delete process.env.ANIMA_BOT_SECRET;
    else process.env.ANIMA_BOT_SECRET = savedBotSecret;
  });

  const fakeProviderRow = {
    _id: 'provider_1',
    _creationTime: 1234,
    nombreORazonSocial: 'Esmeraldas del Oriente',
    nit: '900123456-7',
    cedula: '1234567890',
    direccion: 'Calle 10 #5-30',
    telefono: '3009998877',
    email: 'contacto@esmeraldas.co',
    tipo: 'gemas',
    notas: 'Paga a 30 días',
    rowIndex: 2,
    lastPulledAt: '2026-08-01T00:00:00.000Z',
    syncStatus: 'synced' as const,
  };
  const fakeCtxWithData = {
    db: { query: () => ({ collect: async () => [fakeProviderRow] }) },
  } as never;
  type Handler = (
    ctx: never,
    args: { search?: string; sessionToken?: string; botSecret?: string },
  ) => Promise<Array<Record<string, unknown>>>;

  it('a bot-secret caller searching by a cedula SUBSTRING gets no match (the oracle this closes)', async () => {
    const result = await (providersList as unknown as Handler)(
      fakeCtxWithData,
      { botSecret: BOT_SECRET, search: '1234567890' },
    );
    expect(result).toEqual([]);
  });

  it('a bot-secret caller searching by an email substring also gets no match', async () => {
    const result = await (providersList as unknown as Handler)(
      fakeCtxWithData,
      { botSecret: BOT_SECRET, search: 'contacto@esmeraldas' },
    );
    expect(result).toEqual([]);
  });

  it('a bot-secret caller CAN still search by nombreORazonSocial or nit', async () => {
    const byName = await (providersList as unknown as Handler)(
      fakeCtxWithData,
      { botSecret: BOT_SECRET, search: 'oriente' },
    );
    expect(byName).toHaveLength(1);
    const byNit = await (providersList as unknown as Handler)(fakeCtxWithData, {
      botSecret: BOT_SECRET,
      search: '900123456',
    });
    expect(byNit).toHaveLength(1);
  });

  it('a STAFF caller searching by cedula still matches (redaction only applies to the bot branch)', async () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    const result = await (providersList as unknown as Handler)(
      fakeCtxWithData,
      { sessionToken: token, search: '1234567890' },
    );
    expect(result).toHaveLength(1);
    expect(result[0].cedula).toBe('1234567890');
  });

  it('the bot projection is a named object, not a schema-field spread — an unlisted field never survives even if present on the raw row', async () => {
    const rowWithExtraField = {
      ...fakeProviderRow,
      someFuturePiiColumn: 'leaked-if-spread',
    };
    const ctx = {
      db: { query: () => ({ collect: async () => [rowWithExtraField] }) },
    } as never;
    const result = await (providersList as unknown as Handler)(ctx, {
      botSecret: BOT_SECRET,
    });
    expect(result[0]).not.toHaveProperty('someFuturePiiColumn');
    expect(result[0].nombreORazonSocial).toBe('Esmeraldas del Oriente');
    expect(result[0].cedula).toBeUndefined();
  });
});

// ─── Item 3: invitations.listByCreator + checkGuestHistory ───────────────

describe('item 3 — invitations.listByCreator requires a staff session', () => {
  const fakeInvitation = {
    _id: 'inv_1',
    invitationId: 'inv_123',
    shortCode: 'ABC123',
    creatorEmail: 'ana@tierramadre.app',
    creatorName: 'Ana Advisor',
    guestName: 'Guest Guy',
    guestContact: '+573001234567',
    status: 'active' as const,
    createdAt: '2026-08-01T00:00:00.000Z',
    pin: '1234',
    boundToken: 'tk_secret',
  };
  const fakeCtxWithData = {
    db: {
      query: () => ({
        withIndex: () => ({
          order: () => ({ collect: async () => [fakeInvitation] }),
        }),
      }),
    },
  } as never;
  type Handler = (
    ctx: never,
    args: { creatorEmail: string; sessionToken?: string },
  ) => Promise<Array<Record<string, unknown>>>;

  it('a valid staff session gets the rows, minus pin/boundToken', async () => {
    const token = mintSessionToken('staff@tierramadre.app')!;
    const result = await (listByCreator as unknown as Handler)(
      fakeCtxWithData,
      { creatorEmail: 'ana@tierramadre.app', sessionToken: token },
    );
    expect(result).toHaveLength(1);
    expect(result[0].guestContact).toBe('+573001234567');
    expect(result[0]).not.toHaveProperty('pin');
    expect(result[0]).not.toHaveProperty('boundToken');
  });

  it('no sessionToken gets [] and never touches ctx.db (the guessable-email attack this closes)', async () => {
    const fakeCtxNoDb = {} as never;
    const result = await (listByCreator as unknown as Handler)(fakeCtxNoDb, {
      creatorEmail: 'ana@tierramadre.app',
    });
    expect(result).toEqual([]);
  });
});

describe('item 3 — invitations.checkGuestHistory requires the server secret', () => {
  const fakeCtxNoDb = {} as never;
  type Handler = (
    ctx: never,
    args: { guestContact: string; secret: string },
  ) => Promise<unknown>;

  it('throws (fails closed) with no secret, never touching ctx.db', async () => {
    await expect(
      (checkGuestHistory as unknown as Handler)(fakeCtxNoDb, {
        guestContact: '+573001234567',
        secret: '',
      }),
    ).rejects.toThrow();
  });

  it('throws with a wrong secret', async () => {
    await expect(
      (checkGuestHistory as unknown as Handler)(fakeCtxNoDb, {
        guestContact: '+573001234567',
        secret: 'not-the-real-secret',
      }),
    ).rejects.toThrow();
  });

  it('returns real data with the correct secret', async () => {
    const fakeCtx = {
      db: { query: () => ({ collect: async () => [] }) },
    } as never;
    const result = await (checkGuestHistory as unknown as Handler)(fakeCtx, {
      guestContact: '+573001234567',
      secret: ADMIN_SECRET,
    });
    expect(result).toEqual({
      hasMultipleInviters: false,
      totalInvitations: 0,
      uniqueCreators: 0,
      invitations: [],
    });
  });
});

describe('item 3 — verifiedSessionEmail (api/invitations.ts) gates the REST list-by-creator action', () => {
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

  it('is wired into the list-by-creator branch in source (401 on failure, sessionToken forwarded to Convex)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const root = path.resolve(__dirname, '..');
    const src = fs.readFileSync(path.join(root, 'api/invitations.ts'), 'utf8');
    const i = src.indexOf("action === 'list-by-creator'");
    expect(i, 'no se encontró el bloque list-by-creator').toBeGreaterThan(-1);
    const rest = src.slice(i);
    const j = rest.indexOf("action === 'validate'");
    // list-by-creator is near the end of the file; just take a generous
    // window instead of hunting for the next block.
    const block = rest.slice(0, j === -1 ? 2000 : j);
    expect(block).toContain('verifiedSessionEmail(');
    expect(block).toContain('401');
    expect(block).toContain('sessionToken');
  });
});
