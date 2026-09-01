import { describe, it, expect } from 'vitest';
import { normalizarBolsa, BOLSAS_SUGERIDAS } from '../convex-renacer/convex/lib/bolsas';

describe('normalizarBolsa', () => {
  it('acerca a la sugerida sin importar mayúsculas ni tildes', () => {
    expect(normalizarBolsa('comida')).toBe('Comida');
    expect(normalizarBolsa('APOYO EMOCIONAL')).toBe('Apoyo emocional');
    expect(normalizarBolsa('  techo y   materiales ')).toBe('Techo y materiales');
  });
  it('capitaliza una bolsa nueva y colapsa espacios', () => {
    expect(normalizarBolsa('asistencia  legal')).toBe('Asistencia legal');
  });
  it('devuelve null si queda vacía o se pasa del largo', () => {
    expect(normalizarBolsa('')).toBeNull();
    expect(normalizarBolsa('   ')).toBeNull();
    expect(normalizarBolsa(undefined)).toBeNull();
    expect(normalizarBolsa('x'.repeat(61))).toBeNull();
  });
  it('la lista sugerida no tiene duplicados', () => {
    expect(new Set(BOLSAS_SUGERIDAS).size).toBe(BOLSAS_SUGERIDAS.length);
  });
});
