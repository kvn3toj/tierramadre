import { createTheme, alpha } from '@mui/material/styles';
import { primitiveColors } from './design-system/tokens/primitives/colors';

// ============================================
// iOS HIG Design Tokens for Tierra Madre
// Uses primitiveColors as single source of truth
// ============================================

// Tierra Madre brand colors - Based on logo green #00AE7A
export const brandColors = {
  // Primary emerald palette (from logo) - using primitives
  emeraldGreen: primitiveColors.emerald[500],      // Logo green - primary
  emeraldDark: primitiveColors.emerald[600],       // Darker for hover/pressed states
  emeraldLight: primitiveColors.emerald[400],      // Lighter variant
  emeraldDeep: primitiveColors.emerald[700],       // Deep for contrast

  // Tailwind-compatible shades (for UI components)
  emerald: primitiveColors.emerald,

  // Accent colors
  gold: '#D4AF37',
  goldLight: '#F5D76E',

  // Dark theme surfaces (iOS-style depth) - using primitives
  darkBg: primitiveColors.surfaces.dark.primary,   // iOS true black
  darkSurface: primitiveColors.surfaces.dark.secondary, // iOS secondary background
  darkElevated: '#2C2C2E',      // iOS tertiary background
  darkGrouped: primitiveColors.surfaces.dark.secondary, // iOS grouped background

  // Light colors - using primitives
  white: primitiveColors.surfaces.light.primary,
  offWhite: primitiveColors.surfaces.light.secondary, // iOS system gray 6

  // iOS System Colors - using primitives
  systemGray: primitiveColors.system.gray.light,
  systemGray2: '#636366',
  systemGray3: '#48484A',
  systemGray4: '#3A3A3C',
  systemGray5: '#2C2C2E',
  systemGray6: primitiveColors.surfaces.dark.secondary,
};

// iOS HIG Spacing (8pt grid system)
export const iosSpacing = {
  xxs: 4,   // 0.5x
  xs: 8,    // 1x base unit
  sm: 12,   // 1.5x
  md: 16,   // 2x
  lg: 20,   // 2.5x
  xl: 24,   // 3x
  xxl: 32,  // 4x
  xxxl: 44, // Touch target (iOS HIG minimum)
};

// iOS HIG Animation Curves
export const iosAnimations = {
  // Standard iOS easing
  easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',

  // iOS Spring animations
  spring: 'cubic-bezier(0.68, -0.15, 0.265, 1.35)',
  springGentle: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  springBouncy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Durations
  fast: '0.15s',
  normal: '0.25s',
  slow: '0.35s',

  // Presets
  transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  springTransition: 'all 0.3s cubic-bezier(0.68, -0.15, 0.265, 1.35)',
};

// iOS HIG Border Radius
export const iosBorderRadius = {
  xs: 4,    // Small elements
  sm: 8,    // Buttons, small cards
  md: 12,   // Cards, modals
  lg: 16,   // Large cards, sheets
  xl: 20,   // Bottom sheets
  full: 9999, // Pills, circles
};

// iOS HIG Shadows (elevation system)
export const iosShadows = {
  none: 'none',
  sm: `0 1px 3px ${alpha('#000', 0.12)}, 0 1px 2px ${alpha('#000', 0.08)}`,
  md: `0 4px 6px ${alpha('#000', 0.12)}, 0 2px 4px ${alpha('#000', 0.08)}`,
  lg: `0 10px 20px ${alpha('#000', 0.15)}, 0 3px 6px ${alpha('#000', 0.1)}`,
  xl: `0 20px 40px ${alpha('#000', 0.2)}, 0 5px 10px ${alpha('#000', 0.1)}`,
  // iOS-style floating elements
  floating: `0 10px 40px ${alpha('#000', 0.4)}`,
  // iOS-style press state
  inset: `inset 0 2px 4px ${alpha('#000', 0.1)}`,
};

