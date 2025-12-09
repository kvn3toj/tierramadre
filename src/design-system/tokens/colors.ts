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
    primary: '#0F172A',
    secondary: '#1E293B',
    tertiary: '#334155',
    elevated: '#1E293B',
  },
  surface: {
    default: '#1E293B',
    paper: '#1E293B',
    overlay: 'rgba(255, 255, 255, 0.05)',
    glass: 'rgba(30, 41, 59, 0.8)',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#CBD5E1',
    tertiary: '#94A3B8',
    disabled: '#475569',
  },
  border: {
    light: '#334155',
    default: '#475569',
    dark: '#64748B',
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
} as const;

export default colors;
