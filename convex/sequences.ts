import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";

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
    .query("sequences")
    .withIndex("by_name", (q) => q.eq("name", name))
    .first();
  if (!row) {
    await ctx.db.insert("sequences", { name, nextValue: 2 });
    return 1;
  }
  const value = row.nextValue;
  await ctx.db.patch(row._id, { nextValue: value + 1 });
  return value;
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
 * Read-only peek at the next value a given sequence will return on its
 * next `allocate`. Used by the lot form to preview "B-008" before submit.
 * Does NOT consume the number.
 */
export const peek = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const row = await ctx.db
      .query("sequences")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    return { value: row?.nextValue ?? 1 };
  },
});

export type Sede = "B" | "C";

/**
 * Sequence name for a lot id. Legacy callers used `"lot"` (Bogotá-only);
 * we keep that name for sede `B` so the counter continues uninterrupted,
 * and use `"lot:C"` for the new Cali sede.
 */
export function lotSequenceName(sede: Sede): string {
  return sede === "B" ? "lot" : "lot:C";
}

/** Same migration trick as `lotSequenceName` — preserves the legacy V- counter. */
export function saleSequenceName(sede: Sede): string {
  return sede === "B" ? "sale" : "sale:C";
}

/** "B-001"/"C-001", … "B-9999"/"C-9999". */
export function formatLotId(n: number, sede: Sede): string {
  return `${sede}-${String(n).padStart(3, "0")}`;
}

/** "VB-0001"/"VC-0001", … "VB-99999"/"VC-99999". */
export function formatSaleId(n: number, sede: Sede): string {
  return `V${sede}-${String(n).padStart(4, "0")}`;
}
