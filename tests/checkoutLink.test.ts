import { describe, it, expect } from 'vitest';
import {
  resolveProvider,
  checkoutExpirationISO,
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
