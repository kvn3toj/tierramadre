import { describe, it, expect } from 'vitest';
import { ORDEN_PASOS, ORDEN_RATIFICADO_0825, ORDEN_REUNION_0831 } from '../src/pages/renacer/flujo';

/**
 * Este test ES la compuerta D-0831-4: cambiar el orden del registro es cambiar
 * `ORDEN_PASOS` en `flujo.ts` y este `expect`, nada más.
 */
describe('ORDEN_PASOS (D-0831-4)', () => {
  it('sigue el orden ratificado el 25-08: necesidades ANTES que datos', () => {
    expect(ORDEN_PASOS).toEqual(ORDEN_RATIFICADO_0825);
    expect(ORDEN_PASOS.indexOf('necesidades')).toBeLessThan(ORDEN_PASOS.indexOf('datos'));
  });
  it('los dos órdenes contienen los mismos pasos, empiezan por la bienvenida y cierran con capacidades', () => {
    expect([...ORDEN_REUNION_0831].sort()).toEqual([...ORDEN_RATIFICADO_0825].sort());
    for (const orden of [ORDEN_RATIFICADO_0825, ORDEN_REUNION_0831]) {
      expect(orden[0]).toBe('bienvenida');
      expect(orden[orden.length - 1]).toBe('capacidades');
    }
  });
});
