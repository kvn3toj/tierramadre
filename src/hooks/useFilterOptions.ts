/**
 * useFilterOptions Hook
 * Computes available filter values (colors, shapes, qualities, etc.) from treasure data.
 * Extracted from useTreasureFiltering for modularity.
 */
import { useMemo } from 'react';
import { TreasureItem } from '../types';
import { normalizeQuality, normalizeColor } from '../constants/quality-and-colors';
import { formatCollectionName, normalizeCollection } from '../utils/formatting';

/** Prefer the richest display variant (accented first, then longer) as the
 *  representative for a group of duplicate collection spellings. */
const collectionDisplayScore = (raw: string): number => {
  const display = formatCollectionName(raw);
  const accents = (display.normalize('NFD').match(/\p{Diacritic}/gu) || []).length;
  return accents * 1000 + display.length;
};

export interface FilterOptions {
  colors: string[];
  shapes: string[];
  qualities: string[];
  cantidades: number[];
  colecciones: string[];
  categorias: string[];
  priceMinMax: { min: number; max: number };
  caratMinMax: { min: number; max: number };
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

  const caratMinMax = useMemo(() => {
    const weights = treasure
      .map(item => typeof item.peso === 'number' ? item.peso : parseFloat(String(item.peso)))
      .filter(w => !isNaN(w) && w > 0);
    if (weights.length === 0) return { min: 0, max: 100 };
    return {
      min: Math.min(...weights),
      max: Math.max(...weights),
    };
  }, [treasure]);

  const filterOptions = useMemo(() => {
    const colors = new Set<string>();
    const shapes = new Set<string>();
    const qualities = new Set<string>();
    const cantidades = new Set<number>();
    // Collapse duplicate/variant collection spellings (prefix/case/accent/space)
    // to one option keyed by normalized form, keeping the richest display.
    const coleccionByKey = new Map<string, string>();
    const categorias = new Set<string>();

    treasure.forEach(item => {
      const normalizedColor = normalizeColor(item.color);
      const normalizedQuality = normalizeQuality(item.calidad);

      if (normalizedColor) colors.add(normalizedColor);
      if (item.talla) shapes.add(item.talla);
      if (normalizedQuality) qualities.add(normalizedQuality);
      if (item.cantidad) cantidades.add(item.cantidad);
      if (item.coleccion) {
        const key = normalizeCollection(item.coleccion);
        if (key) {
          const existing = coleccionByKey.get(key);
          if (!existing || collectionDisplayScore(item.coleccion) > collectionDisplayScore(existing)) {
            coleccionByKey.set(key, item.coleccion);
          }
        }
      }
      if (item.categoria) categorias.add(item.categoria);
    });

    return {
      colors: Array.from(colors).sort(),
      shapes: Array.from(shapes).sort(),
      qualities: Array.from(qualities).sort(),
      cantidades: Array.from(cantidades).sort((a, b) => a - b),
      colecciones: Array.from(coleccionByKey.values()).sort((a, b) =>
        formatCollectionName(a).localeCompare(formatCollectionName(b), 'es')
      ),
      categorias: Array.from(categorias).sort(),
      priceMinMax,
      caratMinMax,
    };
  }, [treasure, priceMinMax, caratMinMax]);

  return filterOptions;
}
