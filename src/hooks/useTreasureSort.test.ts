/**
 * @vitest-environment jsdom
 *
 * Regresión del 2026-08-19: TODAS las cards de lote agrupadas aparecían de
 * primeras en el grid del treasure browser, en orden de hash, en vez de
 * mezclarse con los recientes.
 *
 * El sort por defecto "newest" asume "número de ítem más alto = más nuevo",
 * y las cards de grupo llevan un `item` SINTÉTICO en el rango 8.000.000+
 * (hashGroupId, elegido alto justo para no colisionar con los números reales,
 * que van por los cientos). 8M le gana a cualquier ítem real, así que cada
 * lote se iba al tope. La recencia verdadera de un bundle es su miembro más
 * nuevo (`newestMemberItem`), y por él ordena ahora.
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTreasureSort, rankItem } from './useTreasureSort';
import type { TreasureItem } from '../types';

function item(n: number, extra: Partial<TreasureItem> = {}): TreasureItem {
  return {
    item: n,
    nombre: `item-${n}`,
    precioCOP: 100000,
    precioInternacional: 0,
    fechaIngreso: '',
    peso: 1,
    color: 'Verde',
    calidad: 'COMERCIAL',
    talla: '',
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
    imagen: 'x.jpg',
    ...extra,
  } as TreasureItem;
}

const loteCard = (syntheticKey: number, newestMemberItem: number) =>
  item(syntheticKey, {
    isLote: true,
    groupId: `lote:${newestMemberItem}`,
    newestMemberItem,
  });

describe('useTreasureSort "newest" — los lotes ordenan por su miembro más nuevo', () => {
  it('un lote NO le gana a ítems más recientes que sus miembros (la regresión del grid)', () => {
    const treasure = [
      loteCard(8_123_456, 470), // bundle cuyo miembro más nuevo es #470
      item(574),
      item(320),
    ];
    const { result } = renderHook(() => useTreasureSort(treasure, 'newest'));
    expect(result.current.map((t) => t.item)).toEqual([574, 8_123_456, 320]);
  });

  it('un lote con el miembro MÁS nuevo del catálogo sí encabeza', () => {
    const treasure = [item(560), loteCard(8_999_999, 574), item(320)];
    const { result } = renderHook(() => useTreasureSort(treasure, 'newest'));
    expect(result.current[0].item).toBe(8_999_999);
  });

  it('"item-number" ascendente también usa la recencia real del lote', () => {
    const treasure = [item(574), loteCard(8_000_001, 100), item(320)];
    const { result } = renderHook(() =>
      useTreasureSort(treasure, 'item-number'),
    );
    expect(result.current.map((t) => t.item)).toEqual([8_000_001, 320, 574]);
  });

  it('rankItem: un ítem individual ordena por su propio número, sin cambios', () => {
    expect(rankItem(item(574))).toBe(574);
    expect(rankItem(loteCard(8_123_456, 470))).toBe(470);
  });
});
