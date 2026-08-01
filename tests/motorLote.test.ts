/**
 * Las cinco columnas del motor de Lotes que no tenían definición.
 *
 * Cuatro tienen fórmula auditada en el xlsx (§2 de
 * `tierramadre-modelo-fijacion-precios-v2`, celdas E5 y E10–E12) y la quinta
 * —`brechaVsVentasEstimadasCOP`— **se muda al Tablero**: por lote nunca tuvo
 * sentido, en la hoja era modelo-global (E13).
 *
 * Los dos casos de paridad son los mismos que el resto del motor usa, así que
 * cualquier deriva se ve contra números ya verificados contra el archivo vivo:
 * lote 10 (gema, /0,60) y lote 14 (joya, /0,41).
 */
import { describe, it, expect } from 'vitest';
import { CONFIG_PRECIOS_2026_07 } from '../convex/_lib/motorPrecios';
import { metricasDelLote } from '../convex/_lib/motorLote';

const CFG = CONFIG_PRECIOS_2026_07;

/** Lote 10 — gemas facetadas, sin IVA. §5.2 de la referencia. */
const LOTE_10 = {
  costoCompraCOP: 931_931,
  costosVariablesCOP: 9_091,
  costoFijoUnitarioCOP: 442_787,
  unidadesDeclaradas: 4,
  categoriaFiscal: 'gema' as const,
  config: CFG,
};

/** Lote 14 — 9 piezas de joyería, con IVA. §5.3 de la referencia. */
const LOTE_14 = {
  costoCompraCOP: 893_996,
  costosVariablesCOP: 9_091,
  costoFijoUnitarioCOP: 442_787,
  unidadesDeclaradas: 9,
  categoriaFiscal: 'joya' as const,
  config: CFG,
};

describe('la cadena base sigue dando los números pinneados', () => {
  it('lote 10: K $1.383.809 y objetivo $2.306.348', () => {
    const m = metricasDelLote(LOTE_10);
    expect(m.precioEquilibrioCOP).toBe(1_383_809);
    expect(m.precioObjetivoCOP).toBe(2_306_348);
    expect(m.equilibrioRealCOP).toBe(1_537_566);
  });

  it('lote 14: K $1.345.874 y objetivo $3.282.620', () => {
    const m = metricasDelLote(LOTE_14);
    expect(m.precioEquilibrioCOP).toBe(1_345_874);
    expect(m.precioObjetivoCOP).toBe(3_282_620);
    expect(m.equilibrioRealCOP).toBe(1_895_597);
  });
});

describe('multiplicadorMinimo — E5 = E4/B4, contra la COMPRA', () => {
  it('lote 10: 1,4849× — K sobre el costo de compra', () => {
    // Explícitamente contra `costoCompraCOP`, no contra el costo total: dividir
    // por el landed cost daría un número más plano y más tranquilizador, y
    // taparía que un lote barato absorbe proporcionalmente más gasto fijo.
    expect(metricasDelLote(LOTE_10).multiplicadorMinimo).toBeCloseTo(1.4849, 4);
  });

  it('lote 14: 1,5055× — coincide con el «1,51×» de la auditoría', () => {
    expect(metricasDelLote(LOTE_14).multiplicadorMinimo).toBeCloseTo(1.5055, 4);
  });

  it('es siempre mayor que 1: K incluye el costo más el overhead', () => {
    expect(metricasDelLote(LOTE_10).multiplicadorMinimo).toBeGreaterThan(1);
  });
});

describe('margenBrutoEstimadoCOP — E10, con la comisión SOBRE EL PRECIO', () => {
  it('lote 10 (gema, sin IVA): $1.134.691', () => {
    // 2.306.348 − 931.931 − 9.091 − 10% de 2.306.348.
    expect(metricasDelLote(LOTE_10).margenBrutoEstimadoCOP).toBe(1_134_691);
  });

  it('lote 14 (joya): $1.427.573 — el IVA se lleva $623.698 más', () => {
    expect(metricasDelLote(LOTE_14).margenBrutoEstimadoCOP).toBe(1_427_573);
  });

  it('el fijo NO está descontado todavía: eso es la utilidad neta', () => {
    const m = metricasDelLote(LOTE_10);
    expect(m.margenBrutoEstimadoCOP - m.utilidadNetaEstimadaCOP).toBe(442_787);
  });
});

