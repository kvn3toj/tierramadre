import { describe, it, expect } from 'vitest';
import {
  normalizeCalidadForSheet,
  normalizeColorForSheet,
} from '../convex/_lib/fotosintesisVocab';
import { normalizeCalidad } from '../src/data/vocabularies';

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

/**
 * El gemelo app-side, cerrado el 2026-09-04.
 *
 * `normalizeCalidadForSheet` se arregló el 2026-08-03; su gemelo del cliente,
 * `src/data/vocabularies.ts#normalizeCalidad`, siguió devolviendo 'F1' un mes
 * más. La mitad arreglada no alcanzaba, porque el camino que más muerde pasa
 * justamente por el cliente:
 * el drawer HIDRATA una fila de calidad vacía, 'F1' entra al borrador, queda
 * dentro de la línea base de «cambios sin guardar» y se empuja al SOT al
 * guardar cualquier OTRO campo.
 *
 * Medido en `productEdits` el 2026-09-04: 14 ediciones con
 * `{field:'calidad', before:null, after:'F1'}`, sobre joyería, hechas mientras
 * se editaba otra cosa. Y `calidad` alimenta CALIDAD_FACTORS, que sugiere el
 * precio público — así que el invento terminaba proponiendo plata.
 *
 * Los dos gemelos se prueban en el MISMO archivo a propósito: arreglar uno solo
 * es lo que hizo que esto durara un mes.
 */
describe('normalizeCalidad (cliente) — el gemelo tiene que decir lo mismo', () => {
  it('no inventa calidad cuando no hay ninguna', () => {
    expect(normalizeCalidad('')).toBe('');
    expect(normalizeCalidad('   ')).toBe('');
    expect(normalizeCalidad(undefined)).toBe('');
    expect(normalizeCalidad(null)).toBe('');
  });

  it('nunca devuelve F1 salvo que el dato DIGA F1', () => {
    expect(normalizeCalidad('')).not.toBe('F1');
    expect(normalizeCalidad('F1')).toBe('F1');
  });

  it('los dos gemelos coinciden en el vacío y en el alias', () => {
    for (const v of ['', '   ', undefined, null]) {
      expect(normalizeCalidad(v), String(v)).toBe(normalizeCalidadForSheet(v));
    }
    // Y siguen preservando lo que una persona escribió a mano.
    expect(normalizeCalidad('Otra opción')).toBe('Otra opción');
    expect(normalizeCalidadForSheet('Otra opción')).toBe('Otra opción');
  });
});
