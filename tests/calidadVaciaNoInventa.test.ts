import { describe, it, expect } from 'vitest';
import {
  normalizeCalidadForSheet,
  normalizeColorForSheet,
} from '../convex/_lib/fotosintesisVocab';

/**
 * Regresión de 2026-08-03. `normalizeCalidadForSheet` devolvía "F1" para un
 * ítem sin calidad. Como `calidad` está en el allowlist de pull
 * (convex/_lib/sheetPullMaps.ts), el valor inventado volvía a Convex por la
 * hoja: a las 24 horas nadie podía distinguir una calidad medida de una que
 * puso el default.
 *
 * Lo destapó la subdivisión de #508/#509/#497: tres piedras que el dueño dejó
 * explícitamente en "calidad pendiente de confirmar" aterrizaron en el SOT
 * como F1.
 */
describe('normalizeCalidadForSheet — vacío se queda vacío', () => {
  it('no inventa calidad cuando no hay ninguna', () => {
    expect(normalizeCalidadForSheet('')).toBe('');
    expect(normalizeCalidadForSheet('   ')).toBe('');
    expect(normalizeCalidadForSheet(undefined)).toBe('');
    expect(normalizeCalidadForSheet(null)).toBe('');
  });

  it('nunca devuelve el default F1 salvo que el dato DIGA F1', () => {
    expect(normalizeCalidadForSheet('')).not.toBe('F1');
    expect(normalizeCalidadForSheet('F1')).toBe('F1');
    expect(normalizeCalidadForSheet('Extrafina F1')).toBe('F1');
  });

  it('sigue canonizando los alias legacy y respetando lo ya canónico', () => {
    expect(normalizeCalidadForSheet('Fina Sublime')).toBe('FINA SUBLIME');
    expect(normalizeCalidadForSheet('Comercial Estándar')).toBe(
      'COMERCIAL ESTÁNDAR',
    );
    expect(normalizeCalidadForSheet('FINA COMERCIAL')).toBe('FINA COMERCIAL');
    expect(normalizeCalidadForSheet('  Fina Esencial  ')).toBe('FINA ESENCIAL');
  });

  it('se comporta igual que su gemela de color, que nunca inventó nada', () => {
    for (const vacio of ['', '   ', undefined, null] as const) {
      expect(normalizeCalidadForSheet(vacio)).toBe(
        normalizeColorForSheet(vacio),
      );
    }
  });
});
