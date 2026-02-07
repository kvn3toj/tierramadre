import { alpha } from '@mui/material/styles';

// ============================================
// TM STUDIO - Design System v2.0
// ============================================
// Centralized design tokens for Tierra Madre Studio
// Brand: Colombian Emeralds - "Esencia y Poder"
// Colors: Emerald Green #00AE7A + Gold #D4AF37

// ============================================
// 1. BRAND COLORS (Immutable)
// ============================================
export const brand = {
  // Primary Emerald Palette
  emerald: {
    50: '#E6F7F2',
    100: '#B3E8D9',
    200: '#80D9C0',
    300: '#4DCAA7',
    400: '#26BE93',
    500: '#00AE7A', // Primary - Logo green
    600: '#009A6C',
    700: '#008A61',
    800: '#006B4D',
    900: '#004D38',
  },

  // Accent Gold Palette
  gold: {
    50: '#FDF8E8',
    100: '#F9ECC5',
    200: '#F5D76E',
    300: '#EDCB4F',
    400: '#E4BE30',
    500: '#D4AF37', // Primary Gold
    600: '#B8962F',
    700: '#9C7D27',
    800: '#80651F',
    900: '#644D17',
  },

  // Neutral Scale
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
} as const;

// ============================================
// 2. SEMANTIC TOKENS (Light Mode)
// ============================================
export const lightTokens = {
  // Surfaces
  background: {
    app: '#FAFAFA',           // Main app background
    page: '#F5F7F9',          // Page content area
    surface: '#FFFFFF',        // Cards, panels
    elevated: '#FFFFFF',       // Elevated surfaces (dialogs, popovers)
    muted: '#F1F5F9',         // Muted/secondary surfaces
    inverse: brand.slate[900], // Dark surfaces in light mode
  },

  // Text Colors
  text: {
    primary: brand.slate[900],    // Main text
    secondary: brand.slate[600],  // Secondary text
    muted: brand.slate[400],      // Disabled, placeholder
    inverse: '#FFFFFF',           // Text on dark surfaces
    brand: brand.emerald[500],    // Brand colored text
    gold: brand.gold[600],        // Gold accent text
  },

  // Borders
  border: {
    default: brand.slate[200],
    light: brand.slate[100],
    focus: brand.emerald[500],
    hover: brand.slate[300],
    card: brand.slate[200],
  },

  // Interactive States
  interactive: {
    primary: brand.emerald[500],
    primaryHover: brand.emerald[600],
    primaryActive: brand.emerald[700],
    secondary: brand.gold[500],
    secondaryHover: brand.gold[600],
  },

  // Status Colors
  status: {
    success: '#22C55E',
    successBg: alpha('#22C55E', 0.1),
    warning: '#F59E0B',
    warningBg: alpha('#F59E0B', 0.1),
    error: '#EF4444',
    errorBg: alpha('#EF4444', 0.1),
    info: brand.emerald[500],
    infoBg: alpha(brand.emerald[500], 0.1),
  },
} as const;

// ============================================
// 3. SEMANTIC TOKENS (Dark Mode)
// ============================================
export const darkTokens = {
  // Surfaces - True dark with depth
  background: {
    app: '#0A0A0A',            // Main app background
    page: '#0F0F0F',           // Page content area
    surface: '#1A1A1A',        // Cards, panels
    elevated: '#242424',       // Elevated surfaces
    muted: '#141414',          // Muted surfaces
    inverse: '#FFFFFF',        // Light surfaces in dark mode
  },

  // Text Colors
  text: {
    primary: '#F8FAFC',
    secondary: brand.slate[400],
    muted: brand.slate[500],
    inverse: brand.slate[900],
    brand: brand.emerald[400],
    gold: brand.gold[400],
  },

  // Borders
  border: {
    default: alpha('#FFFFFF', 0.12),
    light: alpha('#FFFFFF', 0.06),
    focus: brand.emerald[400],
    hover: alpha('#FFFFFF', 0.2),
    card: alpha('#FFFFFF', 0.08),
  },

  // Interactive States
  interactive: {
    primary: brand.emerald[400],
    primaryHover: brand.emerald[300],
    primaryActive: brand.emerald[500],
    secondary: brand.gold[400],
    secondaryHover: brand.gold[300],
  },

  // Status Colors
  status: {
    success: '#4ADE80',
    successBg: alpha('#4ADE80', 0.15),
    warning: '#FBBF24',
    warningBg: alpha('#FBBF24', 0.15),
    error: '#F87171',
    errorBg: alpha('#F87171', 0.15),
    info: brand.emerald[400],
    infoBg: alpha(brand.emerald[400], 0.15),
  },
} as const;

