/**
 * Auditoría de PII de las superficies v4 del bot (2026-08-12) — hallazgos F1 y F2
 * de `anima-bot/docs/reconciliacion-v4-tierramadre.md` §4.1.
 *
 * Las dos LECTURAS de `casillas.ts` fallaban ABIERTAS, que es exactamente lo que el
 * blindaje de PII del 2026-08-06 erradicó en `providers.list`:
 *
 *  - `_porItemId` devolvía `{ ...casilla, completa, faltantes }` — el spread textual
 *    que aquel arreglo reemplazó por «un objeto que nombra cada campo».
 *  - `_estadoDelLote` devolvía el array `casillas` con los documentos `lotItems`
 *    enteros.
 *
 * «Falla abierta» significa: se agrega una columna al schema y viaja al bot sola, sin
 * que nadie lo decida. Ya había pasado — `clasificadaPor` lleva el EMAIL del staff
 * para toda casilla clasificada desde la web (`casillas.ts`, `caller.email`), y
 * `publicacionParcial.por` lleva otro.
 *
 * El arreglo proyecta en las CÁSCARAS `ViaBot`, no en los internals: `estadoDelLote`
 * y `porItemId` (web, con `requireAccessLevel`) siguen devolviendo el documento
 * entero, igual que en `providers.list` el staff conserva la salida sin proyectar.
 *
 * `clasificadaPor`/`clasificadaEn` SÍ viajan, por decisión explícita de Kevin
 * (2026-08-12): sirven para decir quién clasificó la pieza. La diferencia con antes
 * no es que estén — es que están NOMBRADOS. `publicacionParcial` no se pidió y no
 * viaja.
 *
 * Patrón copiado de `convexPiiInvitados.test.ts` item 2, incluido su mejor test: uno
 * que mete un campo que no está en la lista y exige que NO sobreviva. Ése es el que
 * distingue una proyección construida de un spread — sin él, los dos pasan igual.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { estadoDelLoteViaBot, porItemIdViaBot } from '../convex/casillas';

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

/**
 * Una casilla como la devuelve `ctx.db`: documento entero, con los campos del riel
 * viejo, la PII, y una columna que el schema todavía no tiene — el futuro que la
 * proyección tiene que resistir.
 */
const casillaCruda = {
  _id: 'lotItem_1',
  _creationTime: 1234,
  loteId: 'B-010',
  itemId: '001',
  ordenEnLote: 1,
  preponderancia: 0,
  costoBaseCOP: 0,
  estadoCasilla: 'DISPONIBLE',
  costoUnitarioRealCOP: 450000,
  categoriaFiscal: 'gema',
  calidad: 'Fina',
  color: 'Verde intenso',
  corte: 'Oval',
  ct: 2.3,
  tipo: 'Murralla',
  clasificadaPor: 'staff@tierramadre.app',
  clasificadaEn: 1_700_000_000_000,
  columnaFuturaConPii: 'se-filtra-si-es-spread',
};

const estadoCrudo = {
  loteId: 'B-010',
  estado: 'abierto',
  categoriaFiscalLote: 'gema',
  costoTotalCOP: 3_520_000,
  completeness: {
    completas: 1,
    total: 2,
    pct: 50,
    listoParaPublicar: false,
    incompletas: ['002'],
  },
  conciliacion: {
    suma: 450000,
    diferencia: -2_950_000,
    cuadra: false,
    sinCosto: 1,
  },
  // Lleva `por`, que es un email de staff para lotes publicados desde la web.
  publicacionParcial: {
    ts: 1,
    por: 'jefe@tierramadre.app',
    motivo: 'x',
    casillasIncompletas: [],
  },
  casillas: [casillaCruda],
};

const ctxCon = (resultado: unknown) =>
  ({ runQuery: async () => resultado }) as never;

type Handler<A> = (
  ctx: never,
  args: A,
) => Promise<Record<string, unknown> | null>;

const llamarEstado = (raw: unknown) =>
  (
    estadoDelLoteViaBot as unknown as Handler<{
      botSecret: string;
      loteId: string;
    }>
  )(ctxCon(raw), { botSecret: BOT_SECRET, loteId: 'B-010' });

