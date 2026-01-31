/**
 * Home Page Constants
 *
 * Centralized configuration for the home page module.
 * Follows sacred geometry principles for spacing and proportions.
 *
 * Refactored by: CoomÜnity Council - Evolutionary Refactor
 */

// =============================================================================
// LAYOUT CONSTANTS
// =============================================================================

/** Number of newest products to display in the Products section */
export const MAX_PRODUCTS_DISPLAY = 10;

/** Background opacity for the home background image */
export const BACKGROUND_OPACITY = 0.77;

/** Safe area bottom padding for TabBar */
export const TAB_BAR_HEIGHT = 96;

// =============================================================================
// SKELETON HEIGHTS
// =============================================================================

export const SKELETON_HEIGHTS = {
  products: 200,
  valuation: 280,
  meditation: 180,
  knowledge: 300,
  welcome: 250,
  footer: 150,
} as const;

// =============================================================================
// SHARE CONFIGURATION
// =============================================================================

export const SHARE_CONFIG = {
  title: 'Tierra Madre - Sabiduría Esmeralda',
} as const;

// =============================================================================
// ANIMATION DELAYS
// =============================================================================

export const ANIMATION_DELAYS = {
  whatsappButton: 1000,
  achievementDismiss: 5000,
} as const;
