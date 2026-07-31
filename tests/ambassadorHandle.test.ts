/**
 * Handle rules are shared by the profile edit form and the subdomain
 * resolver, and a disagreement between them is a broken public URL — so
 * the rules get tested directly rather than through either consumer.
 */

import { describe, it, expect } from 'vitest';
import {
  HANDLE_MAX_LENGTH,
  normalizeHandle,
  recommendHandle,
  validateHandle,
} from '../src/utils/ambassadorHandle';

describe('normalizeHandle', () => {
  it('strips Spanish diacritics rather than dropping the letter', () => {
    expect(normalizeHandle('Andrés')).toBe('andres');
    // ñ decomposes to n + combining tilde, so it survives as `n` — the same
    // way the existing slug generator in api/get-asesores.ts treats it.
    expect(normalizeHandle('Muñoz')).toBe('munoz');
  });

  it('collapses separators instead of emitting doubled dashes', () => {
    expect(normalizeHandle('Andres   Mauricio')).toBe('andres-mauricio');
    expect(normalizeHandle('andres..mauricio')).toBe('andres-mauricio');
  });

  it('never returns a leading or trailing dash', () => {
    expect(normalizeHandle('  andres  ')).toBe('andres');
    expect(normalizeHandle('!andres!')).toBe('andres');
  });

  it('truncates without leaving a trailing dash at the cut point', () => {
    const long = normalizeHandle('a'.repeat(28) + ' bcd');
    expect(long.length).toBeLessThanOrEqual(HANDLE_MAX_LENGTH);
    expect(long.endsWith('-')).toBe(false);
  });

  it('is idempotent — normalizing twice changes nothing', () => {
    const once = normalizeHandle('Andrés Mauricio Escobar');
    expect(normalizeHandle(once)).toBe(once);
  });

  it('handles empty input', () => {
    expect(normalizeHandle('')).toBe('');
    expect(normalizeHandle(null)).toBe('');
    expect(normalizeHandle(undefined)).toBe('');
  });
});

describe('recommendHandle', () => {
  it('prefers the first name', () => {
    expect(recommendHandle('Andres Mauricio Escobar Ramirez')).toBe('andres');
  });

  it('falls forward when the first name is too short', () => {
    // "ana" is exactly the minimum, so use a genuinely short one.
    expect(recommendHandle('Jo Ramirez')).toBe('jo-ramirez');
  });

  it('falls forward when the first name is reserved', () => {
    // "admin" is on the reserved list, so it must not be offered.
    expect(recommendHandle('Admin Perez')).toBe('admin-perez');
  });

  it('returns something valid for a normal name', () => {
    expect(validateHandle(recommendHandle('Laura Gomez')).valid).toBe(true);
  });

  it('returns empty for an empty name rather than inventing one', () => {
    expect(recommendHandle('')).toBe('');
  });
});

describe('validateHandle', () => {
  it('accepts a plain handle', () => {
    expect(validateHandle('andres')).toEqual({ valid: true });
  });

  it('rejects reserved subdomains', () => {
    for (const reserved of ['www', 'api', 'admin', 'ambassadors', 'ceo']) {
      expect(validateHandle(reserved)).toEqual({
        valid: false,
        reason: 'reserved',
      });
    }
  });

  it('rejects characters that are illegal in a DNS label', () => {
    expect(validateHandle('andres.perez').reason).toBe('invalid-chars');
    expect(validateHandle('andres_perez').reason).toBe('invalid-chars');
    expect(validateHandle('André').reason).toBe('invalid-chars');
  });

  it('rejects edge dashes, which DNS forbids', () => {
    expect(validateHandle('-andres').reason).toBe('edge-dash');
    expect(validateHandle('andres-').reason).toBe('edge-dash');
  });

  it('enforces length bounds', () => {
    expect(validateHandle('ab').reason).toBe('too-short');
    expect(validateHandle('a'.repeat(HANDLE_MAX_LENGTH + 1)).reason).toBe(
      'too-long',
    );
    expect(validateHandle('').reason).toBe('empty');
  });

  it('accepts anything normalizeHandle produces from a real name', () => {
    const cases = [
      'Andrés Mauricio Escobar Ramirez',
      'Laura Gómez',
      'Juan Pablo',
    ];
    for (const name of cases) {
      expect(validateHandle(normalizeHandle(name)).valid).toBe(true);
    }
  });
});
