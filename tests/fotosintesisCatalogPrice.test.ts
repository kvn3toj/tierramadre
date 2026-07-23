import { describe, it, expect } from 'vitest';
import {
  mapRowToTreasureItem,
  type PublishedRow,
} from '../src/hooks/useFotosintesisCatalog';

/**
 * Regression guard for the "$ 0 desde el ítem ~318" bug (2026-07-22).
 *
 * Convex prod was migrated to SOT v3 (publishedCatalog stopped projecting the
 * retired `precioEmbajadorCOP` and started projecting the derived
 * `precioFinalCOP`) BEFORE the frontend was deployed. The deployed mapper still
 * read `row.precioEmbajadorCOP ?? 0`, so every Convex-only item — exactly the
 * ones above the Sheets range, i.e. 323→472 — rendered at $ 0 while the
 * Sheets-backed items 1–317 kept their price.
 *
 * These tests pin the two invariants that failure violated:
 *   1. the catalog price comes from `precioFinalCOP`;
 *   2. a finished piece ("Joyería Artesanal") is flagged as jewelry, so the
 *      card shows the joya treatment instead of the loose-gem "Gema" chip.
 */

const row = (extra: Partial<PublishedRow> = {}): PublishedRow => ({
  itemId: '411',
  nombre: 'Aretes',
  ...extra,
});

describe('mapRowToTreasureItem — catalog price (SOT v3)', () => {
  it('reads the derived precioFinalCOP', () => {
    expect(
      mapRowToTreasureItem(row({ precioFinalCOP: 104_000 })).precioCOP,
    ).toBe(104_000);
  });

  it('falls back to 0 only when the item genuinely has no derived price', () => {
    // Insumos/topos with no costoBaseCOP legitimately carry no price.
    expect(mapRowToTreasureItem(row({ categoria: 'Insumo' })).precioCOP).toBe(
      0,
    );
  });

  it('never resurrects the retired tier fields as a price source', () => {
    const legacy = row({
      precioEmbajadorCOP: 800_000,
    } as Partial<PublishedRow>);
    expect(mapRowToTreasureItem(legacy).precioCOP).toBe(0);
  });
});

describe('mapRowToTreasureItem — jewelry detection', () => {
  it("treats 'Joyería Artesanal' as jewelry (accents and case tolerated)", () => {
    for (const categoria of [
      'Joyería Artesanal',
      'joyeria artesanal',
      '  JOYERÍA ARTESANAL  ',
    ]) {
      expect(mapRowToTreasureItem(row({ categoria })).isJewelry).toBe(true);
    }
  });

  it('keeps loose-gem categories as non-jewelry', () => {
    expect(
      mapRowToTreasureItem(row({ categoria: 'Gema Facetada', peso: '0.53' }))
        .isJewelry,
    ).toBe(false);
  });
});