// iOS HIG Typography Scale
const iosTypography = {
  // iOS Large Title
  largeTitle: {
    fontSize: '2.125rem', // 34px
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  // iOS Title 1
  title1: {
    fontSize: '1.75rem', // 28px
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: '-0.02em',
  },
  // iOS Title 2
  title2: {
    fontSize: '1.375rem', // 22px
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  // iOS Title 3
  title3: {
    fontSize: '1.25rem', // 20px
    fontWeight: 600,
    lineHeight: 1.35,
    letterSpacing: '-0.01em',
  },
  // iOS Headline
  headline: {
    fontSize: '1.0625rem', // 17px
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '-0.01em',
  },
  // iOS Body
  body: {
    fontSize: '1.0625rem', // 17px
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '-0.01em',
  },
  // iOS Callout
  callout: {
    fontSize: '1rem', // 16px
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: '-0.01em',
  },
  // iOS Subhead
  subhead: {
    fontSize: '0.9375rem', // 15px
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: '-0.01em',
  },
  // iOS Footnote
  footnote: {
    fontSize: '0.8125rem', // 13px
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: '-0.005em',
  },
  // iOS Caption 1
  caption1: {
    fontSize: '0.75rem', // 12px
    fontWeight: 400,
    lineHeight: 1.35,
    letterSpacing: '0',
  },
  // iOS Caption 2
  caption2: {
    fontSize: '0.6875rem', // 11px
    fontWeight: 400,
    lineHeight: 1.3,
    letterSpacing: '0.005em',
  },
};

// Create the MUI theme with iOS HIG tokens - Light Mode Professional
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brandColors.emeraldGreen,
      light: brandColors.emeraldLight,
      dark: brandColors.emeraldDark,
    },
    secondary: {
      main: brandColors.gold,
      light: brandColors.goldLight,
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      disabled: '#9CA3AF',
    },
    divider: '#E5E7EB',
    action: {
      active: brandColors.emeraldGreen,
      hover: alpha(brandColors.emeraldGreen, 0.08),
      selected: alpha(brandColors.emeraldGreen, 0.12),
      disabled: alpha('#000000', 0.26),
      disabledBackground: alpha('#000000', 0.12),
    },
  },
  typography: {
    // iOS-style system font stack
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Roboto, Arial, sans-serif',

    // Map iOS typography to MUI variants
    h1: {
      ...iosTypography.largeTitle,
      fontFamily: '"Libre Baskerville", Georgia, serif', // Keep brand font for headings
    },
    h2: {
      ...iosTypography.title1,
      fontFamily: '"Libre Baskerville", Georgia, serif',
    },
    h3: {
      ...iosTypography.title2,
      fontFamily: '"Libre Baskerville", Georgia, serif',
    },
    h4: {
      ...iosTypography.title3,
    },
    h5: {
      ...iosTypography.headline,
    },
    h6: {
      ...iosTypography.subhead,
      fontWeight: 600,
    },
    subtitle1: {
      ...iosTypography.callout,
      fontWeight: 500,
    },
    subtitle2: {
      ...iosTypography.footnote,
      fontWeight: 500,
    },
    body1: {
      ...iosTypography.body,
    },
    body2: {
      ...iosTypography.subhead,
    },
    button: {
      ...iosTypography.headline,
      textTransform: 'none', // iOS never uses uppercase
    },
    caption: {
      ...iosTypography.caption1,
    },
    overline: {
      ...iosTypography.caption2,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
  },
  shape: {
    borderRadius: iosBorderRadius.sm,
  },
  spacing: iosSpacing.xs, // 8px base unit
  components: {
    // Global defaults
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          WebkitTapHighlightColor: 'transparent',
        },
        // Smooth scrolling is scoped to the document root instead of every
        // element. Applying `scroll-behavior: smooth` to `*` forced animated
        // scrolling on every nested scroller (the catalog grid, the bottom
        // sheets) and fought programmatic jumps such as scroll restoration,
        // which had to explicitly bypass it. The app shell's <main> still opts
        // in to smooth scrolling on its own.
        html: {
          scrollBehavior: 'smooth',
          '@media (prefers-reduced-motion: reduce)': {
            scrollBehavior: 'auto',
          },
        },
        body: {
          // iOS overscroll behavior
          overscrollBehavior: 'none',
        },
        // NOTE: the `img, video` protection that used to live here moved to
        // src/design-system/tokens/css-variables.css. It never ran from this
        // file — nothing imports this theme, and <CssBaseline /> is not
        // mounted, so these styleOverrides are inert. Do not re-add it here.
      },
    },
    // Button with iOS styling
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: iosBorderRadius.sm,
          minHeight: iosSpacing.xxxl, // 44px touch target
          padding: `${iosSpacing.sm}px ${iosSpacing.md}px`,
          transition: iosAnimations.transition,
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        contained: {
          boxShadow: iosShadows.sm,
          '&:hover': {
            boxShadow: iosShadows.md,
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': {
            borderWidth: 1.5,
          },
        },
      },
    },
    // Card with iOS elevation - uses CSS vars for dark/light
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: iosBorderRadius.md,
          backgroundColor: 'var(--card-bg)',
          backgroundImage: 'none',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--card-border)',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: 'var(--shadow-md)',
            borderColor: 'var(--border-strong)',
          },
        },
      },
    },
    // Paper with iOS styling
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: iosBorderRadius.md,
          backgroundImage: 'none',
        },
        elevation1: { boxShadow: iosShadows.sm },
        elevation2: { boxShadow: iosShadows.md },
        elevation3: { boxShadow: iosShadows.lg },
        elevation4: { boxShadow: iosShadows.xl },
      },
    },
    // TextField with iOS styling
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: iosBorderRadius.sm,
            transition: iosAnimations.transition,
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2,
              },
            },
          },
        },
      },
    },
    // Chip with iOS pill style
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: iosBorderRadius.full,
          height: 32,
          transition: iosAnimations.transition,
        },
      },
    },
    // IconButton with iOS touch target
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: iosSpacing.sm,
          transition: iosAnimations.transition,
          '&:active': {
            transform: 'scale(0.9)',
          },
        },
        sizeMedium: {
          width: iosSpacing.xxxl, // 44px
          height: iosSpacing.xxxl,
        },
      },
    },
    // Tabs with iOS styling
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 2,
          borderRadius: 1,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          minHeight: 48,
          transition: iosAnimations.transition,
        },
      },
    },
    // Dialog with iOS modal styling
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: iosBorderRadius.lg,
          boxShadow: iosShadows.floating,
        },
      },
    },
    // Menu with iOS dropdown styling
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: iosBorderRadius.md,
          boxShadow: iosShadows.floating,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        },
      },
    },
    // MenuItem with iOS list styling
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: iosSpacing.xxxl, // 44px touch target
          transition: iosAnimations.transition,
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
      },
    },
    // ListItem with iOS styling
    MuiListItemButton: {
      styleOverrides: {
        root: {
          minHeight: iosSpacing.xxxl,
          transition: iosAnimations.transition,
          '&:active': {
            transform: 'scale(0.99)',
          },
        },
      },
    },
    // Drawer with iOS sheet styling
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
        paperAnchorBottom: {
          borderTopLeftRadius: iosBorderRadius.xl,
          borderTopRightRadius: iosBorderRadius.xl,
        },
      },
    },
    // Tooltip with iOS styling
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: iosBorderRadius.xs,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: iosTypography.footnote.fontSize,
        },
      },
    },
    // Snackbar with iOS toast styling
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiPaper-root': {
            borderRadius: iosBorderRadius.md,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          },
        },
      },
    },
    // Skeleton with iOS loading animation
    MuiSkeleton: {
      styleOverrides: {
        root: {
          borderRadius: iosBorderRadius.xs,
        },
        rounded: {
          borderRadius: iosBorderRadius.sm,
        },
      },
    },
    // Avatar with iOS styling
    MuiAvatar: {
      styleOverrides: {
        root: {
          width: iosSpacing.xxxl,
          height: iosSpacing.xxxl,
        },
        rounded: {
          borderRadius: iosBorderRadius.sm,
        },
      },
    },
    // Badge with iOS notification style
    MuiBadge: {
      styleOverrides: {
        badge: {
          minWidth: 18,
          height: 18,
          fontSize: iosTypography.caption2.fontSize,
          fontWeight: 600,
        },
      },
    },
    // Switch with iOS toggle styling
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 51,
          height: 31,
          padding: 0,
        },
        switchBase: {
          padding: 2,
          '&.Mui-checked': {
            transform: 'translateX(20px)',
          },
        },
        thumb: {
          width: 27,
          height: 27,
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        },
        track: {
          borderRadius: 31 / 2,
          opacity: 1,
          backgroundColor: 'var(--border-default)',
        },
      },
    },
    // Slider with iOS styling
    MuiSlider: {
      styleOverrides: {
        root: {
          height: 4,
        },
        thumb: {
          width: 28,
          height: 28,
          boxShadow: iosShadows.sm,
          '&:hover, &.Mui-focusVisible': {
            boxShadow: iosShadows.md,
          },
        },
        track: {
          borderRadius: 2,
        },
        rail: {
          borderRadius: 2,
          opacity: 0.3,
        },
      },
    },
    // Fab with iOS floating button style
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: iosShadows.floating,
          transition: iosAnimations.springTransition,
          '&:active': {
            transform: 'scale(0.95)',
          },
        },
      },
    },
  },
});

// iOS design tokens are exported inline above:
// - iosSpacing, iosAnimations, iosBorderRadius, iosShadows (exported as const)
// - iosTypography (internal only, mapped to MUI variants)
