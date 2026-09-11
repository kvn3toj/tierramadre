/**
 * Tierra Madre Design System v3 — Button Component
 *
 * The ONE button (DS3 §0, §6.1, addendum §B3/§C). Absorbs `IOSButton`,
 * atelier/foto inline buttons, and `disabledButton`.
 *
 * 5 variants (primary · tinted · plain · outlined · danger) x 3 sizes
 * (sm, md, lg). Borders-first, no gradients, no gold. `--tm-*` only.
 */

import React from 'react';
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  CircularProgress,
  styled,
} from '@mui/material';
import { spacing, componentHeights, touchTargets } from '../../tokens/spacing';
import { fontSizes } from '../../tokens/typography';

// =============================================================================
// TYPES
// =============================================================================

export type ButtonVariant =
  | 'primary'
  | 'tinted'
  | 'plain'
  | 'outlined'
  | 'danger';
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
   * The full emerald-cut octagon (DS3 addendum §E1, item 4). Reserve for the
   * ONE brand CTA per view (Cotizar, Cerrar lote, Registrar venta) — only
   * meaningful on `variant="primary"`. Everything else stays soft-radius.
   */
  bevel?: boolean;
  /**
   * Accessible label — required for icon-only buttons.
   * When children is only an icon (no visible text), you MUST provide aria-label.
   */
  'aria-label'?: string;
  /** Button content */
  children: React.ReactNode;

  // --- Polimorfismo -------------------------------------------------------
  // MUI SÍ reenvía `component` en tiempo de ejecución; lo que se pierde al
  // envolver su botón en un `forwardRef<HTMLButtonElement, ButtonProps>` es la
  // firma `OverridableComponent`, así que TypeScript deja de aceptar
  // `component`, `to` y `target` aunque el DOM resultante sea correcto.
  // Declararlos aquí devuelve el contrato sin un `as any` y sin renunciar al
  // tipado del resto de props. Un CTA que abre WhatsApp o navega con el Link
  // de react-router es un botón, no un enlace disfrazado: debe verse y
  // comportarse igual que los demás.
  /** Renderiza como otro elemento: `'a'`, o el `Link` de react-router. */
  component?: React.ElementType;
  /** Sólo con `component="a"`. */
  target?: string;
  /** Sólo con `component="a"`. Acompaña siempre a `target="_blank"`. */
  rel?: string;
  /** Sólo con `component={Link}` de react-router. */
  to?: string;
}

// =============================================================================
// SIZE MAPPING
// =============================================================================

const sizeStyles = {
  sm: {
    height: componentHeights.button.sm,
    padding: `${spacing.xs}px ${spacing.md}px`,
    fontSize: fontSizes.md, // 13px footnote
  },
  md: {
    height: componentHeights.button.md,
    padding: `${spacing.sm}px ${spacing.lg}px`,
    fontSize: fontSizes.lg, // 15px subheadline
  },
  lg: {
    height: componentHeights.button.lg,
    padding: `${spacing.md}px ${spacing.xl}px`,
    fontSize: fontSizes.xl, // 16px callout
  },
};

// DS3 §6.3 dice, entero: «targets ≥ 44×44px (40px pointer-precision on
// desktop)». Los 40px de `button.md` SON ese piso de escritorio, no un
// descuido — con un ratón el objetivo se apunta, con el dedo se estima. Así
// que el 44 se pide por el dispositivo de entrada (`pointer: coarse`) y no
// por el ancho de la ventana, que no dice nada sobre con qué se toca: un
// portátil angosto sigue teniendo ratón y un iPad de 1180px sigue siendo dedo.
//
// `min-height` gana sobre `height` en el cálculo (la altura final es el
// máximo de las dos), así que esto sube el botón bajo el dedo sin tocar una
// sola pantalla de escritorio. `lg` (48) ya cumple y se queda quieto.
const TOUCH_FLOOR = {
  '@media (pointer: coarse)': {
    minHeight: touchTargets.minimum,
  },
} as const;

