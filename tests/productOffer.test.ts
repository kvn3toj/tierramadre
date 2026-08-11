/**
 * "Can this be bought, and from whom?" (2026-08-11)
 *
 * `estado` was answering two different questions at once, in five places.
 * These tests pin the three cases that were wrong, and the one invariant that
 * must survive the refactor.
 */
import { describe, it, expect } from 'vitest';
import {
  getOffer,
  isPurchasable,
  buildResaleIndex,
  type ResaleOffer,
} from '../src/utils/productOffer';
import type { TreasureItem } from '../src/types';

function item(overrides: Partial<TreasureItem>): TreasureItem {
  return {
    item: 101,
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
    estado: 'DISPONIBLE',
    ...overrides,
  } as TreasureItem;
}

const OFFER: ResaleOffer = {
  itemId: 101,
  asesorSlug: 'alvaro-pelaez',
  asesorName: 'Álvaro Pelaéz',
  priceCOP: 25_000_000,
};

describe('house stock', () => {
  it('DISPONIBLE is ours to sell', () => {
    const offer = getOffer(item({ estado: 'DISPONIBLE' }));
    expect(offer).toMatchObject({ purchasable: true, seller: 'tm' });
  });

  it('CONSIGNACION is ALSO ours to sell', () => {
    // The bug: TM owns consigned stock outright — an ambassador is just
    // holding it. The "available" filter dropped it for staff, hiding real
    // sellable inventory behind a logistics detail.
    const offer = getOffer(item({ estado: 'CONSIGNACION' }));
    expect(offer).toMatchObject({ purchasable: true, seller: 'tm' });
  });

  it('VENDIDA and ASESOR are not, on their own', () => {
    expect(isPurchasable(item({ estado: 'VENDIDA' }))).toBe(false);
    expect(isPurchasable(item({ estado: 'ASESOR' }))).toBe(false);
  });
});

describe('the withheld-field invariant', () => {
  it('treats an absent estado as unknown, never as unavailable', () => {
    // `estado` is a WITHHELD_KEY, so guests never receive it. Reading absent
    // as "not available" is exactly what once reported "0 tesoros
    // disponibles" to every guest and what emptied the ambassador profile.
    for (const estado of [undefined, '', null]) {
      const offer = getOffer(item({ estado } as Partial<TreasureItem>));
      expect(offer.purchasable).toBe(true);
      expect(offer.seller).toBe('unknown');
    }
  });
});

describe('ambassador resale', () => {
  it('an opt-in makes a sold piece purchasable again', () => {
    // The books still say VENDIDA. The owner says "I will sell it". Both are
    // true, which is the whole reason offer and ownership are separate.
    const offer = getOffer(item({ estado: 'VENDIDA' }), OFFER);
    expect(offer.purchasable).toBe(true);
    expect(offer.seller).toBe('ambassador');
    expect(offer.resale?.asesorName).toBe('Álvaro Pelaéz');
  });

  it("uses the ambassador's price when they set one", () => {
    expect(getOffer(item({ estado: 'ASESOR' }), OFFER).priceCOP).toBe(
      25_000_000,
    );
  });

  it('falls back to the house price when they did not', () => {
    const noPrice = { ...OFFER, priceCOP: undefined };
    expect(getOffer(item({ estado: 'ASESOR' }), noPrice).priceCOP).toBe(
      10_000_000,
    );
  });

  it('NEVER infers resale from ownership alone', () => {
    // The piece an ambassador bought for their wife. Owned, sold, and not
    // for sale — inferring an offer here would list it publicly.
    const offer = getOffer(
      item({ estado: 'ASESOR', asesorActual: 'Álvaro Pelaéz' }),
    );
    expect(offer.purchasable).toBe(false);
    expect(offer.seller).not.toBe('ambassador');
  });

  it('does not leak the owner for pieces with no offer', () => {
    const offer = getOffer(
      item({ estado: 'ASESOR', asesorActual: 'Álvaro Pelaéz' }),
    );
    expect(offer.resale).toBeUndefined();
    expect(JSON.stringify(offer)).not.toContain('Álvaro');
  });
});

describe('buildResaleIndex', () => {
  it('keys offers by item number', () => {
    const index = buildResaleIndex([OFFER]);
    expect(index.get(101)?.asesorSlug).toBe('alvaro-pelaez');
    expect(index.get(999)).toBeUndefined();
  });

  it('is empty for an empty list, so every lookup is a miss', () => {
    expect(buildResaleIndex([]).size).toBe(0);
  });
});
