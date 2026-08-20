import { describe, it, expect } from 'vitest';
import {
  RESERVA_TTL_MS,
  MAX_ITEMS_POR_PEDIDO,
  reservedItemIds,
  orderFingerprint,
  findReusableSale,
} from '../convex/_lib/reservas';

const NOW = Date.parse('2026-08-19T12:00:00.000Z');

const sale = (
  clientId: string,
  itemIds: string[],
  msAgo: number,
  estado = 'reservada',
): {
  clientId: string;
  itemIds: string[];
  creationTime: number;
  estado: string;
} => ({
  clientId,
  itemIds,
  creationTime: NOW - msAgo,
  estado,
});

describe('constants', () => {
  it('holds a stone for 30 minutes', () => {
    expect(RESERVA_TTL_MS).toBe(30 * 60 * 1000);
  });

  it('caps an order at 10 items', () => {
    expect(MAX_ITEMS_POR_PEDIDO).toBe(10);
  });
});

describe('reservedItemIds', () => {
  it('holds items from a sale inside the TTL', () => {
    const held = reservedItemIds([sale('c1', ['C-090', 'C-091'], 60_000)], NOW);
    expect(held).toEqual(new Set(['C-090', 'C-091']));
  });

  it('does NOT hold items from a sale older than the TTL', () => {
    const held = reservedItemIds(
      [sale('c1', ['C-090'], RESERVA_TTL_MS + 1)],
      NOW,
    );
    expect(held.size).toBe(0);
  });

  it('still holds a sale exactly at the TTL boundary', () => {
    const held = reservedItemIds([sale('c1', ['C-090'], RESERVA_TTL_MS)], NOW);
    expect(held).toEqual(new Set(['C-090']));
  });

  it('unions items across several pending sales', () => {
    const held = reservedItemIds(
      [sale('c1', ['C-090'], 1000), sale('c2', ['C-091'], 2000)],
      NOW,
    );
    expect(held).toEqual(new Set(['C-090', 'C-091']));
  });

  it('returns an empty set for no sales', () => {
    expect(reservedItemIds([], NOW).size).toBe(0);
  });

  it('does NOT hold items from a confirmada sale', () => {
    const held = reservedItemIds(
      [sale('c1', ['C-090'], 1000, 'confirmada')],
      NOW,
    );
    expect(held.size).toBe(0);
  });

  it('does NOT hold items from a cancelada sale', () => {
    const held = reservedItemIds(
      [sale('c1', ['C-090'], 1000, 'cancelada')],
      NOW,
    );
    expect(held.size).toBe(0);
  });
});

describe('orderFingerprint', () => {
  it('is order-independent', () => {
    expect(orderFingerprint(['b', 'a'])).toBe(orderFingerprint(['a', 'b']));
  });

  it('distinguishes different item sets', () => {
    expect(orderFingerprint(['a'])).not.toBe(orderFingerprint(['a', 'b']));
  });

  it('does not mutate its input', () => {
    const items = ['b', 'a'];
    orderFingerprint(items);
    expect(items).toEqual(['b', 'a']);
  });
});

describe('findReusableSale', () => {
  it('reuses the same client ordering the same items (double-clicked Pagar)', () => {
    const existing = sale('c1', ['C-090', 'C-091'], 5000);
    expect(findReusableSale([existing], 'c1', ['C-091', 'C-090'], NOW)).toBe(
      existing,
    );
  });

  it('does NOT reuse another client with the same items', () => {
    expect(
      findReusableSale([sale('c2', ['C-090'], 5000)], 'c1', ['C-090'], NOW),
    ).toBeNull();
  });

  it('does NOT reuse the same client with a different item set', () => {
    expect(
      findReusableSale([sale('c1', ['C-090'], 5000)], 'c1', ['C-091'], NOW),
    ).toBeNull();
  });

  it('reuses a sale exactly at the TTL boundary', () => {
    const existing = sale('c1', ['C-090'], RESERVA_TTL_MS);
    expect(findReusableSale([existing], 'c1', ['C-090'], NOW)).toBe(existing);
  });

  it('does NOT reuse a sale older than the TTL', () => {
    expect(
      findReusableSale(
        [sale('c1', ['C-090'], RESERVA_TTL_MS + 1)],
        'c1',
        ['C-090'],
        NOW,
      ),
    ).toBeNull();
  });
});
