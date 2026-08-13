import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import { v } from 'convex/values';

/**
 * Inline allocator — call from another mutation's handler so the
 * sequence read+patch happens in the SAME Convex transaction as the
 * caller's writes. If the caller throws after this returns, both the
 * allocator's patch and the caller's writes roll back together —
 * preserving the "sin saltos" invariant (PRD §7 BR-1).
 *
 * Do NOT swap this for `ctx.runMutation(internal.sequences.allocate)`
 * from inside another mutation: that call commits in its own
 * transaction and a gap leaks if the outer mutation later fails.
 */
export async function allocateNext(
  ctx: MutationCtx,
  name: string,
): Promise<number> {
  const row = await ctx.db
    .query('sequences')
    .withIndex('by_name', (q) => q.eq('name', name))
    .first();
  if (!row) {
    await ctx.db.insert('sequences', { name, nextValue: 2 });
    return 1;
  }
  const value = row.nextValue;
  await ctx.db.patch(row._id, { nextValue: value + 1 });
  return value;
}

/**
 * The plain counter above is NOT collision-safe for lot ids: any row that
 * enters `lots` without going through it (imports, migrations, reconstructed
 * lots) leaves the counter behind, and from then on every allocation hands
 * out a loteId that ALREADY EXISTS. A duplicate doesn't error — it aliases:
 * `lots.getByLoteId` resolves with `.first()` (hides the newer row) and
 * `casillas._estadoDelLote` merges both lots' items. Observed live twice:
 * C-077×2 in dev (2026-08-05) and MED-025 about to collide in prod
 * (2026-08-13, counter at 25 with MED-025 and MED-026 taken).
 *
 * `firstFreeLotNumber` scans forward from the counter until it finds a
 * loteId with no `lots` row. The existence check deliberately ignores
 * `estado` — a `reconstruido` lot occupies its id exactly like a live one,
 * which is the half of the bug that produced the C-078 reuse.
 */
const MAX_LOT_ID_SKIPS = 500;

export async function firstFreeLotNumber(
  ctx: QueryCtx,
  sede: Sede,
): Promise<number> {
  const row = await ctx.db
    .query('sequences')
    .withIndex('by_name', (q) => q.eq('name', lotSequenceName(sede)))
    .first();
  let candidate = row?.nextValue ?? 1;
  for (let skips = 0; skips <= MAX_LOT_ID_SKIPS; skips++, candidate++) {
    const taken = await ctx.db
      .query('lots')
      .withIndex('by_loteId', (q) =>
        q.eq('loteId', formatLotId(candidate, sede)),
      )
      .first();
    if (!taken) return candidate;
  }
  throw new Error(
    `sede ${sede}: ${MAX_LOT_ID_SKIPS} loteIds consecutivos ocupados desde el contador — ` +
      `revisar la fila de sequences y la tabla lots antes de crear más lotes`,
  );
}

/**
 * Collision-safe lot-id allocator. Same transactional contract as
 * `allocateNext` (call it from inside the domain mutation), but it advances
 * past occupied ids and leaves the counter one past the id it handed out —
 * so a counter left behind by an import heals itself on the next alta
 * instead of aliasing an existing lot.
 */
export async function allocateNextLotId(
  ctx: MutationCtx,
  sede: Sede,
): Promise<{ value: number; loteId: string }> {
  const value = await firstFreeLotNumber(ctx, sede);
  const name = lotSequenceName(sede);
  const row = await ctx.db
    .query('sequences')
    .withIndex('by_name', (q) => q.eq('name', name))
    .first();
  if (row) {
    await ctx.db.patch(row._id, { nextValue: value + 1 });
  } else {
    await ctx.db.insert('sequences', { name, nextValue: value + 1 });
  }
  return { value, loteId: formatLotId(value, sede) };
}

/**
 * Stand-alone allocator. Useful for tests or one-off CLI invocations
 * that aren't part of a domain-write transaction. Domain mutations
 * (lots.create, sales.create) MUST use `allocateNext` instead so the
 * sequence and the domain write share one transaction.
 */
