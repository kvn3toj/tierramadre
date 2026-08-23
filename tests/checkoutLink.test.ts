import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveProvider,
  checkoutExpirationISO,
  buildPaymentLink,
} from '../api/_lib/checkoutLink';
import { RESERVA_TTL_MS } from '../convex/_lib/reservas';

const NOW = Date.parse('2026-08-19T12:00:00.000Z');

describe('resolveProvider', () => {
  it('defaults to mercadopago when unset', () => {
    expect(resolveProvider(undefined)).toBe('mercadopago');
  });

  it('accepts wompi', () => {
    expect(resolveProvider('wompi')).toBe('wompi');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(resolveProvider('  WOMPI ')).toBe('wompi');
  });

  it('falls back to mercadopago on an unknown value', () => {
    expect(resolveProvider('wompy')).toBe('mercadopago');
  });
});

describe('checkoutExpirationISO', () => {
  it('expires exactly one reservation TTL from now', () => {
    expect(checkoutExpirationISO(NOW)).toBe(
      new Date(NOW + RESERVA_TTL_MS).toISOString(),
    );
  });

  it('matches the 30-minute hold', () => {
    expect(checkoutExpirationISO(NOW)).toBe('2026-08-19T12:30:00.000Z');
  });
});

describe('buildPaymentLink — reused-order expiry anchors on the hold start, not "now"', () => {
  // A double-clicked "Pagar" gets `now: order.reservedAt` from the API
  // handlers (the ORIGINAL sale's creation instant), never `Date.now()` —
  // otherwise the link would outlive the 30-min hold it's supposed to die
  // with (see `api/checkout-create-order.ts` / `api/ghl-create-order.ts`).
  // `buildPaymentLink` itself is the seam: it must honor whatever `now` it's
  // handed rather than recomputing from the wall clock.
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.WOMPI_PUBLIC_KEY = 'pub_test_x';
    process.env.WOMPI_INTEGRITY_SECRET = 'secret_x';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('embeds an expiration derived from the passed `now`, not the current instant', async () => {
    const holdStart = NOW; // T+0 — when the original sale was created
    const clickInstant = NOW + 29 * 60 * 1000; // T+29 — the double-click

    const link = await buildPaymentLink(
      {
        saleId: 'VB-0007',
        totalCOP: 1_000_000,
        appUrl: 'https://tierramadre.app',
        contact: {},
        now: holdStart, // the fix: caller passes the hold's start, not Date.now()
      },
      'wompi',
    );

    expect(link.checkoutUrl).toBeTruthy();
    const params = new URL(link.checkoutUrl!).searchParams;
    expect(params.get('expiration-time')).toBe(
      checkoutExpirationISO(holdStart),
    );
    // The bug this guards against: had the caller passed `clickInstant`
    // (≈ Date.now() at the moment of the double-click) instead, the link
    // would outlive the hold — expiring 30 min after the click, not 30 min
    // after the reservation actually started.
    expect(params.get('expiration-time')).not.toBe(
      checkoutExpirationISO(clickInstant),
    );
  });
});
