/**
 * Composition test for the empty ambassador profile (2026-08-11).
 *
 * This is the layer that was missing. Every unit involved was individually
 * correct — the projection withheld `asesor` exactly as designed, and
 * `getAsesorProducts` filtered on it exactly as written — and the profile
 * still rendered empty for every non-staff visitor, because nothing tested
 * the two together. 897 unit tests passed over a dead product surface.
 *
 * So these assertions are about the SEAM: given catalog rows shaped the way
 * each kind of caller actually receives them, does the profile end up with
 * pieces?
 */
import { describe, it, expect } from 'vitest';
import {
  resolveAsesorProducts,
  getAsesorProducts,
} from '../src/utils/asesorProductOwnership';
import { toPublicItem } from '../api/_lib/catalogProjection';
import type { TreasureItem } from '../src/types';

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

const STAFF_ROWS = [
  item({ item: 101 }),
  item({ item: 102, estado: 'VENDIDA' }),
  item({ item: 103, asesor: 'Otra Persona' }),
];

/** What an anonymous caller actually gets back: PUBLIC_KEYS only. */
const PUBLIC_ROWS = STAFF_ROWS.map(toPublicItem) as unknown as TreasureItem[];

describe('the bug, pinned', () => {
  it('local ownership resolution returns nothing once the projection has run', () => {
    // Not a hypothetical: `asesor` is a WITHHELD_KEY, so this is the exact
    // input every guest's browser holds.
    expect(getAsesorProducts(PUBLIC_ROWS, 'Álvaro Pelaéz')).toHaveLength(0);
    // …while staff, holding unprojected rows, resolve two pieces.
    expect(getAsesorProducts(STAFF_ROWS, 'Álvaro Pelaéz')).toHaveLength(2);
  });
});

describe('resolveAsesorProducts', () => {
  const server = { itemIds: [101, 102], availableItemIds: [101] };

  it('gives a guest their ambassador pieces from item numbers alone', () => {
    const resolved = resolveAsesorProducts([], PUBLIC_ROWS, server);
    expect(resolved.map((p) => p.item)).toEqual([101, 102]);
    expect(resolved.map((p) => p.effectiveEstado)).toEqual([
      'DISPONIBLE',
      'VENDIDA',
    ]);
  });

  it('never downgrades staff to the public projection', () => {
    // The regression that would matter most: staff asked the endpoint too
    // (a race, a cache miss), and got handed back price-less rows.
    const local = getAsesorProducts(STAFF_ROWS, 'Álvaro Pelaéz');
    const resolved = resolveAsesorProducts(local, PUBLIC_ROWS, server);
    expect(resolved).toBe(local);
    expect(resolved[0].precioCOP).toBe(10_000_000);
  });

  it('ignores item numbers absent from the catalog rather than emitting holes', () => {
    const resolved = resolveAsesorProducts([], PUBLIC_ROWS, {
      itemIds: [101, 999],
      availableItemIds: [101, 999],
    });
    expect(resolved.map((p) => p.item)).toEqual([101]);
  });

  it('returns nothing when neither source has an answer', () => {
    expect(resolveAsesorProducts([], PUBLIC_ROWS, null)).toEqual([]);
    expect(resolveAsesorProducts([], [], server)).toEqual([]);
  });

  it('carries no price into a guest row, because there was none to carry', () => {
    const resolved = resolveAsesorProducts([], PUBLIC_ROWS, server);
    for (const p of resolved) {
      expect(p.precioCOP).toBeUndefined();
      expect(p.asesor).toBeUndefined();
    }
  });
});

describe('the stats the header shows', () => {
  /** Mirrors AsesorProfilePage's `stats` memo. */
  function totalValueOf(products: TreasureItem[]): number | null {
    const priced = products.filter(
      (p) => typeof p.precioCOP === 'number' && p.precioCOP > 0,
    );
    return priced.length
      ? priced.reduce((sum, p) => sum + (p.precioCOP || 0), 0)
      : null;
  }

  it('is null for a guest, not zero', () => {
    // "$0" told visitors the collection was worthless. Absent is absent.
    const guest = resolveAsesorProducts([], PUBLIC_ROWS, {
      itemIds: [101],
      availableItemIds: [101],
    });
    expect(totalValueOf(guest)).toBeNull();
  });

  it('is a real total for staff', () => {
    const staff = getAsesorProducts(STAFF_ROWS, 'Álvaro Pelaéz');
    expect(totalValueOf(staff)).toBe(20_000_000);
  });
});
