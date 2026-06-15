import { describe, it, expect } from 'vitest';
import { normalizeCollection, formatCollectionName } from '../src/utils/formatting';

describe('normalizeCollection — duplicate collapsing', () => {
  it('strips the COLECCION prefix so prefixed/unprefixed variants match', () => {
    expect(normalizeCollection('COLECCION Fenix')).toBe(normalizeCollection('Fenix'));
    expect(normalizeCollection('Colección Madres')).toBe(normalizeCollection('Madres'));
  });

  it('is accent- and case-insensitive (Dinastias === Dinastías)', () => {
    expect(normalizeCollection('Dinastias')).toBe(normalizeCollection('Dinastías'));
    expect(normalizeCollection('Círculos de PODER')).toBe(normalizeCollection('Circulos de PODER'));
    expect(normalizeCollection('REINAS')).toBe(normalizeCollection('reinas'));
  });

  it('collapses surrounding and inner whitespace', () => {
    expect(normalizeCollection('  #4000 ')).toBe(normalizeCollection('#4000'));
    expect(normalizeCollection('Secretos  del   Bosque')).toBe(normalizeCollection('Secretos del Bosque'));
  });

  it('keeps genuinely different spellings distinct (typos are not merged)', () => {
    // "Motaña" (typo) vs "Montaña" must remain two separate collections.
    expect(normalizeCollection('TOPITOS Mariposas de la Motaña'))
      .not.toBe(normalizeCollection('TOPITOS Mariposas de la Montaña'));
  });

  it('handles null/undefined safely', () => {
    expect(normalizeCollection(undefined)).toBe('');
    expect(normalizeCollection(null)).toBe('');
    expect(normalizeCollection('')).toBe('');
  });

  it('formatCollectionName still produces a human label for display', () => {
    expect(formatCollectionName('COLECCION Madres')).toBe('Madres');
  });
});
