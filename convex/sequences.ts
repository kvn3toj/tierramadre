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

/** "B-001", "B-002", … "B-9999". */
export function formatLotId(n: number): string {
  return `B-${String(n).padStart(3, "0")}`;
}

/** "V-0001", "V-0002", … "V-99999". */
export function formatSaleId(n: number): string {
  return `V-${String(n).padStart(4, "0")}`;
}