const llamarItem = (raw: unknown) =>
  (
    porItemIdViaBot as unknown as Handler<{ botSecret: string; itemId: string }>
  )(ctxCon(raw), { botSecret: BOT_SECRET, itemId: '001' });

// ─── F2 · estadoDelLoteViaBot ────────────────────────────────────────────────

describe('F2 — estadoDelLoteViaBot proyecta en vez de devolver los documentos crudos', () => {
  it('una columna que no está en la lista NO sobrevive, aunque venga en la fila cruda', async () => {
    const r = await llamarEstado(estadoCrudo);
    const casilla = (r!.casillas as Array<Record<string, unknown>>)[0];
    expect(casilla).not.toHaveProperty('columnaFuturaConPii');
    // Y tampoco los internos de Convex ni los campos del riel viejo.
    expect(casilla).not.toHaveProperty('_id');
    expect(casilla).not.toHaveProperty('_creationTime');
    expect(casilla).not.toHaveProperty('preponderancia');
  });

  it('`publicacionParcial` no viaja: lleva `por`, que es otro email de staff', async () => {
    const r = await llamarEstado(estadoCrudo);
    expect(r).not.toHaveProperty('publicacionParcial');
  });

  it('`clasificadaPor` y `clasificadaEn` SÍ viajan — decisión explícita, no accidente', async () => {
    const r = await llamarEstado(estadoCrudo);
    const casilla = (r!.casillas as Array<Record<string, unknown>>)[0];
    expect(casilla.clasificadaPor).toBe('staff@tierramadre.app');
    expect(casilla.clasificadaEn).toBe(1_700_000_000_000);
  });

  it('sobrevive TODO lo que anima-bot lee de verdad (W1 y W2)', async () => {
    const r = await llamarEstado(estadoCrudo);
    // W2 — `leerEstadoLote`: loteId, completeness, conciliacion.
    expect(r!.loteId).toBe('B-010');
    expect(r!.completeness).toEqual(estadoCrudo.completeness);
    expect(r!.conciliacion).toEqual(estadoCrudo.conciliacion);
    // W1 — `leerEstadoDelLote`: estado, categoriaFiscalLote, costoTotalCOP, y
    // `casillas` como ARRAY, porque de él sólo usa `.length`.
    expect(r!.estado).toBe('abierto');
    expect(r!.categoriaFiscalLote).toBe('gema');
    expect(r!.costoTotalCOP).toBe(3_520_000);
    expect(Array.isArray(r!.casillas)).toBe(true);
    expect((r!.casillas as unknown[]).length).toBe(1);
  });

  it('un lote inexistente sigue siendo `null`, no un objeto a medias', async () => {
    expect(await llamarEstado(null)).toBeNull();
  });
});

// ─── F1 · porItemIdViaBot ────────────────────────────────────────────────────

describe('F1 — porItemIdViaBot deja de ser un spread del documento', () => {
  const itemCrudo = {
    ...casillaCruda,
    completa: true,
    faltantes: [] as string[],
  };

  it('una columna que no está en la lista NO sobrevive', async () => {
    const r = await llamarItem(itemCrudo);
    expect(r).not.toHaveProperty('columnaFuturaConPii');
    expect(r).not.toHaveProperty('_id');
    expect(r).not.toHaveProperty('loteId');
  });

  it('sobrevive lo que el bot lee: `estadoCasilla`, y el contrato del internal', async () => {
    const r = await llamarItem(itemCrudo);
    // `leerEstadoCasilla` (anima-bot, features/movimientos/wizard.ts) lee UNO.
    expect(r!.estadoCasilla).toBe('DISPONIBLE');
    expect(r!.itemId).toBe('001');
    expect(r!.completa).toBe(true);
    expect(r!.faltantes).toEqual([]);
  });

  it('`clasificadaPor` viaja también acá, y nombrado', async () => {
    const r = await llamarItem(itemCrudo);
    expect(r!.clasificadaPor).toBe('staff@tierramadre.app');
  });

  it('un ítem que no es casilla v4 sigue siendo `null`', async () => {
    expect(await llamarItem(null)).toBeNull();
  });
});
