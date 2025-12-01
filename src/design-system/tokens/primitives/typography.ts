/**
 * Primitive Typography Tokens
 * "Emerald iOS" Design System
 *
 * iOS Human Interface Guidelines typography system using
 * SF Pro Display (headlines) and SF Pro Text (body).
 *
 * Reference: https://developer.apple.com/design/human-interface-guidelines/typography
 */

/**
 * Font Families
 * SF Pro fonts with system fallbacks
 */
export const fontFamilies = {
  /**
   * SF Pro Display - For large text (headlines, titles)
   * Optimized for sizes 20pt and above
   */
  display: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',

  /**
   * SF Pro Text - For small to medium text (body, UI elements)
   * Optimized for sizes 19pt and below
   */
  text: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',

  /**
   * SF Mono - For code, technical data, monospaced content
   */
  mono: 'ui-monospace, "SF Mono", Menlo, Monaco, "Cascadia Mono", "Roboto Mono", Consolas, monospace',

  /**
   * Luxury Serif - For emerald names (premium feel)
   * Falls back to Georgia for broader compatibility
   */
  luxury: '"Playfair Display", "Libre Baskerville", Georgia, serif',
} as const;

/**
 * Font Weights
 * iOS standard weight scale
 */
export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * iOS Text Styles
 * Official iOS typography scale with exact specifications
 */
export const iosTextStyles = {
  /**
   * Large Title - 34pt
   * Used for large, prominent titles
   */
  largeTitle: {
    fontFamily: fontFamilies.display,
    fontSize: '34px',
    lineHeight: '41px',
    fontWeight: fontWeights.bold,
    letterSpacing: '0.374px',
  },

  /**
   * Title 1 - 28pt
   * Used for first-level hierarchical headings
   */
  title1: {
    fontFamily: fontFamilies.display,
    fontSize: '28px',
    lineHeight: '34px',
    fontWeight: fontWeights.bold,
    letterSpacing: '0.364px',
  },

  /**
   * Title 2 - 22pt
   * Used for second-level hierarchical headings
   */
  title2: {
    fontFamily: fontFamilies.display,
    fontSize: '22px',
    lineHeight: '28px',
    fontWeight: fontWeights.bold,
    letterSpacing: '0.352px',
  },

  /**
   * Title 3 - 20pt
   * Used for third-level hierarchical headings
   */
  title3: {
    fontFamily: fontFamilies.display,
    fontSize: '20px',
    lineHeight: '25px',
    fontWeight: fontWeights.semibold,
    letterSpacing: '0.38px',
  },

  /**
   * Headline - 17pt semibold
   * Used for headings in grouped content
   */
  headline: {
    fontFamily: fontFamilies.text,
    fontSize: '17px',
    lineHeight: '22px',
    fontWeight: fontWeights.semibold,
    letterSpacing: '-0.408px',
  },

  /**
   * Body - 17pt regular
   * Default text style for content
   */
  body: {
    fontFamily: fontFamilies.text,
    fontSize: '17px',
    lineHeight: '22px',
    fontWeight: fontWeights.regular,
    letterSpacing: '-0.408px',
  },

  /**
   * Callout - 16pt
   * Used for emphasized content
   */
  callout: {
    fontFamily: fontFamilies.text,
    fontSize: '16px',
    lineHeight: '21px',
    fontWeight: fontWeights.regular,
    letterSpacing: '-0.32px',
  },

  /**
   * Subheadline - 15pt
   * Used for secondary information
   */
  subheadline: {
    fontFamily: fontFamilies.text,
    fontSize: '15px',
    lineHeight: '20px',
    fontWeight: fontWeights.regular,
    letterSpacing: '-0.24px',
  },

  /**
   * Footnote - 13pt
   * Used for footnotes and supplementary content
   */
  footnote: {
    fontFamily: fontFamilies.text,
    fontSize: '13px',
    lineHeight: '18px',
    fontWeight: fontWeights.regular,
    letterSpacing: '-0.078px',
  },

  /**
   * Caption 1 - 12pt
   * Used for captions
   */
  caption1: {
    fontFamily: fontFamilies.text,
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: fontWeights.regular,
    letterSpacing: '0px',
  },

  /**
   * Caption 2 - 11pt
   * Used for smaller captions
   */
  caption2: {
    fontFamily: fontFamilies.text,
    fontSize: '11px',
    lineHeight: '13px',
    fontWeight: fontWeights.regular,
    letterSpacing: '0.066px',
  },
} as const;

/**
 * Custom Typography Extensions
 * Emerald-specific styles beyond iOS standards
 */
export const customTextStyles = {
  /**
   * Emerald Name - Luxury serif for product names
   */
  emeraldName: {
    fontFamily: fontFamilies.luxury,
    fontSize: '28px',
    lineHeight: '36px',
    fontWeight: fontWeights.bold,
    letterSpacing: '0.5px',
  },

  /**
   * Technical Data - Monospace for specs
   */
  technical: {
    fontFamily: fontFamilies.mono,
    fontSize: '13px',
    lineHeight: '18px',
    fontWeight: fontWeights.regular,
    letterSpacing: '0px',
  },
} as const;

/**
 * Combined Typography System
 */
export const typography = {
  families: fontFamilies,
  weights: fontWeights,
  ios: iosTextStyles,
  custom: customTextStyles,
} as const;

export type Typography = typeof typography;
