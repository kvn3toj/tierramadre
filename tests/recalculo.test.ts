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
  agruparUnidadesPorLote,
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

describe('agruparUnidadesPorLote — los dos rieles, sin contar dos veces', () => {
  // Hoy los dos rieles no se pisan: las casillas v4 no tienen fila en
  // `productInventory`. Después de la migración de ensayo SÍ — las casillas se
  // crean sobre ítems que ya existen ahí—, y sin deduplicar cada pieza se
  // contaría dos veces en `unidadesActivas`, que es el número que `recalculos`
  // traza como auditoría del criterio alterno de D2.
  const LOTES = ['C-068', 'C-077'];

  it('una pieza con fila en los dos rieles cuenta UNA vez', () => {
    const porLote = agruparUnidadesPorLote({
      lotesVivos: LOTES,
      inventario: [{ itemId: '496', loteId: 'C-068', estado: 'DISPONIBLE' }],
      casillas: [
        { itemId: '496', loteId: 'C-068', estadoCasilla: 'DISPONIBLE' },
      ],
    });
    expect(porLote.get('C-068')).toEqual(['DISPONIBLE']);
  });

  it('cuando difieren, manda la casilla: es el estado de v4', () => {
    // El riel viejo puede estar viejo. Si la casilla dice VENDIDA y el
    // inventario todavía dice DISPONIBLE, contar la vieja mantendría vivo un
    // lote agotado y le seguiría asignando gasto fijo.
    const porLote = agruparUnidadesPorLote({
      lotesVivos: LOTES,
      inventario: [{ itemId: '496', loteId: 'C-068', estado: 'DISPONIBLE' }],
      casillas: [{ itemId: '496', loteId: 'C-068', estadoCasilla: 'VENDIDA' }],
    });
    expect(porLote.get('C-068')).toEqual(['VENDIDA']);
  });

  it('si los dos rieles la ubican en lotes distintos, gana el de la casilla', () => {
    const porLote = agruparUnidadesPorLote({
      lotesVivos: LOTES,
      inventario: [{ itemId: '496', loteId: 'C-077', estado: 'DISPONIBLE' }],
      casillas: [
        { itemId: '496', loteId: 'C-068', estadoCasilla: 'DISPONIBLE' },
      ],
    });
    expect(porLote.get('C-068')).toEqual(['DISPONIBLE']);
    expect(porLote.get('C-077')).toEqual([]);
  });

  it('una pieza cuyo lote no existe como fila queda fuera', () => {
    // El mecanismo exacto del subconteo 66 vs 88: `loteEstaActivo` no puede ver
    // piezas cuyo lote Convex nunca conoció. No es un criterio distinto, es dato
    // incompleto — y lo repara la migración creando los lotes, no este conteo.
    const porLote = agruparUnidadesPorLote({
      lotesVivos: LOTES,
      inventario: [{ itemId: '999', loteId: 'C-999', estado: 'DISPONIBLE' }],
      casillas: [],
    });
    expect(porLote.has('C-999')).toBe(false);
    expect([...porLote.values()].flat()).toEqual([]);
  });

  it('una casilla sin estado todavía no cuenta como unidad', () => {
    const porLote = agruparUnidadesPorLote({
      lotesVivos: LOTES,
      inventario: [],
      casillas: [{ itemId: '496', loteId: 'C-068' }],
    });
    expect(porLote.get('C-068')).toEqual([]);
  });

  it('un ítem de inventario sin loteId no se le atribuye a nadie', () => {
    const porLote = agruparUnidadesPorLote({
      lotesVivos: LOTES,
      inventario: [{ itemId: '496', estado: 'DISPONIBLE' }],
      casillas: [],
    });
    expect([...porLote.values()].flat()).toEqual([]);
  });

  it('cada lote vivo aparece como clave, aunque no tenga piezas', () => {
    // Un lote recién creado, con las casillas aún sin llenar, tiene que poder
    // reportarse como NO activo — y para eso su clave tiene que existir.
    const porLote = agruparUnidadesPorLote({
      lotesVivos: LOTES,
      inventario: [],
      casillas: [],
    });
    expect([...porLote.keys()].sort()).toEqual(['C-068', 'C-077']);
    expect(
      contarLotesActivos(
        [...porLote.values()].map((u) => u.map((estado) => ({ estado }))),
      ),
    ).toBe(0);
  });
});
