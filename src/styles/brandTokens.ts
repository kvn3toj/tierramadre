/**
 * TIERRA MADRE - Sacred Design Tokens
 * Brand Guide: Conscious Luxury through Geometric Harmony
 *
 * Philosophy: "Nuestro lujo es la Claridad y la Verdad"
 */

// Golden Ratio for sacred proportions
const PHI = 1.618;
const BASE_UNIT = 8;

// ═══════════════════════════════════════════════════════════════
// COLOR PALETTE - Minimal & Intentional
// ═══════════════════════════════════════════════════════════════

export const colors = {
  // Primary - Deep Emerald Green (Luxury + Nature)
  emeraldDeep: '#0A4D3C',
  emeraldRich: '#1B7A5E',
  emeraldLight: '#2E9B7D',

  // Backgrounds - Pure White (Let the stone breathe)
  pureWhite: '#FFFFFF',
  naturalWhite: '#FDFDFB',
  offWhite: '#FAFAFA',

  // Text - Black/Charcoal (Serious, Readable)
  charcoal: '#2C2C2C',
  deepBlack: '#0D0D0D',
  textSecondary: '#4A4A4A',

  // Accents - Strategic
  silverGray: '#C5C5C0',
  lightGray: '#E8E8E8',
  neonGreen: '#39FF14', // Location points only

  // Atmospheric (for mystical backgrounds)
  mysticalDark: '#0D1B1E',
  mistGray: '#B8C5C9',
} as const;

// ═══════════════════════════════════════════════════════════════
// SPACING - Golden Ratio Based
// ═══════════════════════════════════════════════════════════════

export const spacing = {
  xs: BASE_UNIT * 0.5,    // 4px
  sm: BASE_UNIT,          // 8px
  md: BASE_UNIT * 2,      // 16px
  lg: BASE_UNIT * 3,      // 24px
  xl: BASE_UNIT * 5,      // 40px
  xxl: BASE_UNIT * 8,     // 64px
  xxxl: BASE_UNIT * 13,   // 104px

  // Semantic
  breathingRoom: BASE_UNIT * 8,
  sectionGap: BASE_UNIT * 13,
  pageMargin: BASE_UNIT * 5,
} as const;

// ═══════════════════════════════════════════════════════════════
// TYPOGRAPHY - Hierarchy of Clarity
// ═══════════════════════════════════════════════════════════════

export const typography = {
  // Font Families
  serif: {
    elegant: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
    display: "'Playfair Display', Georgia, serif",
  },

  sans: {
    clean: "'Montserrat', 'Helvetica Neue', system-ui, sans-serif",
    technical: "'Helvetica Neue', Arial, sans-serif",
  },

  // Type Scale (Golden Ratio inspired)
  scale: {
    micro: '0.75rem',     // 12px
    small: '0.875rem',    // 14px
    base: '1rem',         // 16px
    medium: '1.125rem',   // 18px
    large: '1.5rem',      // 24px
    xlarge: '2rem',       // 32px
    display: '3rem',      // 48px
    monument: '4.5rem',   // 72px
  },

  // Line Heights
  leading: {
    tight: 1.2,
    normal: 1.4,
    relaxed: PHI,         // 1.618
    loose: 1.8,
  },

  // Letter Spacing
  tracking: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.05em',
    wider: '0.1em',
    widest: '0.2em',
  },

  // Font Weights
  weight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// GEOMETRY - Sacred Patterns
// ═══════════════════════════════════════════════════════════════

export const geometry = {
  // Border Radii (sharp for luxury, subtle for softness)
  radius: {
    none: '0',
    subtle: '2px',
    small: '4px',
  },

  // Line Weights
  lineWeight: {
    hair: '0.5px',
    fine: '1px',
    medium: '2px',
  },

  // Shadows (subtle, never harsh)
  shadow: {
    none: 'none',
    subtle: '0 1px 2px rgba(0,0,0,0.05)',
    soft: '0 2px 8px rgba(0,0,0,0.08)',
    elevated: '0 4px 16px rgba(0,0,0,0.1)',
  },

  // Corner decoration sizes
  cornerDecoration: {
    small: 32,
    medium: 48,
    large: 64,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// MOTION - Conscious Animation
// ═══════════════════════════════════════════════════════════════

export const motion = {
  duration: {
    fast: '200ms',
    normal: '300ms',
    slow: '500ms',
  },

  easing: {
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    entrance: 'cubic-bezier(0.0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// BRAND VOICE - Opacity Levels
// ═══════════════════════════════════════════════════════════════

export const brandVoice = {
  opacity: {
    ghost: 0.05,
    whisper: 0.1,
    subtle: 0.3,
    present: 0.6,
    strong: 0.8,
    solid: 1,
  },
} as const;

// Consolidated export
export const brandTokens = {
  colors,
  spacing,
  typography,
  geometry,
  motion,
  brandVoice,
} as const;

export type BrandTokens = typeof brandTokens;
