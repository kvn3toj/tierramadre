/**
 * Tierra Madre Design System - Container Component
 *
 * Max-width container with responsive padding.
 *
 * Designed by ARIA - Capitana del Concilio de Creación
 */

import React from 'react';
import { Container as MuiContainer, ContainerProps as MuiContainerProps, styled } from '@mui/material';
import { containerWidths, spacing } from '../../tokens/spacing';

// =============================================================================
// TYPES
// =============================================================================

export type ContainerMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | false;

export interface ContainerProps extends Omit<MuiContainerProps, 'maxWidth'> {
  /** Maximum width of container */
  maxWidth?: ContainerMaxWidth;
  /** Add horizontal padding */
  padding?: boolean;
  /** Center container content */
  center?: boolean;
  /** Children */
  children: React.ReactNode;
}

// =============================================================================
// STYLED CONTAINER
// =============================================================================

const StyledContainer = styled(MuiContainer, {
  shouldForwardProp: (prop) =>
    !['containerMaxWidth', 'containerPadding', 'containerCenter'].includes(
      prop as string
    ),
})<{
  containerMaxWidth: ContainerMaxWidth;
  containerPadding: boolean;
  containerCenter: boolean;
}>(({ containerMaxWidth, containerPadding, containerCenter }) => ({
  width: '100%',
  maxWidth: containerMaxWidth ? containerWidths[containerMaxWidth] : 'none',
  marginLeft: containerCenter ? 'auto' : undefined,
  marginRight: containerCenter ? 'auto' : undefined,
  paddingLeft: containerPadding ? spacing.lg : 0,
  paddingRight: containerPadding ? spacing.lg : 0,
  // Responsive padding
  '@media (min-width: 600px)': {
    paddingLeft: containerPadding ? spacing.xl : 0,
    paddingRight: containerPadding ? spacing.xl : 0,
  },
  '@media (min-width: 960px)': {
    paddingLeft: containerPadding ? spacing['2xl'] : 0,
    paddingRight: containerPadding ? spacing['2xl'] : 0,
  },
}));

// =============================================================================
// CONTAINER COMPONENT
// =============================================================================

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      maxWidth = 'lg',
      padding = true,
      center = true,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <StyledContainer
        ref={ref}
        containerMaxWidth={maxWidth}
        containerPadding={padding}
        containerCenter={center}
        disableGutters // We handle padding ourselves
        {...props}
      >
        {children}
      </StyledContainer>
    );
  }
);

Container.displayName = 'Container';

export default Container;
