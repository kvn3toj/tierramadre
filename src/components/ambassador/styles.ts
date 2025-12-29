/**
 * Shared styles for ambassador components
 */

import { alpha, SxProps, Theme } from '@mui/material';

// Card background and border colors based on theme mode
export const CARD_COLORS = {
  light: {
    bg: '#FFFFFF',
    border: '#E5E7EB',
  },
  dark: {
    bg: '#1C1C1E',
    border: '#2C2C2E',
  },
} as const;

// Generate Card sx styles
export const getCardSx = (isLight: boolean, options?: {
  borderRadius?: number;
  withHover?: boolean;
  hoverColor?: string;
}): SxProps<Theme> => {
  const { borderRadius = 3, withHover = true, hoverColor = '#059669' } = options || {};

  const baseStyles: SxProps<Theme> = {
    bgcolor: isLight ? CARD_COLORS.light.bg : CARD_COLORS.dark.bg,
    borderRadius,
    border: '1px solid',
    borderColor: isLight ? CARD_COLORS.light.border : CARD_COLORS.dark.border,
    transition: 'all 0.2s ease',
  };

  if (withHover) {
    return {
      ...baseStyles,
      '&:hover': {
        borderColor: hoverColor,
        boxShadow: `0 4px 20px ${alpha(hoverColor, 0.15)}`,
        transform: 'translateY(-2px)',
      },
    };
  }

  return baseStyles;
};
