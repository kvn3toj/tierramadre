import { describe, it, expect } from "vitest";
import {
  formatLotId,
  formatSaleId,
  parseLoteId,
  reclaimIfTail,
} from "../convex/sequences";

describe("formatLotId", () => {
  it("pads single digits to 3 and prefixes the sede", () => {
    expect(formatLotId(1, "B")).toBe("B-001");
    expect(formatLotId(7, "C")).toBe("C-007");
  });

  it("pads double and triple digits", () => {
    expect(formatLotId(42, "B")).toBe("B-042");
    expect(formatLotId(999, "S")).toBe("S-999");
  });

  it("does not truncate beyond 3 digits", () => {
    expect(formatLotId(1000, "B")).toBe("B-1000");
    expect(formatLotId(12345, "M")).toBe("M-12345");
  });
});

describe("formatSaleId", () => {
  it("pads to 4 digits and prefixes V + sede", () => {
    expect(formatSaleId(1, "B")).toBe("VB-0001");
    expect(formatSaleId(42, "C")).toBe("VC-0042");
    expect(formatSaleId(9999, "B")).toBe("VB-9999");
  });

  it("does not truncate beyond 4 digits", () => {
    expect(formatSaleId(10000, "B")).toBe("VB-10000");
  });
});

describe("parseLoteId", () => {
  it("round-trips formatLotId for every sede", () => {
    for (const sede of ["B", "C", "S", "M"] as const) {
      for (const n of [1, 7, 42, 999, 1000]) {
        expect(parseLoteId(formatLotId(n, sede))).toEqual({ sede, value: n });
      }
    }
  });

  it("strips the zero-padding from the numeric suffix", () => {
    expect(parseLoteId("C-001")).toEqual({ sede: "C", value: 1 });
    expect(parseLoteId("B-042")).toEqual({ sede: "B", value: 42 });
  });
});

/**
 * Minimal in-memory stand-in for the Convex MutationCtx surface that
 * `reclaimIfTail` touches: a `by_name` indexed `.first()` read and a
 * `.patch()`. Enough to assert the tail-only rollback rule without a live
 * deployment.
 */
function makeCtx(
  rows: Array<{ _id: string; name: string; nextValue: number }>,
) {
  const patches: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const ctx = {
    db: {
      query: () => ({
        withIndex: (_index: string, builder: (q: unknown) => unknown) => {
          let wanted: string | undefined;
          builder({
            eq: (_field: string, value: string) => {
              wanted = value;
              return {};
            },
          });
          return {
            first: async () => rows.find((r) => r.name === wanted) ?? null,
          };
        },
      }),
      patch: async (id: string, patch: Record<string, unknown>) => {
        patches.push({ id, patch });
        const row = rows.find((r) => r._id === id);
        if (row) Object.assign(row, patch);
      },
    },
  };
  // `reclaimIfTail` only ever reaches for ctx.db.query/patch.
  return { ctx: ctx as never, patches, rows };
}

describe("reclaimIfTail", () => {
  it("rolls the sequence back when value is the tail (nextValue === value + 1)", async () => {
    // C-001 was just allocated → nextValue advanced to 2. Cancelling it must
    // reclaim the number so the next lot reuses C-001.
    const { ctx, patches, rows } = makeCtx([
      { _id: "seqC", name: "lot:C", nextValue: 2 },
    ]);
    const reclaimed = await reclaimIfTail(ctx, "lot:C", 1);
    expect(reclaimed).toBe(true);
    expect(rows[0].nextValue).toBe(1);
    expect(patches).toEqual([{ id: "seqC", patch: { nextValue: 1 } }]);
  });

  it("does NOT roll back a middle value (a newer number was already handed out)", async () => {
    // C-001 and C-002 exist (nextValue 3). Cancelling C-001 cannot reclaim it
    // without colliding with the live C-002, so the sequence stays put.
    const { ctx, patches, rows } = makeCtx([
      { _id: "seqC", name: "lot:C", nextValue: 3 },
    ]);
    const reclaimed = await reclaimIfTail(ctx, "lot:C", 1);
    expect(reclaimed).toBe(false);
    expect(rows[0].nextValue).toBe(3);
    expect(patches).toEqual([]);
  });

  it("is a no-op when the sequence row does not exist yet", async () => {
    const { ctx, patches } = makeCtx([]);
    const reclaimed = await reclaimIfTail(ctx, "lot:C", 1);
    expect(reclaimed).toBe(false);
    expect(patches).toEqual([]);
  });
});
