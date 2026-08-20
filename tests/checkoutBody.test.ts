import { describe, it, expect } from 'vitest';
import { parseCheckoutBody } from '../api/_lib/checkoutBody';
import { MAX_ITEMS_POR_PEDIDO } from '../convex/_lib/reservas';

const validContact = {
  celular: '3001234567',
  full_name: 'Ana',
  email: 'a@b.com',
};

describe('parseCheckoutBody', () => {
  it('accepts the happy path', () => {
    const result = parseCheckoutBody({
      contact: validContact,
      items: [{ sku: 'C-090', qty: 1 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toEqual([{ sku: 'C-090', qty: 1 }]);
      expect(result.value.contact.celular).toBe('3001234567');
    }
  });

  it('rejects a non-numeric qty string ("x") instead of letting it become NaN', () => {
    const result = parseCheckoutBody({
      contact: validContact,
      items: [{ sku: 'C-090', qty: 'x' }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it('rejects qty: NaN', () => {
    const result = parseCheckoutBody({
      contact: validContact,
      items: [{ sku: 'C-090', qty: NaN }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects qty: Infinity', () => {
    const result = parseCheckoutBody({
      contact: validContact,
      items: [{ sku: 'C-090', qty: Infinity }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects qty: -1', () => {
    const result = parseCheckoutBody({
      contact: validContact,
      items: [{ sku: 'C-090', qty: -1 }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects qty: 0', () => {
    const result = parseCheckoutBody({
      contact: validContact,
      items: [{ sku: 'C-090', qty: 0 }],
    });
    expect(result.ok).toBe(false);
  });

  it('CRITICAL: rejects a huge items array with a poisoned qty, on length alone', () => {
    const items = Array.from({ length: 5000 }, (_, i) => ({
      sku: `C-${i}`,
      qty: i === 0 ? 'x' : 1,
    }));
    const result = parseCheckoutBody({ contact: validContact, items });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      // Rejected by the array-length cap, independent of any qty parsing —
      // this is the fix for the NaN-sum bypass (finding 1).
      expect(result.message).toContain(String(MAX_ITEMS_POR_PEDIDO));
    }
  });

  it('rejects items: [null] instead of throwing', () => {
    const result = parseCheckoutBody({
      contact: validContact,
      items: [null],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it('rejects items: []', () => {
    const result = parseCheckoutBody({ contact: validContact, items: [] });
    expect(result.ok).toBe(false);
  });

  it('rejects a missing celular', () => {
    const result = parseCheckoutBody({
      contact: { full_name: 'Ana' },
      items: [{ sku: 'C-090', qty: 1 }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a non-string full_name instead of forwarding it to Convex', () => {
    const result = parseCheckoutBody({
      contact: { celular: '3001234567', full_name: 5 },
      items: [{ sku: 'C-090', qty: 1 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it('accepts exactly MAX_ITEMS_POR_PEDIDO units', () => {
    const result = parseCheckoutBody({
      contact: validContact,
      items: [{ sku: 'C-090', qty: MAX_ITEMS_POR_PEDIDO }],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects one unit over MAX_ITEMS_POR_PEDIDO', () => {
    const result = parseCheckoutBody({
      contact: validContact,
      items: [{ sku: 'C-090', qty: MAX_ITEMS_POR_PEDIDO + 1 }],
    });
    expect(result.ok).toBe(false);
  });

  it('acepta un origen de vitrina', () => {
    const r = parseCheckoutBody({
      contact: { celular: '3001234567' },
      items: [{ sku: 'C-090', qty: 1 }],
      origen: { tipo: 'vitrina', token: 'AB3K9P' },
    });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.value.origen).toEqual({
        tipo: 'vitrina',
        token: 'AB3K9P',
      });
  });

  it('acepta la ausencia de origen — es el riel del bot', () => {
    const r = parseCheckoutBody({
      contact: { celular: '3001234567' },
      items: [{ sku: 'C-090', qty: 1 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.origen).toBeUndefined();
  });

  it('rechaza un tipo de origen desconocido', () => {
    const r = parseCheckoutBody({
      contact: { celular: '3001234567' },
      items: [{ sku: 'C-090', qty: 1 }],
      origen: { tipo: 'inventado', token: 'X' },
    });
    expect(r.ok).toBe(false);
  });

  it('rechaza un origen sin token utilizable', () => {
    for (const token of ['', '   ', 5, null, undefined]) {
      const r = parseCheckoutBody({
        contact: { celular: '3001234567' },
        items: [{ sku: 'C-090', qty: 1 }],
        origen: { tipo: 'vitrina', token },
      });
      expect(r.ok).toBe(false);
    }
  });

  it('rechaza un origen que no es objeto', () => {
    const r = parseCheckoutBody({
      contact: { celular: '3001234567' },
      items: [{ sku: 'C-090', qty: 1 }],
      origen: 'vitrina',
    });
    expect(r.ok).toBe(false);
  });
});
