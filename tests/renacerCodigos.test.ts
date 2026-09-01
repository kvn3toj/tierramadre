import { describe, it, expect } from 'vitest';
import {
  parseCodigo,
  codigoEnBloque,
  esCodigoDeRaiz,
  bloquesSeSolapan,
  bloqueValido,
} from '../convex-renacer/convex/lib/codigos';

describe('parseCodigo — el formato del código de invitación', () => {
  it('acepta 3 y 4 dígitos sin cero a la izquierda', () => {
    expect(parseCodigo('101')).toBe(101);
    expect(parseCodigo(' 9999 ')).toBe(9999);
    expect(parseCodigo(250)).toBe(250);
  });
  it('rechaza lo que no es un código', () => {
    expect(parseCodigo('99')).toBeNull(); // 2 dígitos
    expect(parseCodigo('0101')).toBeNull(); // cero a la izquierda
    expect(parseCodigo('10000')).toBeNull(); // 5 dígitos
    expect(parseCodigo('100A')).toBeNull(); // letras
    expect(parseCodigo('')).toBeNull();
    expect(parseCodigo(undefined)).toBeNull();
  });
});

describe('bloques de raíz', () => {
  const pablo = { codigoBase: 100, tamano: 100 };

  it('el código de la raíz es la base; los repartibles son los que siguen', () => {
    expect(esCodigoDeRaiz(pablo, 100)).toBe(true);
    expect(codigoEnBloque(pablo, 100)).toBe(false);
    expect(codigoEnBloque(pablo, 101)).toBe(true);
    expect(codigoEnBloque(pablo, 199)).toBe(true);
    expect(codigoEnBloque(pablo, 200)).toBe(false); // ya es de la raíz siguiente
  });

  it('detecta solapamientos y deja pasar bloques contiguos', () => {
    expect(bloquesSeSolapan(pablo, { codigoBase: 200, tamano: 100 })).toBe(false);
    expect(bloquesSeSolapan(pablo, { codigoBase: 150, tamano: 10 })).toBe(true);
    expect(bloquesSeSolapan(pablo, { codigoBase: 50, tamano: 51 })).toBe(true);
    expect(bloquesSeSolapan(pablo, { codigoBase: 50, tamano: 50 })).toBe(false);
  });

  it('valida el bloque dentro del rango imprimible', () => {
    expect(bloqueValido(pablo)).toBe(true);
    expect(bloqueValido({ codigoBase: 99, tamano: 10 })).toBe(false); // base < 100
    expect(bloqueValido({ codigoBase: 100, tamano: 1 })).toBe(false); // sin repartibles
    expect(bloqueValido({ codigoBase: 9990, tamano: 20 })).toBe(false); // se pasa de 9999
    expect(bloqueValido({ codigoBase: 9990, tamano: 10 })).toBe(true);
  });
});