// ============================================
// 4. TYPOGRAPHY TOKENS
// ============================================
export const typography = {
  fontFamily: {
    display: '"Libre Baskerville", Georgia, serif',
    body: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Roboto, Arial, sans-serif',
    mono: '"SF Mono", "Fira Code", Monaco, Consolas, monospace',
  },

  // Scale based on iOS HIG
  size: {
    xs: '0.6875rem',   // 11px
    sm: '0.75rem',     // 12px
    base: '0.875rem',  // 14px
    md: '1rem',        // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },

  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
  },

  letterSpacing: {
    tighter: '-0.02em',
    tight: '-0.01em',
    normal: '0',
    wide: '0.01em',
    wider: '0.05em',
    widest: '0.12em',
  },
} as const;

// ============================================
// 5. SPACING TOKENS (8pt Grid)
// ============================================
export const spacing = {
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px (iOS touch target)
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
} as const;

// ============================================
// 6. BORDER RADIUS TOKENS
// ============================================
export const radius = {
  none: '0',
  xs: '0.25rem',    // 4px
  sm: '0.375rem',   // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.25rem', // 20px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// ============================================
// 7. SHADOW TOKENS
// ============================================
export const shadows = {
  // Light mode shadows
  light: {
    none: 'none',
    xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
    sm: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
    md: '0 4px 6px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)',
    lg: '0 10px 15px rgba(15, 23, 42, 0.08), 0 4px 6px rgba(15, 23, 42, 0.04)',
    xl: '0 20px 25px rgba(15, 23, 42, 0.1), 0 8px 10px rgba(15, 23, 42, 0.04)',
    '2xl': '0 25px 50px rgba(15, 23, 42, 0.15)',
    // Brand shadows
    emerald: `0 4px 14px ${alpha(brand.emerald[500], 0.25)}`,
    emeraldLg: `0 8px 24px ${alpha(brand.emerald[500], 0.3)}`,
    gold: `0 4px 14px ${alpha(brand.gold[500], 0.25)}`,
    // Card specific
    card: '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
    cardHover: '0 8px 16px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)',
  },

  // Dark mode shadows (more subtle, less visible)
  dark: {
    none: 'none',
    xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.4), 0 4px 6px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.5), 0 8px 10px rgba(0, 0, 0, 0.3)',
    '2xl': '0 25px 50px rgba(0, 0, 0, 0.6)',
    // Brand shadows (glow effect in dark mode)
    emerald: `0 4px 20px ${alpha(brand.emerald[400], 0.3)}`,
    emeraldLg: `0 8px 32px ${alpha(brand.emerald[400], 0.4)}`,
    gold: `0 4px 20px ${alpha(brand.gold[400], 0.3)}`,
    // Card specific
    card: `0 0 0 1px ${alpha('#FFFFFF', 0.05)}`,
    cardHover: `0 0 0 1px ${alpha(brand.emerald[400], 0.2)}, 0 8px 24px rgba(0, 0, 0, 0.4)`,
  },
} as const;

