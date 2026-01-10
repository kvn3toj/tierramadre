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
export {
  overlays,
  glassStyle,
  thumbnailStates,
} from './tokens/overlays';

// Charts / Data Visualization
export {
  chartTokens,
  chartColors,
  chartBadge,
} from './tokens/charts';

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
} from './utils/colorUtils';

// =============================================================================
// COMPONENTS
// =============================================================================

// Button
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './components/Button';

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
