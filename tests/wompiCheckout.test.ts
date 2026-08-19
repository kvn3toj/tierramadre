import { describe, it, expect } from 'vitest';
import {
  buildCheckoutUrl,
  fetchTransaction,
  WOMPI_APPROVED,
} from '../api/_lib/wompi';
import { buildIntegritySignature } from '../api/_lib/wompi-signature';

const CONFIG = {
  publicKey: 'pub_test_ABC',
  integritySecret: 'test_integrity_SECRET',
};

describe('buildCheckoutUrl', () => {
  it("points at Wompi's hosted checkout with COP and cents", () => {
    const url = new URL(
      buildCheckoutUrl(
        {
          reference: 'VB-0042',
          amountCOP: 2500000,
          redirectUrl: 'https://tierramadre.app/pedido-confirmado/VB-0042',
        },
        CONFIG,
      ),
    );
    expect(url.origin + url.pathname).toBe('https://checkout.wompi.co/p/');
    expect(url.searchParams.get('public-key')).toBe('pub_test_ABC');
    expect(url.searchParams.get('currency')).toBe('COP');
    expect(url.searchParams.get('amount-in-cents')).toBe('250000000');
    expect(url.searchParams.get('reference')).toBe('VB-0042');
    expect(url.searchParams.get('redirect-url')).toBe(
      'https://tierramadre.app/pedido-confirmado/VB-0042',
    );
  });

  it('signs the amount it actually sends', () => {
    const url = new URL(
      buildCheckoutUrl(
        {
          reference: 'VB-0042',
          amountCOP: 2500000,
          redirectUrl: 'https://x.co/ok',
        },
        CONFIG,
      ),
    );
    expect(url.searchParams.get('signature:integrity')).toBe(
      buildIntegritySignature(
        { reference: 'VB-0042', amountInCents: 250000000, currency: 'COP' },
        'test_integrity_SECRET',
      ),
    );
  });

  it('passes customer data through when provided', () => {
    const url = new URL(
      buildCheckoutUrl(
        {
          reference: 'VB-1',
          amountCOP: 1000,
          redirectUrl: 'https://x.co/ok',
          customer: {
            email: 'ana@example.com',
            fullName: 'Ana Ruiz',
            phoneNumber: '3001234567',
          },
        },
        CONFIG,
      ),
    );
    expect(url.searchParams.get('customer-data:email')).toBe('ana@example.com');
    expect(url.searchParams.get('customer-data:full-name')).toBe('Ana Ruiz');
    expect(url.searchParams.get('customer-data:phone-number')).toBe(
      '3001234567',
    );
  });

  it('omits customer-data keys entirely when absent', () => {
    const url = new URL(
      buildCheckoutUrl(
        { reference: 'VB-1', amountCOP: 1000, redirectUrl: 'https://x.co/ok' },
        CONFIG,
      ),
    );
    expect(url.searchParams.has('customer-data:email')).toBe(false);
  });

  it('rejects a non-integer amount rather than signing a rounded one', () => {
    expect(() =>
      buildCheckoutUrl(
        {
          reference: 'VB-1',
          amountCOP: 1000.5,
          redirectUrl: 'https://x.co/ok',
        },
        CONFIG,
      ),
    ).toThrow(/integer/i);
  });

  it('rejects a non-positive amount', () => {
    expect(() =>
      buildCheckoutUrl(
        { reference: 'VB-1', amountCOP: 0, redirectUrl: 'https://x.co/ok' },
        CONFIG,
      ),
    ).toThrow(/positive/i);
  });
});

describe('fetchTransaction', () => {
  const BODY = {
    data: {
      id: '1234-1699',
      status: 'APPROVED',
      reference: 'VB-0042',
      amount_in_cents: 250000000,
      currency: 'COP',
      payment_method_type: 'NEQUI',
    },
  };

  it("normalizes Wompi's snake_case response", async () => {
    const fake = async () => ({
      ok: true,
      status: 200,
      json: async () => BODY,
    });
    expect(
      await fetchTransaction(
        '1234-1699',
        'prv_test_X',
        'https://sandbox.wompi.co/v1',
        fake,
      ),
    ).toEqual({
      id: '1234-1699',
      status: 'APPROVED',
      reference: 'VB-0042',
      amountInCents: 250000000,
      currency: 'COP',
      paymentMethodType: 'NEQUI',
    });
  });

  it('calls the transactions endpoint with a bearer private key', async () => {
    let seenUrl = '';
    let seenAuth = '';
    const fake = async (url: string, init?: any) => {
      seenUrl = url;
      seenAuth = init?.headers?.Authorization ?? '';
      return { ok: true, status: 200, json: async () => BODY };
    };
    await fetchTransaction(
      '1234-1699',
      'prv_test_X',
      'https://sandbox.wompi.co/v1',
      fake,
    );
    expect(seenUrl).toBe('https://sandbox.wompi.co/v1/transactions/1234-1699');
    expect(seenAuth).toBe('Bearer prv_test_X');
  });

  it('throws on a non-ok response so the webhook can 500 and be retried', async () => {
    const fake = async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    });
    await expect(
      fetchTransaction(
        'nope',
        'prv_test_X',
        'https://sandbox.wompi.co/v1',
        fake,
      ),
    ).rejects.toThrow(/404/);
  });

  it('exports the approved sentinel Wompi actually uses', () => {
    expect(WOMPI_APPROVED).toBe('APPROVED');
  });
});
