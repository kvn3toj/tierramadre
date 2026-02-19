/**
 * Gallery Constants
 *
 * Constants and types used by HeroGallery.
 */

// =============================================================================
// TYPES
// =============================================================================

export type MainCategory = 'estrenos' | 'joyas' | 'lotes' | 'gemas';

export interface Category {
  id: MainCategory;
  label: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Auto-transition interval for hero carousel (ms) */
export const AUTO_TRANSITION_INTERVAL = 6000;

/** All gallery categories */
export const ALL_CATEGORIES: Category[] = [
  { id: 'estrenos', label: 'Estrenos' },
  { id: 'gemas', label: 'Gemas' },
  { id: 'lotes', label: 'Lotes' },
  { id: 'joyas', label: 'Joyas' },
];