describe('utilidadNetaEstimadaCOP — E11, con el fijo DEL LOTE', () => {
  it('lote 10: $691.904', () => {
    expect(metricasDelLote(LOTE_10).utilidadNetaEstimadaCOP).toBe(691_904);
  });

  it('lote 14: $984.786', () => {
    expect(metricasDelLote(LOTE_14).utilidadNetaEstimadaCOP).toBe(984_786);
  });

  it('descuenta UN fijo, no uno por unidad', () => {
    // El candado del modelo: si se descontara `fijo × unidades`, un lote de 122
    // piezas cargaría 122 veces la estructura y ningún lote grande cerraría
    // nunca. D2 asigna el fijo POR LOTE.
    const nueve = metricasDelLote({ ...LOTE_10, unidadesDeclaradas: 9 });
    expect(nueve.utilidadNetaEstimadaCOP).toBe(691_904);
  });
});

describe('puntoEquilibrioUnidades — E12 adaptada al lote', () => {
  it('lote 10: 1,56 unidades cubren el fijo asignado al lote', () => {
    expect(metricasDelLote(LOTE_10).puntoEquilibrioUnidades).toBeCloseTo(
      1.5609,
      3,
    );
  });

  it('lote 14: 2,79 — la joya necesita más piezas pese a mejor margen bruto', () => {
    expect(metricasDelLote(LOTE_14).puntoEquilibrioUnidades).toBeCloseTo(
      2.7914,
      3,
    );
  });

  it('un lote más caro NO se vuelve deficitario: el objetivo sigue al costo', () => {
    // Vale la pena dejarlo fijado porque es contraintuitivo y define el modelo:
    // como el objetivo se DERIVA de K, el margen bruto al objetivo es siempre
    //   K × margenDeseado / divisor + fijo,
    // o sea estrictamente positivo por construcción. Un lote no puede quedar
    // cotizado a pérdida por ser caro — solo por venderse por debajo del
    // objetivo, que es otra cosa y la mide `margenNetoReal`.
    const caro = metricasDelLote({ ...LOTE_10, costoCompraCOP: 50_000_000 });
    expect(caro.margenBrutoEstimadoCOP).toBeGreaterThan(0);
    expect(caro.puntoEquilibrioUnidades).toBeDefined();

    // El margen se mide contra el objetivo YA REDONDEADO —el precio que de
    // verdad se cotiza—, no contra el K/0,60 ideal. La diferencia es de un peso
    // en el lote 10 ($1.134.691 contra $1.134.692), y la versión correcta es la
    // que se puede cobrar.
    const m = metricasDelLote(LOTE_10);
    expect(m.margenBrutoEstimadoCOP).toBe(
      Math.round(2_306_348 * 0.9 - 931_931 - 9_091),
    );
  });

  it('sin unidades declaradas queda ausente', () => {
    expect(
      metricasDelLote({ ...LOTE_10, unidadesDeclaradas: 0 })
        .puntoEquilibrioUnidades,
    ).toBeUndefined();
  });
});

describe('reglaVigente y la salvedad del remate', () => {
  it('en agosto la regla vigente es remate, y el objetivo se reporta igual', () => {
    // Las cuatro fórmulas se calculan SOBRE EL OBJETIVO —es lo que la fórmula
    // dice— aunque hasta el 2026-08-31 lo que se cobra es K×1,3. `reglaVigente`
    // es lo que deja ver la diferencia, y el Léeme la explica.
    const m = metricasDelLote({ ...LOTE_10, fecha: '2026-08-15' });
    expect(m.reglaVigente).toBe('remate');
    expect(m.precioObjetivoCOP).toBe(2_306_348);
  });

  it('desde septiembre vuelve a regir el objetivo', () => {
    expect(
      metricasDelLote({ ...LOTE_10, fecha: '2026-09-01' }).reglaVigente,
    ).toBe('objetivo');
  });
});

describe('lo que se niega a calcular', () => {
  it('sin categoría fiscal revienta, sin default', () => {
    expect(() =>
      metricasDelLote({ ...LOTE_10, categoriaFiscal: undefined as never }),
    ).toThrow(/categor/i);
  });

  it('sin costo de compra revienta: no hay multiplicador contra cero', () => {
    expect(() => metricasDelLote({ ...LOTE_10, costoCompraCOP: 0 })).toThrow();
  });
});
