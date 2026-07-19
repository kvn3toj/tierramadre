/**
 * Tierra Madre Design System
 *
 * A comprehensive design system for Colombian emeralds commerce.
 * Inspired by iOS Human Interface Guidelines with Tierra Madre brand identity.
 *
 * Designed by ARIA, MOKSART & EUNOIA
 */

// =============================================================================
// TOKENS
// =============================================================================

// Colors
export {
  emeraldCore,
  goldAccent,
  qualityTiers,
  originColors,
  semanticColors,
  surfacesLight,
  surfacesDark,
  priceTiers,
  colors,
} from './tokens/colors';

// Spacing
export {
  PHI,
  spacing,
  touchTargets,
  componentHeights,
  layoutRatios,
  containerWidths,
  breakpoints,
  safeArea,
  gaps,
  spacingSystem,
} from './tokens/spacing';

// Typography
export {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  typography,
  typographySystem,
} from './tokens/typography';

// Shadows
export {
  defaultShadows,
  emeraldShadows,
  goldShadows,
  semanticShadows,
  cardShadows,
  focusShadows,
  floatingLayerShadows,
  specularShadows,
  shadows,
} from './tokens/shadows';

// Glassmorphism
export {
  glassLight,
  glassDark,
  glassEmerald,
  glassGold,
  blurValues,
  saturationValues,
  applyGlass,
  glass,
  type GlassEffect,
} from './tokens/glass';

// Gradients
export {
  emeraldGradients,
  goldGradients,
  qualityGradients,
  backgroundGradients,
  radialGradients,
  conicGradients,
  buttonGradients,
  originGradients,
  meshGradients,
  gradients,
} from './tokens/gradients';

// Opacity
export { opacity, type OpacityLevel } from './tokens/opacity';

// Overlays
export { overlays, glassStyle, thumbnailStates } from './tokens/overlays';

// Charts / Data Visualization
export { chartTokens, chartColors, chartBadge } from './tokens/charts';

// Accents & Status Colors
export { accentColors, medalColors, getAccentColor } from './tokens/accents';

// iOS Semantic Colors
export { iosSemanticColors, getIOSColor } from './tokens/ios-semantic';

// iOS Typography Scale
export { iosTypographyScale } from './tokens/ios-typography';

// Layout Constants & Border Radius
export {
  layoutConstants,
  radius,
  zIndex,
  appShell,
  layoutBreakpoints,
} from './tokens/layout';

// Scroll container mixins (fixed-viewport shell — see README "Navigation UX Rules")
export {
  containedScrollY,
  containedScrollX,
  paneHeight,
  bottomBarClearance,
} from './mixins/scrollMixins';

// CSS Transition helpers & Microinteraction tokens
export { cssTransition, microinteraction } from './tokens/motion';

// Atelier (admin product-management tokens — back-of-house, parchment + ink)
export {
  atelierSurfaces,
  atelierInk,
  atelierBrass,
  atelierStatus,
  atelierFocus,
  atelierGrid,
  atelierSpacing,
  atelierType,
  atelierMotion,
  getAtelier,
  type Atelier,
  type AtelierMode,
} from './tokens/atelier';

// Fotosíntesis admin tokens (cool-neutral surfaces + emerald accent)
export { getFoto, type FotoMode, type FotoTokens } from './tokens/foto';

// Quiet Emerald — v2 redesign language ("Una joya en calma").
// Grayscale + single emerald accent; Cormorant / Hanken Grotesk / DM Mono.
export {
  quietEmerald,
  qeEmerald,
  qeAccent,
  qeGray,
  qeDark,
  qeLight,
  qeTokens,
  qeShadow,
  qeFont,
  qeType,
  qeRadius,
  qeMotion,
  getQuietEmerald,
  type QEMode,
  type QESurfaces,
} from './tokens/quiet-emerald';

