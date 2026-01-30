/**
 * Gallery Constants
 *
 * Constants and types used by HeroGallery and useGalleryFiltering.
 * Extracted from HeroGallery.tsx for modularity.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  item?: number;
}

export type MainCategory = 'estrenos' | 'joyas' | 'lotes' | 'gemas';

export interface Subcategory {
  id: string;
  label: string;
}

export interface Category {
  id: MainCategory;
  label: string;
  subcategories?: Subcategory[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Auto-transition interval for hero carousel (ms) */
export const AUTO_TRANSITION_INTERVAL = 6000;

/**
 * Quality mapping for filtering Lotes and Gemas.
 * These are exact match patterns (case-insensitive).
 */
export const QUALITY_FILTERS: Record<string, string[]> = {
  'comercial': ['Comercial', 'Comercial Estándar', 'Comercial Estandar', 'Estandar', 'Estándar', 'Plata - comercial'],
  'finas': ['Comercial Fina', 'Comercial Superior', 'Fina'],
  'extra-finas': ['Comercial SuperFina', 'SuperFina', 'Extra Fina'],
};

/** Jewelry type mapping (based on medidas field) */
export const JEWELRY_TYPES: Record<string, string[]> = {
  'topitos': ['Topito', 'Topitos'],
  'aretes': ['Arete', 'Aretes'],
  'anillos': ['Anillo', 'Anillos'],
  'pulseras': ['Pulsera', 'Pulseras'],
  'dijes': ['Dije', 'Dijes'],
};

/** All gallery categories with optional subcategories */
export const ALL_CATEGORIES: Category[] = [
  { id: 'estrenos', label: 'Estrenos' },
  {
    id: 'gemas',
    label: 'Gemas',
    subcategories: [
      { id: 'comercial', label: 'Comercial' },
      { id: 'finas', label: 'Finas' },
      { id: 'extra-finas', label: 'Extra finas' },
    ],
  },
  {
    id: 'lotes',
    label: 'Lotes',
    subcategories: [
      { id: 'comercial', label: 'Comercial' },
      { id: 'finas', label: 'Finas' },
      { id: 'extra-finas', label: 'Extra finas' },
    ],
  },
  {
    id: 'joyas',
    label: 'Joyas',
    subcategories: [
      { id: 'topitos', label: 'Topitos' },
      { id: 'aretes', label: 'Aretes' },
      { id: 'anillos', label: 'Anillos' },
      { id: 'pulseras', label: 'Pulseras' },
      { id: 'dijes', label: 'Dijes' },
    ],
  },
];

// =============================================================================
// HELPERS
// =============================================================================

/** Check if a product's quality matches a filter's quality list (case-insensitive exact match) */
export const matchesQuality = (itemQuality: string | undefined, filterQualities: string[]): boolean => {
  if (!itemQuality) return false;
  const normalizedQuality = itemQuality.trim().toLowerCase();
  return filterQualities.some((q) => normalizedQuality === q.toLowerCase());
};
