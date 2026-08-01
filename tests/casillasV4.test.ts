/**
 * La creación de casillas al guardar W1 — el corazón del modelo «2 Cerebros».
 *
 * Guardar el lote NO captura las piezas: crea N casillas vacías en
 * `PENDIENTE_CLASIFICAR` y termina. Quien clasifica las llena después, y puede
 * ser otra persona en otro momento. Es la separación que la página actual no
 * tiene (hoy captura ítem por ítem inline, en la misma sesión).
 */
import { describe, it, expect } from 'vitest';
import {
  ESTADO_CASILLA_INICIAL,
  planificarCasillas,
  siguienteItemIdNumerico,
} from '../convex/_lib/casillasV4';

describe('siguienteItemIdNumerico — los dos rieles comparten numeración', () => {
  it('toma el máximo entre inventario legacy y casillas v4', () => {
    // Si solo mirara productInventory, una casilla v4 recibiría un itemId que
    // otra casilla v4 ya tiene: las casillas todavía no tienen fila de
    // inventario, así que serían invisibles para el allocator viejo.
    expect(siguienteItemIdNumerico(['500', '512'], ['512', '513'])).toBe(514);
  });

  it('ignora itemIds no numéricos en vez de romperse', () => {
    expect(siguienteItemIdNumerico(['500', 'B-001-G1', ''], [])).toBe(501);
  });

  it('desde una base vacía empieza en 1', () => {
    expect(siguienteItemIdNumerico([], [])).toBe(1);
  });
});

describe('planificarCasillas', () => {
  const plan = planificarCasillas({
    loteId: 'B-042',
    unidadesDeclaradas: 4,
    primerItemIdNumerico: 514,
    categoriaFiscalLote: 'gema',
  });

  it('crea una casilla por unidad declarada', () => {
    expect(plan).toHaveLength(4);
  });

  it('numera los itemIds correlativos desde el primero libre', () => {
    expect(plan.map((c) => c.itemId)).toEqual(['514', '515', '516', '517']);
  });

  it('todas nacen PENDIENTE_CLASIFICAR', () => {
    expect(plan.every((c) => c.estadoCasilla === ESTADO_CASILLA_INICIAL)).toBe(
      true,
    );
    expect(ESTADO_CASILLA_INICIAL).toBe('PENDIENTE_CLASIFICAR');
  });

  it('ordena las casillas 1..N dentro del lote', () => {
    expect(plan.map((c) => c.ordenEnLote)).toEqual([1, 2, 3, 4]);
  });

  it('deja en cero los campos del riel viejo', () => {
    // `preponderancia` y `costoBaseCOP` son del modelo que prorratea. En v4 el
    // costo autoritativo es el capturado por casilla, y estos quedan como
    // lastre para no romper el schema compartido.
    expect(plan.every((c) => c.preponderancia === 0)).toBe(true);
    expect(plan.every((c) => c.costoBaseCOP === 0)).toBe(true);
  });

  it('NO trae costo unitario: es lo que W2 tiene que capturar', () => {
    expect(plan.every((c) => c.costoUnitarioRealCOP === undefined)).toBe(true);
  });

  it('hereda la categoría fiscal cuando el lote tiene una sola', () => {
    expect(plan.every((c) => c.categoriaFiscal === 'gema')).toBe(true);
  });

  it('en un lote mixto la deja vacía — cada casilla declara la suya', () => {
    const mixto = planificarCasillas({
      loteId: 'B-043',
      unidadesDeclaradas: 2,
      primerItemIdNumerico: 600,
      categoriaFiscalLote: 'mixta',
    });
    expect(mixto.every((c) => c.categoriaFiscal === undefined)).toBe(true);
  });

  it('exige al menos una unidad', () => {
    expect(() =>
      planificarCasillas({
        loteId: 'B-044',
        unidadesDeclaradas: 0,
        primerItemIdNumerico: 1,
        categoriaFiscalLote: 'gema',
      }),
    ).toThrow(/unidades/i);
  });

  it('rechaza un lote sin id — la casilla quedaría huérfana', () => {
    expect(() =>
      planificarCasillas({
        loteId: '',
        unidadesDeclaradas: 1,
        primerItemIdNumerico: 1,
        categoriaFiscalLote: 'gema',
      }),
    ).toThrow(/loteId/i);
  });
});
