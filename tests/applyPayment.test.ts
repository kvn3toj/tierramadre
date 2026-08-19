import { describe, it, expect } from 'vitest';
import { applyPaymentToSale } from '../convex/_lib/applyPayment';

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
