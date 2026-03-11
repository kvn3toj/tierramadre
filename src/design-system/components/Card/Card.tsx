/**
 * Tierra Madre Design System - Card Component
 *
 * 3 variants (elevated, outlined, filled) with compound pattern.
 * Built on Material-UI with Tierra Madre brand styling.
 *
 * Designed by ARIA - Capitana del Concilio de Creación
 */

import React from 'react';
import {
  Card as MuiCard,
  CardContent as MuiCardContent,
  CardActions as MuiCardActions,
  Box,
  Typography,
  styled,
  CardProps as MuiCardProps,
} from '@mui/material';
import { shadows } from '../../tokens/shadows';
import { spacing } from '../../tokens/spacing';

// =============================================================================
// TYPES
// =============================================================================

export type CardVariant = 'elevated' | 'outlined' | 'filled';

export interface CardProps extends Omit<MuiCardProps, 'variant'> {
  /** Card style variant */
  variant?: CardVariant;
  /** Makes the card interactive (hover effects) */
  interactive?: boolean;
  /** Disables the card (reduces opacity, prevents interaction) */
  disabled?: boolean;
  /** Click handler (makes card interactive) */
  onClick?: () => void;
  /** Accessible label for interactive cards (required for icon-only cards) */
  'aria-label'?: string;
  /** Card content */
  children: React.ReactNode;
}

export interface CardHeaderProps {
  /** Header title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Action element (button, icon, etc.) */
  action?: React.ReactNode;
  /** Avatar or icon before title */
  avatar?: React.ReactNode;
}

export interface CardContentProps {
  /** Compact padding */
  compact?: boolean;
  /** Content */
  children: React.ReactNode;
}

export interface CardFooterProps {
  /** Footer alignment */
  align?: 'left' | 'center' | 'right' | 'space-between';
  /** Footer content */
  children: React.ReactNode;
}

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) =>
    !['cardVariant', 'interactive', 'isDisabled'].includes(prop as string),
})<{
  cardVariant: CardVariant;
  interactive: boolean;
  isDisabled?: boolean;
}>(({ cardVariant, interactive, isDisabled }) => {
  const baseStyles = {
    borderRadius: 12,
    overflow: 'hidden',
    transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    cursor: isDisabled ? 'not-allowed' : interactive ? 'pointer' : 'default',
    opacity: isDisabled ? 0.5 : 1,
    pointerEvents: isDisabled ? 'none' as const : 'auto' as const,
    '&:focus-visible': {
      outline: 'none',
      boxShadow: shadows.focus.default,
    },
  };

  const variantStyles = {
    elevated: {
      backgroundColor: 'var(--card-bg)',
      boxShadow: shadows.card.resting,
      border: 'none',
      ...(interactive && {
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: shadows.card.hover,
        },
        '&:active': {
          transform: 'translateY(-2px)',
          boxShadow: shadows.card.active,
        },
      }),
    },
    outlined: {
      backgroundColor: 'var(--card-bg)',
      boxShadow: 'none',
      border: '1px solid var(--card-border)',
      ...(interactive && {
        '&:hover': {
          borderColor: 'var(--brand-primary)',
          boxShadow: shadows.emerald.sm,
        },
        '&:active': {
          borderColor: 'var(--brand-primary-hover)',
        },
      }),
    },
    filled: {
      backgroundColor: 'var(--surface-secondary)',
      boxShadow: 'none',
      border: 'none',
      ...(interactive && {
        '&:hover': {
          backgroundColor: 'var(--border-default)',
        },
        '&:active': {
          backgroundColor: 'var(--border-strong)',
        },
      }),
    },
  };

  return {
    ...baseStyles,
    ...variantStyles[cardVariant],
  };
});

const StyledCardHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${spacing.lg}px ${spacing.lg}px ${spacing.sm}px`,
  gap: spacing.md,
});

const HeaderContent = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md,
  flex: 1,
  minWidth: 0,
});

const HeaderText = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const StyledCardContent = styled(MuiCardContent, {
  shouldForwardProp: (prop) => prop !== 'compact',
})<{ compact?: boolean }>(({ compact }) => ({
  padding: compact ? spacing.md : spacing.lg,
  '&:last-child': {
    paddingBottom: compact ? spacing.md : spacing.lg,
  },
}));

const StyledCardFooter = styled(MuiCardActions, {
  shouldForwardProp: (prop) => prop !== 'footerAlign',
})<{ footerAlign: CardFooterProps['align'] }>(({ footerAlign }) => ({
  padding: `${spacing.sm}px ${spacing.lg}px ${spacing.lg}px`,
  justifyContent:
    footerAlign === 'space-between'
      ? 'space-between'
      : footerAlign === 'center'
      ? 'center'
      : footerAlign === 'right'
      ? 'flex-end'
      : 'flex-start',
  gap: spacing.sm,
}));

// =============================================================================
// CARD HEADER
// =============================================================================

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  avatar,
}) => {
  return (
    <StyledCardHeader>
      <HeaderContent>
        {avatar && <Box>{avatar}</Box>}
        <HeaderText>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '1rem',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: '0.875rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {subtitle}
            </Typography>
          )}
        </HeaderText>
      </HeaderContent>
      {action && <Box>{action}</Box>}
    </StyledCardHeader>
  );
};

// =============================================================================
// CARD CONTENT
// =============================================================================

export const CardContent: React.FC<CardContentProps> = ({
  compact = false,
  children,
}) => {
  return <StyledCardContent compact={compact}>{children}</StyledCardContent>;
};

// =============================================================================
// CARD FOOTER
// =============================================================================

export const CardFooter: React.FC<CardFooterProps> = ({
  align = 'right',
  children,
}) => {
  return <StyledCardFooter footerAlign={align}>{children}</StyledCardFooter>;
};

// =============================================================================
// CARD COMPONENT
// =============================================================================

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', interactive, disabled, onClick, 'aria-label': ariaLabel, children, ...props }, ref) => {
    const isInteractive = !disabled && (interactive ?? !!onClick);

    return (
      <StyledCard
        ref={ref}
        cardVariant={variant}
        interactive={isInteractive}
        isDisabled={disabled}
        onClick={disabled ? undefined : onClick}
        tabIndex={isInteractive ? 0 : undefined}
        role={isInteractive ? 'button' : undefined}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        onKeyDown={
          isInteractive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        {...props}
      >
        {children}
      </StyledCard>
    );
  }
) as React.ForwardRefExoticComponent<
  CardProps & React.RefAttributes<HTMLDivElement>
> & {
  Header: typeof CardHeader;
  Content: typeof CardContent;
  Footer: typeof CardFooter;
};

Card.displayName = 'Card';

// Attach sub-components
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;
