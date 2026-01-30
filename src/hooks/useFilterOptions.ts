/**
 * useFilterOptions Hook
 * Computes available filter values (colors, shapes, qualities, etc.) from treasure data.
 * Extracted from useTreasureFiltering for modularity.
 */
import { useMemo } from 'react';
import { TreasureItem } from '../types';
import { normalizeQuality, normalizeColor } from '../constants/quality-and-colors';

export interface FilterOptions {
  colors: string[];
  shapes: string[];
  qualities: string[];
  cantidades: number[];
  colecciones: string[];
  priceMinMax: { min: number; max: number };
}

export function useFilterOptions(treasure: TreasureItem[]): FilterOptions {
  const priceMinMax = useMemo(() => {
    const prices = treasure.map(item => item.precioCOP).filter(p => p > 0);
    if (prices.length === 0) return { min: 0, max: 100000000 };
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [treasure]);

  const filterOptions = useMemo(() => {
    const colors = new Set<string>();
    const shapes = new Set<string>();
    const qualities = new Set<string>();
    const cantidades = new Set<number>();
    const colecciones = new Set<string>();

    treasure.forEach(item => {
      const normalizedColor = normalizeColor(item.color);
      const normalizedQuality = normalizeQuality(item.calidad);

      if (normalizedColor) colors.add(normalizedColor);
      if (item.talla) shapes.add(item.talla);
      if (normalizedQuality) qualities.add(normalizedQuality);
      if (item.cantidad) cantidades.add(item.cantidad);
      if (item.coleccion) colecciones.add(item.coleccion);
    });

    return {
      colors: Array.from(colors).sort(),
      shapes: Array.from(shapes).sort(),
      qualities: Array.from(qualities).sort(),
      cantidades: Array.from(cantidades).sort((a, b) => a - b),
      colecciones: Array.from(colecciones).sort(),
      priceMinMax,
    };
  }, [treasure, priceMinMax]);

  return filterOptions;
}
