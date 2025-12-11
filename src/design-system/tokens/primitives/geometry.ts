/**
 * Sacred Geometry Design Tokens
 *
 * Mathematical proportions inspired by nature and sacred geometry.
 * Used for harmonious visual design across the application.
 *
 * Designed by: Eunoia (Visual Design System)
 */

// =============================================================================
// GOLDEN RATIO & FIBONACCI
// =============================================================================

/**
 * Golden Ratio (Phi)
 * The divine proportion found throughout nature
 */
export const PHI = 1.618033988749895;
export const PHI_INVERSE = 0.618033988749895;

/**
 * Fibonacci Sequence
 * Natural growth pattern for harmonious scaling
 */
export const fibonacci = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233] as const;

/**
 * Golden Ratio Scale
 * Base size multiplied by golden ratio powers
 */
export const goldenScale = {
  xs: 4,                           // Base / PHI^3
  sm: Math.round(4 * PHI),         // ~6
  md: Math.round(4 * PHI ** 2),    // ~10
  base: Math.round(4 * PHI ** 3),  // ~17
  lg: Math.round(4 * PHI ** 4),    // ~27
  xl: Math.round(4 * PHI ** 5),    // ~44
  '2xl': Math.round(4 * PHI ** 6), // ~72
  '3xl': Math.round(4 * PHI ** 7), // ~116
} as const;

// =============================================================================
// HARMONIC PROPORTIONS
// =============================================================================

/**
 * Musical Intervals as Visual Ratios
 * Pythagorean proportions for pleasing visual relationships
 */
export const harmonicRatios = {
  unison: 1 / 1,       // 1:1
  octave: 2 / 1,       // 2:1
  fifth: 3 / 2,        // 3:2 (perfect fifth)
  fourth: 4 / 3,       // 4:3 (perfect fourth)
  major3rd: 5 / 4,     // 5:4
  minor3rd: 6 / 5,     // 6:5
  golden: PHI,         // Golden ratio
} as const;

/**
 * Aspect Ratios for UI Elements
 * Common proportions for cards, images, containers
 */
export const aspectRatios = {
  square: 1 / 1,
  golden: PHI,
  goldenPortrait: 1 / PHI,
  photo4x3: 4 / 3,
  photo3x2: 3 / 2,
  video16x9: 16 / 9,
  video21x9: 21 / 9,
  card: 1.5,           // Common card ratio
  story: 9 / 16,       // Instagram story
} as const;

// =============================================================================
// SACRED ANGLES
// =============================================================================

/**
 * Angles derived from sacred geometry
 * For rotations, gradients, and decorative elements
 */
export const sacredAngles = {
  golden: 137.5,       // Golden angle (360 / PHI^2)
  hexagon: 60,         // Hexagonal symmetry
  pentagon: 72,        // Pentagonal symmetry (360/5)
  octagon: 45,         // Octagonal symmetry
  vesicaPiscis: 33,    // Vesica piscis angle
  pyramid: 51.83,      // Great Pyramid slope
} as const;

// =============================================================================
// EMERALD CUT GEOMETRY
// =============================================================================

/**
 * Emerald Cut Proportions
 * Based on ideal emerald gemstone facet ratios
 */
export const emeraldCut = {
  /** Length to width ratio for emerald cuts */
  idealRatio: 1.5,
  /** Corner chamfer angle */
  cornerAngle: 45,
  /** Table facet percentage */
  tablePercent: 0.65,
  /** Crown angle degrees */
  crownAngle: 14,
  /** Pavilion angle degrees */
  pavilionAngle: 43,
  /** Step facet proportions */
  stepRatios: [0.2, 0.35, 0.45] as const,
} as const;

/**
 * Decorative corner radii inspired by emerald cuts
 */
export const emeraldRadius = {
  /** Chamfered corner style */
  chamfer: {
    xs: '4px 4px 4px 4px / 2px 2px 2px 2px',
    sm: '8px 8px 8px 8px / 4px 4px 4px 4px',
    md: '12px 12px 12px 12px / 6px 6px 6px 6px',
    lg: '16px 16px 16px 16px / 8px 8px 8px 8px',
  },
  /** Standard rounded corners (fibonacci-based) */
  rounded: {
    none: 0,
    xs: 2,
    sm: 3,
    md: 5,
    lg: 8,
    xl: 13,
    '2xl': 21,
    full: 9999,
  },
} as const;

// =============================================================================
// SPACING BASED ON GOLDEN RATIO
// =============================================================================

/**
 * Spacing scale derived from golden ratio
 * Base unit: 4px
 */