// Emerald step-cut octagon (§E1 item 4) — chamfers all four corners so a
// bevel-primary button reads as a table-cut emerald, not a rounded pill.
// clip-path erases the box-shadow/border at the diagonals by design (§E1
// discipline note) — the bevel lives on filled elements only.
const BEVEL_CLIP =
  'polygon(var(--tm-bevel) 0, calc(100% - var(--tm-bevel)) 0, 100% var(--tm-bevel), 100% calc(100% - var(--tm-bevel)), calc(100% - var(--tm-bevel)) 100%, var(--tm-bevel) 100%, 0 calc(100% - var(--tm-bevel)), 0 var(--tm-bevel))';

// =============================================================================
// STYLED BUTTON
// =============================================================================

const StyledButton = styled(MuiButton, {
  shouldForwardProp: (prop) =>
    !['buttonVariant', 'buttonSize', 'loading', 'bevel'].includes(
      prop as string,
    ),
})<{
  buttonVariant: ButtonVariant;
  buttonSize: ButtonSize;
  loading?: boolean;
  bevel?: boolean;
}>(({ buttonVariant, buttonSize, loading, bevel }) => {
  const size = sizeStyles[buttonSize];
  const beveled = bevel && buttonVariant === 'primary';

  const baseStyles = {
    height: size.height,
    ...(buttonSize === 'lg' ? {} : TOUCH_FLOOR),
    padding: size.padding,
    fontSize: size.fontSize,
    fontWeight: 600,
    borderRadius: beveled ? 0 : 'var(--tm-radius-control)',
    ...(beveled ? { clipPath: BEVEL_CLIP, WebkitClipPath: BEVEL_CLIP } : {}),
    textTransform: 'none' as const,
    // DS3 §4: transition color/border/opacity only — never layout-shifting props.
    transition:
      'background-color var(--tm-fast) var(--tm-ease), border-color var(--tm-fast) var(--tm-ease), opacity var(--tm-fast) var(--tm-ease)',
    opacity: loading ? 0.7 : 1,
    pointerEvents: loading ? ('none' as const) : ('auto' as const),
    '&:focus-visible': {
      outline: 'none',
      boxShadow: 'var(--tm-focus-ring)',
    },
    // §6.1: active/press = opacity dim, never a layout-shifting scale.
    '&:active': {
      opacity: 0.85,
    },
    '&:disabled': {
      opacity: 0.45,
      cursor: 'not-allowed',
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--tm-accent-strong)',
      color: 'var(--tm-on-accent)',
      border: 'none',
      boxShadow: 'none',
      '&:hover': {
        opacity: 0.92,
      },
    },
    tinted: {
      backgroundColor: 'var(--tm-accent-wash)',
      color: 'var(--tm-accent)',
      border: 'none',
      boxShadow: 'none',
      '&:hover': {
        backgroundColor: 'var(--tm-accent-wash-strong)',
      },
    },
    plain: {
      backgroundColor: 'transparent',
      color: 'var(--tm-accent)',
      border: 'none',
      boxShadow: 'none',
      '&:hover': {
        backgroundColor: 'var(--tm-well)',
      },
    },
    outlined: {
      backgroundColor: 'transparent',
      color: 'var(--tm-text)',
      border: '1px solid var(--tm-border)',
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'var(--tm-accent)',
      },
      '&:active': {
        backgroundColor: 'var(--tm-well)',
      },
    },
    danger: {
      backgroundColor: 'var(--tm-danger)',
      color: 'var(--tm-on-accent)',
      border: 'none',
      boxShadow: 'none',
      '&:hover': {
        opacity: 0.92,
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
      bevel = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <StyledButton
        ref={ref}
        buttonVariant={variant}
        buttonSize={size}
        loading={loading}
        bevel={bevel}
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
  },
);

Button.displayName = 'Button';

export default Button;
