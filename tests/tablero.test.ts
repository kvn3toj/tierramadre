/**
 * La pestaña Tablero — el motor agregado.
 *
 * En el xlsx el Tablero tenía 8 indicadores y **solo 1 vivo**, y ese estaba
 * inflado por el doble conteo de C-010. Acá los valores los calcula Convex y la
 * hoja es una vista, así que no hay fórmula que se pueda romper desde la celda.
 *
 * Una fila por mes (`idFila = AAAA-MM`, decisión de Kevin): el modelo ya es por
 * período —`configPrecios` versiona los gastos fijos justamente para que un
 * cambio de tasa no reprecie el pasado— y doce filas muestran la película que
 * una sola fila viva no puede: cómo se movió el fijo unitario cuando entró
 * inventario, y cuándo cambió la regla vigente.
 */
import { describe, it, expect } from 'vitest';
import { CONFIG_PRECIOS_2026_07 } from '../convex/_lib/motorPrecios';
import { periodoDeBogota, construirTablero } from '../convex/_lib/tablero';

const CFG = CONFIG_PRECIOS_2026_07;

describe('periodoDeBogota — la frontera del mes es America/Bogota', () => {
  // Colombia no tiene horario de verano, así que el offset es fijo −05:00 y no
  // hace falta una tabla de zonas. Usar UTC mandaría al mes siguiente todo lo
  // que pase después de las 19:00 del último día.
  it('las 23:00 del 31 de agosto en Bogotá siguen siendo agosto', () => {
    // 2026-09-01T04:00Z = 2026-08-31 23:00 en Bogotá.
    expect(periodoDeBogota(Date.parse('2026-09-01T04:00:00Z'))).toBe('2026-08');
  });

  it('las 00:30 del 1 de septiembre en Bogotá ya son septiembre', () => {
    // 2026-09-01T05:30Z = 2026-09-01 00:30 en Bogotá.
    expect(periodoDeBogota(Date.parse('2026-09-01T05:30:00Z'))).toBe('2026-09');
  });

  it('el mediodía de un día cualquiera cae en su mes', () => {
    expect(periodoDeBogota(Date.parse('2026-08-01T17:00:00Z'))).toBe('2026-08');
  });

  it('el cambio de año también respeta el huso', () => {
    // 2027-01-01T04:00Z = 2026-12-31 23:00 en Bogotá.
    expect(periodoDeBogota(Date.parse('2027-01-01T04:00:00Z'))).toBe('2026-12');
  });
});

const BASE = {
  periodo: '2026-08',
  config: CFG,
  lotesActivos: 88,
  inventarioActivoCOP: 71_769_301,
  ventas: [] as {
    precioVentaRealCOP: number;
    KUnidadCOP: number;
    categoriaFiscal: 'gema' | 'joya';
  }[],
};

