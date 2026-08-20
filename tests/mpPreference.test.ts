import { describe, it, expect, vi } from 'vitest';
import {
  buildPreference,
  createPreference,
  fetchPayment,
} from '../api/_lib/mp-preference';

describe('buildPreference', () => {
  it('sets external_reference, notification_url, and COP currency', () => {
    const body = buildPreference({
      items: [{ title: 'Anillo Aurora', quantity: 1, unit_price: 1_450_000 }],
      payer: { name: 'Ana', email: 'ana@b.co' },
      orderId: 'VB-0007',
      notificationUrl: 'https://tierramadre.co/api/mp-webhook',
    });
    expect(body.external_reference).toBe('VB-0007');
    expect(body.notification_url).toBe('https://tierramadre.co/api/mp-webhook');
    expect((body.items as any[])[0].currency_id).toBe('COP');
    expect(body.auto_return).toBe('approved');
  });

  it('omits expires and expiration_date_to when expirationTime is not given', () => {
    const body = buildPreference({
      items: [{ title: 'Anillo Aurora', quantity: 1, unit_price: 1_450_000 }],
      orderId: 'VB-0007',
      notificationUrl: 'https://tierramadre.co/api/mp-webhook',
    });
    expect('expires' in body).toBe(false);
    expect('expiration_date_to' in body).toBe(false);
  });

  it('sets expires and expiration_date_to when expirationTime is given', () => {
    const body = buildPreference({
      items: [{ title: 'Anillo Aurora', quantity: 1, unit_price: 1_450_000 }],
      orderId: 'VB-0007',
      notificationUrl: 'https://tierramadre.co/api/mp-webhook',
      expirationTime: '2026-08-19T12:30:00.000Z',
    });
    expect(body.expires).toBe(true);
    expect(body.expiration_date_to).toBe('2026-08-19T12:30:00.000Z');
  });
});

describe('createPreference', () => {
  it('POSTs to MP and returns id + init_point', async () => {
    const f = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 'pref-1', init_point: 'https://mp/checkout?x' }),
    }));
    const out = await createPreference(
      { items: [] },
      'APP_USR-token',
      f as any,
    );
    expect(out).toEqual({ id: 'pref-1', init_point: 'https://mp/checkout?x' });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://api.mercadopago.com/checkout/preferences');
    expect(init.headers.Authorization).toBe('Bearer APP_USR-token');
  });
});

describe('fetchPayment', () => {
  it('GETs /v1/payments/{id} and normalizes the payment fields', async () => {
    const f = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 12345,
        status: 'approved',
        status_detail: 'accredited',
        external_reference: 'VB-0007',
        transaction_amount: 1_450_000,
        currency_id: 'COP',
      }),
    }));
    const p = await fetchPayment('12345', 'APP_USR-token', f as any);
    expect(p).toEqual({
      id: '12345',
      status: 'approved',
      statusDetail: 'accredited',
      externalReference: 'VB-0007',
      transactionAmount: 1_450_000,
      currencyId: 'COP',
    });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://api.mercadopago.com/v1/payments/12345');
    expect(init.method).toBe('GET');
  });

  it('throws on a non-ok MP response (so the webhook returns 500 → MP retries)', async () => {
    const f = vi.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    }));
    await expect(fetchPayment('x', 't', f as any)).rejects.toThrow(/404/);
  });
});
