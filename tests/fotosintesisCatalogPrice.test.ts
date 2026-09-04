import { describe, it, expect } from 'vitest';
import {
  mapRowToTreasureItem,
  type PublishedRow,
} from '../src/hooks/useFotosintesisCatalog';

/**
 * Regression guard for the "$ 0 desde el ítem ~318" bug (2026-07-22).
 *
 * Convex prod was migrated to SOT v3 (publishedCatalog stopped projecting the
 * retired `precioEmbajadorCOP` and started projecting the derived
 * `precioFinalCOP`) BEFORE the frontend was deployed. The deployed mapper still
 * read `row.precioEmbajadorCOP ?? 0`, so every Convex-only item — exactly the
 * ones above the Sheets range, i.e. 323→472 — rendered at $ 0 while the
 * Sheets-backed items 1–317 kept their price.
 *
 * These tests pin the two invariants that failure violated:
 *   1. the catalog price comes from `precioFinalCOP`;
 *   2. a finished piece ("Joyería Artesanal") is flagged as jewelry, so the
 *      card shows the joya treatment instead of the loose-gem "Gema" chip.
 */

const row = (extra: Partial<PublishedRow> = {}): PublishedRow => ({
  itemId: '411',
  nombre: 'Aretes',
  ...extra,
});

describe('mapRowToTreasureItem — catalog price (SOT v3)', () => {
  it('reads the derived precioFinalCOP', () => {
    expect(
      mapRowToTreasureItem(row({ precioFinalCOP: 104_000 })).precioCOP,
    ).toBe(104_000);
  });

  it('falls back to 0 only when the item genuinely has no derived price', () => {
    // Insumos/topos with no costoBaseCOP legitimately carry no price.
    expect(mapRowToTreasureItem(row({ categoria: 'Insumo' })).precioCOP).toBe(
      0,
    );
  });

  it('never resurrects the retired tier fields as a price source', () => {
    const legacy = row({
      precioEmbajadorCOP: 800_000,
    } as Partial<PublishedRow>);
    expect(mapRowToTreasureItem(legacy).precioCOP).toBe(0);
  });
});

describe('mapRowToTreasureItem — jewelry detection', () => {
  it("treats 'Joyería Artesanal' as jewelry (accents and case tolerated)", () => {
    for (const categoria of [
      'Joyería Artesanal',
      'joyeria artesanal',
      '  JOYERÍA ARTESANAL  ',
    ]) {
      expect(mapRowToTreasureItem(row({ categoria })).isJewelry).toBe(true);
    }
  });

  it('keeps loose-gem categories as non-jewelry', () => {
    expect(
      mapRowToTreasureItem(row({ categoria: 'Gema Facetada', peso: '0.53' }))
        .isJewelry,
    ).toBe(false);
  });
});

/**
 * El ancla en dólares (columna BG, 2026-09-01).
 *
 * #547 Anillo Tiempo y #548 Anillo Semilla valen US$17.100 y US$36.200. Ese
 * número se escribió una vez como si fueran pesos, y el arreglo provisional
 * —M = US$ × TRM del día— volvió a atarlos a una tasa congelada: el 2026-09-04,
 * con la TRM en 3.141,36 contra los 3.213,97 del stop-gap, la vitrina los
 * cobraba US$395 y US$837 de más. Un precio en dólares no puede depender de
 * cuándo se calculó.
 *
 * La regla: BG > 0 ⇒ el dólar manda y el peso se deriva con la TRM del día.
 *
 * El caso que más importa es el último: SIN TRM se cae a `precioFinalCOP`, no a
 * cero. Un cero en esta función es «Consultar precio» en la vitrina — es
 * literalmente el bug que este archivo vigila desde 2026-07-22, y una TRM
 * ausente no puede reintroducirlo por la puerta de atrás.
 */
describe('mapRowToTreasureItem — ancla en dólares (col BG)', () => {
  const TRM = 3141.36;

  it('anclado: el precio es round(USD × TRM), y M se ignora', () => {
    const anclado = row({ precioFinalUSD: 17_100, precioFinalCOP: 54_958_887 });
    expect(mapRowToTreasureItem(anclado, { trmRate: TRM }).precioCOP).toBe(
      Math.round(17_100 * TRM),
    );
  });

  it('el viaje de ida y vuelta es exacto: 36.200 vuelve 36.200, no 36.199', () => {
    const cop = mapRowToTreasureItem(row({ precioFinalUSD: 36_200 }), {
      trmRate: TRM,
    }).precioCOP;
    expect(Math.round(cop / TRM)).toBe(36_200);
  });

  it('sin ancla (BG vacío): sigue mandando precioFinalCOP', () => {
    expect(
      mapRowToTreasureItem(row({ precioFinalCOP: 104_000 }), { trmRate: TRM })
        .precioCOP,
    ).toBe(104_000);
  });

  it('BG = 0 significa DESANCLADO, no «gratis» — vuelve a M', () => {
    // Desanclar se hace escribiendo 0, no vaciando la celda: el pull omite a
    // propósito la celda vaciada («never clear a number from a blanked cell»).
    // Si 0 se tratara como ancla, la pieza saldría en $0.
    expect(
      mapRowToTreasureItem(row({ precioFinalUSD: 0, precioFinalCOP: 104_000 }), {
        trmRate: TRM,
      }).precioCOP,
    ).toBe(104_000);
  });

  it('sin TRM utilizable cae a M — nunca a 0', () => {
    const anclado = row({ precioFinalUSD: 17_100, precioFinalCOP: 54_958_887 });
    for (const trmRate of [undefined, 0, Number.NaN, -1]) {
      expect(mapRowToTreasureItem(anclado, { trmRate }).precioCOP).toBe(
        54_958_887,
      );
    }
    // Y sin opts en absoluto (los llamadores viejos, antes de pasar la TRM).
    expect(mapRowToTreasureItem(anclado).precioCOP).toBe(54_958_887);
  });

  it('un ancla sin M no inventa un cero silencioso: usa el ancla', () => {
    expect(
      mapRowToTreasureItem(row({ precioFinalUSD: 36_200 }), { trmRate: TRM })
        .precioCOP,
    ).toBe(Math.round(36_200 * TRM));
  });
});
