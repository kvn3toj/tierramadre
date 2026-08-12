import { describe, it, expect } from 'vitest';
import { formatMedidas } from './medidas';

describe('formatMedidas', () => {
  it('renders the real value from medidasValores when medidas is a format label', () => {
    // The 191-item legacy shape: the "Medidas" row used to print "Largo x Ancho".
    expect(
      formatMedidas({
        medidas: 'Largo x Ancho',
        medidasValores: '7.0 × 9.1 × 3.8 mm',
      }),
    ).toBe('7.0 × 9.1 × 3.8 mm');
  });

  it('treats Diámetro as a label too, not a measurement', () => {
    expect(
      formatMedidas({ medidas: 'Diámetro', medidasValores: '5.2 mm' }),
    ).toBe('5.2 mm');
  });

  it('prefers a Fotosíntesis-edited medidas over a stale legacy medidasValores', () => {
    // Item #350: the edit form wrote 6.9×9×3.8; medidasValores still held the
    // older 7.0 × 9.1 × 3.8. The fresher edit must win.
    expect(
      formatMedidas({
        medidas: '6.9×9×3.8 mm',
        medidasValores: '7.0 × 9.1 × 3.8 mm',
      }),
    ).toBe('6.9×9×3.8 mm');
  });

  it('appends mm only to a bare numeric value', () => {
    expect(formatMedidas({ medidas: '', medidasValores: '6.9 x 9' })).toBe(
      '6.9 x 9 mm',
    );
  });

  it('leaves an already-united value untouched', () => {
    expect(formatMedidas({ medidas: '6.9×9×3.8 mm' })).toBe('6.9×9×3.8 mm');
  });

  it('returns undefined when there is no measurement, so the row is dropped', () => {
    expect(formatMedidas({ medidas: '', medidasValores: '' })).toBeUndefined();
    expect(formatMedidas({})).toBeUndefined();
    expect(formatMedidas({ medidas: '-' })).toBeUndefined();
    expect(formatMedidas({ medidas: '0' })).toBeUndefined();
    // 'Anillo' is a jewelry type that leaked into the column, not a size.
    expect(formatMedidas({ medidas: 'Anillo' })).toBeUndefined();
  });

  it('drops a lone format label with nothing behind it', () => {
    expect(
      formatMedidas({ medidas: 'Largo x Ancho', medidasValores: '' }),
    ).toBeUndefined();
  });
});
