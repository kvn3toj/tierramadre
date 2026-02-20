/**
 * Shared styles for ambassador components
 */

import { alpha, SxProps, Theme } from '@mui/material';
import { cardShadows, emeraldCore, emeraldGradients, cssTransition } from '../../design-system/index';

// Card background and border colors based on theme mode
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
export const getCardSx = (isLight: boolean, options?: {
  borderRadius?: number;
  withHover?: boolean;
}): SxProps<Theme> => {
  const { borderRadius = 3, withHover = true } = options || {};

  const baseStyles: SxProps<Theme> = {
    bgcolor: 'var(--card-bg)',
    borderRadius,
    border: '1px solid',
    borderColor: isLight
      ? alpha(emeraldCore.primary, 0.06)
      : alpha(emeraldCore.primary, 0.1),
    boxShadow: cardShadows.resting,
    transition: cssTransition.default,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      background: emeraldGradients.deep,
      opacity: 0,
      transition: cssTransition.default,
      zIndex: 1,
    },
  };

  if (withHover) {
    return {
      ...baseStyles,
      '&:hover': {
        borderColor: emeraldCore.primary,
        boxShadow: cardShadows.emeraldHover,
        transform: 'translateY(-2px)',
      },
      '&:hover::before': {
        opacity: 1,
      },
    };
  }

  return baseStyles;
};
