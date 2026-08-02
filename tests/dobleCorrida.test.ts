/**
 * La doble corrida ítem por ítem (SOT-V4-FASE1, punto 8) — compara lo que la
 * OPERACIÓN cobra hoy contra lo que el motor v4 recomendaría cobrar.
 *
 * **Qué columna de v3 es «el precio real»:** `precioFinalCOP` (columna M de la
 * pestaña Inventario). Es SHEET-OWNED desde 2026-07-23
 * (`convex/_lib/sheetPullMaps.ts`): un humano lo fija en la hoja y viaja de
 * vuelta a Convex; `costoBaseCOP × 2.6` solo es la semilla de un ítem nuevo.
 * Es la lista de precios oficial del catálogo, no una fórmula.
 *
 * `AT` («Precio objetivo (modelo)») NO es esta columna: es el objetivo que
 * calculaba el xlsx viejo a mano, `preserve: true`, y es justamente el modelo
 * que el motor v4 reemplaza — no la vara contra la que compararlo. `AU`
 * («Caja: precio venta») tampoco: es el valor de una transacción de caja, no
 * el precio de lista.
 *
 * **Qué de v4 se compara:** `precioObjetivoUnidadCOP` — «supervivencia + 30%
 * de margen neto», el equivalente v4 de un precio de catálogo (no
 * `equilibrioRealUnidadCOP`, que es el piso de no perder plata, ni `KUnidadCOP`,
 * que ni siquiera viaja al espejo).
 *
 * Es reporte, no corrección (dictamen de Kevin): la función no decide cuál
 * precio es el correcto, solo mide la diferencia y por qué un ítem no se pudo
 * comparar.
 */
import { describe, it, expect } from 'vitest';
import {
  compararPreciosItemV3vsV4,
  resumirComparacion,
} from '../convex/_lib/dobleCorrida';

// Los mismos cuatro ítems y los mismos `precioObjetivoUnidadCOP` pinneados en
// `tests/motorUnidad.test.ts` (lote 10, patrón oro de la auditoría del 25/07).
const PRECIOS_V4 = new Map([
  [
    '372',
    { precioObjetivoUnidadCOP: 665_681, categoriaFiscal: 'gema' as const },
  ],
  [
    '373',
    { precioObjetivoUnidadCOP: 874_126, categoriaFiscal: 'gema' as const },
  ],
  [
    '374',
    { precioObjetivoUnidadCOP: 201_721, categoriaFiscal: 'gema' as const },
  ],
  [
    '375',
    { precioObjetivoUnidadCOP: 564_820, categoriaFiscal: 'gema' as const },
  ],
]);

describe('compararPreciosItemV3vsV4', () => {
  it('calcula la diferencia en COP y en % cuando ambos precios existen', () => {
    const filasV3 = [{ itemId: '372', precioFinalCOP: 700_000 }];
    const [c] = compararPreciosItemV3vsV4(filasV3, PRECIOS_V4);
    expect(c.precioV3COP).toBe(700_000);
    expect(c.precioV4COP).toBe(665_681);
    expect(c.diferenciaCOP).toBe(665_681 - 700_000);
    expect(c.diferenciaPct).toBeCloseTo((665_681 - 700_000) / 700_000, 10);
    expect(c.motivo).toBeUndefined();
  });

  it('la diferencia es v4 menos v3: positiva cuando el motor pide MÁS que hoy', () => {
    const filasV3 = [{ itemId: '374', precioFinalCOP: 150_000 }];
    const [c] = compararPreciosItemV3vsV4(filasV3, PRECIOS_V4);
    expect(c.diferenciaCOP).toBe(201_721 - 150_000);
    expect(c.diferenciaCOP).toBeGreaterThan(0);
  });

  it('un ítem sin precioFinalCOP en la hoja no se compara, y dice por qué', () => {
    const filasV3 = [{ itemId: '372', precioFinalCOP: undefined }];
    const [c] = compararPreciosItemV3vsV4(filasV3, PRECIOS_V4);
    expect(c.precioV3COP).toBeUndefined();
    expect(c.diferenciaCOP).toBeUndefined();
    expect(c.diferenciaPct).toBeUndefined();
    expect(c.motivo).toMatch(/precioFinalCOP/);
    // Igual reporta lo que v4 sí sabe, para que el reporte no lo esconda.
    expect(c.precioV4COP).toBe(665_681);
  });

  it('un precioFinalCOP de 0 en la hoja cuenta como ausente, no como precio', () => {
    const filasV3 = [{ itemId: '372', precioFinalCOP: 0 }];
    const [c] = compararPreciosItemV3vsV4(filasV3, PRECIOS_V4);
    expect(c.motivo).toMatch(/precioFinalCOP/);
  });

  it('un ítem que v4 no cotiza no se compara, y dice por qué', () => {
    const filasV3 = [{ itemId: '999', precioFinalCOP: 500_000 }];
    const [c] = compararPreciosItemV3vsV4(filasV3, PRECIOS_V4);
    expect(c.precioV3COP).toBe(500_000);
    expect(c.precioV4COP).toBeUndefined();
    expect(c.motivo).toMatch(/no cotiza/);
  });

  it('un ítem que existe en v4 pero no en la hoja v3 también se reporta', () => {
    const c = compararPreciosItemV3vsV4([], PRECIOS_V4).find(
      (x) => x.itemId === '372',
    );
    expect(c?.precioV4COP).toBe(665_681);
    expect(c?.motivo).toMatch(/hoja/);
  });

  it('no duplica un itemId repetido en la hoja', () => {
    const filasV3 = [
      { itemId: '372', precioFinalCOP: 700_000 },
      { itemId: '372', precioFinalCOP: 999_999 },
    ];
    expect(
      compararPreciosItemV3vsV4(filasV3, PRECIOS_V4).filter(
        (c) => c.itemId === '372',
      ),
    ).toHaveLength(1);
  });

  it('produce una fila por cada ítem de la unión v3 ∪ v4, sin perder ninguno', () => {
    const filasV3 = [
      { itemId: '372', precioFinalCOP: 700_000 },
      { itemId: '999', precioFinalCOP: 500_000 },
    ];
    const salida = compararPreciosItemV3vsV4(filasV3, PRECIOS_V4);
    // 372,373,374,375 de v4 + 999 exclusivo de v3 = 5, sin duplicar 372.
    expect(salida.map((c) => c.itemId).sort()).toEqual(
      ['372', '373', '374', '375', '999'].sort(),
    );
  });
});

