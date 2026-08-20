import { describe, it, expect } from 'vitest';
import {
  MULTIPLICADOR_POR_DEFECTO,
  esMultiplicadorValido,
  resolverMultiplicador,
  precioConMarkup,
} from '../convex/_lib/precioVitrina';

describe('MULTIPLICADOR_POR_DEFECTO', () => {
  it('es 1 — la ausencia de markup, no un markup elegido', () => {
    expect(MULTIPLICADOR_POR_DEFECTO).toBe(1);
  });
});

describe('esMultiplicadorValido', () => {
  it('acepta el rango real del slider', () => {
    expect(esMultiplicadorValido(1)).toBe(true);
    expect(esMultiplicadorValido(2.6)).toBe(true);
    expect(esMultiplicadorValido(4)).toBe(true);
  });

  it('rechaza fuera de rango', () => {
    expect(esMultiplicadorValido(0.9)).toBe(false);
    expect(esMultiplicadorValido(4.1)).toBe(false);
  });

  it('rechaza lo que no es un número finito', () => {
    expect(esMultiplicadorValido(NaN)).toBe(false);
    expect(esMultiplicadorValido(Infinity)).toBe(false);
    expect(esMultiplicadorValido('2')).toBe(false);
    expect(esMultiplicadorValido(null)).toBe(false);
    expect(esMultiplicadorValido(undefined)).toBe(false);
  });
});

describe('resolverMultiplicador', () => {
  it('sin origen usa el default — ese es el riel del bot', () => {
    expect(resolverMultiplicador(undefined, null)).toEqual({
      ok: true,
      multiplicador: 1,
    });
  });

  it('con origen resuelto usa el multiplicador del registro', () => {
    expect(
      resolverMultiplicador(
        { tipo: 'vitrina', token: 'AB3K9P' },
        {
          multiplicador: 2.6,
        },
      ),
    ).toEqual({ ok: true, multiplicador: 2.6 });
  });

  it('SEGURIDAD: origen afirmado que no resuelve se RECHAZA, no cae a 1', () => {
    expect(
      resolverMultiplicador({ tipo: 'vitrina', token: 'basura' }, null),
    ).toEqual({ ok: false, razon: 'origen-invalido' });
  });

  it('SEGURIDAD: un registro con multiplicador corrupto se rechaza, no se cobra a 1', () => {
    expect(
      resolverMultiplicador(
        { tipo: 'invitacion', token: 'XY12' },
        {
          multiplicador: 99,
        },
      ),
    ).toEqual({ ok: false, razon: 'origen-invalido' });
  });

  it('un registro sin multiplicador (invitación vieja) vale 1, porque existe', () => {
    expect(
      resolverMultiplicador({ tipo: 'invitacion', token: 'XY12' }, {}),
    ).toEqual({ ok: true, multiplicador: 1 });
  });
});

describe('precioConMarkup', () => {
  it('redondea al peso', () => {
    expect(precioConMarkup(1_000_000, 2.6)).toBe(2_600_000);
    expect(precioConMarkup(333_333, 1.1)).toBe(366_666);
  });

  it('x1 devuelve el precio base intacto', () => {
    expect(precioConMarkup(1_980_000, 1)).toBe(1_980_000);
  });

  it('un precio de 0 sigue en 0', () => {
    expect(precioConMarkup(0, 2.6)).toBe(0);
  });
});