export const goldenSpacing = {
  '0': 0,
  '0.5': 2,            // Base / 2
  '1': 4,              // Base
  '2': Math.round(4 * PHI_INVERSE),     // ~2.5 -> 3
  '3': Math.round(4 * 1),               // 4
  '4': Math.round(4 * PHI_INVERSE * 2), // ~5
  '5': Math.round(4 * PHI),             // ~6
  '6': Math.round(4 * PHI * PHI_INVERSE * 2), // ~8
  '8': Math.round(4 * PHI ** 1.5),      // ~10
  '10': Math.round(4 * PHI ** 2),       // ~10
  '12': Math.round(4 * PHI ** 2.5),     // ~17
  '16': Math.round(4 * PHI ** 3),       // ~17
  '20': Math.round(4 * PHI ** 3.5),     // ~27
  '24': Math.round(4 * PHI ** 4),       // ~27
  '32': Math.round(4 * PHI ** 4.5),     // ~44
  '40': Math.round(4 * PHI ** 5),       // ~44
  '48': Math.round(4 * PHI ** 5.5),     // ~72
  '64': Math.round(4 * PHI ** 6),       // ~72
} as const;

// =============================================================================
// TYPOGRAPHY SCALE (GOLDEN RATIO)
// =============================================================================

/**
 * Font size scale based on golden ratio
 * Base: 16px
 */
export const goldenTypeScale = {
  xs: Math.round(16 / PHI ** 2),    // ~10px
  sm: Math.round(16 / PHI),         // ~12px
  base: 16,                         // 16px
  lg: Math.round(16 * PHI ** 0.5),  // ~20px
  xl: Math.round(16 * PHI),         // ~26px
  '2xl': Math.round(16 * PHI ** 1.5), // ~33px
  '3xl': Math.round(16 * PHI ** 2),   // ~42px
  '4xl': Math.round(16 * PHI ** 2.5), // ~54px
  '5xl': Math.round(16 * PHI ** 3),   // ~68px
} as const;

// =============================================================================
// CONTAINER WIDTHS
// =============================================================================

/**
 * Container widths based on Fibonacci sequence
 * Harmonious breakpoints for responsive design
 */
export const goldenContainers = {
  xs: 233,   // Fibonacci
  sm: 377,   // Fibonacci
  md: 610,   // Fibonacci
  lg: 987,   // Fibonacci
  xl: 1220,  // ~md * PHI
  '2xl': 1597, // ~lg * PHI
} as const;

// =============================================================================
// VISUAL RHYTHM
// =============================================================================

/**
 * Animation keyframe percentages based on golden ratio
 * For natural-feeling animations
 */
export const goldenKeyframes = {
  start: 0,
  goldenEarly: 38.2,   // 100 * PHI_INVERSE^2
  golden: 61.8,        // 100 * PHI_INVERSE
  goldenLate: 85.4,    // 100 - 100 * PHI_INVERSE^3
  end: 100,
} as const;

/**
 * Grid column ratios for asymmetric layouts
 */
export const goldenGrid = {
  /** Golden ratio split (major | minor) */
  twoCol: [PHI_INVERSE, 1 - PHI_INVERSE] as const, // ~[0.618, 0.382]
  /** Three column fibonacci */
  threeCol: [0.236, 0.382, 0.382] as const,
  /** Four column balanced */
  fourCol: [0.25, 0.25, 0.25, 0.25] as const,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a spacing value by multiplying base by golden ratio
 * @param base - Base value
 * @param power - Power of phi to apply
 */
export const goldenMultiple = (base: number, power: number): number => {
  return Math.round(base * PHI ** power);
};

/**
 * Calculate the fibonacci number at index n
 * @param n - Index in fibonacci sequence
 */
export const getFibonacci = (n: number): number => {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
};

/**
 * Get golden ratio subdivision
 * @param total - Total value to subdivide
 * @param part - 'major' (0.618) or 'minor' (0.382)
 */
export const goldenSplit = (total: number, part: 'major' | 'minor'): number => {
  return part === 'major' ? total * PHI_INVERSE : total * (1 - PHI_INVERSE);
};

// =============================================================================
// COMBINED EXPORT
// =============================================================================

export const geometry = {
  phi: PHI,
  phiInverse: PHI_INVERSE,
  fibonacci,
  scale: goldenScale,
  harmonics: harmonicRatios,
  aspects: aspectRatios,
  angles: sacredAngles,
  emerald: emeraldCut,
  radius: emeraldRadius,
  spacing: goldenSpacing,
  type: goldenTypeScale,
  containers: goldenContainers,
  keyframes: goldenKeyframes,
  grid: goldenGrid,
} as const;

export type Geometry = typeof geometry;
