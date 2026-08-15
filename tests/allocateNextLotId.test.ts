import { describe, it, expect } from 'vitest';
import { allocateNextLotId, firstFreeLotNumber } from '../convex/sequences';

/**
 * In-memory stand-in for the two table surfaces the collision-safe allocator
 * touches: `sequences.by_name` and `lots.by_loteId`, both via `.first()`,
 * plus `.patch()`/`.insert()` on `sequences`. Same idea as the `makeCtx` in
 * `fotosintesis-sequences.test.ts`.
 *
 * The fake `lots` rows carry `estado: "reconstruido"` ON PURPOSE: the
 * existence check must treat a reconstructed lot as occupying its id — that
 * blindness is the half of the bug that produced the C-078 reuse.
 */
function makeCtx(opts: {
  sequences: Array<{ _id: string; name: string; nextValue: number }>;
  takenLoteIds: string[];
}) {
  const patched: Array<{ _id: string; nextValue: number }> = [];
  const inserted: Array<{ table: string; doc: Record<string, unknown> }> = [];
  const db = {
    query(table: string) {
      return {
        withIndex(
          _index: string,
          build: (q: {
            eq: (field: string, value: string) => unknown;
          }) => unknown,
        ) {
          let wanted = '';
          build({
            eq: (_field: string, value: string) => {
              wanted = value;
              return {};
            },
          });
          return {
            async first() {
              if (table === 'sequences') {
                return opts.sequences.find((r) => r.name === wanted) ?? null;
              }
              if (table === 'lots') {
                return opts.takenLoteIds.includes(wanted)
                  ? { loteId: wanted, estado: 'reconstruido' }
                  : null;
              }
              throw new Error(`tabla inesperada: ${table}`);
            },
          };
        },
      };
    },
    async patch(_id: string, fields: { nextValue: number }) {
      patched.push({ _id, nextValue: fields.nextValue });
    },
    async insert(table: string, doc: Record<string, unknown>) {
      inserted.push({ table, doc });
      return `id_${inserted.length}`;
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ctx: { db } as any, patched, inserted };
}

describe('allocateNextLotId', () => {
  it('hands out the counter value when nothing collides', async () => {
    const { ctx, patched } = makeCtx({
      sequences: [{ _id: 's1', name: 'lot', nextValue: 8 }],
      takenLoteIds: [],
    });
    const got = await allocateNextLotId(ctx, 'B');
    expect(got).toEqual({ value: 8, loteId: 'B-008' });
    expect(patched).toEqual([{ _id: 's1', nextValue: 9 }]);
  });

  it('MED incident (2026-08-13): counter behind occupied rows skips past them', async () => {
    // Prod real: contador en 25, MED-025 y MED-026 ya existen. El contador
    // crudo entregaría MED-025 — el duplicado que tapa, no truena.
    const { ctx, patched } = makeCtx({
      sequences: [{ _id: 's1', name: 'lot:MED', nextValue: 25 }],
      takenLoteIds: ['MED-025', 'MED-026'],
    });
    const got = await allocateNextLotId(ctx, 'MED');
    expect(got).toEqual({ value: 27, loteId: 'MED-027' });
    expect(patched).toEqual([{ _id: 's1', nextValue: 28 }]);
  });

  it('C-077 incident (2026-08-05): survives a long run of occupied ids', async () => {
    // Dev real: 87 lotes de sede C con números hasta el 89 y el contador en 77.
    const taken = Array.from(
      { length: 13 },
      (_, i) => `C-${String(77 + i).padStart(3, '0')}`,
    );
    const { ctx } = makeCtx({
      sequences: [{ _id: 's1', name: 'lot:C', nextValue: 77 }],
      takenLoteIds: taken,
    });
    const got = await allocateNextLotId(ctx, 'C');
    expect(got).toEqual({ value: 90, loteId: 'C-090' });
  });

  it('a reconstructed lot occupies its id like any other', async () => {
    // El fake devuelve estado "reconstruido" en TODA fila ocupada (ver makeCtx):
    // si el allocator filtrara por estado, este test entregaría B-001 y fallaría.
    const { ctx } = makeCtx({
      sequences: [{ _id: 's1', name: 'lot', nextValue: 1 }],
      takenLoteIds: ['B-001'],
    });
    const got = await allocateNextLotId(ctx, 'B');
    expect(got).toEqual({ value: 2, loteId: 'B-002' });
  });

  it('creates the sequence row past the first free id when none exists', async () => {
    const { ctx, inserted } = makeCtx({
      sequences: [],
      takenLoteIds: ['S-001'],
    });
    const got = await allocateNextLotId(ctx, 'S');
    expect(got).toEqual({ value: 2, loteId: 'S-002' });
    expect(inserted).toEqual([
      { table: 'sequences', doc: { name: 'lot:S', nextValue: 3 } },
    ]);
  });

  it('throws instead of scanning forever on pathological data', async () => {
    const taken = Array.from(
      { length: 502 },
      (_, i) => `B-${String(1 + i).padStart(3, '0')}`,
    );
    const { ctx } = makeCtx({
      sequences: [{ _id: 's1', name: 'lot', nextValue: 1 }],
      takenLoteIds: taken,
    });
    await expect(allocateNextLotId(ctx, 'B')).rejects.toThrow(
      /consecutivos ocupados/,
    );
  });
});

describe('firstFreeLotNumber', () => {
  it('previews exactly what allocateNextLotId would hand out, without writing', async () => {
    const { ctx, patched, inserted } = makeCtx({
      sequences: [{ _id: 's1', name: 'lot:MED', nextValue: 25 }],
      takenLoteIds: ['MED-025', 'MED-026'],
    });
    const peeked = await firstFreeLotNumber(ctx, 'MED');
    expect(patched).toEqual([]);
    expect(inserted).toEqual([]);

    const allocated = await allocateNextLotId(ctx, 'MED');
    expect(allocated.value).toBe(peeked);
  });

  it('starts at 1 when the sequence row does not exist', async () => {
    const { ctx } = makeCtx({ sequences: [], takenLoteIds: [] });
    expect(await firstFreeLotNumber(ctx, 'M')).toBe(1);
  });
});
