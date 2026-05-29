import { describe, it, expect } from "vitest";
import { buildItemPricingPatch } from "../src/pages/admin/Fotosintesis/utils/buildLotItemPayload";

/**
 * Regression guard for the "LoteResumen sidebar prices not saving" bug.
 *
 * The per-item pricing panel on LoteResumenPage edits precioEmbajadorCOP (sheet
 * col N) and precioConscienteCOP (col O) — the tiers the public catalog actually
 * shows — plus the mostrarEnCatalogo toggle, all into local React state. Before
 * the fix those edits were persisted ONLY by handleClose() (abierto lots); the
 * cerrado/publicado save handlers (handlePublishClosed / handleSaveGrouping)
 * never looped updateGemaFields, so editing prices on a live lot silently
 * discarded them. buildItemPricingPatch is the shared, pure contract every save
 * handler now routes through, so this test pins the patch shape.
 *
 * The EditItemDrawer (Goal F2) routes through the sibling `tierPricePatch`
 * helper (see tests/tierPricePatch.test.ts) — it carries only the two tiers
 * because the drawer already sends `mostrarEnCatalogo` via the sub-form
 * converter. The drawer gates that merge on `tipo !== "insumo"`, so an insumo
 * (internal supply, never in the public catalog) never sends a tier.
 */
describe("buildItemPricingPatch", () => {
  it("always carries the publish flag", () => {
    expect(buildItemPricingPatch(true, undefined)).toEqual({
      mostrarEnCatalogo: true,
    });
    expect(buildItemPricingPatch(false, undefined)).toEqual({
      mostrarEnCatalogo: false,
    });
  });

  it("includes numeric tier prices when set", () => {
    expect(
      buildItemPricingPatch(true, {
        precioEmbajadorCOP: 625000,
        precioConscienteCOP: 750000,
      }),
    ).toEqual({
      mostrarEnCatalogo: true,
      precioEmbajadorCOP: 625000,
      precioConscienteCOP: 750000,
    });
  });

  it("omits empty-string (unset) tier prices so they are not cleared accidentally", () => {
    expect(
      buildItemPricingPatch(false, {
        precioEmbajadorCOP: "",
        precioConscienteCOP: "",
      }),
    ).toEqual({ mostrarEnCatalogo: false });
  });

  it("includes only the tier that is actually a number", () => {
    expect(
      buildItemPricingPatch(true, {
        precioEmbajadorCOP: 480000,
        precioConscienteCOP: "",
      }),
    ).toEqual({ mostrarEnCatalogo: true, precioEmbajadorCOP: 480000 });
  });

  it("treats 0 as a real value (an explicitly free/canje tier), not unset", () => {
    expect(
      buildItemPricingPatch(true, {
        precioEmbajadorCOP: 0,
        precioConscienteCOP: "",
      }),
    ).toEqual({ mostrarEnCatalogo: true, precioEmbajadorCOP: 0 });
  });
});
