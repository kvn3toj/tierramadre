import { describe, it, expect } from 'vitest';
import { buildItemPricingPatch } from '../src/pages/admin/Fotosintesis/utils/buildLotItemPayload';

/**
 * Regression guard for the "LoteResumen sidebar prices not saving" bug.
 *
 * The per-item panel on LoteResumenPage edits the `mostrarEnCatalogo` toggle
 * into local React state. Before the fix those edits were persisted ONLY by
 * handleClose() (abierto lots); the cerrado/publicado save handlers
 * (handlePublishClosed / handleSaveGrouping) never looped updateGemaFields, so
 * editing on a live lot silently discarded them. buildItemPricingPatch is the
 * shared, pure contract every save handler now routes through, so this test
 * pins the patch shape.
 *
 * PRICE REFACTOR (2026-07-21, SOT v3): the per-item embajador/consciente tiers
 * were removed. The price is DERIVED in Convex (precioFinalCOP = costoBaseCOP ×
 * 2.6) and the UI never sends one, so this patch carries ONLY the publish flag.
 * That flag must survive every save path — dropping it un-publishes an item.
 */
describe('buildItemPricingPatch', () => {
  it('always carries the publish flag', () => {
    expect(buildItemPricingPatch(true)).toEqual({ mostrarEnCatalogo: true });
    expect(buildItemPricingPatch(false)).toEqual({ mostrarEnCatalogo: false });
  });

  it('carries NOTHING but the publish flag (no price tiers post-SOT v3)', () => {
    expect(Object.keys(buildItemPricingPatch(true))).toEqual([
      'mostrarEnCatalogo',
    ]);
  });
});
