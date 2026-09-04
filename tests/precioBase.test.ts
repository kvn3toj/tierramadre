/**
 * `precioBaseCOP` — el precio que ve el escritorio de ventas.
 *
 * El catálogo ya resolvía el ancla en dólares; las cuatro pantallas de
 * Fotosíntesis no. Con #547 y #548 anclados, eso significaba que la vitrina
 * mostraba un precio y la venta se sembraba con otro: el peso provisional,
 * congelado a la TRM del 2026-09-01. Al 2026-09-04 la brecha era US$395 y
 * US$837 — y una venta creada así se cierra con el número equivocado.
 *
 * Lo que se fija acá es esa equivalencia: la misma pieza vale lo mismo en la
 * vitrina y en el kardex.
 */
import { describe, it, expect } from 'vitest';
import { precioBaseCOP, estaAncladoEnUSD } from '../src/utils/precioBase';
import { mapRowToTreasureItem } from '../src/hooks/useFotosintesisCatalog';

const TRM = 3141.36;

describe('precioBaseCOP', () => {
  it('anclado: round(USD × TRM), ignorando el peso provisional', () => {
    expect(
      precioBaseCOP({ precioFinalUSD: 17_100, precioFinalCOP: 54_958_887 }, TRM),
    ).toBe(Math.round(17_100 * TRM));
  });

  it('sin ancla: manda precioFinalCOP', () => {
    expect(precioBaseCOP({ precioFinalCOP: 104_000 }, TRM)).toBe(104_000);
  });

  it('BG = 0 es DESANCLADO, no «gratis»', () => {
    // Desanclar se hace escribiendo 0 y no vaciando la celda, porque el pull
    // omite a propósito la celda vaciada. Si 0 contara como ancla, la pieza
    // saldría en $0 en el kardex y en la venta.
    expect(
      precioBaseCOP({ precioFinalUSD: 0, precioFinalCOP: 104_000 }, TRM),
    ).toBe(104_000);
  });

  it('sin TRM utilizable cae al peso — nunca a 0', () => {
    const anclado = { precioFinalUSD: 17_100, precioFinalCOP: 54_958_887 };
    for (const trm of [undefined, 0, Number.NaN, -1]) {
      expect(precioBaseCOP(anclado, trm)).toBe(54_958_887);
    }
  });

  it('cae al riel legacy `precioCOP` sólo si no hay nada más', () => {
    expect(precioBaseCOP({ precioCOP: 90_000 }, TRM)).toBe(90_000);
    // Pero nunca por encima del campo vivo.
    expect(precioBaseCOP({ precioFinalCOP: 104_000, precioCOP: 90_000 }, TRM)).toBe(
      104_000,
    );
  });

  it('un ítem sin ningún precio devuelve undefined, no 0', () => {
    // `undefined` deja que cada pantalla decida (guion, semilla costo × 2.6…).
    // Un 0 se vería como un precio real de cero pesos.
    expect(precioBaseCOP({}, TRM)).toBeUndefined();
    expect(precioBaseCOP(null, TRM)).toBeUndefined();
  });

  it('estaAncladoEnUSD sólo acepta un número positivo finito', () => {
    expect(estaAncladoEnUSD(17_100)).toBe(true);
    for (const v of [0, -1, Number.NaN, Infinity, undefined]) {
      expect(estaAncladoEnUSD(v as number | undefined)).toBe(false);
    }
  });
});

describe('la vitrina y el escritorio de ventas coinciden', () => {
  it('el mismo ítem anclado vale lo mismo en las dos superficies', () => {
    const row = {
      itemId: '548',
      nombre: 'Anillo Semilla',
      precioFinalUSD: 36_200,
      precioFinalCOP: 116_345_714, // el provisional, que ninguna debe usar
    };
    const enVitrina = mapRowToTreasureItem(row, { trmRate: TRM }).precioCOP;
    const enVenta = precioBaseCOP(row, TRM);
    expect(enVenta).toBe(enVitrina);
    expect(enVitrina).toBe(Math.round(36_200 * TRM));
  });

  it('y también coinciden cuando NO hay ancla', () => {
    const row = { itemId: '411', nombre: 'Aretes', precioFinalCOP: 104_000 };
    expect(precioBaseCOP(row, TRM)).toBe(
      mapRowToTreasureItem(row, { trmRate: TRM }).precioCOP,
    );
  });
});
