/**
 * El recálculo del gasto fijo unitario, y sus dos candados.
 *
 * El costo fijo por lote es dinámico: entra inventario y baja, se vende un lote
 * entero y sube. Hoy eso se hace a mano en la hoja, que es como se llega a un
 * `E6` desactualizado cotizando todo el catálogo.
 *
 * Los dos candados que estos tests fijan:
 *
 *  1. **Consignación y devolución NO recalculan.** La pieza sigue viva en el
 *     inventario; solo cambió de manos. Si movieran el divisor, entregar siete
 *     piezas a un comercializador repreciaría el catálogo entero sin que nadie
 *     hubiera comprado ni vendido nada.
 *  2. **Nada retroactivo sobre lo VENDIDA.** Una venta ya cerrada tiene su
 *     precio; recalcularlo cambiaría márgenes y comisiones ya liquidados.
 */
import { describe, it, expect } from 'vitest';
import { CONFIG_PRECIOS_2026_07 } from '../convex/_lib/motorPrecios';
import {
  contarLotesActivos,
  loteEstaActivo,
  planificarRecalculo,
  unidadesAReprecificar,
} from '../convex/_lib/recalculo';

const CFG = CONFIG_PRECIOS_2026_07;
const TS = 1_785_000_000_000;

describe('loteEstaActivo — activo = al menos una unidad no vendida (D2)', () => {
  it('un lote con una sola pieza disponible está activo', () => {
    expect(loteEstaActivo([{ estado: 'DISPONIBLE' }])).toBe(true);
  });

  it('una pieza en consignación mantiene vivo el lote — no se vendió', () => {
    expect(
      loteEstaActivo([{ estado: 'VENDIDA' }, { estado: 'EN_CONSIGNACION' }]),
    ).toBe(true);
  });

  it('con todas vendidas el lote sale del divisor', () => {
    expect(loteEstaActivo([{ estado: 'VENDIDA' }, { estado: 'VENDIDA' }])).toBe(
      false,
    );
  });

  it('un lote sin unidades todavía no cuenta como activo', () => {
    // Un lote recién creado cuyas casillas aún no existen no puede absorber
    // gasto fijo: no hay nada que cotizar.
    expect(loteEstaActivo([])).toBe(false);
  });

  it('cuenta los lotes activos de una lista', () => {
    expect(
      contarLotesActivos([
        [{ estado: 'DISPONIBLE' }],
        [{ estado: 'VENDIDA' }],
        [{ estado: 'VENDIDA' }, { estado: 'ASESOR' }],
      ]),
    ).toBe(2);
  });
});

describe('planificarRecalculo — qué eventos mueven el divisor', () => {
  const base = { config: CFG, ts: TS };

  it('el alta de un lote recalcula: 76 → 77 baja el fijo a $437.037', () => {
    const plan = planificarRecalculo({
      ...base,
      evento: 'ALTA_LOTE',
      lotesActivosAntes: 76,
      lotesActivosDespues: 77,
      unidadesActivas: 236,
    });
    expect(plan.recalcula).toBe(true);
    expect(plan.traza?.valorAnterior).toBe(442_787);
    expect(plan.traza?.valorNuevo).toBe(437_037);
    expect(plan.traza?.divisorUsado).toBe(77);
    expect(plan.traza?.evento).toBe('ALTA_LOTE');
    expect(plan.traza?.ts).toBe(TS);
  });

  it('la venta que apaga el último ítem de un lote recalcula: 76 → 75', () => {
    const plan = planificarRecalculo({
      ...base,
      evento: 'VENTA',
      lotesActivosAntes: 76,
      lotesActivosDespues: 75,
      unidadesActivas: 234,
    });
    expect(plan.recalcula).toBe(true);
    expect(plan.traza?.valorNuevo).toBe(448_691);
  });

  it('la venta que deja piezas vivas en el lote NO recalcula', () => {
    // El lote sigue activo, así que el divisor no se movió. Recalcular aquí
    // repreciaría el catálogo en cada venta suelta, sin causa.
    const plan = planificarRecalculo({
      ...base,
      evento: 'VENTA',
      lotesActivosAntes: 76,
      lotesActivosDespues: 76,
      unidadesActivas: 234,
    });
    expect(plan.recalcula).toBe(false);
    expect(plan.traza).toBeUndefined();
  });

  it('la consignación NO recalcula aunque le pasen conteos distintos', () => {
    // Candado explícito: no depende de que el conteo coincida. La regla es del
    // TIPO de evento, porque la pieza no salió del inventario.
    const plan = planificarRecalculo({
      ...base,
      evento: 'CONSIGNACION',
      lotesActivosAntes: 76,
      lotesActivosDespues: 75,
      unidadesActivas: 234,
    });
    expect(plan.recalcula).toBe(false);
    expect(plan.motivo).toMatch(/consignaci|no cambia el inventario/i);
  });

  it('la devolución tampoco recalcula', () => {
    expect(
      planificarRecalculo({
        ...base,
        evento: 'DEVOLUCION',
        lotesActivosAntes: 75,
        lotesActivosDespues: 76,
        unidadesActivas: 235,
      }).recalcula,
    ).toBe(false);
  });

  it('deja traza de por qué NO recalculó, no solo de cuándo sí', () => {
    const plan = planificarRecalculo({
      ...base,
      evento: 'CONSIGNACION',
      lotesActivosAntes: 76,
      lotesActivosDespues: 76,
      unidadesActivas: 235,
    });
    expect(plan.motivo.length).toBeGreaterThan(0);
  });

  it('guarda el conteo de unidades como dato auditable, no como divisor', () => {
    // D2 eligió lotes. Trazar también las piezas deja auditar después qué habría
    // pasado con el otro conteo, sin volver a inventar el número.
    const plan = planificarRecalculo({
      ...base,
      evento: 'ALTA_LOTE',
      lotesActivosAntes: 76,
      lotesActivosDespues: 77,
      unidadesActivas: 236,
    });
    expect(plan.traza?.unidadesActivas).toBe(236);
    expect(plan.traza?.divisorUsado).toBe(77);
  });

  it('quedarse sin lotes activos no recalcula a Infinity', () => {
    const plan = planificarRecalculo({
      ...base,
      evento: 'VENTA',
      lotesActivosAntes: 1,
      lotesActivosDespues: 0,
      unidadesActivas: 0,
    });
    expect(plan.recalcula).toBe(false);
    expect(plan.motivo).toMatch(/sin lotes activos/i);
  });
});

describe('unidadesAReprecificar — el candado de lo ya vendido', () => {
  const inventario = [
    { itemId: '372', estado: 'DISPONIBLE' },
    { itemId: '373', estado: 'VENDIDA' },
    { itemId: '374', estado: 'EN_CONSIGNACION' },
    { itemId: '375', estado: 'ASESOR' },
  ];

  it('excluye lo VENDIDA — su precio ya se cobró', () => {
    expect(unidadesAReprecificar(inventario).map((u) => u.itemId)).toEqual([
      '372',
      '374',
      '375',
    ]);
  });

  it('la pieza en consignación SÍ se reprecia — todavía no se vendió', () => {
    expect(
      unidadesAReprecificar(inventario).some((u) => u.itemId === '374'),
    ).toBe(true);
  });

  it('no muta la lista que recibe', () => {
    const copia = [...inventario];
    unidadesAReprecificar(inventario);
    expect(inventario).toEqual(copia);
  });
});
