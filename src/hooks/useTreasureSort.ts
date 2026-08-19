/**
 * useTreasureSort Hook
 * Sorting logic for treasure items, including quality ordering and image priority.
 * Extracted from useTreasureFiltering for modularity.
 */
import { useMemo } from 'react';
import { TreasureItem } from '../types';
import { getSearchHits } from '../lib/analytics/treasureAnalytics';
import { QUALITY_ORDER } from '../constants/quality-and-colors';

export type SortOption =
  | 'price-desc'
  | 'price-asc'
  | 'name-asc'
  | 'name-desc'
  | 'quality-premium'
  | 'item-number'
  | 'newest'
  | 'most-searched';

/**
 * Número de ítem con el que una card ORDENA. Para una card de lote agrupada,
 * su miembro más nuevo (`newestMemberItem`) — el `item` propio es una clave
 * sintética en el rango 8M+ que sólo existe para no colisionar con números
 * reales y no dice nada de recencia.
 */
export function rankItem(t: TreasureItem): number {
  return t.newestMemberItem ?? t.item;
}

export function useTreasureSort(
  filteredTreasure: TreasureItem[],
  sortBy: SortOption,
): TreasureItem[] {
  return useMemo(() => {
    const sorted = [...filteredTreasure];
    const searchHits = getSearchHits();

    // Define sort function based on user selection
    const sortFn = (a: TreasureItem, b: TreasureItem): number => {
      switch (sortBy) {
        case 'name-asc':
          return a.nombre.localeCompare(b.nombre);
        case 'name-desc':
          return b.nombre.localeCompare(a.nombre);
        case 'price-asc':
          return a.precioCOP - b.precioCOP;
        case 'price-desc':
          return b.precioCOP - a.precioCOP;
        case 'quality-premium': {
          const aScore = QUALITY_ORDER[a.calidad.split(' ').pop() || ''] || 0;
          const bScore = QUALITY_ORDER[b.calidad.split(' ').pop() || ''] || 0;
          return bScore - aScore;
        }
        case 'item-number':
          return rankItem(a) - rankItem(b);
        case 'newest':
          // Item numbers are assigned sequentially as products enter the inventario sheet
          // (column A), so the highest item number is the most recently added product.
          // Grouped lote cards rank by their newest MEMBER (rankItem): their own
          // `item` is a synthetic 8M-range key that would otherwise beat every
          // real item and pin all lotes to the top of the grid.
          return rankItem(b) - rankItem(a);
        case 'most-searched': {
          const aHits = searchHits[a.item] || 0;
          const bHits = searchHits[b.item] || 0;
          if (bHits === aHits) {
            return b.precioCOP - a.precioCOP;
          }
          return bHits - aHits;
        }
        default:
          return b.precioCOP - a.precioCOP;
      }
    };

    // Check if item has a valid image
    const hasValidImage = (item: TreasureItem): boolean => {
      return typeof item.imagen === 'string' && item.imagen.trim().length > 0;
    };

    // Insumos (supplies: chains, findings, etc. — categoria "Insumo") always
    // sort AFTER gemas + joyas, regardless of the chosen sort mode.
    const isInsumo = (item: TreasureItem): boolean =>
      (item.categoria || '').trim().toLowerCase() === 'insumo';

    return sorted.sort((a, b) => {
      // 1) Insumos last.
      const aInsumo = isInsumo(a);
      const bInsumo = isInsumo(b);
      if (aInsumo !== bInsumo) return aInsumo ? 1 : -1;

      // 2) Within each group: items WITH images first.
      const aHasImage = hasValidImage(a);
      const bHasImage = hasValidImage(b);
      if (aHasImage && !bHasImage) return -1;
      if (!aHasImage && bHasImage) return 1;

      // 3) Then the selected sort mode.
      return sortFn(a, b);
    });
  }, [filteredTreasure, sortBy]);
}
