/**
 * iOS Semantic Colors (HIG Compliant)
 *
 * Apple's iOS semantic color system for proper dark mode support.
 * Labels, fills, separators, and system backgrounds.
 *
 * Extracted from legacy design-system.ts for canonical usage.
 */

// =============================================================================
// iOS SEMANTIC COLORS
// =============================================================================

export const iosSemanticColors = {
  // Labels - for text hierarchy
  label: {
    light: 'rgba(0, 0, 0, 1)',
    dark: 'rgba(255, 255, 255, 1)',
  },
  secondaryLabel: {
    light: 'rgba(60, 60, 67, 0.75)',
    dark: 'rgba(235, 235, 245, 0.6)',
  },
  tertiaryLabel: {
    light: 'rgba(60, 60, 67, 0.7)',
    dark: 'rgba(235, 235, 245, 0.55)',
  },
  quaternaryLabel: {
    light: 'rgba(60, 60, 67, 0.44)',
    dark: 'rgba(235, 235, 245, 0.38)',
  },

  // Fills - for UI elements
  fill: {
    light: 'rgba(120, 120, 128, 0.2)',
    dark: 'rgba(120, 120, 128, 0.36)',
  },
  secondaryFill: {
    light: 'rgba(120, 120, 128, 0.16)',
    dark: 'rgba(120, 120, 128, 0.32)',
  },
  tertiaryFill: {
    light: 'rgba(118, 118, 128, 0.12)',
    dark: 'rgba(118, 118, 128, 0.24)',
  },

  // Backgrounds
  systemBackground: {
    light: '#FFFFFF',
    dark: '#000000',
  },
  secondarySystemBackground: {
    light: '#F2F2F7',
    dark: '#1C1C1E',
  },
  tertiarySystemBackground: {
    light: '#FFFFFF',
    dark: '#2C2C2E',
  },

  // Grouped backgrounds
  systemGroupedBackground: {
    light: '#F2F2F7',
    dark: '#000000',
  },
  secondarySystemGroupedBackground: {
    light: '#FFFFFF',
    dark: '#1C1C1E',
  },

  // Separators
  separator: {
    light: 'rgba(60, 60, 67, 0.29)',
    dark: 'rgba(84, 84, 88, 0.6)',
  },
  opaqueSeparator: {
    light: '#C6C6C8',
    dark: '#38383A',
  },
} as const;

// =============================================================================
// HELPER: Get iOS Color by mode
// =============================================================================

export const getIOSColor = (
  colorKey: keyof typeof iosSemanticColors,
  mode: 'light' | 'dark'
): string => {
  return iosSemanticColors[colorKey][mode];
};
