/**
 * Tierra Madre Design System - Button Component
 *
 * 4 variants (primary, secondary, tertiary, danger) x 3 sizes (sm, md, lg)
 * Built on Material-UI with Tierra Madre brand styling.
 *
 * Designed by ARIA - Capitana del Concilio de Creación
 */

import React from 'react';
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  CircularProgress,
  styled,
} from '@mui/material';
import { gradients } from '../../tokens/gradients';
import { shadows } from '../../tokens/shadows';
import { spacing, componentHeights } from '../../tokens/spacing';
import { goldAccent } from '../../tokens/colors';
import { emeraldAlpha, goldAlpha, errorAlpha } from '../../utils/colorUtils';
import { fontSizes } from '../../tokens/typography';
import { cssTransition } from '../../tokens/motion';
import { radius } from '../../tokens/layout';

// =============================================================================
// TYPES
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  /** Button style variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Shows loading spinner and disables button */
  loading?: boolean;
  /** Icon before text */
  startIcon?: React.ReactNode;
  /** Icon after text */
  endIcon?: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
  /**
   * Accessible label — required for icon-only buttons.
   * When children is only an icon (no visible text), you MUST provide aria-label.
   */
  'aria-label'?: string;
  /** Button content */
  children: React.ReactNode;
}

// =============================================================================
// SIZE MAPPING
// =============================================================================

const sizeStyles = {
  sm: {
    height: componentHeights.button.sm,
    padding: `${spacing.xs}px ${spacing.md}px`,
    fontSize: fontSizes.md,      // 13px footnote
  },
  md: {
    height: componentHeights.button.md,
    padding: `${spacing.sm}px ${spacing.lg}px`,
    fontSize: fontSizes.lg,      // 15px subheadline
  },
  lg: {
    height: componentHeights.button.lg,
    padding: `${spacing.md}px ${spacing.xl}px`,
    fontSize: fontSizes.xl,      // 16px callout
  },
};

// =============================================================================
// STYLED BUTTON
// =============================================================================

const StyledButton = styled(MuiButton, {
  shouldForwardProp: (prop) =>
    !['variant', 'buttonSize', 'loading'].includes(prop as string),
})<{
  buttonVariant: ButtonVariant;
  buttonSize: ButtonSize;
  loading?: boolean;
}>(({ buttonVariant, buttonSize, loading }) => {
  const size = sizeStyles[buttonSize];

  const baseStyles = {
    height: size.height,
    padding: size.padding,
    fontSize: size.fontSize,
    fontWeight: 600,
    borderRadius: radius.md,
    textTransform: 'none' as const,
    transition: cssTransition.default,
    opacity: loading ? 0.7 : 1,
    pointerEvents: loading ? 'none' as const : 'auto' as const,
    '&:focus-visible': {
      outline: 'none',
      boxShadow: shadows.focus.default,
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
    '&:disabled': {
      opacity: 0.5,
    },
  };

  const variantStyles = {
    primary: {
      background: gradients.button.primary,
      color: '#FFFFFF',
      boxShadow: shadows.emerald.primary,
      border: 'none',
      '&:hover': {
        background: gradients.button.primaryHover,
        boxShadow: shadows.emerald.lg,
      },
      '&:active': {
        background: gradients.button.primaryActive,
      },
    },
    secondary: {
      background: 'transparent',
      color: goldAccent.primary,
      border: `2px solid ${goldAccent.primary}`,
      boxShadow: 'none',
      '&:hover': {
        background: goldAlpha(0.08),
        borderColor: goldAccent.light,
        boxShadow: shadows.gold.sm,
      },
      '&:active': {
        background: goldAlpha(0.15),
      },
    },
    tertiary: {
      background: 'transparent',
      color: 'var(--brand-primary)',
      border: 'none',
      boxShadow: 'none',
      '&:hover': {
        background: emeraldAlpha(0.08),
      },
      '&:active': {
        background: emeraldAlpha(0.15),
      },
    },
    danger: {
      background: gradients.button.danger,
      color: '#FFFFFF',
      border: 'none',
      boxShadow: shadows.semantic.error,
      '&:hover': {
        background: gradients.button.dangerHover,
        boxShadow: `0 6px 20px ${errorAlpha(0.4)}`,
      },
      '&:active': {
        background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
      },
    },
  };

  return {
    ...baseStyles,
    ...variantStyles[buttonVariant],
  };
});

// =============================================================================
// BUTTON COMPONENT
// =============================================================================

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      startIcon,
      endIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <StyledButton
        ref={ref}
        buttonVariant={variant}
        buttonSize={size}
        loading={loading}
        disabled={disabled || loading}
        fullWidth={fullWidth}
        startIcon={
          loading ? (
            <CircularProgress
              size={size === 'sm' ? 14 : size === 'md' ? 16 : 18}
              color="inherit"
            />
          ) : (
            startIcon
          )
        }
        endIcon={loading ? undefined : endIcon}
        {...props}
      >
        {children}
      </StyledButton>
    );
  }
);

Button.displayName = 'Button';

export default Button;
