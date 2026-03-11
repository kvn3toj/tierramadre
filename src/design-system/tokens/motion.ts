/**
 * Motion Design Tokens — FRAMER MOTION LAYER
 *
 * iOS HIG-compliant animation system using framer-motion.
 * Based on sacred geometry principles (φ = 1.618).
 *
 * ┌──────────────────────────────────────────────────────┐
 * │  MOTION TOKEN BOUNDARY                               │
 * │                                                      │
 * │  primitives/motion.ts  → CSS easing strings,         │
 * │                          CSS keyframes, CSS durations │
 * │                          Use in: sx props, styled()   │
 * │                                                      │
 * │  tokens/motion.ts      → Framer Motion springs,      │
 * │  (THIS FILE)             animation variants,          │
 * │                          gesture configs              │
 * │                          Use in: <motion.div />       │
 * │                                                      │
 * │  Both share: cssTransition (CSS transition strings)   │
 * └──────────────────────────────────────────────────────┘
 *
 * Designed by ARIA - UX/UI Implementation Capitana
 */

// =============================================================================
// TIMING TOKENS
// =============================================================================

export const duration = {
  /** Immediate feedback (micro-interactions) */
  instant: 0.1,
  /** Quick transitions (button states) */
  fast: 0.2,
  /** Standard animations (card transitions) */
  base: 0.3,
  /** Emphasis animations (reveals) */
  slow: 0.5,
  /** Complex sequences */
  slower: 0.8,
} as const;

// =============================================================================
// EASING CURVES
// =============================================================================

export const easing = {
  /** Material Design standard */
  standard: [0.4, 0, 0.2, 1] as const,
  /** Decelerate (entering elements) */
  decelerate: [0, 0, 0.2, 1] as const,
  /** Accelerate (exiting elements) */
  accelerate: [0.4, 0, 1, 1] as const,
  /** iOS-style spring bounce */
  spring: [0.34, 1.56, 0.64, 1] as const,
  /** Smooth ease-out */
  smooth: [0.25, 0.1, 0.25, 1] as const,
} as const;

// =============================================================================
// SPRING PHYSICS
// =============================================================================

export const spring = {
  /** Bouncy - for playful interactions */
  bouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 10,
  },
  /** Smooth - for standard transitions */
  smooth: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 20,
  },
  /** Gentle - for subtle movements */
  gentle: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 30,
  },
  /** Snappy - for responsive feedback */
  snappy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 25,
  },
} as const;

// =============================================================================
// MICROINTERACTION TOKENS (from ds-tm.pen 03A/03B specs)
// =============================================================================

export const microinteraction = {
  /** 03B: Bottom nav pill slide */
  navPill: { type: 'tween' as const, duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  /** 03A: Touch ripple expand */
  ripple: { duration: 0.4, ease: 'easeOut' },
  /** 03B: Badge pulse ring */
  badgePulse: { duration: 2, scaleEnd: 2.5, opacityStart: 0.4 },
  /** 03B: Scale & glow press/release */
  pressScale: { press: 0.96, duration: 0.1 },
  /** 03B: Spring release after press */
  releaseSpring: { type: 'spring' as const, stiffness: 400, damping: 15 },
  /** 03B: Toggle spring physics */
  toggle: { type: 'spring' as const, mass: 1, stiffness: 500, damping: 30 },
} as const;

// =============================================================================
// COMMON TRANSITIONS
// =============================================================================

export const transition = {
  /** Default transition */
  default: {
    duration: duration.base,
    ease: easing.standard,
  },
  /** Fast feedback */
  fast: {
    duration: duration.fast,
    ease: easing.smooth,
  },
  /** Smooth entry */
  enter: {
    duration: duration.base,
    ease: easing.decelerate,
  },
  /** Quick exit */
  exit: {
    duration: duration.fast,
    ease: easing.accelerate,
  },
} as const;

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

/** Card hover/focus animation */
export const cardVariants = {
  initial: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.02,
    y: -8,
    transition: {
      ...spring.smooth,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: duration.instant,
    },
  },
  focus: {
    scale: 1.01,
    y: -4,
    transition: {
      ...spring.gentle,
    },
  },
} as const;

/** Fade in from bottom */
export const fadeInUp = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: transition.enter,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: transition.exit,
  },
} as const;

/** Stagger children animation */
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
} as const;

/** Stagger child item */
export const staggerItem = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
} as const;

/** Scale in animation */
export const scaleIn = {
  initial: {
    opacity: 0,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      ...spring.smooth,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: transition.exit,
  },
} as const;

/** Accordion expand/collapse */
export const accordionVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: duration.base, ease: easing.standard },
      opacity: { duration: duration.fast },
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: duration.base, ease: easing.decelerate },
      opacity: { duration: duration.base, delay: 0.1 },
    },
  },
} as const;

/** Progress ring animation */
export const progressRing = {
  initial: (_progress: number) => ({
    strokeDashoffset: 100,
  }),
  animate: (progress: number) => ({
    strokeDashoffset: 100 - progress,
    transition: {
      ...spring.gentle,
      duration: duration.slow,
    },
  }),
} as const;

/** Pulse animation for active states */
export const pulse = {
  scale: [1, 1.05, 1],
  opacity: [0.6, 1, 0.6],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

/** Shimmer effect for loading */
export const shimmer = {
  x: ['-100%', '200%'],
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'linear',
  },
} as const;

// =============================================================================
// CSS TRANSITION STRINGS (for sx prop / inline styles)
// =============================================================================

export const cssTransition = {
  /** Fast feedback (100ms) */
  fast: 'all 100ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  /** Default transitions (200ms) */
  default: 'all 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  /** Slow transitions (300ms) */
  slow: 'all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  /** Spring-like (300ms with overshoot) */
  spring: 'all 300ms cubic-bezier(0.68, -0.15, 0.265, 1.35)',
  /** Colors only (200ms) */
  colors: 'background-color 200ms, border-color 200ms, color 200ms',
} as const;

// =============================================================================
// GESTURE CONFIGURATIONS
// =============================================================================

export const gesture = {
  /** Swipe threshold in pixels */
  swipeThreshold: 50,
  /** Drag elasticity */
  dragElastic: 0.1,
  /** Drag constraints */
  dragMomentum: true,
} as const;

// =============================================================================
// COMPOSITE EXPORT
// =============================================================================

export const motionTokens = {
  duration,
  easing,
  spring,
  transition,
  cssTransition,
  microinteraction,
  variants: {
    card: cardVariants,
    fadeInUp,
    staggerContainer,
    staggerItem,
    scaleIn,
    accordion: accordionVariants,
    progressRing,
    pulse,
    shimmer,
  },
  gesture,
} as const;

export default motionTokens;