describe('resumirComparacion', () => {
  it('agrega mediana y buckets, no un total — la lección del divisor', () => {
    // Tres ítems comparables: -10%, 0%, +20%. Mediana = 0%.
    const comparaciones = [
      {
        itemId: 'a',
        precioV3COP: 100,
        precioV4COP: 90,
        diferenciaCOP: -10,
        diferenciaPct: -0.1,
      },
      {
        itemId: 'b',
        precioV3COP: 100,
        precioV4COP: 100,
        diferenciaCOP: 0,
        diferenciaPct: 0,
      },
      {
        itemId: 'c',
        precioV3COP: 100,
        precioV4COP: 120,
        diferenciaCOP: 20,
        diferenciaPct: 0.2,
      },
    ];
    const resumen = resumirComparacion(comparaciones);
    expect(resumen.comparables).toBe(3);
    expect(resumen.medianaDiferenciaPct).toBeCloseTo(0, 10);
    expect(resumen.sobre10Pct).toBe(1); // solo 'c', 20% > 10%
  });

  it('la mediana de un número par de ítems promedia los dos del medio', () => {
    const comparaciones = [
      {
        itemId: 'a',
        precioV3COP: 100,
        precioV4COP: 90,
        diferenciaCOP: -10,
        diferenciaPct: -0.1,
      },
      {
        itemId: 'b',
        precioV3COP: 100,
        precioV4COP: 95,
        diferenciaCOP: -5,
        diferenciaPct: -0.05,
      },
      {
        itemId: 'c',
        precioV3COP: 100,
        precioV4COP: 105,
        diferenciaCOP: 5,
        diferenciaPct: 0.05,
      },
      {
        itemId: 'd',
        precioV3COP: 100,
        precioV4COP: 110,
        diferenciaCOP: 10,
        diferenciaPct: 0.1,
      },
    ];
    expect(resumirComparacion(comparaciones).medianaDiferenciaPct).toBeCloseTo(
      0,
      10,
    );
  });

  it('agrupa lo que no se pudo comparar por motivo, sin perderlo en la mediana', () => {
    const comparaciones = [
      {
        itemId: 'a',
        precioV3COP: 100,
        precioV4COP: 90,
        diferenciaCOP: -10,
        diferenciaPct: -0.1,
      },
      { itemId: 'x', motivo: 'sin precioFinalCOP en el SOT v3' },
      { itemId: 'y', motivo: 'sin precioFinalCOP en el SOT v3' },
      { itemId: 'z', motivo: 'v4 no cotiza el ítem' },
    ];
    const resumen = resumirComparacion(comparaciones);
    expect(resumen.comparables).toBe(1);
    expect(resumen.sinComparar).toContainEqual({
      motivo: 'sin precioFinalCOP en el SOT v3',
      cantidad: 2,
    });
    expect(resumen.sinComparar).toContainEqual({
      motivo: 'v4 no cotiza el ítem',
      cantidad: 1,
    });
  });

  it('con cero comparables la mediana es 0, no NaN', () => {
    expect(resumirComparacion([]).medianaDiferenciaPct).toBe(0);
  });
});
