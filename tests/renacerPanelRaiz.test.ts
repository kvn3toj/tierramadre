import { describe, it, expect } from 'vitest';
import {
  codigosRepartibles,
  proximoLibre,
} from '../convex-renacer/convex/lib/codigos';
import { diasDeCampana } from '../convex-renacer/convex/lib/campana';
import {
  tokenCoincide,
  nuevoTokenOpaco,
} from '../convex-renacer/convex/lib/guardas';

/**
 * Las reglas del panel de la raíz (2026-09-01) y del contador de días, como test.
 *
 * Lo que se prueba acá es lo que la pantalla NO puede equivocarse: repartir dos veces el
 * mismo código, contar el código de la raíz como repartible, o pintar un número de días
 * que nadie midió.
 */

describe('codigosRepartibles — el bloque de una raíz', () => {
  const pablo = { codigoBase: 100, tamano: 100 };

  it('reparte base+1 … base+tamano-1, y NUNCA la base', () => {
    const cs = codigosRepartibles(pablo);
    expect(cs[0]).toBe(101);
    expect(cs.at(-1)).toBe(199);
    expect(cs).toHaveLength(99);
    // Control negativo: el código de la raíz identifica al líder, no a un invitado.
    expect(cs).not.toContain(100);
  });

  it('un bloque mínimo (tamaño 2) reparte exactamente un código', () => {
    expect(codigosRepartibles({ codigoBase: 500, tamano: 2 })).toEqual([501]);
  });
});

describe('proximoLibre — cuál código entrega la raíz ahora', () => {
  const bloque = { codigoBase: 200, tamano: 5 }; // reparte 201..204

  it('devuelve el más bajo que nadie usó', () => {
    expect(proximoLibre(bloque, new Set([201, 202]))).toBe(203);
  });

  it('salta los huecos: si el 201 quedó libre y el 202 usado, entrega el 201', () => {
    expect(proximoLibre(bloque, new Set([202]))).toBe(201);
  });

  it('sin nada usado, entrega el primero del bloque', () => {
    expect(proximoLibre(bloque, new Set())).toBe(201);
  });

  it('con el cupo agotado devuelve null — la pantalla dice "sin códigos libres"', () => {
    expect(proximoLibre(bloque, new Set([201, 202, 203, 204]))).toBeNull();
  });

  it('un código usado FUERA del bloque no consume cupo del bloque', () => {
    expect(proximoLibre(bloque, new Set([999]))).toBe(201);
  });
});

describe('diasDeCampana — sin fecha medida no hay número (D-0901-3)', () => {
  const arranque = Date.UTC(2026, 7, 25); // 2026-08-25

  it('el día del arranque es el día 1, no el 0', () => {
    expect(diasDeCampana(arranque, arranque)).toBe(1);
  });

  it('cuenta los días transcurridos', () => {
    expect(diasDeCampana(arranque, arranque + 7 * 86_400_000)).toBe(8);
  });

  it('devuelve null mientras nadie fijó el arranque — jamás un default', () => {
    expect(diasDeCampana(undefined)).toBeNull();
    expect(diasDeCampana(null)).toBeNull();
    expect(diasDeCampana(0)).toBeNull();
  });
});

describe('tokenCoincide — la credencial del panel', () => {
  it('acepta el token exacto', () => {
    const t = nuevoTokenOpaco();
    expect(tokenCoincide(t, t)).toBe(true);
  });

  it('rechaza un token distinto, uno vacío y una raíz SIN token', () => {
    const t = nuevoTokenOpaco();
    expect(tokenCoincide(t, nuevoTokenOpaco())).toBe(false);
    expect(tokenCoincide(t, '')).toBe(false);
    // El caso que importa: una raíz emitida antes del 2026-09-01 no tiene panelToken.
    // `undefined` NUNCA puede leerse como "coincide" — eso abriría todos los bloques viejos.
    expect(tokenCoincide(undefined, '')).toBe(false);
    expect(tokenCoincide(undefined, 'loquesea')).toBe(false);
  });

  it('el token es largo y opaco: adivinarlo no es un camino', () => {
    const t = nuevoTokenOpaco();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(nuevoTokenOpaco()).not.toBe(t);
  });
});
