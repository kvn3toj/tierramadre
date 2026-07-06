import { describe, it, expect } from 'vitest';
import { parsePresupuestoCOP, parsePriceTier } from '../api/_lib/parseBudget';

describe('parsePresupuestoCOP', () => {
  it('passes a real positive number through', () => {
    expect(parsePresupuestoCOP(3_000_000)).toBe(3_000_000);
  });

  it('parses a plain numeric string', () => {
    expect(parsePresupuestoCOP('3000000')).toBe(3_000_000);
  });

  it('parses a dot/comma-grouped amount ("3.000.000", "$3,000,000 COP")', () => {
    expect(parsePresupuestoCOP('3.000.000')).toBe(3_000_000);
    expect(parsePresupuestoCOP('$3,000,000 COP')).toBe(3_000_000);
  });

  it('parses Colombian "millones" phrasing (the exact incident input)', () => {
    expect(parsePresupuestoCOP('3 millones')).toBe(3_000_000);
    expect(parsePresupuestoCOP('3 millones de pesos')).toBe(3_000_000);
    expect(parsePresupuestoCOP('un poco menos de 3 millones')).toBe(3_000_000);
  });

  it('parses fractional millions with either decimal separator', () => {
    expect(parsePresupuestoCOP('3,5 millones')).toBe(3_500_000);
    expect(parsePresupuestoCOP('3.5 millones')).toBe(3_500_000);
  });

  it('parses the "M" abbreviation', () => {
    expect(parsePresupuestoCOP('3M')).toBe(3_000_000);
    expect(parsePresupuestoCOP('3 m')).toBe(3_000_000);
  });

  it('returns undefined for empty / missing / non-usable input (never 0)', () => {
    // This is the failure that surfaced 611M–930M pieces: an empty merge tag.
    expect(parsePresupuestoCOP('')).toBeUndefined();
    expect(parsePresupuestoCOP('   ')).toBeUndefined();
    expect(parsePresupuestoCOP(undefined)).toBeUndefined();
    expect(parsePresupuestoCOP(null)).toBeUndefined();
    expect(parsePresupuestoCOP('no sé')).toBeUndefined();
    expect(parsePresupuestoCOP(0)).toBeUndefined();
    expect(parsePresupuestoCOP(-5)).toBeUndefined();
  });
});

describe('parsePriceTier', () => {
  it('detects "moderado" (the exact incident input) and its synonyms', () => {
    expect(parsePriceTier('precio moderado')).toBe('moderado');
    expect(parsePriceTier('opción precio moderado')).toBe('moderado');
    expect(parsePriceTier('algo intermedio')).toBe('moderado');
    expect(parsePriceTier('un precio razonable')).toBe('moderado');
    expect(parsePriceTier('rango medio')).toBe('moderado');
  });

  it('detects "economico" (accent-insensitive) and its synonyms', () => {
    expect(parsePriceTier('económico')).toBe('economico');
    expect(parsePriceTier('economico')).toBe('economico');
    expect(parsePriceTier('algo barato')).toBe('economico');
    expect(parsePriceTier('presupuesto bajo')).toBe('economico');
    expect(parsePriceTier('lo más accesible')).toBe('economico');
  });

  it('detects "alto" and premium phrasing', () => {
    expect(parsePriceTier('gama alta')).toBe('alto');
    expect(parsePriceTier('lo más exclusivo')).toBe('alto');
    expect(parsePriceTier('premium')).toBe('alto');
    expect(parsePriceTier('quiero lujo')).toBe('alto');
  });

  it('prefers the high tier when a phrase mixes signals', () => {
    // "gama alta" is the strongest signal even if the sentence continues.
    expect(parsePriceTier('gama alta pero no tan cara')).toBe('alto');
  });

  it('returns undefined when there is no qualitative signal', () => {
    expect(parsePriceTier('')).toBeUndefined();
    expect(parsePriceTier('   ')).toBeUndefined();
    expect(parsePriceTier(undefined)).toBeUndefined();
    expect(parsePriceTier(null)).toBeUndefined();
    expect(parsePriceTier('3 millones')).toBeUndefined();
    expect(parsePriceTier('un anillo de compromiso')).toBeUndefined();
  });
});