export const allocate = internalMutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const value = await allocateNext(ctx, name);
    return { value };
  },
});

/**
 * Roll a sequence back by one IFF `value` is the last number it handed out
 * (i.e. `nextValue === value + 1`). Lets `lots.cancel` reclaim the number of a
 * just-created, never-populated lot so the NEXT lot reuses it — honouring the
 * "sin saltos" invariant (PRD §7 BR-1) instead of leaving a permanent gap.
 *
 * Returns `true` when the number was reclaimed; `false` when this is NOT the
 * tail (a newer number already exists, so renumbering would collide) or the
 * sequence row does not exist. Call from inside the caller's mutation so the
 * rollback shares the transaction that deletes the lot.
 */
export async function reclaimIfTail(
  ctx: MutationCtx,
  name: string,
  value: number,
): Promise<boolean> {
  const row = await ctx.db
    .query('sequences')
    .withIndex('by_name', (q) => q.eq('name', name))
    .first();
  if (!row) return false;
  if (row.nextValue !== value + 1) return false;
  await ctx.db.patch(row._id, { nextValue: value });
  return true;
}

/**
 * Read-only peek at the next value a given sequence will return on its
 * next `allocate`. Used by the lot form to preview "B-008" before submit.
 * Does NOT consume the number.
 */
export const peek = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const row = await ctx.db
      .query('sequences')
      .withIndex('by_name', (q) => q.eq('name', name))
      .first();
    return { value: row?.nextValue ?? 1 };
  },
});

// Known sede codes keep autocomplete; a sanitized custom write-in code is also
// accepted (it just becomes the loteId/saleId prefix + its own sequence key).
export type Sede = 'B' | 'C' | 'S' | 'M' | (string & {});

/**
 * Sequence name for a lot id. Legacy callers used `"lot"` (Bogotá-only);
 * we keep that name for sede `B` so the counter continues uninterrupted,
 * and use `"lot:C"` / `"lot:S"` / `"lot:M"` for Cali, Secreta, and Marketing.
 */
export function lotSequenceName(sede: Sede): string {
  if (sede === 'B') return 'lot';
  return `lot:${sede}`;
}

/** Same migration trick as `lotSequenceName` — preserves the legacy V- counter. */
export function saleSequenceName(sede: Sede): string {
  if (sede === 'B') return 'sale';
  return `sale:${sede}`;
}

/** "B-001"/"C-001"/"S-001"/"M-001", … */
export function formatLotId(n: number, sede: Sede): string {
  return `${sede}-${String(n).padStart(3, '0')}`;
}

/**
 * Inverse of {@link formatLotId}: split "C-001" into its sede prefix and the
 * (un-padded) numeric value. The prefix letter is the source of truth for the
 * sede even on legacy rows whose optional `sede` column is unset.
 */
export function parseLoteId(loteId: string): { sede: Sede; value: number } {
  const dash = loteId.indexOf('-');
  return {
    sede: loteId.slice(0, dash) as Sede,
    value: Number.parseInt(loteId.slice(dash + 1), 10),
  };
}

/** "VB-0001"/"VC-0001", … "VB-99999"/"VC-99999". */
export function formatSaleId(n: number, sede: Sede): string {
  return `V${sede}-${String(n).padStart(4, '0')}`;
}

/**
 * Sub-lote sequence key — one counter PER parent lote so ids read
 * "B-001-G1", "B-001-G2", … and never collide across parents. The parent
 * loteId is embedded in the key, so the same "G" number can recur under
 * different parents without clashing.
 */
export function subLoteSequenceName(parentLoteId: string): string {
  return `sublot:${parentLoteId}`;
}

/** "B-001-G1" — parent loteId + "-G" + the per-parent sequence value. */
export function formatSubLoteId(parentLoteId: string, n: number): string {
  return `${parentLoteId}-G${n}`;
}
