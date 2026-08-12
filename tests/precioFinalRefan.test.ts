import { describe, it, expect } from 'vitest';
import {
  computePrecioFinal,
  precioFinalRefanPatch,
  PRECIO_FINAL_MULTIPLIER,
} from '../convex/_lib/pricing';

/**
 * Guard for the price-ownership change of 2026-07-23.
 *
 * Before it, `precioFinalCOP` was recomputed as `costoBaseCOP × 2.6` on every
 * lote cost re-fan (convex/lotItems.ts: recomputePreponderancia + update). That
 * made the official price list unmaintainable: any edit to a lote silently
 * reset every price in it back to the multiplier.
 *
 * The re-fan now routes through `precioFinalRefanPatch`, which patches nothing
 * once a human owns the price. The mutations themselves are not unit-testable
 * (no convex-test harness in this repo), so this pure helper is where the
 * branch is pinned. If it regresses, item 89 silently drops 830.116 → 364.780.
 */
describe('precioFinalRefanPatch — lote re-fan must not reprice', () => {
  it('re-derives the price while the row still tracks the seed', () => {
    expect(precioFinalRefanPatch({}, 140300)).toEqual({
      precioFinalCOP: 364780,
    });
    expect(precioFinalRefanPatch({ precioFinalManual: false }, 140300)).toEqual(
      {
        precioFinalCOP: 364780,
      },
    );
  });

  it('patches NOTHING once the price is human-owned', () => {
    expect(precioFinalRefanPatch({ precioFinalManual: true }, 140300)).toEqual(
      {},
    );
  });

  it('stays empty even when the cost changes a lot (the real regression)', () => {
    // Item 89: cost 140.300, sheet price 830.116. Re-fanning C-046 to any cost
    // must leave the price alone — an empty patch is the only safe result.
    for (const nuevoCosto of [0, 1, 140300, 319275, 5_000_000]) {
      expect(
        precioFinalRefanPatch({ precioFinalManual: true }, nuevoCosto),
      ).toEqual({});
    }
  });

  it('an unowned row with no cost yields no phantom 0 price', () => {
    expect(precioFinalRefanPatch({}, 0)).toEqual({ precioFinalCOP: undefined });
    expect(precioFinalRefanPatch({}, null)).toEqual({
      precioFinalCOP: undefined,
    });
  });

  it('the seed multiplier is still 2.6', () => {
    expect(PRECIO_FINAL_MULTIPLIER).toBe(2.6);
    expect(computePrecioFinal(100000)).toBe(260000);
  });
});
