/**
 * useEsmereoThemeTokens
 *
 * Single source of truth for the theme-aware glass + typography tokens used
 * across the Esmereogénesis surface (Hub + Garden + extracted children like
 * AporteSlider, GardenHero, CompletedCelebration).
 *
 * Both light and dark mode share the emerald soul:
 *   - Light mode: pearl-mint glass with dark emerald typography.
 *   - Dark mode: deep emerald glass with cream-white typography.
 *
 * Before this hook, the recipe was duplicated ~50 lines in Hub and Garden
 * with subtle drift (gradient angle 135° vs 140°, shadow 10px vs 12px).
 * Reconciled to the Garden values, which are visually indistinguishable.
 */
import { useMemo } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import { emeraldCore, goldAccent } from "../design-system/tokens/colors";
import { whiteAlpha, blackAlpha } from "../design-system/utils/colorUtils";
import {
  PEARL_SURFACE,
  PEARL_SURFACE_BRIGHT,
} from "../components/esmereogenesis/tokens";

export interface EsmereoThemeTokens {
  isLight: boolean;
  /** Sticky page header glass background */
  headerBg: string;
  /** Default card surface — rhythm panel, history block, etc. */
  cardBg: string;
  /** Slightly brighter variant for the AporteSlider card so the live form
   *  surface separates from the surrounding rhythm/history cards. */
  sliderCardBg: string;
  /** Gold-tinted ceremonial surface for the Eclosionada / completed panel. */
  completedCardBg: string;
  /** 1px border for cards (rhythm, slider, history). */
  cardBorder: string;
  /** 1px border under the sticky header. */
  headerBorder: string;
  /** Standard card shadow recipe. */
  cardShadow: string;
  /** Title color — sticky header, dialog titles. */
  titleColor: string;
  /** Overline color — section labels in caps. */
  overlineColor: string;
  /** Headline color — Playfair display headings. */
  headlineColor: string;
  /** Body copy color. */
  bodyColor: string;
  /** Muted text — sub-labels, totals fractions. */
  mutedColor: string;
  /** Accent color — slider thumb, focus rings. */
  accentColor: string;
  /** Hub-only: hero progress bar track. */
  progressTrack: string;
}

export function useEsmereoThemeTokens(): EsmereoThemeTokens {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";

  return useMemo<EsmereoThemeTokens>(() => {
    const headerBg = isLight
      ? `linear-gradient(180deg, ${alpha(emeraldCore.light, 0.16)} 0%, ${alpha(emeraldCore.primary, 0.08)} 100%), ${alpha(PEARL_SURFACE, 0.78)}`
      : `linear-gradient(180deg, ${alpha(emeraldCore.dark, 0.78)} 0%, ${alpha(emeraldCore.dark, 0.62)} 100%)`;
    const cardBg = isLight
      ? `linear-gradient(135deg, ${alpha(emeraldCore.light, 0.18)} 0%, ${alpha(emeraldCore.primary, 0.1)} 100%), ${alpha(PEARL_SURFACE, 0.78)}`
      : `linear-gradient(135deg, ${alpha(emeraldCore.primary, 0.32)} 0%, ${alpha(emeraldCore.dark, 0.55)} 100%)`;
    const sliderCardBg = isLight
      ? `linear-gradient(135deg, ${alpha(emeraldCore.light, 0.22)} 0%, ${alpha(emeraldCore.primary, 0.14)} 100%), ${alpha(PEARL_SURFACE, 0.82)}`
      : `linear-gradient(135deg, ${alpha(emeraldCore.primary, 0.32)} 0%, ${alpha(emeraldCore.dark, 0.6)} 100%)`;
    const completedCardBg = isLight
      ? `linear-gradient(135deg, ${alpha(goldAccent.light, 0.22)} 0%, ${alpha(emeraldCore.light, 0.18)} 100%), ${alpha(PEARL_SURFACE_BRIGHT, 0.82)}`
      : `linear-gradient(135deg, ${alpha(emeraldCore.primary, 0.32)} 0%, ${alpha(emeraldCore.dark, 0.65)} 100%)`;
    const cardBorder = isLight
      ? alpha(emeraldCore.primary, 0.3)
      : alpha(emeraldCore.light, 0.22);
    const headerBorder = isLight
      ? alpha(emeraldCore.primary, 0.24)
      : alpha(emeraldCore.light, 0.18);
    const cardShadow = isLight
      ? `0 10px 26px ${alpha(emeraldCore.dark, 0.18)}, 0 1px 0 ${whiteAlpha(0.42)} inset`
      : `0 10px 26px ${blackAlpha(0.32)}, 0 1px 0 ${alpha(emeraldCore.light, 0.16)} inset`;
    const progressTrack = isLight
      ? alpha(emeraldCore.primary, 0.16)
      : blackAlpha(0.32);

    return {
      isLight,
      headerBg,
      cardBg,
      sliderCardBg,
      completedCardBg,
      cardBorder,
      headerBorder,
      cardShadow,
      titleColor: isLight ? emeraldCore.dark : PEARL_SURFACE,
      overlineColor: isLight ? emeraldCore.dark : emeraldCore.light,
      headlineColor: isLight ? emeraldCore.dark : PEARL_SURFACE,
      bodyColor: isLight ? alpha(emeraldCore.dark, 0.78) : whiteAlpha(0.78),
      mutedColor: isLight ? alpha(emeraldCore.dark, 0.6) : whiteAlpha(0.62),
      accentColor: isLight ? emeraldCore.primary : emeraldCore.light,
      progressTrack,
    };
  }, [isLight]);
}
