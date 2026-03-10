/**
 * Tierra Madre Design System - Color Tokens
 *
 * Based on Colombian emerald heritage and sacred geometry principles.
 * Designed by EUNOIA - Visual Systems & Sacred Geometry
 */

// =============================================================================
// PRIMARY EMERALD PALETTE (from logo #00AE7A)
// =============================================================================

export const emeraldCore = {
  primary: '#00AE7A',      // Logo green - Pure Colombian Emerald
  light: '#33C194',        // Sunlit Emerald
  lighter: '#66D4AE',      // Morning Dew
  lightest: '#E6F7F1',     // Emerald Mist
  dark: '#008C61',         // Deep Forest
  darker: '#006A48',       // Earth's Heart
  darkest: '#004830',      // Mineral Core

  // Sacred ratios derived from primary (golden ratio)
  vibrant: '#00D697',      // φ lighter
  essence: '#007856',      // φ darker

  // Accessible text variant — 4.72:1 on white (WCAG AA)
  textAccessible: '#0B6E4F',
} as const;

// =============================================================================
// GOLD ACCENT (Colombian Heritage - Pre-Columbian)
// =============================================================================

export const goldAccent = {
  primary: '#D4AF37',      // Pre-Columbian Gold
  light: '#E5C866',        // Sunlight on Gold
  lighter: '#F5E6A3',      // Gold Dust
  lightest: '#FDF8E8',     // Golden Dawn
  dark: '#B8941F',         // Ancient Gold
  darker: '#8F7318',       // Earth Gold
  darkest: '#665210',      // Deep Treasure
} as const;

// =============================================================================
// QUALITY TIER SYSTEM (Consciousness Frequencies)
// =============================================================================

export const qualityTiers = {
  estandar: {
    primary: '#33C194',
    secondary: '#00AE7A',
    gradient: 'linear-gradient(135deg, #33C194 0%, #00AE7A 100%)',
    glow: 'rgba(51, 193, 148, 0.3)',
    frequency: '396Hz',
    chakra: 'Root',
    symbolism: 'Earth Foundation',
  },
  fina: {
    primary: '#00AE7A',
    secondary: '#008C61',
    gradient: 'linear-gradient(135deg, #00AE7A 0%, #008C61 100%)',
    glow: 'rgba(0, 174, 122, 0.4)',
    frequency: '528Hz',
    chakra: 'Heart',
    symbolism: 'Heart of Nature',
  },
  superFina: {
    primary: '#008C61',
    secondary: '#006A48',
    gradient: 'linear-gradient(135deg, #008C61 0%, #006A48 100%)',
    glow: 'rgba(0, 140, 97, 0.5)',
    frequency: '639Hz',
    chakra: 'Throat',
    symbolism: 'Sacred Connection',
  },
  sublime: {
    primary: '#006A48',
    secondary: '#004830',
    gradient: 'linear-gradient(135deg, #006A48 0%, #004830 100%)',
    accent: '#D4AF37',
    glow: 'rgba(0, 106, 72, 0.6)',
    frequency: '852Hz',
    chakra: 'Third Eye',
    symbolism: 'Divine Essence',
  },
} as const;

// =============================================================================
// ORIGIN COLORS (Colombian Mining Regions)
// =============================================================================

export const originColors = {
  muzo: {
    primary: '#00AE7A',
    secondary: '#006A48',
    name: 'Muzo',
    description: 'Classic emerald green',
  },
  chivor: {
    primary: '#0099CC',
    secondary: '#006699',
    name: 'Chivor',
    description: 'Blue-green celestial tones',
  },
  coscuez: {
    primary: '#00B35C',
    secondary: '#008844',
    name: 'Coscuez',
    description: 'Warmer golden-green tones',
  },
  gachala: {
    primary: '#00CC88',
    secondary: '#009966',
    name: 'Gachalá',
    description: 'Brilliant clear stones',
  },
  other: {
    primary: '#669999',
    secondary: '#447777',
    name: 'Other',
    description: 'Diverse sources',
  },
} as const;

