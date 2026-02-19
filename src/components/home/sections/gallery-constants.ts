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
