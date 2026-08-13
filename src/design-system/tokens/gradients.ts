/**
 * Tierra Madre Design System - Gradient Tokens
 *
 * Emerald-inspired gradients representing quality tiers,
 * Colombian heritage, and natural beauty.
 */

// =============================================================================
// EMERALD GRADIENTS
// =============================================================================

export const emeraldGradients = {
  /** Soft, light emerald gradient */
  light: 'linear-gradient(135deg, #E6F7F1 0%, #B3E6D9 100%)',
  /** Medium emerald gradient */
  medium: 'linear-gradient(135deg, #66D4AE 0%, #00C992 100%)',
  /** Deep emerald gradient */
  deep: 'linear-gradient(135deg, #00C992 0%, #006A48 100%)',
  /** Intense emerald gradient */
  intense: 'linear-gradient(135deg, #008C61 0%, #004830 100%)',
  /** Horizontal emerald */
  horizontal: 'linear-gradient(90deg, #00C992 0%, #006A48 100%)',
  /** Vertical emerald */
  vertical: 'linear-gradient(180deg, #00C992 0%, #006A48 100%)',
} as const;

// =============================================================================
// GOLD GRADIENTS
// =============================================================================

export const goldGradients = {
  /** Soft gold gradient */
  light: 'linear-gradient(135deg, #EBEDEC 0%, #C9CECB 100%)',
  /** Medium gold gradient */
  medium: 'linear-gradient(135deg, #9AA09D 0%, #8C928F 100%)',
  /** Deep gold gradient */
  deep: 'linear-gradient(135deg, #8C928F 0%, #5C6360 100%)',
  /** Intense gold gradient */
  intense: 'linear-gradient(135deg, #5C6360 0%, #272C2B 100%)',
} as const;

// =============================================================================
// QUALITY TIER GRADIENTS
// =============================================================================

export const qualityGradients = {
  /** Estándar - Entry quality */
  estandar: 'linear-gradient(135deg, #33C194 0%, #00C992 100%)',
  /** Fina - Fine quality */
  fina: 'linear-gradient(135deg, #00C992 0%, #008C61 100%)',
  /** SuperFina - Super fine quality */
  superFina: 'linear-gradient(135deg, #008C61 0%, #006A48 100%)',
  /** Sublime - Highest quality with gold accent */
  sublime: 'linear-gradient(135deg, #006A48 0%, #004830 50%, #8C928F 100%)',
  /** Sublime alternative - darker */
  sublimeAlt: 'linear-gradient(135deg, #006A48 0%, #004830 100%)',
} as const;

// =============================================================================
// BACKGROUND GRADIENTS
// =============================================================================

export const backgroundGradients = {
  /** Light mode page background */
  light: 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)',
  /** Dark mode page background */
  dark: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
  /** Emerald-tinted light background */
  emeraldLight: 'linear-gradient(180deg, #FFFFFF 0%, #E6F7F1 100%)',
  /** Emerald-tinted dark background */
  emeraldDark: 'linear-gradient(180deg, #0F172A 0%, #004830 100%)',
  /** Hero section gradient */
  hero: 'linear-gradient(135deg, #00C992 0%, #006A48 50%, #004830 100%)',
  /** Subtle emerald tint */
  subtle:
    'linear-gradient(180deg, rgba(0, 174, 122, 0.02) 0%, rgba(0, 174, 122, 0.08) 100%)',
} as const;

// =============================================================================
// RADIAL GRADIENTS
// =============================================================================

export const radialGradients = {
  /** Emerald spotlight effect */
  emeraldSpotlight:
    'radial-gradient(circle at 50% 50%, rgba(0, 174, 122, 0.2) 0%, transparent 70%)',
  /** Gold spotlight effect */
  goldSpotlight:
    'radial-gradient(circle at 50% 50%, rgba(140, 146, 143, 0.2) 0%, transparent 70%)',
  /** Card hover glow */
  hoverGlow:
    'radial-gradient(circle at 50% 50%, rgba(0, 174, 122, 0.15) 0%, transparent 60%)',
  /** Center light */
  centerLight:
    'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, transparent 70%)',
  /** Vignette effect */
  vignette:
    'radial-gradient(circle at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.1) 100%)',
} as const;

// =============================================================================
// CONIC GRADIENTS (Decorative)
// =============================================================================

