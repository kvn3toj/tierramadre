/**
 * Chart/Data Visualization Tokens
 *
 * Standardized dimensions and styling for charts and data visualization.
 * Based on iOS HIG guidelines for touch targets and readability.
 *
 * Usage:
 *   import { chartTokens } from '../design-system/tokens/charts';
 *   const { width, height } = chartTokens.dimensions;
 */

import { opacity } from './opacity';

// =============================================================================
// CHART DIMENSIONS
// =============================================================================

export const chartTokens = {
  /** Standard chart dimensions */
  dimensions: {
    /** Full-width chart */
    width: 400,
    /** Compact height for inline charts */
    height: 180,
    /** Tall chart for detailed views */
    heightTall: 280,
    /** Mini chart for sparklines */
    heightMini: 60,
  },

  /** Chart padding (preserves space for labels) */
  padding: {
    top: 28,
    right: 12,
    bottom: 30,
    left: 36,
  },

  /** Data point styling */
  point: {
    /** Default point radius */
    radius: 6,
    /** Hover/active point radius */
    radiusHover: 8,
    /** Touch target radius (iOS HIG: 44pt / 2 = 22pt) */
    touchTargetRadius: 22,
  },

  /** Line styling */
  line: {
    /** Default line width */
    width: 2.5,
    /** Thin line for secondary data */
    widthThin: 1.5,
    /** Thick line for emphasis */
    widthThick: 3.5,
  },

  /** Grid styling */
  grid: {
    /** Grid line opacity */
    opacity: opacity.guide,
    /** Grid line width */
    width: 1,
    /** Dashed grid pattern */
    dashArray: '4,4',
  },

  /** Tooltip dimensions */
  tooltip: {
    width: 58,
    height: 32,
    borderRadius: 6,
    padding: 8,
  },

  /** Animation durations (ms) */
  animation: {
    /** Path draw animation */
    pathDraw: 1500,
    /** Point appear animation */
    pointAppear: 800,
    /** Hover transition */
    hover: 200,
  },

  /** Area chart dimensions (for weekly trends) */
  areaChart: {
    height: 200,
    heightCompact: 140,
    padding: { top: 20, right: 16, bottom: 40, left: 44 },
  },

  /** Progress bar styling */
  progressBar: {
    height: 8,
    heightCompact: 6,
    borderRadius: 4,
    trackOpacity: 0.12,
  },

  /** Insight card styling */
  insightCard: {
    minHeight: 80,
    iconSize: 40,
    borderRadius: 12,
  },
} as const;

// =============================================================================
// CHART COLOR SCHEMES
// =============================================================================

export const chartColors = {
  /** Emerald theme (default) */
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

  /** Gold theme (for premium/growth indicators) */
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

// =============================================================================
// BADGE STYLING (for growth indicators)
// =============================================================================

export const chartBadge = {
  /** Positive growth badge */
  positive: {
    bg: `rgba(0, 174, 122, ${opacity.elevated})`,
    bgLight: `rgba(0, 174, 122, ${opacity.guide})`,
    text: '#00AE7A',
    border: 'transparent',
  },

  /** Negative growth badge */
  negative: {
    bg: `rgba(239, 68, 68, ${opacity.elevated})`,
    bgLight: `rgba(239, 68, 68, ${opacity.guide})`,
    text: '#EF4444',
    border: 'transparent',
  },

  /** Neutral badge */
  neutral: {
    bg: `rgba(148, 163, 184, ${opacity.elevated})`,
    bgLight: `rgba(148, 163, 184, ${opacity.guide})`,
    text: '#94A3B8',
    border: 'transparent',
  },
} as const;
