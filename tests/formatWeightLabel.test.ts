import { describe, it, expect } from 'vitest';
import {
  formatWeightLabel,
  getColorDot,
  UNCLASSIFIED_COLOR_DOT,
} from '../src/utils/formatting';

describe('formatWeightLabel', () => {
  describe('the 0.00 ct bug it exists to kill', () => {
    it('returns empty for a zero weight instead of "0.00 ct"', () => {
      expect(formatWeightLabel({ peso: 0 })).toBe('');
    });

    it('honours a caller-supplied fallback for a zero weight', () => {
      expect(formatWeightLabel({ peso: 0 }, { fallback: '—' })).toBe('—');
    });

    it('returns empty for a negative weight', () => {
      expect(formatWeightLabel({ peso: -1 })).toBe('');
    });

    it('returns empty for NaN', () => {
      expect(formatWeightLabel({ peso: NaN })).toBe('');
    });

    it('returns empty when peso is absent (optional on ReceiptProduct)', () => {
      expect(formatWeightLabel({})).toBe('');
    });
  });

  describe('gems', () => {
    it('formats a real carat weight to two decimals', () => {
      expect(formatWeightLabel({ peso: 4.2 })).toBe('4.20 ct');
    });

    it('parses a comma decimal, matching formatCarats', () => {
      expect(formatWeightLabel({ peso: '2,63' })).toBe('2.63 ct');
    });
  });

  describe('jewelry', () => {
    it('prefers the metal name by default', () => {
      expect(
        formatWeightLabel({ peso: 1.5, isJewelry: true, metalType: 'Oro 18k' }),
      ).toBe('Oro 18k');
    });

    it('falls back to carats when a joya has no metal recorded', () => {
      expect(formatWeightLabel({ peso: 1.5, isJewelry: true })).toBe('1.50 ct');
    });

    it("'metal-only' shows nothing rather than inventing a carat weight", () => {
      // Guards the catalog card: some Fotosíntesis joyería carries a
      // numeric peso with no metalType, and has never shown a weight.
      expect(
        formatWeightLabel(
          { peso: 1.5, isJewelry: true },
          { jewelryPrefers: 'metal-only' },
        ),
      ).toBe('');
    });

    it("'metal-only' still shows the metal when recorded", () => {
      expect(
        formatWeightLabel(
          { peso: 1.5, isJewelry: true, metalType: 'Plata' },
          { jewelryPrefers: 'metal-only' },
        ),
      ).toBe('Plata');
    });

    it('ignores a whitespace-only metalType', () => {
      expect(
        formatWeightLabel({ peso: 1.5, isJewelry: true, metalType: '   ' }),
      ).toBe('1.50 ct');
    });

    it('does not treat metalType as a weight for a non-jewelry item', () => {
      expect(formatWeightLabel({ peso: 0, metalType: 'Plata' })).toBe('');
    });
  });

  describe("jewelryPrefers: 'carats' — gem-weight-only columns", () => {
    it('returns the carat weight, never the metal', () => {
      expect(
        formatWeightLabel(
          { peso: 1.5, isJewelry: true, metalType: 'Oro 18k' },
          { jewelryPrefers: 'carats' },
        ),
      ).toBe('1.50 ct');
    });

    it('returns empty rather than the metal name when peso coerced to 0', () => {
      // The ingestion layer runs parseDecimal('Plata') -> 0, so a naive
      // fallback here would render "Gema (Ct): Plata".
      expect(
        formatWeightLabel(
          { peso: 'Plata', isJewelry: true, metalType: 'Plata' },
          { jewelryPrefers: 'carats' },
        ),
      ).toBe('');
    });
  });
});

describe('getColorDot', () => {
  it('resolves a known colour', () => {
    expect(getColorDot('Verde Muzo')).toBe('#065F46');
  });

  it('is insensitive to case, accents and extra whitespace', () => {
    const expected = getColorDot('Verde Limón');
    expect(expected).not.toBe(UNCLASSIFIED_COLOR_DOT);
    for (const variant of ['verde limon', 'VERDE LIMÓN', '  Verde  Limon  ']) {
      expect(getColorDot(variant)).toBe(expected);
    }
  });

  it('returns the neutral swatch for values that are not colours', () => {
    // Chivor is a mine, Cristal/Intenso are quality modifiers. Neutral is
    // the honest answer until they move to their proper facets.
    for (const notAColour of ['Chivor', 'Cristal', 'Intenso', '', '   ']) {
      expect(getColorDot(notAColour)).toBe(UNCLASSIFIED_COLOR_DOT);
    }
  });
});
