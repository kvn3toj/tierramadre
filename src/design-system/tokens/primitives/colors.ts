/**
 * Primitive Color Tokens
 * "Emerald iOS" Design System
 *
 * Raw color values representing the fusion of Colombian emerald luxury
 * and iOS minimalist precision. These primitives are used to build
 * semantic color tokens.
 */

export const primitiveColors = {
  /**
   * Emerald Palette - Colombian Emerald Green (Brand Core)
   * Preserved from original brand identity: #00AE7A
   *
   * Scale from 50-900 for consistent UI shading
   */
  emerald: {
    50: '#ECFDF5',   // Lightest tint
    100: '#D1FAE5',  // Very light
    200: '#A7F3D0',  // Light
    300: '#6EE7B7',  // Light accent
    400: '#34D399',  // Bright accent
    500: '#00AE7A',  // Brand Core - Main brand color (Tierra Madre logo)
    600: '#059669',  // Darker for hover states
    700: '#047857',  // Deep for contrast
    800: '#065F46',  // Very dark
    900: '#064E3B',  // Darkest
  },

  /**
   * Metallic Silver Palette - Premium sophistication
   * Creates depth and luxury through metallic shimmer
   */
  metallic: {
    silver: {
      50: '#F8FAFB',   // Platinum Mist
      100: '#E8ECEF',  // Silver Whisper - Light mode accents
      200: '#D1D9E0',  // Chrome Light
      300: '#B4BFC9',  // Sterling
      400: '#8A99A8',  // Brushed Metal
      500: '#6B7A8A',  // Titanium - Mid metallic
      600: '#515F6E',  // Gunmetal
      700: '#3A4654',  // Slate
      800: '#252E3B',  // Obsidian
      900: '#121821',  // Void - Dark mode depth
    },
  },

  /**
   * Base Surfaces - Pure foundations
   * Minimalist palette for light and dark themes
   */
  surfaces: {
    light: {
      primary: '#FFFFFF',      // Pure white (preserved)
      secondary: '#F2F2F7',    // iOS light secondary background
      tertiary: '#FAFAFA',     // Subtle off-white
    },
    dark: {
      primary: '#000000',      // Pure black (preserved)
      secondary: '#1C1C1E',    // iOS dark secondary background
      tertiary: '#0A0E13',     // Rich black with blue undertone
    },
  },

  /**
   * iOS System Colors - Native iOS palette
   * For semantic meanings (success, warning, error)
   */
  system: {
    red: {
      light: '#FF3B30',
      dark: '#FF453A',
    },
    orange: {
      light: '#FF9500',
      dark: '#FF9F0A',
    },
    yellow: {
      light: '#FFCC00',
      dark: '#FFD60A',
    },
    green: {
      light: '#34C759',
      dark: '#32D74B',
    },
    blue: {
      light: '#007AFF',
      dark: '#0A84FF',
    },
    gray: {
      light: '#8E8E93',
      dark: '#8E8E93',
    },
  },

  /**
   * Transparency Overlays
   * For glassmorphic effects and overlays
   */
  overlays: {
    light: {
      subtle: 'rgba(255, 255, 255, 0.7)',
      medium: 'rgba(255, 255, 255, 0.85)',
      strong: 'rgba(255, 255, 255, 0.95)',
    },
    dark: {
      subtle: 'rgba(0, 0, 0, 0.5)',
      medium: 'rgba(0, 0, 0, 0.7)',
      strong: 'rgba(0, 0, 0, 0.85)',
    },
  },
} as const;

export type PrimitiveColors = typeof primitiveColors;
