/**
 * Shared styles for ambassador components
 */

import { alpha, SxProps, Theme } from '@mui/material';

// Card background and border colors based on theme mode
// These now reference CSS variables for automatic dark/light switching
export const CARD_COLORS = {
  light: {
    bg: 'var(--card-bg)',
    border: 'var(--card-border)',
  },
  dark: {
    bg: 'var(--card-bg)',
    border: 'var(--card-border)',
  },
} as const;

// Generate Card sx styles
export const getCardSx = (_isLight: boolean, options?: {
  borderRadius?: number;
  withHover?: boolean;
  hoverColor?: string;
}): SxProps<Theme> => {
  const { borderRadius = 3, withHover = true, hoverColor = '#059669' } = options || {};

  const baseStyles: SxProps<Theme> = {
    bgcolor: 'var(--card-bg)',
    borderRadius,
    border: '1px solid',
    borderColor: 'var(--card-border)',
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
