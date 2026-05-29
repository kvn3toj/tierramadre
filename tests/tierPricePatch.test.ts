import { describe, it, expect } from "vitest";
import { tierPricePatch } from "../src/pages/admin/Fotosintesis/utils/buildLotItemPayload";

/**
 * Contract guard for the EditItemDrawer's "Precios del catálogo" block (Goal F2:
 * make the public catalog price editable post-create).
 *
 * The drawer holds the two catalog tiers — precioEmbajadorCOP (sheet col N, the
 * price the public actually pays) and precioConscienteCOP (col O) — in local
 * React state typed `number | ""`. On submit it merges this patch into the
 * updateGemaFields payload.
 *
 * Rules (mirrors buildItemPricingPatch's omit-on-blank contract):
 * - a blank "" tier is OMITTED so a no-op edit never clears a stored price;
 * - a numeric value (including a literal 0, a deliberate canje/free tier) is
 *   sent verbatim. Convex's compareNumber path for these two columns has NO
 *   0→undefined guard, so 0 must round-trip exactly as the operator typed it.
 */
describe("tierPricePatch", () => {
  it("includes both tiers when both are numbers", () => {
    expect(tierPricePatch(625000, 750000)).toEqual({
      precioEmbajadorCOP: 625000,
      precioConscienteCOP: 750000,
    });
  });

  it("omits blank (unset) tiers so they are not cleared accidentally", () => {
    expect(tierPricePatch("", "")).toEqual({});
  });

  it("includes only the tier that is actually a number", () => {
    expect(tierPricePatch(480000, "")).toEqual({
      precioEmbajadorCOP: 480000,
    });
    expect(tierPricePatch("", 900000)).toEqual({
      precioConscienteCOP: 900000,
    });
  });

  it("treats 0 as a real value (an explicitly free/canje tier), not unset", () => {
    expect(tierPricePatch(0, "")).toEqual({ precioEmbajadorCOP: 0 });
    expect(tierPricePatch(0, 0)).toEqual({
      precioEmbajadorCOP: 0,
      precioConscienteCOP: 0,
    });
  });
});
