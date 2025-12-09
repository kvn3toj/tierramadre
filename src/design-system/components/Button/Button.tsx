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
    fontSize: '0.875rem',
  },
  md: {
    height: componentHeights.button.md,
    padding: `${spacing.sm}px ${spacing.lg}px`,
    fontSize: '0.9375rem',
  },
  lg: {
    height: componentHeights.button.lg,
    padding: `${spacing.md}px ${spacing.xl}px`,
    fontSize: '1rem',
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
    borderRadius: 8,
    textTransform: 'none' as const,
    transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    opacity: loading ? 0.7 : 1,
    pointerEvents: loading ? 'none' as const : 'auto' as const,
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
      color: '#D4AF37',
      border: '2px solid #D4AF37',
      boxShadow: 'none',
      '&:hover': {
        background: 'rgba(212, 175, 55, 0.08)',
        borderColor: '#E5C866',
        boxShadow: shadows.gold.sm,
      },
      '&:active': {
        background: 'rgba(212, 175, 55, 0.15)',
      },
    },
    tertiary: {
      background: 'transparent',
      color: '#00AE7A',
      border: 'none',
      boxShadow: 'none',
      '&:hover': {
        background: 'rgba(0, 174, 122, 0.08)',
      },
      '&:active': {
        background: 'rgba(0, 174, 122, 0.15)',
      },
    },
    danger: {
      background: gradients.button.danger,
      color: '#FFFFFF',
      border: 'none',
      boxShadow: shadows.semantic.error,
      '&:hover': {
        background: gradients.button.dangerHover,
        boxShadow: `0 6px 20px rgba(239, 68, 68, 0.4)`,
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
