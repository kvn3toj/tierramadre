/**
 * El mensaje que rescata una cotización vencida.
 *
 * Lo que se fija:
 *   1. **Nunca lleva el precio viejo.** Es la regla de negocio del vencimiento
 *      entera en una línea: si el precio viaja, o lo honramos o lo explicamos.
 *   2. Lleva los números de pieza, que es la única razón por la que
 *      conservamos el registro de una vitrina vencida en vez de borrarlo.
 *   3. Con muchas piezas resume en vez de truncarse.
 */
import { describe, it, expect } from 'vitest';
import {
  mensajeCotizacionVencida,
  enlaceCotizacionVencida,
  MAX_PIEZAS_EN_MENSAJE,
} from '../src/components/vitrina/mensajeCotizacionVencida';

describe('mensajeCotizacionVencida', () => {
  it('nombra las piezas con su número', () => {
    const t = mensajeCotizacionVencida([
      { item: 416, nombre: 'Aretes Colibríes' },
      { item: 397, nombre: 'Rositas' },
    ]);
    expect(t).toContain('#416');
    expect(t).toContain('Aretes Colibríes');
    expect(t).toContain('#397');
  });

  it('funciona sin nombre, sólo con el número', () => {
    expect(mensajeCotizacionVencida([{ item: 416 }])).toContain('#416');
  });

  it('sigue siendo un mensaje útil aunque no haya piezas', () => {
    const t = mensajeCotizacionVencida([]);
    expect(t.length).toBeGreaterThan(0);
    expect(t).toContain('venció');
  });

  it('NUNCA incluye un precio — es la regla del vencimiento', () => {
    const t = mensajeCotizacionVencida([
      { item: 416, nombre: 'Aretes Colibríes' },
    ]);
    expect(t).not.toMatch(/\$|COP|USD|\d{3}\.\d{3}/);
  });

  it('resume en vez de truncarse cuando hay muchas piezas', () => {
    const muchas = Array.from({ length: MAX_PIEZAS_EN_MENSAJE + 5 }, (_, i) => ({
      item: 100 + i,
    }));
    const t = mensajeCotizacionVencida(muchas);
    expect(t).toContain('5 piezas más');
    expect(t).toContain('#100');
    expect(t).not.toContain(`#${100 + MAX_PIEZAS_EN_MENSAJE}`);
  });

  it('usa el singular con una sola pieza de sobra', () => {
    const muchas = Array.from({ length: MAX_PIEZAS_EN_MENSAJE + 1 }, (_, i) => ({
      item: 100 + i,
    }));
    expect(mensajeCotizacionVencida(muchas)).toContain('1 pieza más');
  });
});

describe('enlaceCotizacionVencida', () => {
  it('limpia el teléfono y codifica el texto', () => {
    const url = enlaceCotizacionVencida('+57 311 305 2755', [{ item: 416 }]);
    expect(url.startsWith('https://wa.me/573113052755?text=')).toBe(true);
    expect(url).not.toContain(' ');
    expect(decodeURIComponent(url.split('text=')[1])).toContain('#416');
  });
});
