/**
 * Primitive Motion Tokens
 * "Emerald iOS" Design System
 *
 * iOS-inspired animation system with spring physics and easing curves.
 * Creates natural, organic motion that feels alive and responsive.
 *
 * Reference: https://developer.apple.com/design/human-interface-guidelines/motion
 */

/**
 * Easing Curves
 * iOS standard bezier curves for smooth animations
 */
export const easingCurves = {
  /**
   * Standard - Most common easing
   * Use for general UI transitions
   */
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',

  /**
   * Decelerate - Ease out
   * Element enters view or appears
   */
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',

  /**
   * Accelerate - Ease in
   * Element exits view or disappears
   */
  accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',

  /**
   * Sharp - Quick transition
   * Use for rapid state changes
   */
  sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',

  /**
   * iOS Ease In Out - iOS native curve
   */
  iosEaseInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
} as const;

/**
 * Duration Scale
 * Timing values for different animation speeds
 */
export const durations = {
  /**
   * 100ms - Instant
   * Near-immediate feedback (hover states, toggles)
   */
  instant: '100ms',

  /**
   * 200ms - Fast
   * Quick transitions (button presses, menu opens)
   */
  fast: '200ms',

  /**
   * 300ms - Normal
   * Standard iOS transition timing
   */
  normal: '300ms',

  /**
   * 400ms - Slow
   * Deliberate movements (page transitions, modals)
   */
  slow: '400ms',

  /**
   * 500ms - Slower
   * Complex animations (multi-step transitions)
   */
  slower: '500ms',

  /**
   * 350ms - Page Transition
   * iOS standard push/pop navigation
   */
  pageTransition: '350ms',
} as const;

/**
 * Spring Physics Parameters
 * For natural, bouncy animations (CSS won't support these directly,
 * but they guide our bezier curve selection)
 */
export const springPresets = {
  /**
   * Gentle Spring
   * Subtle bounce, professional feel
   */
  gentle: {
    tension: 120,
    friction: 14,
    mass: 1,
    velocity: 0,
    // Approximate cubic-bezier equivalent
    cubicBezier: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  /**
   * Snappy Spring
   * Quick response, noticeable bounce
   */
  snappy: {
    tension: 180,
    friction: 12,
    mass: 1,
    velocity: 0,
    cubicBezier: 'cubic-bezier(0.68, -0.15, 0.265, 1.35)',
  },

  /**
   * Bouncy Spring
   * Playful, pronounced bounce
   */
  bouncy: {
    tension: 300,
    friction: 10,
    mass: 1,
    velocity: 0,
    cubicBezier: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

/**
 * Pre-configured Transitions
 * Ready-to-use transition strings
 */
export const transitions = {
  /**
   * All properties - Standard transition
   */
  all: `all ${durations.normal} ${easingCurves.standard}`,

  /**
   * Transform - Optimized for GPU
   */
  transform: `transform ${durations.normal} ${easingCurves.standard}`,

  /**
   * Opacity - Fade transitions
   */
  opacity: `opacity ${durations.fast} ${easingCurves.decelerate}`,

  /**
   * Background - Color changes
   */
  background: `background-color ${durations.fast} ${easingCurves.standard}`,

  /**
   * Border - Border animations
   */
  border: `border-color ${durations.fast} ${easingCurves.standard}`,

  /**
   * Box Shadow - Elevation changes
   */
  shadow: `box-shadow ${durations.normal} ${easingCurves.decelerate}`,

  /**
   * Spring - Bouncy animation
   */
  spring: `all ${durations.normal} ${springPresets.gentle.cubicBezier}`,

  /**
   * Snappy Spring - Quick bounce
   */
  springSnappy: `all ${durations.fast} ${springPresets.snappy.cubicBezier}`,
} as const;

/**
 * Keyframe Animations
 * Pre-defined animation patterns
 */
export const keyframes = {
  /**
   * Fade In
   */
  fadeIn: `
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `,

  /**
   * Fade Out
   */
  fadeOut: `
    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
  `,

  /**
   * Slide In from Right (iOS navigation)
   */
  slideInRight: `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `,

  /**
   * Slide Out to Left (iOS navigation)
   */
  slideOutLeft: `
    @keyframes slideOutLeft {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(-30%);
        opacity: 0.5;
      }
    }
  `,

  /**
   * Scale In (modal appearance)
   */
  scaleIn: `
    @keyframes scaleIn {
      from {
        transform: scale(0.9);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
  `,

  /**
   * Emerald Pulse - Brand animation
   * Glowing emerald effect
   */
  emeraldPulse: `
    @keyframes emeraldPulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(0, 174, 122, 0.7);
      }
      50% {
        transform: scale(1.05);
        box-shadow: 0 0 20px 10px rgba(0, 174, 122, 0);
      }
    }
  `,

  /**
   * Silver Shimmer - Metallic shine effect
   */
  silverShimmer: `
    @keyframes silverShimmer {
      0% {
        background-position: -200% center;
      }
      100% {
        background-position: 200% center;
      }
    }
  `,

  /**
   * Bounce - Playful bounce
   */
  bounce: `
    @keyframes bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-10px);
      }
    }
  `,
} as const;

/**
 * Stagger Delays
 * For cascading animations (Fibonacci-inspired)
 */
export const staggerDelays = {
  /**
   * Fibonacci sequence delays in milliseconds
   * Creates natural, organic stagger rhythm
   */
  fibonacci: [0, 50, 80, 130, 210, 340] as const,

  /**
   * Linear stagger
   */
  linear: [0, 50, 100, 150, 200, 250] as const,

  /**
   * Exponential stagger
   */
  exponential: [0, 50, 100, 200, 400, 800] as const,
} as const;

/**
 * Combined Motion System
 */
export const motion = {
  easing: easingCurves,
  duration: durations,
  spring: springPresets,
  transition: transitions,
  keyframes,
  stagger: staggerDelays,
} as const;

export type Motion = typeof motion;
