/**
 * Accent & Status Colors
 *
 * Social brand colors, UI accent colors, price tier colors,
 * and medal/ranking colors for various UI elements.
 *
 * Extracted from legacy design-system.ts for canonical usage.
 */

import { emeraldCore } from './colors';

// =============================================================================
// ACCENT COLORS
// =============================================================================

export const accentColors = {
  // Social/Brand
  whatsapp: '#25D366',
  whatsappHover: '#20BD5A',
  instagram: '#E4405F',
  facebook: '#1877F2',

  // Status (semantic - light/dark variants)
  success: {
    light: '#22C55E',
    dark: '#4ADE80',
  },
  warning: {
    light: '#F59E0B',
    dark: '#FBBF24',
  },
  error: {
    light: '#EF4444',
    dark: '#F87171',
  },
  info: {
    light: '#3B82F6',
    dark: '#60A5FA',
  },

  // UI Accents
  purple: {
    light: '#8B5CF6',
    dark: '#A78BFA',
  },
  indigo: {
    light: '#6366F1',
    dark: '#818CF8',
  },
  cyan: {
    light: '#06B6D4',
    dark: '#22D3EE',
  },
  pink: {
    light: '#EC4899',
    dark: '#F472B6',
  },

  // Price tiers
  priceTiers: {
    minimum: { color: '#64748B', label: 'Minimo' },
    base: { color: '#3B82F6', label: 'Base' },
    ideal: { color: emeraldCore.primary, label: 'Ideal' },
    premium: { color: emeraldCore.dark, label: 'Premium' },
  },
} as const;

// =============================================================================
// MEDAL / RANKING COLORS
// =============================================================================

export const medalColors = {
  gold: '#8C928F', // graphite (was #FFD700)
  silver: '#C9CECB', // light graphite
  bronze: '#5C6360', // deep graphite
} as const;

// =============================================================================
// HELPER: Get Accent Color by mode
// =============================================================================

export const getAccentColor = (
  colorKey: keyof Omit<typeof accentColors, 'priceTiers'>,
  mode: 'light' | 'dark' = 'light',
): string => {
  const color = accentColors[colorKey];
  if (typeof color === 'string') return color;
  return color[mode];
};
