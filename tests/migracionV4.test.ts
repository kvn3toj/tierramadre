/**
 * El planificador de la migración de ensayo v3 → v4.
 *
 * Corre primero en dev, y de ahí sale el inventario con el que la doble corrida
 * puede comparar precios. Hasta que corra, dev reparte el gasto fijo entre menos
 * lotes de los que existen (66 contra 88) y ningún número suyo es comparable.
 *
 * Es puro a propósito: recibe lo que la hoja dice y lo que Convex tiene, y
 * devuelve un PLAN. No escribe. Así el ensayo se puede repetir cuantas veces haga
 * falta —y revisar a ojo— antes de que algo toque la base.
 *
 * Las tres reglas que los tests protegen, en orden de daño si se rompen:
 *
 *  1. **No se inventa un costo.** D6: el costo unitario se CAPTURA. Una fila sin
 *     costo va al reporte de excepciones, no a un prorrateo.
 *  2. **No se corrige nada por cuenta propia.** Lo anómalo se REPORTA para que lo
 *     mire un humano (dictamen de Kevin sobre LC-03).
 *  3. **Es idempotente.** Correr el ensayo dos veces no duplica un lote.
 */
import { describe, it, expect } from 'vitest';
import {
  ESTADO_PENDIENTE_CLASIFICAR,
  planificarMigracion,
} from '../convex/_lib/migracionV4';

const LOTE_HOJA = {
  loteId: 'C-068',
  estado: 'reconstruido',
  providerNombre: '',
  fechaRecepcion: '2026-07-23',
  costoTotalCOP: 735_000,
  unidadesDeclaradas: 10,
  formaPago: '',
};

const FILA = {
  itemId: '496',
  loteId: 'C-068',
  estado: '',
  costoBaseCOP: 153_125,
  nombre: 'Baguette',
};

describe('los lotes que la hoja tiene y Convex no', () => {
  it('los planifica para crear', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(plan.lotesACrear.map((l) => l.loteId)).toEqual(['C-068']);
  });

  it('conserva `reconstruido` en vez de disfrazarlo de `abierto`', () => {
    // Estos lotes son agrupaciones retroactivas armadas desde colecciones
    // legadas, no compras. Mapearlos a «abierto» los volvería indistinguibles de
    // una compra real, y ese error es invisible una vez guardado.
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(plan.lotesACrear[0].estado).toBe('reconstruido');
  });

  it('sin proveedor NO le atribuye las piedras a uno real: lo reporta', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(plan.lotesACrear[0].sinProveedor).toBe(true);
    expect(
      plan.excepciones.some(
        (e) => e.codigo === 'LOTE_SIN_PROVEEDOR' && e.referencia === 'C-068',
      ),
    ).toBe(true);
  });

  it('un lote con proveedor no genera esa excepción', () => {
    const plan = planificarMigracion({
      lotesHoja: [{ ...LOTE_HOJA, providerNombre: 'Proveedor Uno' }],
      lotesConvex: [],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(plan.lotesACrear[0].sinProveedor).toBe(false);
    expect(
      plan.excepciones.some((e) => e.codigo === 'LOTE_SIN_PROVEEDOR'),
    ).toBe(false);
  });

  it('no recrea un lote que Convex ya tiene', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [{ loteId: 'C-068' }],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(plan.lotesACrear).toHaveLength(0);
  });
});

describe('las 25 filas con ESTADO en blanco', () => {
  // Dictamen de Kevin (2026-08-01): son INVENTARIO VIVO, carga incompleta. Se
  // convierten en casillas PENDIENTE_CLASIFICAR, que es exactamente el estado
  // que v4 tiene para «una pieza que existe y todavía no se clasificó».
  it('se convierten en casillas PENDIENTE_CLASIFICAR', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [{ loteId: 'C-068' }],
      filasHoja: [FILA],
      casillasConvex: [],
    });
    expect(plan.casillasACrear).toHaveLength(1);
    expect(plan.casillasACrear[0].estadoCasilla).toBe(
      ESTADO_PENDIENTE_CLASIFICAR,
    );
    expect(plan.casillasACrear[0].itemId).toBe('496');
  });

  it('una fila con estado conocido conserva el suyo', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [{ loteId: 'C-068' }],
      filasHoja: [
        { ...FILA, itemId: '140', estado: 'VENDIDA' },
        { ...FILA, itemId: '141', estado: 'DISPONIBLE' },
      ],
      casillasConvex: [],
    });
    const porItem = new Map(
      plan.casillasACrear.map((c) => [c.itemId, c.estadoCasilla]),
    );
    expect(porItem.get('140')).toBe('VENDIDA');
    expect(porItem.get('141')).toBe('DISPONIBLE');
  });

  it('el costo se CAPTURA de la fila, jamás se reparte', () => {
    // D6, y el caso «Choker + Piedra»: prorratear el costo del lote entre sus
    // piezas produjo $52.500 donde el costo real era otro.
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [{ loteId: 'C-068' }],
      filasHoja: [FILA],
      casillasConvex: [],
    });
    expect(plan.casillasACrear[0].costoUnitarioRealCOP).toBe(153_125);
  });

  it('una fila SIN costo se reporta, no se le inventa uno', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [{ loteId: 'C-068' }],
      filasHoja: [{ ...FILA, costoBaseCOP: 0 }],
      casillasConvex: [],
    });
    expect(plan.casillasACrear[0].costoUnitarioRealCOP).toBeUndefined();
    expect(
      plan.excepciones.some(
        (e) => e.codigo === 'CASILLA_SIN_COSTO' && e.referencia === '496',
      ),
    ).toBe(true);
  });

  it('no recrea una casilla que ya existe', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [{ loteId: 'C-068' }],
      filasHoja: [FILA],
      casillasConvex: [{ itemId: '496' }],
    });
    expect(plan.casillasACrear).toHaveLength(0);
  });

  it('una fila de un lote que no existe ni se va a crear se reporta', () => {
    // Sin esto la casilla quedaría colgando de un loteId fantasma.
    const plan = planificarMigracion({
      lotesHoja: [],
      lotesConvex: [],
      filasHoja: [{ ...FILA, loteId: 'C-999' }],
      casillasConvex: [],
    });
    expect(plan.casillasACrear).toHaveLength(0);
    expect(plan.excepciones.some((e) => e.codigo === 'CASILLA_SIN_LOTE')).toBe(
      true,
    );
  });
});