export const conicGradients = {
  /** Emerald spectrum */
  emeraldSpectrum:
    'conic-gradient(from 0deg, #33C194, #00C992, #008C61, #006A48, #004830, #006A48, #008C61, #00C992, #33C194)',
  /** Gold spectrum */
  goldSpectrum:
    'conic-gradient(from 0deg, #C9CECB, #9AA09D, #8C928F, #5C6360, #3A403E, #5C6360, #8C928F, #9AA09D, #C9CECB)',
  /** Sublime (emerald + gold) */
  sublimeSpectrum:
    'conic-gradient(from 0deg, #006A48, #8C928F, #004830, #5C6360, #006A48)',
} as const;

// =============================================================================
// BUTTON GRADIENTS
// =============================================================================

export const buttonGradients = {
  /** Primary button */
  primary: 'linear-gradient(135deg, #00C992 0%, #008C61 100%)',
  /** Primary button hover */
  primaryHover: 'linear-gradient(135deg, #3FDCAE 0%, #00C992 100%)',
  /** Primary button active */
  primaryActive: 'linear-gradient(135deg, #008C61 0%, #006A48 100%)',
  /** Secondary (gold) button */
  secondary: 'linear-gradient(135deg, #8C928F 0%, #5C6360 100%)',
  /** Secondary button hover */
  secondaryHover: 'linear-gradient(135deg, #9AA09D 0%, #8C928F 100%)',
  /** Danger button */
  danger: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  /** Danger button hover */
  dangerHover: 'linear-gradient(135deg, #F87171 0%, #EF4444 100%)',
} as const;

// =============================================================================
// ORIGIN REGION GRADIENTS
// =============================================================================

export const originGradients = {
  /** Muzo - Classic green */
  muzo: 'linear-gradient(135deg, #00C992 0%, #006A48 100%)',
  /** Chivor - Blue-green */
  chivor: 'linear-gradient(135deg, #0099CC 0%, #006699 100%)',
  /** Coscuez - Yellow-green */
  coscuez: 'linear-gradient(135deg, #00B35C 0%, #008844 100%)',
  /** Gachalá - Bright green */
  gachala: 'linear-gradient(135deg, #00CC88 0%, #009966 100%)',
} as const;

// =============================================================================
// MESH GRADIENTS (Complex backgrounds)
// =============================================================================

export const meshGradients = {
  /** Emerald mesh */
  emerald: `
    radial-gradient(at 40% 20%, rgba(0, 174, 122, 0.3) 0px, transparent 50%),
    radial-gradient(at 80% 0%, rgba(0, 140, 97, 0.2) 0px, transparent 50%),
    radial-gradient(at 0% 50%, rgba(0, 106, 72, 0.2) 0px, transparent 50%),
    radial-gradient(at 80% 50%, rgba(51, 193, 148, 0.15) 0px, transparent 50%),
    radial-gradient(at 0% 100%, rgba(0, 72, 48, 0.2) 0px, transparent 50%)
  `,
  /** Gold mesh */
  gold: `
    radial-gradient(at 40% 20%, rgba(140, 146, 143, 0.3) 0px, transparent 50%),
    radial-gradient(at 80% 0%, rgba(92, 99, 96, 0.2) 0px, transparent 50%),
    radial-gradient(at 0% 50%, rgba(58, 64, 62, 0.2) 0px, transparent 50%),
    radial-gradient(at 80% 50%, rgba(154, 160, 157, 0.15) 0px, transparent 50%)
  `,
  /** Sublime mesh (emerald + gold) */
  sublime: `
    radial-gradient(at 20% 30%, rgba(0, 174, 122, 0.25) 0px, transparent 50%),
    radial-gradient(at 80% 20%, rgba(140, 146, 143, 0.2) 0px, transparent 50%),
    radial-gradient(at 50% 80%, rgba(0, 106, 72, 0.2) 0px, transparent 50%),
    radial-gradient(at 90% 70%, rgba(92, 99, 96, 0.15) 0px, transparent 50%)
  `,
} as const;

// =============================================================================
// COMPOSITE EXPORT
// =============================================================================

export const gradients = {
  emerald: emeraldGradients,
  gold: goldGradients,
  quality: qualityGradients,
  background: backgroundGradients,
  radial: radialGradients,
  conic: conicGradients,
  button: buttonGradients,
  origin: originGradients,
  mesh: meshGradients,
} as const;

export default gradients;