// =============================================================================
// SEMANTIC COLORS
// =============================================================================

export const semanticColors = {
  success: {
    main: '#00AE7A',
    light: '#E6F7F1',
    dark: '#006A48',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#F59E0B',
    light: '#FEF3C7',
    dark: '#D97706',
    contrastText: '#000000',
  },
  error: {
    main: '#EF4444',
    light: '#FEE2E2',
    dark: '#DC2626',
    contrastText: '#FFFFFF',
  },
  info: {
    main: '#3B82F6',
    light: '#DBEAFE',
    dark: '#1D4ED8',
    contrastText: '#FFFFFF',
  },
} as const;

// =============================================================================
// SURFACE & BACKGROUND (Light Mode)
// =============================================================================

export const surfacesLight = {
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    elevated: '#FFFFFF',
  },
  surface: {
    default: '#FFFFFF',
    paper: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.04)',
    glass: 'rgba(255, 255, 255, 0.8)',
  },
  text: {
    primary: '#1F2937',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    disabled: '#D1D5DB',
  },
  border: {
    light: '#E5E7EB',
    default: '#D1D5DB',
    dark: '#9CA3AF',
  },
} as const;

// =============================================================================
// SURFACE & BACKGROUND (Dark Mode)
// =============================================================================

export const surfacesDark = {
  background: {
    primary: '#000000',
    secondary: '#1C1C1E',
    tertiary: '#2C2C2E',
    elevated: '#1C1C1E',
  },
  surface: {
    default: '#1C1C1E',
    paper: '#1C1C1E',
    overlay: 'rgba(255, 255, 255, 0.05)',
    glass: 'rgba(28, 28, 30, 0.8)',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#ABABAF',
    tertiary: '#7C7C80',
    disabled: '#48484A',
  },
  border: {
    light: '#38383A',
    default: '#48484A',
    dark: '#636366',
  },
} as const;

// =============================================================================
// PRICE TIER COLORS
// =============================================================================

export const priceTiers = {
  accessible: {
    range: '< $500',
    color: emeraldCore.light,
    badge: 'Entry Luxury',
  },
  premium: {
    range: '$500 - $2000',
    color: emeraldCore.primary,
    badge: 'Premium',
  },
  exclusive: {
    range: '$2000 - $5000',
    color: emeraldCore.dark,
    badge: 'Exclusive',
  },
  collection: {
    range: '> $5000',
    color: emeraldCore.darkest,
    badge: 'Collection Piece',
    accent: goldAccent.primary,
  },
} as const;

// =============================================================================
// INSIGHT/RECOMMENDATION COLORS
// =============================================================================

export const insightColors = {
  opportunity: {
    bg: 'rgba(59, 130, 246, 0.08)',
    bgDark: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.2)',
    icon: '#3B82F6',
    text: '#1D4ED8',
    textDark: '#60A5FA',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.08)',
    bgDark: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.2)',
    icon: '#F59E0B',
    text: '#D97706',
    textDark: '#FBBF24',
  },
  success: {
    bg: 'rgba(0, 174, 122, 0.08)',
    bgDark: 'rgba(0, 174, 122, 0.15)',
    border: 'rgba(0, 174, 122, 0.2)',
    icon: '#00AE7A',
    text: '#006A48',
    textDark: '#33C194',
  },
  critical: {
    bg: 'rgba(239, 68, 68, 0.08)',
    bgDark: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.2)',
    icon: '#EF4444',
    text: '#DC2626',
    textDark: '#F87171',
  },
} as const;

// =============================================================================
// COMPOSITE EXPORT
// =============================================================================

export const colors = {
  emerald: emeraldCore,
  gold: goldAccent,
  quality: qualityTiers,
  origin: originColors,
  semantic: semanticColors,
  light: surfacesLight,
  dark: surfacesDark,
  price: priceTiers,
  insight: insightColors,
} as const;

export default colors;