describe('el reporte de excepciones — LC-03 y los que se le parezcan', () => {
  // Dictamen de Kevin: «LC-03 ($1.233M) va al reporte de excepciones de la
  // migración como fila a auditar con Kevin ANTES de que la Fase 2 la tome como
  // verdad. No la corrijas por tu cuenta.»
  const lc03 = {
    ...LOTE_HOJA,
    loteId: 'LC-03',
    costoTotalCOP: 1_233_000_000,
    unidadesDeclaradas: 2,
  };

  it('marca el lote cuyo costo declarado no se parece a la suma de sus piezas', () => {
    const plan = planificarMigracion({
      lotesHoja: [lc03],
      lotesConvex: [],
      filasHoja: [
        { itemId: '1', loteId: 'LC-03', estado: '', costoBaseCOP: 500_000 },
        { itemId: '2', loteId: 'LC-03', estado: '', costoBaseCOP: 500_000 },
      ],
      casillasConvex: [],
    });
    const exc = plan.excepciones.find(
      (e) => e.codigo === 'COSTO_INCONSISTENTE',
    );
    expect(exc?.referencia).toBe('LC-03');
    expect(exc?.requiereAuditoria).toBe(true);
  });

  it('NO corrige el costo: lo migra tal cual y deja el aviso', () => {
    const plan = planificarMigracion({
      lotesHoja: [lc03],
      lotesConvex: [],
      filasHoja: [
        { itemId: '1', loteId: 'LC-03', estado: '', costoBaseCOP: 500_000 },
      ],
      casillasConvex: [],
    });
    expect(plan.lotesACrear[0].costoTotalCOP).toBe(1_233_000_000);
  });

  it('un lote coherente no se marca', () => {
    const plan = planificarMigracion({
      lotesHoja: [{ ...LOTE_HOJA, costoTotalCOP: 300_000 }],
      lotesConvex: [],
      filasHoja: [
        { itemId: '1', loteId: 'C-068', estado: '', costoBaseCOP: 150_000 },
        { itemId: '2', loteId: 'C-068', estado: '', costoBaseCOP: 150_000 },
      ],
      casillasConvex: [],
    });
    expect(
      plan.excepciones.some((e) => e.codigo === 'COSTO_INCONSISTENTE'),
    ).toBe(false);
  });

  it('un lote sin piezas no se juzga por coherencia de costo', () => {
    // No hay con qué comparar. Inventar una comparación contra cero marcaría
    // como anómalo a todo lote todavía sin cargar.
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [],
      filasHoja: [],
      casillasConvex: [],
    });
    expect(
      plan.excepciones.some((e) => e.codigo === 'COSTO_INCONSISTENTE'),
    ).toBe(false);
  });
});

describe('el resumen — lo que se lee antes de decidir si se aplica', () => {
  it('cuenta lo que va a pasar y cuántas excepciones hay', () => {
    const plan = planificarMigracion({
      lotesHoja: [LOTE_HOJA, { ...LOTE_HOJA, loteId: 'C-067' }],
      lotesConvex: [{ loteId: 'C-067' }],
      filasHoja: [FILA, { ...FILA, itemId: '497', costoBaseCOP: 0 }],
      casillasConvex: [],
    });
    expect(plan.resumen.lotesACrear).toBe(1);
    expect(plan.resumen.casillasACrear).toBe(2);
    expect(plan.resumen.excepciones).toBe(plan.excepciones.length);
    expect(plan.resumen.requierenAuditoria).toBe(
      plan.excepciones.filter((e) => e.requiereAuditoria).length,
    );
  });

  it('correr el plan dos veces sobre el resultado del primero no hace nada', () => {
    // La prueba real de idempotencia: aplicar y volver a planificar da vacío.
    const primero = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: [],
      filasHoja: [FILA],
      casillasConvex: [],
    });
    const segundo = planificarMigracion({
      lotesHoja: [LOTE_HOJA],
      lotesConvex: primero.lotesACrear.map((l) => ({ loteId: l.loteId })),
      filasHoja: [FILA],
      casillasConvex: primero.casillasACrear.map((c) => ({
        itemId: c.itemId,
      })),
    });
    expect(segundo.lotesACrear).toHaveLength(0);
    expect(segundo.casillasACrear).toHaveLength(0);
  });
});