// Vault Cinema (cinematic lockscreen tokens)
export { vaultCinema, type VaultCinemaTokens } from './tokens/vault-cinema';
export {
  vaultEasing,
  vaultEasingCss,
  vaultDurations,
  type VaultEasing,
  type VaultDurations,
} from './tokens/vault-motion';

// Primitives (re-exported for consistent import paths)
export { primitiveColors } from './tokens/primitives/colors';
export {
  spacing as primitiveSpacing,
  iosDimensions,
} from './tokens/primitives/spacing';
export { easingCurves, durations } from './tokens/primitives/motion';

// Legacy palette tokens (migrated from monolithic design-system.ts)
export {
  brand,
  lightTokens,
  darkTokens,
  gradients as legacyGradients,
  legacyTypography,
  getTokens,
  studioColors,
  studioGradients,
  studioShadows,
  animation,
} from './tokens/legacy-compat';

// =============================================================================
// UTILITIES
// =============================================================================

export {
  whiteAlpha,
  blackAlpha,
  emeraldAlpha,
  emeraldDarkAlpha,
  goldAlpha,
  errorAlpha,
  successAlpha,
  warningAlpha,
  textAlpha,
  borderAlpha,
  surfaceAlpha,
  // iOS HIG Contrast Tokens (WCAG AA Compliant)
  iosLabels,
  textOnGlass,
  getContrastText,
  iosFills,
  iosSeparators,
} from './utils/colorUtils';

// =============================================================================
// COMPONENTS
// =============================================================================

// Button
export {
  Button,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from './components/Button';

// Card
export {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  type CardProps,
  type CardVariant,
  type CardHeaderProps,
  type CardContentProps,
  type CardFooterProps,
} from './components/Card';

// Badge — the ONE status/label chip (dot/icon + label, never color-only).
export { Badge, type BadgeProps, type BadgeTone } from './components/Badge';

// MetricCard — the ONE stat tile (Card + Badge composition).
export { MetricCard, type MetricCardProps } from './components/MetricCard';

// TextField — the ONE text input.
export {
  TextField,
  type TextFieldProps,
  type TextFieldSize,
} from './components/TextField';

// Field — label[for] + help + error wrapper for non-self-labeled controls.
export { Field, type FieldProps } from './components/Field';

// SegmentedControl — the ONE bounded exclusive-choice switch.
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
} from './components/SegmentedControl';

// Sheet — the ONE overlay (desktop modal / mobile bottom-sheet split).
export { Sheet, type SheetProps } from './components/Sheet';

// EmptyState — the ONE "nothing here" shell.
export { EmptyState, type EmptyStateProps } from './components/EmptyState';

// ErrorState — the ONE "something broke" shell.
export { ErrorState, type ErrorStateProps } from './components/ErrorState';

// Skeleton — the ONE loading placeholder.
export { Skeleton, type SkeletonProps } from './components/Skeleton';

// FilterSheet — the ONE filter overlay.
export { FilterSheet, type FilterSheetProps } from './components/FilterSheet';

// Layout
export {
  Stack,
  VStack,
  HStack,
  Container,
  type StackProps,
  type VStackProps,
  type HStackProps,
  type ContainerProps,
  type StackDirection,
  type StackSpacing,
  type StackAlign,
  type StackJustify,
  type ContainerMaxWidth,
} from './components/Layout';

// TabBar — the ONE unified bottom navigation (DS v3). Storefront + Fotosíntesis
// + provider all render this component; only slots + theme differ (see
// src/components/navigation/tabBarConfig.ts).
export { TabBar } from './components/TabBar/TabBar';
export type {
  TabBarProps,
  TabSlot,
  TabBarTheme,
} from './components/TabBar/TabBar';

// =============================================================================
// DS v3 COMPOSITE — one object, the whole system (theme-as-data)
// =============================================================================
export { ds3, getDS3, ds3Motion, ds3Status, ds3States, ds3Shell } from './v3';
export type { DS3, DS3Mode, DS3Surfaces } from './v3';