// ============================================
// 8. GRADIENTS
// ============================================
export const gradients = {
  // Header gradient (dark with emerald tint)
  header: `linear-gradient(135deg, ${brand.slate[900]} 0%, ${alpha(brand.emerald[500], 0.15)} 100%)`,
  headerDark: `linear-gradient(135deg, #0A0A0A 0%, ${alpha(brand.emerald[500], 0.1)} 100%)`,

  // Brand gradients
  emerald: `linear-gradient(135deg, ${brand.emerald[500]} 0%, ${brand.emerald[700]} 100%)`,
  emeraldSoft: `linear-gradient(135deg, ${brand.emerald[400]} 0%, ${brand.emerald[600]} 100%)`,

  gold: `linear-gradient(135deg, ${brand.gold[400]} 0%, ${brand.gold[600]} 100%)`,
  goldShimmer: `linear-gradient(135deg, ${brand.gold[400]} 0%, ${brand.gold[300]} 50%, ${brand.gold[500]} 100%)`,

  // Surface gradients
  surfaceLight: `linear-gradient(180deg, #FFFFFF 0%, ${brand.slate[50]} 100%)`,
  surfaceDark: `linear-gradient(180deg, #1A1A1A 0%, #141414 100%)`,

  // Premium overlays
  overlayLight: `radial-gradient(circle at 100% 0%, ${alpha(brand.emerald[500], 0.08)} 0%, transparent 60%)`,
  overlayDark: `radial-gradient(circle at 100% 0%, ${alpha(brand.emerald[400], 0.12)} 0%, transparent 60%)`,
} as const;

