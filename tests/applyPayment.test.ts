import { describe, it, expect } from 'vitest';
import {
  applyPaymentToSale,
  isPaymentProvider,
  amountsMatch,
} from '../convex/_lib/applyPayment';

const NOW = '2026-05-28T12:00:00.000Z';

const MP_OK = {
  provider: 'mercadopago' as const,
  id: 'mp-999',
  status: 'approved',
  approved: true,
};
const WOMPI_OK = {
  provider: 'wompi' as const,
  id: '1234-1699',
  status: 'APPROVED',
  approved: true,
};

describe('applyPaymentToSale', () => {
  it('flips a reservada sale to confirmada on an approved MP payment', () => {
    const r = applyPaymentToSale({ estado: 'reservada' }, MP_OK, NOW);
    expect(r.changed).toBe(true);
    if (r.changed) {
      expect(r.patch).toEqual({
        estado: 'confirmada',
        paidAt: NOW,
        paymentProvider: 'mercadopago',
        providerTxId: 'mp-999',
        providerStatus: 'approved',
        mpPaymentId: 'mp-999',
        mpStatus: 'approved',
      });
    }
  });

  it('flips a reservada sale to confirmada on an approved Wompi transaction', () => {
    const r = applyPaymentToSale({ estado: 'reservada' }, WOMPI_OK, NOW);
    expect(r.changed).toBe(true);
    if (r.changed) {
      expect(r.patch).toEqual({
        estado: 'confirmada',
        paidAt: NOW,
        paymentProvider: 'wompi',
        providerTxId: '1234-1699',
        providerStatus: 'APPROVED',
      });
    }
  });

  it('does NOT write mp* fields for a non-MercadoPago payment', () => {
    const r = applyPaymentToSale({ estado: 'reservada' }, WOMPI_OK, NOW);
    if (r.changed) {
      expect(r.patch).not.toHaveProperty('mpPaymentId');
      expect(r.patch).not.toHaveProperty('mpStatus');
    }
  });

  it('is idempotent: an already-confirmada sale does not change (replay guard)', () => {
    expect(applyPaymentToSale({ estado: 'confirmada' }, WOMPI_OK, NOW)).toEqual(
      { changed: false, reason: 'already-paid' },
    );
  });

  it('never revives a cancelada sale from a late webhook', () => {
    expect(applyPaymentToSale({ estado: 'cancelada' }, WOMPI_OK, NOW)).toEqual({
      changed: false,
      reason: 'cancelled',
    });
  });

  it("ignores a non-approved payment, whatever the provider's wording", () => {
    expect(
      applyPaymentToSale(
        { estado: 'reservada' },
        {
          provider: 'mercadopago',
          id: 'mp-1',
          status: 'pending',
          approved: false,
        },
        NOW,
      ),
    ).toEqual({ changed: false, reason: 'not-approved' });
    expect(
      applyPaymentToSale(
        { estado: 'reservada' },
        { provider: 'wompi', id: 'w-1', status: 'DECLINED', approved: false },
        NOW,
      ),
    ).toEqual({ changed: false, reason: 'not-approved' });
    expect(
      applyPaymentToSale(
        { estado: 'reservada' },
        { provider: 'wompi', id: 'w-1', status: 'VOIDED', approved: false },
        NOW,
      ),
    ).toEqual({ changed: false, reason: 'not-approved' });
  });
});

describe('isPaymentProvider', () => {
  it('accepts the three known rails', () => {
    expect(isPaymentProvider('mercadopago')).toBe(true);
    expect(isPaymentProvider('wompi')).toBe(true);
    expect(isPaymentProvider('breb-manual')).toBe(true);
  });

  it('rejects an unknown or malformed value instead of trusting it', () => {
    expect(isPaymentProvider('wompy')).toBe(false); // typo
    expect(isPaymentProvider('')).toBe(false);
    expect(isPaymentProvider(undefined)).toBe(false);
    expect(isPaymentProvider(null)).toBe(false);
    expect(isPaymentProvider(123)).toBe(false);
  });
});

describe('amountsMatch', () => {
  it('passes when the received amount and currency match the expected total, in cents', () => {
    expect(amountsMatch(50000, 5000000, 'COP')).toBe(true);
  });

  it('fails when the received amount diverges from the expected total', () => {
    expect(amountsMatch(50000, 4999900, 'COP')).toBe(false);
    expect(amountsMatch(50000, 5000100, 'COP')).toBe(false);
  });

  it('fails on any currency other than COP', () => {
    expect(amountsMatch(50000, 5000000, 'USD')).toBe(false);
    expect(amountsMatch(50000, 5000000, undefined)).toBe(false);
  });

  it('skips the check (passes) when the caller sends neither amount nor currency', () => {
    // The live mp-webhook.ts rail does not send these yet — omitting both
    // must not change its behavior.
    expect(amountsMatch(50000, undefined, undefined)).toBe(true);
  });
});
