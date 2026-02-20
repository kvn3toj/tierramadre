/**
 * iOS Typography Scale (HIG Compliant)
 *
 * Matches iOS Dynamic Type sizes for consistency with native iOS apps.
 *
 * Extracted from legacy design-system.ts for canonical usage.
 */

// =============================================================================
// iOS TYPOGRAPHY SCALE
// =============================================================================

export const iosTypographyScale = {
  /** Large Title - 34pt */
  largeTitle: '2.125rem',
  /** Title 1 - 28pt */
  title1: '1.75rem',
  /** Title 2 - 22pt */
  title2: '1.375rem',
  /** Title 3 - 20pt */
  title3: '1.25rem',
  /** Headline - 17pt semibold */
  headline: '1.0625rem',
  /** Body - 17pt */
  body: '1.0625rem',
  /** Callout - 16pt */
  callout: '1rem',
  /** Subhead - 15pt */
  subhead: '0.9375rem',
  /** Footnote - 13pt */
  footnote: '0.8125rem',
  /** Caption 1 - 12pt */
  caption1: '0.75rem',
  /** Caption 2 - 11pt */
  caption2: '0.6875rem',
} as const;