describe('las columnas computables', () => {
  it('el gasto fijo del mes y el divisor salen de la config y del conteo', () => {
    const t = construirTablero(BASE);
    expect(t.gastosFijosMesCOP).toBe(33_651_815);
    expect(t.lotesActivos).toBe(88);
    // El número que la operación usa hoy: $33.651.815 ÷ 88.
    expect(t.costoFijoUnitarioCOP).toBe(382_407);
  });

  it('sin ventas, las ventas del mes son 0 y el margen también', () => {
    const t = construirTablero(BASE);
    expect(t.ventasMesCOP).toBe(0);
    expect(t.margenBrutoMesCOP).toBe(0);
  });

  it('el inventario de colección es OTRA celda — no se suma al operativo (punto 5)', () => {
    // Ausente ⇒ 0, igual que inventarioActivoCOP: es una Σ que naturalmente
    // es cero sin datos, no un valor fabricado.
    expect(construirTablero(BASE).inventarioColeccionCOP).toBe(0);
    const t = construirTablero({
      ...BASE,
      inventarioColeccionCOP: 1_777_030_371,
    });
    expect(t.inventarioColeccionCOP).toBe(1_777_030_371);
    // Y el operativo no se mueve por tener un valor de colección: son dos
    // negocios, dos celdas — el titular deja de medir los dos en una sola.
    expect(t.inventarioActivoCOP).toBe(71_769_301);
  });

  it('sin ventas, el punto de equilibrio queda AUSENTE, no en cero', () => {
    // Un 0 se leería como «el mes ya se cubrió». Vacío se lee como lo que es.
    expect(construirTablero(BASE).puntoEquilibrioUnidades).toBeUndefined();
  });

  it('suma las ventas del período y su margen, con comisión e IVA sobre el precio', () => {
    const t = construirTablero({
      ...BASE,
      ventas: [
        // Gema: 10% de comisión, sin IVA.
        {
          precioVentaRealCOP: 1_000_000,
          KUnidadCOP: 600_000,
          categoriaFiscal: 'gema',
        },
        // Joya: 10% + 19%.
        {
          precioVentaRealCOP: 2_000_000,
          KUnidadCOP: 900_000,
          categoriaFiscal: 'joya',
        },
      ],
    });
    expect(t.ventasMesCOP).toBe(3_000_000);
    // (1.000.000×0,90 − 600.000) + (2.000.000×0,71 − 900.000)
    expect(t.margenBrutoMesCOP).toBe(300_000 + 520_000);
  });

  it('la utilidad neta del mes descuenta el gasto fijo COMPLETO, no el unitario', () => {
    // A nivel mes el gasto fijo es el del mes entero: repartirlo sería contarlo
    // dos veces, porque el reparto ya está dentro de cada K unitario.
    const t = construirTablero({
      ...BASE,
      ventas: [
        {
          precioVentaRealCOP: 1_000_000,
          KUnidadCOP: 600_000,
          categoriaFiscal: 'gema',
        },
      ],
    });
    expect(t.utilidadNetaEstimadaCOP).toBe(300_000 - 33_651_815);
  });
});

describe('ventasEstimadasMesCOP — dato de entrada, jamás inventado', () => {
  it('cuando Kevin no la dictó, ella y la brecha quedan AUSENTES', () => {
    // El `B11` del xlsx era `=B4*2,5`, un multiplicador hardcodeado que nadie
    // decidió. Un cero inventado en su lugar sería el mismo defecto con otra
    // cara.
    const t = construirTablero(BASE);
    expect(t.ventasEstimadasMesCOP).toBeUndefined();
    expect(t.brechaVsVentasEstimadasCOP).toBeUndefined();
  });

  it('cuando la dictó, la brecha es estimada − real', () => {
    const t = construirTablero({
      ...BASE,
      config: { ...CFG, ventasEstimadasMesCOP: 50_000_000 },
      ventas: [
        {
          precioVentaRealCOP: 20_000_000,
          KUnidadCOP: 1,
          categoriaFiscal: 'gema',
        },
      ],
    });
    expect(t.ventasEstimadasMesCOP).toBe(50_000_000);
    expect(t.brechaVsVentasEstimadasCOP).toBe(30_000_000);
  });

  it('vender por encima de la estimada da una brecha negativa, no cero', () => {
    const t = construirTablero({
      ...BASE,
      config: { ...CFG, ventasEstimadasMesCOP: 10_000_000 },
      ventas: [
        {
          precioVentaRealCOP: 12_000_000,
          KUnidadCOP: 1,
          categoriaFiscal: 'gema',
        },
      ],
    });
    expect(t.brechaVsVentasEstimadasCOP).toBe(-2_000_000);
  });
});

describe('reglaVigente por período', () => {
  it('agosto 2026 está en remate', () => {
    expect(construirTablero({ ...BASE, periodo: '2026-08' }).reglaVigente).toBe(
      'remate',
    );
  });

  it('septiembre 2026 ya cotiza al objetivo', () => {
    // La transición del 1/09 va a quedar visible en la hoja sin que nadie la
    // anote: agosto dirá `remate`, septiembre dirá `objetivo`.
    expect(construirTablero({ ...BASE, periodo: '2026-09' }).reglaVigente).toBe(
      'objetivo',
    );
  });
});
