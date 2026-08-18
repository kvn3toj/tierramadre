/**
 * @vitest-environment jsdom
 *
 * F4 (2026-08 fix round, control-de-acceso-al-catalogo): `precioCOP` is a
 * non-optional `number` on TreasureItem, but the server-side catalog
 * projection (api/_lib/catalogProjection.ts) never sends the key at all for
 * anon/guest callers — so at runtime it comes back `undefined`, not `0`.
 * The pre-fix filter (`!(item.precioCOP > 0)`) could not tell "withheld"
 * apart from "priced at zero" and dropped every row for a guest, landing an
 * asesor's invitation link on a blank browser (loginAsGuest resolves `anon`
 * with no token). These tests pin the fix: a withheld price must not remove
 * a row, while a genuinely zero-priced row (e.g. a lote parent, retired to 0
 * so its value isn't double-counted against its child pieces) still does.
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTreasureFiltering } from './useTreasureFiltering';
import type { TreasureItem } from '../types';

function baseFields() {
  return {
    fechaIngreso: '',
    nombre: 'Esmeralda de prueba',
    peso: 1,
    color: 'Verde',
    calidad: 'COMERCIAL',
    talla: 'Esmeralda',
    medidas: '',
    medidasValores: '',
    categoria: 'Gema',
    coleccion: '',
    cantidad: 1,
    ubicacion: '',
    asesor: '',
    estado: 'DISPONIBLE',
    qr: '',
    caja: '',
    asesorActual: '',
    estadoAsesor: '',
    isJewelry: false,
  };
}

/** A row shaped like what a signed-in asesor gets — precioCOP is a real number. */
function pricedItem(item: number, precioCOP: number): TreasureItem {
  return {
    item,
    precioCOP,
    precioInternacional: 0,
    ...baseFields(),
  } as TreasureItem;
}

/**
 * A row shaped like what an anon/guest caller gets: `precioCOP`, `estado`
 * AND `cantidad` are genuinely ABSENT (not present as keys at all — all three
 * are WITHHELD_KEYS, withheld together), mirroring what `toPublicItem`
 * produces and what a guest's browser receives over the wire —
 * `JSON.stringify` drops undefined-valued keys, so all three read `undefined`
 * at runtime despite TreasureItem's type saying `number`/`TreasureStatus`.
 * `city` is withheld too and is simply never set here (it's optional on
 * TreasureItem and no producer populates it).
 */
function priceFreeItem(item: number): TreasureItem {
  const { estado: _estado, cantidad: _cantidad, ...rest } = baseFields();
  return { item, ...rest } as unknown as TreasureItem;
}

describe('useTreasureFiltering — priceless rows (F4)', () => {
  it('does NOT drop a price-free row — the invited-guest blank-catalog regression', () => {
    const { result } = renderHook(() =>
      useTreasureFiltering({
        treasure: [priceFreeItem(1)],
        inactivityTimeoutMinutes: 0,
      }),
    );
    expect(result.current.filteredTreasure).toHaveLength(1);
    expect(result.current.filteredTreasure[0].item).toBe(1);
  });

  it('a whole guest catalog (every row price-free) is not emptied', () => {
    const { result } = renderHook(() =>
      useTreasureFiltering({
        treasure: [priceFreeItem(1), priceFreeItem(2), priceFreeItem(3)],
        inactivityTimeoutMinutes: 0,
      }),
    );
    expect(result.current.filteredTreasure).toHaveLength(3);
  });

  it('STILL drops a genuinely zero-priced row (e.g. a lote parent retired to 0)', () => {
    const { result } = renderHook(() =>
      useTreasureFiltering({
        treasure: [pricedItem(1, 0), pricedItem(2, 635000)],
        inactivityTimeoutMinutes: 0,
      }),
    );
    expect(result.current.filteredTreasure.map((i) => i.item)).toEqual([2]);
  });

  it('una fila PUBLICADA por Fotosíntesis sin precio SÍ se muestra — "Consultar precio" (2026-08-18)', () => {
    // El caso C-090: ítems publicados sin costear. Sólo el puente Fotosíntesis
    // estampa publishedAt, así que su presencia distingue "aún sin costear"
    // (mostrar, PriceDisplay pinta "Consultar precio") de un padre legacy
    // retirado a 0 (ocultar, como pina el test de arriba).
    const publicadaSinPrecio = {
      ...pricedItem(544, 0),
      publishedAt: 1787000000000,
    };
    const { result } = renderHook(() =>
      useTreasureFiltering({
        treasure: [publicadaSinPrecio, pricedItem(2, 635000), pricedItem(3, 0)],
        inactivityTimeoutMinutes: 0,
      }),
    );
    expect(result.current.filteredTreasure.map((i) => i.item).sort()).toEqual([
      2, 544,
    ]);
  });

  it('a price-free row still passes an active price-range filter — the range cannot exclude what it cannot compare', () => {
    const { result } = renderHook(() =>
      useTreasureFiltering({
        treasure: [priceFreeItem(1)],
        initialFilters: { priceRange: [100, 200] },
        inactivityTimeoutMinutes: 0,
      }),
    );
    expect(result.current.filteredTreasure).toHaveLength(1);
  });

  it('an explicit item (QR/quotation deep link) still passes even when priced zero', () => {
    const { result } = renderHook(() =>
      useTreasureFiltering({
        treasure: [pricedItem(1, 0)],
        initialFilters: { itemsFilter: [1] },
        inactivityTimeoutMinutes: 0,
      }),
    );
    expect(result.current.filteredTreasure).toHaveLength(1);
  });
});

describe('useTreasureFiltering — withheld estado (N4, 2026-08 fix round 3)', () => {
  it('a guest row (estado withheld) passes statusFilter: "available" — MoreSheetSearch.tsx hard-codes this and returned zero results for every guest query before this fix', () => {
    const { result } = renderHook(() =>
      useTreasureFiltering({
        treasure: [priceFreeItem(1)],
        initialFilters: { statusFilter: 'available' },
        inactivityTimeoutMinutes: 0,
      }),
    );
    expect(result.current.filteredTreasure).toHaveLength(1);
  });

  it('a guest row (estado withheld) passes statusFilter: "sold" too — withheld means "cannot evaluate", not "fails every filter"', () => {
    const { result } = renderHook(() =>
      useTreasureFiltering({
        treasure: [priceFreeItem(1)],
        initialFilters: { statusFilter: 'sold' },
        inactivityTimeoutMinutes: 0,
      }),
    );
    expect(result.current.filteredTreasure).toHaveLength(1);
  });

  it('a staff row (estado known) is still correctly filtered by statusFilter — the fix does not disable status filtering for staff', () => {
    const disponible = pricedItem(1, 100);
    const vendida = {
      ...pricedItem(2, 200),
      estado: 'VENDIDA',
    } as TreasureItem;
    const { result } = renderHook(() =>
      useTreasureFiltering({
        treasure: [disponible, vendida],
        initialFilters: { statusFilter: 'available' },
        inactivityTimeoutMinutes: 0,
      }),
    );
    expect(result.current.filteredTreasure.map((i) => i.item)).toEqual([1]);
  });
});
