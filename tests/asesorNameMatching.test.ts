/**
 * Ownership matching by name (2026-08-11).
 *
 * `normalizeName` used to keep only ASCII A-Za-z, which DELETED accented
 * letters rather than folding them: "Álvaro Pelaéz" → "LVAROPELAZ" but
 * "ALVARO PELAEZ" → "ALVAROPELAEZ". Both sheets that carry these names —
 * Inventario's `asesor` column and the Asesores roster — are hand-maintained,
 * so one being accented and the other not is a matter of who typed it. When
 * they disagreed the ambassador matched none of their own pieces and the
 * profile rendered empty, with nothing logged anywhere.
 *
 * Found while building /api/ambassador-products, whose whole job is to answer
 * "which pieces are this ambassador's" — an accent-fold miss there returns an
 * empty profile, which is the exact bug the endpoint exists to fix.
 */
import { describe, it, expect } from 'vitest';
import { normalizeName, matchesAsesorName } from '../src/utils/asesorNameUtils';

describe('normalizeName', () => {
  it('folds accents instead of deleting the letter', () => {
    expect(normalizeName('Álvaro Pelaéz')).toBe('ALVAROPELAEZ');
    expect(normalizeName('ALVARO PELAEZ')).toBe('ALVAROPELAEZ');
    expect(normalizeName('Muñoz')).toBe('MUNOZ');
    expect(normalizeName('Castañeda')).toBe('CASTANEDA');
  });

  it('still drops punctuation and whitespace', () => {
    expect(normalizeName('JM. Escobar')).toBe('JMESCOBAR');
    expect(normalizeName('  maría-josé  ')).toBe('MARIAJOSE');
  });

  it('handles an empty name', () => {
    expect(normalizeName('')).toBe('');
  });
});

describe('matchesAsesorName', () => {
  it('matches the same person written with and without accents', () => {
    // The regression that motivated the fix.
    expect(matchesAsesorName('Álvaro Pelaéz', 'ALVARO PELAEZ')).toBe(true);
    expect(matchesAsesorName('ALVARO PELAEZ', 'Álvaro Pelaéz')).toBe(true);
    expect(matchesAsesorName('Danilo Castañeda', 'Danilo Castaneda')).toBe(
      true,
    );
  });

  it('still matches abbreviated forms', () => {
    expect(matchesAsesorName('JM.Escobar', 'Juan Manuel Escobar Ramirez')).toBe(
      true,
    );
  });

  it('still matches an abbreviated form against an accented full name', () => {
    expect(matchesAsesorName('D.Castañeda', 'Danilo Castaneda')).toBe(true);
  });

  it('does not match different people', () => {
    expect(matchesAsesorName('Álvaro Pelaéz', 'Juan Manuel Escobar')).toBe(
      false,
    );
    expect(matchesAsesorName('', 'Álvaro Pelaéz')).toBe(false);
    expect(matchesAsesorName('Álvaro Pelaéz', '')).toBe(false);
  });

  it('does not match on a surname shorter than three letters', () => {
    expect(matchesAsesorName('A.Li', 'Ana Li Torres')).toBe(false);
  });
});
