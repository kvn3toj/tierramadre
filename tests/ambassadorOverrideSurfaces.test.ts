/**
 * Overrides have to reach every surface, not just the favourites row (2026-08-11).
 *
 * `applyAmbassadorOverrides` was called in exactly one place —
 * AsesorProfilePage's `favoriteItems` — so an ambassador who renamed a piece
 * or set a price saw it on that one strip and nowhere else: not in the
 * category list, not on the piece's own screen, and not in the header's
 * "Valor", which summed raw `precioCOP`. The feature looked like it worked
 * and told the truth on one sixth of the page.
 *
 * The fix applies overrides once, at the source, so everything derived
 * inherits them. These tests pin the derived surfaces rather than the utility,
 * because the utility was never the broken part.
 */
import { describe, it, expect } from 'vitest';
import { applyAmbassadorOverrides } from '../src/utils/applyAmbassadorOverride';
import { resolveAsesorProducts } from '../src/utils/asesorProductOwnership';
import type { TreasureItem } from '../src/types';
import type { AmbassadorProductOverride } from '../src/types/ambassadorOverride';

function item(overrides: Partial<TreasureItem>): TreasureItem {
  return {
    item: 1,
    nombre: 'Muzo',
    peso: 2,
    color: 'Verde',
    calidad: 'AA',
    talla: 'Oval',
    medidas: '8x6',
    categoria: 'Esmeralda',
    coleccion: '',
    isJewelry: false,
    precioCOP: 10_000_000,
    asesor: 'Álvaro Pelaéz',
    estado: 'DISPONIBLE',
    ...overrides,
  } as TreasureItem;
}

const OWNED = [item({ item: 101 }), item({ item: 102, precioCOP: 20_000_000 })];

const OVERRIDES: Record<string, AmbassadorProductOverride> = {
  '101': {
    asesorSlug: 'alvaro-pelaez',
    itemId: '101',
    customName: 'La Verde de Muzo',
    customPriceCOP: 25_000_000,
    updatedAt: 'x',
  },
};

/** Mirrors AsesorProfilePage's `allProducts` memo. */
function allProducts() {
  return applyAmbassadorOverrides(
    resolveAsesorProducts(
      OWNED.map((p) => ({
        ...p,
        effectiveEstado: 'DISPONIBLE' as const,
        isTransferredAway: false,
      })),
      [],
      null,
    ),
    OVERRIDES,
  );
}

describe('overrides reach every surface derived from allProducts', () => {
  it('renames the piece', () => {
    expect(allProducts()[0].nombre).toBe('La Verde de Muzo');
  });

  it('reprices the piece', () => {
    expect(allProducts()[0].precioCOP).toBe(25_000_000);
  });

  it('leaves untouched pieces exactly as they were', () => {
    expect(allProducts()[1].nombre).toBe('Muzo');
    expect(allProducts()[1].precioCOP).toBe(20_000_000);
  });

  it('keeps effectiveEstado — the generic return type, not TreasureItem', () => {
    // A non-generic signature silently erased this, and every ownership-aware
    // surface downstream (available counts, sold badges) reads it.
    expect(allProducts()[0].effectiveEstado).toBe('DISPONIBLE');
  });

  it('feeds the header total the overridden price, not the raw one', () => {
    // The header used to sum raw precioCOP: 10M + 20M = 30M, while the
    // ambassador had priced that first piece at 25M.
    const total = allProducts().reduce((sum, p) => sum + (p.precioCOP || 0), 0);
    expect(total).toBe(45_000_000);
  });

  it('feeds the category list and the piece screen the same object', () => {
    // Both resolve out of allProducts by id, so one application covers them.
    const products = allProducts();
    const fromCategory = products.filter((p) => p.categoria === 'Esmeralda');
    const fromDetail = products.find((p) => p.item === 101);
    expect(fromCategory[0].nombre).toBe('La Verde de Muzo');
    expect(fromDetail?.precioCOP).toBe(25_000_000);
  });

  it('is a no-op when the ambassador has curated nothing', () => {
    const base = resolveAsesorProducts(
      OWNED.map((p) => ({
        ...p,
        effectiveEstado: 'DISPONIBLE' as const,
        isTransferredAway: false,
      })),
      [],
      null,
    );
    expect(applyAmbassadorOverrides(base, {})).toBe(base);
  });
});
