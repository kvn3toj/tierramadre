import { describe, it, expect } from 'vitest';
import { agruparPorBolsa, SIN_BOLSA } from '../src/pages/renacer/agrupar';

const n = (id: string, categoria: string | null) => ({ id, categoria });

describe('agruparPorBolsa', () => {
  it('agrupa por bolsa, las más pedidas primero, y "otras" siempre al final', () => {
    const bolsas = agruparPorBolsa([
      n('a', 'Alimentos'),
      n('b', null),
      n('c', 'Techo y vivienda'),
      n('d', null),
      n('e', null),
      n('f', 'Techo y vivienda'),
    ]);
    expect(bolsas.map((b) => b.nombre)).toEqual(['Techo y vivienda', 'Alimentos', SIN_BOLSA]);
    expect(bolsas[2].necesidades.map((x) => x.id)).toEqual(['b', 'd', 'e']);
  });

  it('conserva el orden de llegada dentro de cada bolsa (el turno no se reordena)', () => {
    const bolsas = agruparPorBolsa([n('1', 'Salud'), n('2', 'Salud'), n('3', 'Salud')]);
    expect(bolsas[0].necesidades.map((x) => x.id)).toEqual(['1', '2', '3']);
  });

  it('con lista vacía devuelve cero bolsas', () => {
    expect(agruparPorBolsa([])).toEqual([]);
  });
});
