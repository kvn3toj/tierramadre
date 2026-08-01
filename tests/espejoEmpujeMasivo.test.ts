/**
 * El plan de un empuje masivo al espejo — 375 casillas migradas que nunca se
 * encolaron (la migración no encola).
 *
 * `drenar` lee la pestaña ENTERA en cada fila que procesa (`leerRango`, ver
 * `espejo.ts`), así que empujar 375 filas de una sola vez en un solo
 * `drenar({ limite: 375 })` dispararía ~3 llamadas a la Sheets API POR FILA
 * (listar pestañas · leer rango · escribir) sin pausa entre ninguna — es
 * exactamente cómo se agota la cuota por minuto de la Sheets API.
 *
 * La cura no es lógica nueva de drenaje: es ESPACIAR las invocaciones que ya
 * existen. Esta función es pura aritmética — cuántos pasos, con qué límite
 * cada uno, cuánto retraso entre ellos — para que el caller (una action de
 * Convex) solo tenga que agendar `ctx.scheduler.runAfter(retrasoMs, drenar,
 * { limite })` por cada paso.
 */
import { describe, it, expect } from 'vitest';
import { planificarDrenajeEscalonado } from '../convex/_lib/espejoEmpujeMasivo';

describe('planificarDrenajeEscalonado', () => {
  it('sin filas pendientes, no hay pasos', () => {
    expect(
      planificarDrenajeEscalonado({
        totalFilas: 0,
        tamanoLote: 10,
        intervaloMs: 90_000,
      }),
    ).toEqual([]);
  });

  it('375 filas en lotes de 10 dan 38 pasos, el último con el resto', () => {
    const pasos = planificarDrenajeEscalonado({
      totalFilas: 375,
      tamanoLote: 10,
      intervaloMs: 90_000,
    });
    expect(pasos).toHaveLength(38); // ceil(375/10)
    expect(pasos.every((p) => p.limite === 10)).toBe(true);
  });

  it('el retraso crece en pasos exactos de intervaloMs, empezando en 0', () => {
    const pasos = planificarDrenajeEscalonado({
      totalFilas: 25,
      tamanoLote: 10,
      intervaloMs: 90_000,
    });
    expect(pasos.map((p) => p.retrasoMs)).toEqual([0, 90_000, 180_000]);
  });

  it('un lote exacto no agrega un paso vacío de más', () => {
    const pasos = planificarDrenajeEscalonado({
      totalFilas: 20,
      tamanoLote: 10,
      intervaloMs: 1_000,
    });
    expect(pasos).toHaveLength(2);
  });

  it('tamanoLote <= 0 revienta: sin esto un paso nunca drena nada y el plan queda vivo para siempre', () => {
    expect(() =>
      planificarDrenajeEscalonado({
        totalFilas: 10,
        tamanoLote: 0,
        intervaloMs: 1_000,
      }),
    ).toThrow(/tamanoLote/);
  });

  it('intervaloMs negativo revienta: un retraso negativo dispararía todo de una vez, que es justo lo que esto existe para evitar', () => {
    expect(() =>
      planificarDrenajeEscalonado({
        totalFilas: 10,
        tamanoLote: 5,
        intervaloMs: -1,
      }),
    ).toThrow(/intervaloMs/);
  });
});
