/**
 * Gallery Constants
 *
 * Constants and types used by HeroGallery.
 */

// =============================================================================
// TYPES
// =============================================================================

export type MainCategory = 'piedras' | 'joyas' | 'lotes' | 'gemas';

export interface Category {
  id: MainCategory;
  label: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Auto-transition interval for hero carousel (ms) */
export const AUTO_TRANSITION_INTERVAL = 6000;

/** All gallery categories with icons */
export const ALL_CATEGORIES: Category[] = [
  { id: 'piedras', label: 'Piedras' },
  { id: 'gemas', label: 'Gemas' },
  { id: 'lotes', label: 'Lotes' },
  { id: 'joyas', label: 'Joyas' },
];

/** Icon map for categories (used in pill tabs) */
export const CATEGORY_ICONS: Record<MainCategory, string> = {
  piedras: '💎',
  gemas: '✦',
  lotes: '◆◆',
  joyas: '👑',
};

/** Subcategories for each main category (values match Column K in Google Sheets) */
// NOTE: joyas values must stay synced with JEWELRY_CATEGORIES in api/get-treasure-sheets.js
export const CATEGORY_SUBCATEGORIES: Record<MainCategory, string[]> = {
  joyas: [
    'Anillo en Plata',
    'Aretes',
    'Topitos',
    'Pulsera',
    'Dije',
    'Anillo en Oro',
    // Label the Fotosíntesis wizard writes for every finished piece (SOT v3).
    'Joyería Artesanal',
  ],
  piedras: [], // TBD - uses current type/cantidad logic as fallback
  gemas: [], // TBD
  lotes: [], // TBD
};

/** Display labels for hero category filter chips */
export const HERO_CATEGORY_LABELS: Record<MainCategory, string> = {
  piedras: 'Piedras',
  gemas: 'Gemas',
  lotes: 'Lotes',
  joyas: 'Joyas',
};