// ============================================
// 9. ANIMATION TOKENS
// ============================================
export const animation = {
  // Easing curves (iOS-style)
  easing: {
    default: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    in: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
    out: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    inOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    spring: 'cubic-bezier(0.68, -0.15, 0.265, 1.35)',
    springGentle: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Durations
  duration: {
    instant: '0ms',
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '400ms',
    slowest: '500ms',
  },

  // Common transitions
  transition: {
    fast: 'all 100ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    default: 'all 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    slow: 'all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    spring: 'all 300ms cubic-bezier(0.68, -0.15, 0.265, 1.35)',
    colors: 'background-color 200ms, border-color 200ms, color 200ms',
  },
} as const;

// ============================================
// 10. COMPONENT TOKENS
// ============================================

// Card styles
export const cardStyles = {
  light: {
    base: {
      backgroundColor: lightTokens.background.surface,
      border: `1px solid ${lightTokens.border.card}`,
      borderRadius: radius.xl,
      boxShadow: shadows.light.card,
      transition: animation.transition.default,
      p: { xs: 2, sm: 2.5, md: 3 }, // Responsive padding: 16px mobile, 20px tablet, 24px desktop
    },
    hover: {
      boxShadow: shadows.light.cardHover,
      borderColor: alpha(brand.emerald[500], 0.3),
    },
  },
  dark: {
    base: {
      backgroundColor: darkTokens.background.surface,
      border: `1px solid ${darkTokens.border.card}`,
      borderRadius: radius.xl,
      boxShadow: shadows.dark.card,
      transition: animation.transition.default,
      p: { xs: 2, sm: 2.5, md: 3 }, // Responsive padding: 16px mobile, 20px tablet, 24px desktop
    },
    hover: {
      boxShadow: shadows.dark.cardHover,
      borderColor: alpha(brand.emerald[400], 0.3),
    },
  },
} as const;

// Button styles
export const buttonStyles = {
  primary: {
    background: gradients.emerald,
    color: '#FFFFFF',
    boxShadow: shadows.light.emerald,
    hoverBackground: gradients.emeraldSoft,
    hoverShadow: shadows.light.emeraldLg,
  },
  secondary: {
    background: gradients.gold,
    color: brand.slate[900],
    boxShadow: shadows.light.gold,
  },
} as const;

// Header styles
export const headerStyles = {
  light: {
    background: gradients.header,
    overlay: gradients.overlayLight,
    accentLine: gradients.emerald,
    brandColor: brand.emerald[500],
    titleColor: '#FFFFFF',
    subtitleColor: alpha('#FFFFFF', 0.7),
  },
  dark: {
    background: gradients.headerDark,
    overlay: gradients.overlayDark,
    accentLine: gradients.emeraldSoft,
    brandColor: brand.emerald[400],
    titleColor: '#FFFFFF',
    subtitleColor: alpha('#FFFFFF', 0.6),
  },
} as const;

// ============================================
// 11. HELPER FUNCTIONS
// ============================================

// Get tokens based on mode
export const getTokens = (mode: 'light' | 'dark') => {
  return mode === 'light' ? lightTokens : darkTokens;
};

// Get shadows based on mode
export const getShadows = (mode: 'light' | 'dark') => {
  return mode === 'light' ? shadows.light : shadows.dark;
};

// Get card styles based on mode
export const getCardStyles = (mode: 'light' | 'dark') => {
  return mode === 'light' ? cardStyles.light : cardStyles.dark;
};

// Get header styles based on mode
export const getHeaderStyles = (mode: 'light' | 'dark') => {
  return mode === 'light' ? headerStyles.light : headerStyles.dark;
};

// ============================================
// 12. SX PROP HELPERS (MUI Ready)
// ============================================
export const sxHelpers = {
  // Card with hover effect
  card: (mode: 'light' | 'dark') => ({
    ...getCardStyles(mode).base,
    '&:hover': getCardStyles(mode).hover,
  }),

  // Elevated card (dialogs, popovers)
  elevatedCard: (mode: 'light' | 'dark') => ({
    backgroundColor: getTokens(mode).background.elevated,
    border: `1px solid ${getTokens(mode).border.default}`,
    borderRadius: radius.xl,
    boxShadow: getShadows(mode).lg,
  }),

  // Muted card (secondary content)
  mutedCard: (mode: 'light' | 'dark') => ({
    backgroundColor: getTokens(mode).background.muted,
    border: `1px solid ${getTokens(mode).border.light}`,
    borderRadius: radius.lg,
  }),

  // Text styles
  textPrimary: (mode: 'light' | 'dark') => ({
    color: getTokens(mode).text.primary,
  }),

  textSecondary: (mode: 'light' | 'dark') => ({
    color: getTokens(mode).text.secondary,
  }),

  textBrand: (mode: 'light' | 'dark') => ({
    color: getTokens(mode).text.brand,
    fontWeight: typography.weight.semibold,
  }),

  // Primary button
  primaryButton: {
    background: buttonStyles.primary.background,
    color: buttonStyles.primary.color,
    boxShadow: buttonStyles.primary.boxShadow,
    '&:hover': {
      background: buttonStyles.primary.hoverBackground,
      boxShadow: buttonStyles.primary.hoverShadow,
      transform: 'translateY(-1px)',
    },
    transition: animation.transition.default,
  },
} as const;

// ============================================
// LEGACY EXPORTS (for backwards compatibility)
// ============================================
// These mirror the old studioColors, studioGradients, etc. from PremiumHeader.tsx

export const studioColors = {
  emerald: brand.emerald[500],
  emeraldDark: brand.emerald[700],
  emeraldLight: brand.emerald[400],
  emeraldDeep: brand.emerald[800],
  gold: brand.gold[500],
  goldLight: brand.gold[200],
  surface: lightTokens.background.surface,
  surfaceElevated: lightTokens.background.elevated,
  surfaceMuted: lightTokens.background.muted,
  dark: brand.slate[900],
  darkSoft: brand.slate[800],
  textPrimary: lightTokens.text.primary,
  textSecondary: lightTokens.text.secondary,
  textMuted: lightTokens.text.muted,
  border: lightTokens.border.default,
  borderLight: lightTokens.border.light,
};

export const studioGradients = gradients;

export const studioShadows = {
  ...shadows.light,
  emerald: shadows.light.emerald,
  gold: shadows.light.gold,
};

export const studioCardStyles = {
  card: sxHelpers.card('light'),
  sectionTitle: {
    fontWeight: typography.weight.semibold,
    color: lightTokens.text.primary,
    fontSize: typography.size.md,
    letterSpacing: typography.letterSpacing.tight,
  },
  label: {
    fontWeight: typography.weight.medium,
    color: lightTokens.text.secondary,
    fontSize: typography.size.base,
  },
  value: {
    fontWeight: typography.weight.semibold,
    color: lightTokens.text.primary,
  },
  emeraldAccent: {
    color: brand.emerald[500],
    fontWeight: typography.weight.semibold,
  },
};

// ============================================
// 13. iOS SEMANTIC COLORS (HIG Compliant)
// ============================================
// These match Apple's iOS semantic color system for proper dark mode support
export const iosSemanticColors = {
  // Labels - for text hierarchy
  label: {
    light: 'rgba(0, 0, 0, 1)',
    dark: 'rgba(255, 255, 255, 1)',
  },
  secondaryLabel: {
    light: 'rgba(60, 60, 67, 0.75)', // WCAG AA 5.1:1 on white (was 0.6 = 3.4:1)
    dark: 'rgba(235, 235, 245, 0.6)', // 6.0:1 on #1C1C1E — already passes AA
  },
  tertiaryLabel: {
    light: 'rgba(60, 60, 67, 0.7)', // WCAG AA 4.6:1 on white (was 0.3 = 1.9:1)
    dark: 'rgba(235, 235, 245, 0.55)', // WCAG AA 5.0:1 on #1C1C1E (was 0.3 = 2.4:1)
  },
  quaternaryLabel: {
    light: 'rgba(60, 60, 67, 0.44)', // 3:1 for decorative/disabled (was 0.18)
    dark: 'rgba(235, 235, 245, 0.38)', // 3:1 for decorative/disabled (was 0.16)
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

// ============================================
// 14. LAYOUT CONSTANTS (iOS HIG)
// ============================================
// Fixed dimensions for consistent UI across the app
export const layoutConstants = {
  // Navigation
  tabBarHeight: 56,
  tabBarClearance: 80, // tabBar + safe spacing for floating elements
  navBarHeight: 44,
  largeNavBarHeight: 96,
  // Safe areas (fallback values when env() not available)
  safeAreaTopFallback: 47, // iPhone notch
  safeAreaBottomFallback: 34, // iPhone home indicator
  // Touch targets (iOS HIG minimum: 44pt)
  minTouchTarget: 44,
  // Common offsets
  floatingButtonOffset: 96, // For WhatsApp button, FABs
  comparisonBarOffset: 64,
  quickActionsOffset: 80,
} as const;

// ============================================
// 15. ACCENT & STATUS COLORS
// ============================================
// Consolidated accent colors for various UI elements
export const accentColors = {
  // Social/Brand
  whatsapp: '#25D366',
  whatsappHover: '#20BD5A',
  instagram: '#E4405F',
  facebook: '#1877F2',
  // Status (semantic)
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
    minimum: { color: '#64748B', label: 'Mínimo' },
    base: { color: '#3B82F6', label: 'Base' },
    ideal: { color: brand.emerald[500], label: 'Ideal' },
    premium: { color: '#D4AF37', label: 'Premium' },
  },
} as const;

// ============================================
// 16. iOS TYPOGRAPHY SCALE (HIG Compliant)
// ============================================
// Matches iOS Dynamic Type sizes for consistency
export const iosTypographyScale = {
  // Large Title - 34pt
  largeTitle: '2.125rem',
  // Title 1 - 28pt
  title1: '1.75rem',
  // Title 2 - 22pt
  title2: '1.375rem',
  // Title 3 - 20pt
  title3: '1.25rem',
  // Headline - 17pt semibold
  headline: '1.0625rem',
  // Body - 17pt
  body: '1.0625rem',
  // Callout - 16pt
  callout: '1rem',
  // Subhead - 15pt
  subhead: '0.9375rem',
  // Footnote - 13pt
  footnote: '0.8125rem',
  // Caption 1 - 12pt
  caption1: '0.75rem',
  // Caption 2 - 11pt
  caption2: '0.6875rem',
} as const;

// ============================================
// 17. HELPER: Get iOS Semantic Color
// ============================================
export const getIOSColor = (
  colorKey: keyof typeof iosSemanticColors,
  mode: 'light' | 'dark'
): string => {
  return iosSemanticColors[colorKey][mode];
};

// ============================================
// 18. HELPER: Get Accent Color
// ============================================
export const getAccentColor = (
  colorKey: keyof Omit<typeof accentColors, 'priceTiers'>,
  mode: 'light' | 'dark' = 'light'
): string => {
  const color = accentColors[colorKey];
  if (typeof color === 'string') return color;
  return color[mode];
};

// ============================================
// 19. OPACITY TOKENS
// ============================================
export const opacity = {
  transparent: 0,
  whisper: 0.03,
  subtle: 0.05,
  glass: 0.06,
  light: 0.08,
  soft: 0.1,
  guide: 0.12,
  medium: 0.15,
  regular: 0.2,
  elevated: 0.25,
  prominent: 0.3,
  strong: 0.35,
  overlay: 0.4,
  half: 0.5,
  muted: 0.6,
  intense: 0.7,
  heavy: 0.8,
  solid: 0.85,
  near: 0.9,
  tooltip: 0.95,
  opaque: 1,
} as const;

export type OpacityLevel = keyof typeof opacity;

// ============================================
// 20. OVERLAY TOKENS
// ============================================
export const overlays = {
  glass: {
    light: {
      bg: `rgba(255,255,255,${opacity.glass})`,
      border: `rgba(255,255,255,${opacity.light})`,
      blur: 'blur(20px)',
    },
    dark: {
      bg: `rgba(0,0,0,${opacity.overlay})`,
      border: `rgba(255,255,255,${opacity.soft})`,
      blur: 'blur(20px)',
    },
    frosted: {
      bg: `rgba(255,255,255,${opacity.soft})`,
      border: `rgba(255,255,255,${opacity.medium})`,
      blur: 'blur(24px) saturate(180%)',
    },
  },
  hero: {
    gradient: `linear-gradient(to bottom, rgba(0,0,0,${opacity.soft}) 0%, rgba(0,0,0,${opacity.prominent}) 60%, rgba(0,0,0,${opacity.heavy}) 100%)`,
    subtle: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,${opacity.overlay}) 100%)`,
    strong: `linear-gradient(to bottom, transparent 40%, rgba(0,0,0,${opacity.intense}) 100%)`,
  },
  tooltip: {
    light: `rgba(255,255,255,${opacity.tooltip})`,
    dark: `rgba(30,41,59,${opacity.tooltip})`,
  },
  backdrop: {
    modal: `rgba(0,0,0,${opacity.half})`,
    sheet: `rgba(0,0,0,${opacity.prominent})`,
    heavy: `rgba(0,0,0,${opacity.intense})`,
  },
  pill: {
    active: {
      bg: `rgba(255,255,255,${opacity.regular})`,
      border: `rgba(255,255,255,${opacity.near})`,
    },
    inactive: {
      bg: 'transparent',
      border: `rgba(255,255,255,${opacity.half})`,
    },
    hover: {
      bg: `rgba(255,255,255,${opacity.soft})`,
    },
  },
  text: {
    primary: `rgba(255,255,255,${opacity.solid})`,
    secondary: `rgba(255,255,255,${opacity.muted})`,
    tertiary: `rgba(255,255,255,${opacity.half})`,
    hint: `rgba(255,255,255,${opacity.strong})`,
  },
} as const;

export const glassStyle = {
  light: {
    bgcolor: overlays.glass.light.bg,
    backdropFilter: overlays.glass.light.blur,
    WebkitBackdropFilter: overlays.glass.light.blur,
    border: '1px solid',
    borderColor: overlays.glass.light.border,
  },
  dark: {
    bgcolor: overlays.glass.dark.bg,
    backdropFilter: overlays.glass.dark.blur,
    WebkitBackdropFilter: overlays.glass.dark.blur,
    border: '1px solid',
    borderColor: overlays.glass.dark.border,
  },
  frosted: {
    bgcolor: overlays.glass.frosted.bg,
    backdropFilter: overlays.glass.frosted.blur,
    WebkitBackdropFilter: overlays.glass.frosted.blur,
    border: '1px solid',
    borderColor: overlays.glass.frosted.border,
  },
} as const;

export const thumbnailStates = {
  active: {
    border: `2px solid rgba(255,255,255,${opacity.near})`,
    boxShadow: `0 0 0 1px rgba(0,0,0,${opacity.regular})`,
  },
  inactive: {
    border: `2px solid rgba(255,255,255,${opacity.half})`,
    boxShadow: 'none',
  },
  hover: {
    border: `2px solid rgba(255,255,255,${opacity.intense})`,
  },
} as const;

// ============================================
// 21. COLOR UTILITY FUNCTIONS
// ============================================
export const whiteAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return `rgba(255, 255, 255, ${value})`;
};

export const blackAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return `rgba(0, 0, 0, ${value})`;
};

export const emeraldAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return alpha(brand.emerald[500], value);
};

export const emeraldDarkAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return alpha(brand.emerald[700], value);
};

export const goldAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return alpha(brand.gold[500], value);
};

export const errorAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return alpha('#EF4444', value); // Tailwind red-500
};

export const successAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return alpha(brand.emerald[500], value);
};

export const warningAlpha = (opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return alpha('#F59E0B', value); // Tailwind amber-500
};

export const textAlpha = (isLight: boolean, opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return isLight ? blackAlpha(value) : whiteAlpha(value);
};

export const borderAlpha = (isLight: boolean, opacityValue: number | OpacityLevel): string => {
  const value = typeof opacityValue === 'string' ? opacity[opacityValue] : opacityValue;
  return isLight ? `rgba(0, 0, 0, ${value})` : `rgba(255, 255, 255, ${value})`;
};

// ============================================
// 22. CHART TOKENS
// ============================================
export const chartTokens = {
  dimensions: {
    width: 400,
    height: 180,
    heightTall: 280,
    heightMini: 60,
  },
  padding: {
    top: 28,
    right: 12,
    bottom: 30,
    left: 36,
  },
  point: {
    radius: 6,
    radiusHover: 8,
    touchTargetRadius: 22,
  },
  line: {
    width: 2.5,
    widthThin: 1.5,
    widthThick: 3.5,
  },
  grid: {
    opacity: opacity.guide,
    width: 1,
    dashArray: '4,4',
  },
  tooltip: {
    width: 58,
    height: 32,
    borderRadius: 6,
    padding: 8,
  },
  animation: {
    pathDraw: 1500,
    pointAppear: 800,
    hover: 200,
  },
} as const;

export const chartColors = {
  emerald: {
    line: '#00AE7A',
    lineGradientStart: '#33C194',
    lineGradientEnd: '#008C61',
    area: `rgba(0, 174, 122, ${opacity.medium})`,
    areaGradientEnd: `rgba(0, 174, 122, ${opacity.whisper})`,
    point: '#00AE7A',
    pointHover: '#008C61',
    grid: `rgba(255, 255, 255, ${opacity.guide})`,
    gridDark: `rgba(0, 0, 0, ${opacity.guide})`,
  },
  gold: {
    line: '#D4AF37',
    lineGradientStart: '#E5C866',
    lineGradientEnd: '#8F7318',
    area: `rgba(212, 175, 55, ${opacity.medium})`,
    areaGradientEnd: `rgba(212, 175, 55, ${opacity.whisper})`,
    point: '#D4AF37',
    pointHover: '#B8941F',
    grid: `rgba(255, 255, 255, ${opacity.guide})`,
    gridDark: `rgba(0, 0, 0, ${opacity.guide})`,
  },
} as const;

export const chartBadge = {
  positive: {
    bg: `rgba(0, 174, 122, ${opacity.elevated})`,
    bgLight: `rgba(0, 174, 122, ${opacity.guide})`,
    text: '#00AE7A',
    border: 'transparent',
  },
  negative: {
    bg: `rgba(239, 68, 68, ${opacity.elevated})`,
    bgLight: `rgba(239, 68, 68, ${opacity.guide})`,
    text: '#EF4444',
    border: 'transparent',
  },
  neutral: {
    bg: `rgba(148, 163, 184, ${opacity.elevated})`,
    bgLight: `rgba(148, 163, 184, ${opacity.guide})`,
    text: '#94A3B8',
    border: 'transparent',
  },
} as const;
