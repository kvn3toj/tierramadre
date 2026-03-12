/**
 * Product Categorization Utility
 * Derives 4 categories from TreasureItem fields for museum-style browsing.
 */

import { TreasureItem } from '../types';

export interface ProductCategory {
  key: 'joyas' | 'lotes' | 'gemas' | 'piedras';
  label: string;
  count: number;
  coverImageUrl?: string;
  items: TreasureItem[];
}

const FINE_QUALITIES = ['fina', 'premium', 'aaa', 'superfina', 'comercial superfina', 'comercial fina'];

function isFineQuality(calidad?: string): boolean {
  if (!calidad) return false;
  const lower = calidad.toLowerCase();
  return FINE_QUALITIES.some(q => lower.includes(q));
}

function getCoverImage(items: TreasureItem[]): string | undefined {
  const withImage = items.find(i => i.thumbnailUrl || i.imagen);
  return withImage?.thumbnailUrl || withImage?.imagen;
}

export function categorizeProducts(items: TreasureItem[]): ProductCategory[] {
  const joyas: TreasureItem[] = [];
  const lotes: TreasureItem[] = [];
  const gemas: TreasureItem[] = [];
  const piedras: TreasureItem[] = [];

  for (const item of items) {
    if (item.isJewelry) {
      joyas.push(item);
    } else if (item.cantidad > 1) {
      lotes.push(item);
    } else if (isFineQuality(item.calidad)) {
      gemas.push(item);
    } else {
      piedras.push(item);
    }
  }

  // Order matches ds-tm.pen "Ambassador Museum — Category Tap": Piedras → Gemas → Lotes → Joyas
  const categories: ProductCategory[] = [
    { key: 'piedras', label: 'Piedras', count: piedras.length, coverImageUrl: getCoverImage(piedras), items: piedras },
    { key: 'gemas', label: 'Gemas', count: gemas.length, coverImageUrl: getCoverImage(gemas), items: gemas },
    { key: 'lotes', label: 'Lotes', count: lotes.length, coverImageUrl: getCoverImage(lotes), items: lotes },
    { key: 'joyas', label: 'Joyas', count: joyas.length, coverImageUrl: getCoverImage(joyas), items: joyas },
  ];

  // Only return categories that have items
  return categories.filter(c => c.count > 0);
}

/** Get unique quality tiers from a list of items */
export function getQualityTiers(items: TreasureItem[]): string[] {
  const tiers = new Set<string>();
  items.forEach(item => {
    if (item.calidad) tiers.add(item.calidad);
  });
  return Array.from(tiers).sort();
}
