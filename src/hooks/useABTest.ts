/**
 * useABTest Hook
 * A/B Testing framework for viewport and responsive optimization.
 * Provides variant configurations for grid cards based on iOS HIG guidelines.
 *
 * Variants:
 * - control: Current implementation (18px name, 14px specs)
 * - ios-hig: Strict iOS HIG compliance (17px body, 15px subhead, 12px caption)
 * - premium: Enhanced luxury mode (20px name, 16px specs, 24px gaps)
 */
import { useMemo } from 'react';
import { useFeatureFlags } from '../utils/featureFlags';

// iOS HIG Typography Scale (strict compliance)
export const iosTypographyScale = {
  largeTitle: '2.125rem',  // 34px
  title1: '1.75rem',       // 28px
  title2: '1.375rem',      // 22px
  title3: '1.25rem',       // 20px
  headline: '1.0625rem',   // 17px - semibold
  body: '1.0625rem',       // 17px
  callout: '1rem',         // 16px
  subhead: '0.9375rem',    // 15px
  footnote: '0.8125rem',   // 13px
  caption1: '0.75rem',     // 12px
  caption2: '0.6875rem',   // 11px
} as const;

export type ABVariant = 'control' | 'ios-hig' | 'premium';

export interface ABTestConfig {
  // Grid settings
  gridGap: number;
  mobileCardHeight: number;

  // Card content
  cardPadding: number;
  cardBorderRadius: number;

  // Typography (rem values)
  nameFontSize: string;
  specsFontSize: string;
  priceFontSize: string;
  captionFontSize: string;

  // Image
  imageAspectRatio: string;
  imageQuality: 'eco' | 'good' | 'best';

  // Touch targets
  touchTargetSize: number;
  buttonIconSize: number;

  // Spacing
  colorDotSize: number;
  buttonGap: number;

  // Visual
  shadowIntensity: 'light' | 'medium' | 'strong';
}

/**
 * A/B Test variant configurations
 */
export const abVariants: Record<ABVariant, ABTestConfig> = {
  // Variant A: Current implementation (control group)
  control: {
    gridGap: 16,
    mobileCardHeight: 420,
    cardPadding: 16,
    cardBorderRadius: 12,
    nameFontSize: '1.125rem',      // 18px (current)
    specsFontSize: '0.875rem',     // 14px (current)
    priceFontSize: '0.875rem',     // 14px
    captionFontSize: '0.7rem',     // 11.2px (current)
    imageAspectRatio: '1 / 1',
    imageQuality: 'good',
    touchTargetSize: 44,
    buttonIconSize: 22,
    colorDotSize: 10,
    buttonGap: 8,
    shadowIntensity: 'medium',
  },

  // Variant B: iOS HIG Strict Compliance
  'ios-hig': {
    gridGap: 16,                   // 2×8pt grid
    mobileCardHeight: 420,
    cardPadding: 16,               // 2×8pt grid
    cardBorderRadius: 12,          // iOS HIG md radius
    nameFontSize: iosTypographyScale.body,       // 17px
    specsFontSize: iosTypographyScale.subhead,   // 15px
    priceFontSize: iosTypographyScale.body,      // 17px
    captionFontSize: iosTypographyScale.caption1, // 12px
    imageAspectRatio: '1 / 1',
    imageQuality: 'good',
    touchTargetSize: 44,           // iOS HIG minimum
    buttonIconSize: 20,            // Balanced for 44px target
    colorDotSize: 8,               // 1×8pt grid
    buttonGap: 8,                  // 1×8pt grid
    shadowIntensity: 'light',      // iOS subtle shadows
  },

  // Variant C: Premium Luxury Mode
  premium: {
    gridGap: 24,                   // 3×8pt grid - more breathing room
    mobileCardHeight: 480,         // Taller cards for 4:5 aspect
    cardPadding: 20,               // 2.5×8pt grid
    cardBorderRadius: 16,          // Larger radius for luxury feel
    nameFontSize: '1.25rem',       // 20px - title3 level
    specsFontSize: '1rem',         // 16px - callout level
    priceFontSize: '1.125rem',     // 18px
    captionFontSize: iosTypographyScale.footnote, // 13px
    imageAspectRatio: '4 / 5',     // Portrait ratio for gems
    imageQuality: 'best',          // Maximum quality
    touchTargetSize: 48,           // Larger than minimum
    buttonIconSize: 24,            // Larger icons
    colorDotSize: 12,              // More prominent
    buttonGap: 12,                 // More spacing
    shadowIntensity: 'strong',     // Premium depth effect
  },
};

/**
 * Get shadow styles based on intensity
 */
export function getShadowByIntensity(intensity: ABTestConfig['shadowIntensity'], isLight: boolean) {
  const shadows = {
    light: isLight
      ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)'
      : '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)',
    medium: isLight
      ? '0 2px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)'
      : '0 2px 8px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)',
    strong: isLight
      ? '0 4px 16px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)'
      : '0 4px 16px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.2)',
  };
  return shadows[intensity];
}

/**
 * Hook to get current A/B test configuration
 */
export function useABTest(): {
  variant: ABVariant;
  config: ABTestConfig;
  setVariant: (variant: ABVariant) => void;
  isControlGroup: boolean;
} {
  const { flags, setFlag } = useFeatureFlags();

  const variant = (flags.AB_GRID_VARIANT as ABVariant) || 'ios-hig';
  const config = useMemo(() => abVariants[variant], [variant]);

  const setVariant = (newVariant: ABVariant) => {
    setFlag('AB_GRID_VARIANT', newVariant);
  };

  return {
    variant,
    config,
    setVariant,
    isControlGroup: variant === 'control',
  };
}

/**
 * Device viewport configurations for testing
 */
export const deviceViewports = {
  'iphone-se': { width: 375, height: 667, name: 'iPhone SE', dpr: 2 },
  'iphone-12': { width: 390, height: 844, name: 'iPhone 12/13/14', dpr: 3 },
  'iphone-14-pro': { width: 393, height: 852, name: 'iPhone 14 Pro', dpr: 3 },
  'iphone-14-pro-max': { width: 430, height: 932, name: 'iPhone 14 Pro Max', dpr: 3 },
  'ipad-mini': { width: 744, height: 1133, name: 'iPad Mini', dpr: 2 },
  'ipad-pro-11': { width: 834, height: 1194, name: 'iPad Pro 11"', dpr: 2 },
  'desktop': { width: 1440, height: 900, name: 'Desktop', dpr: 1 },
} as const;

export type DeviceViewport = keyof typeof deviceViewports;

export default useABTest;
