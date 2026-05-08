import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Race-safe monotonic counter allocator.
 *
 * Convex serializes mutations that touch overlapping documents within a
 * single function — and any two `allocate` calls for the same `name` end
 * up reading and patching the same row, so they cannot interleave. The
 * second caller observes the first's incremented `nextValue` and returns
 * the next number.
 *
 * First call for an unseen name returns 1 and seeds `nextValue: 2`.
 */
export const allocate = internalMutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const row = await ctx.db
      .query("sequences")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (!row) {
      await ctx.db.insert("sequences", { name, nextValue: 2 });
      return { value: 1 };
    }
    const value = row.nextValue;
    await ctx.db.patch(row._id, { nextValue: value + 1 });
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
