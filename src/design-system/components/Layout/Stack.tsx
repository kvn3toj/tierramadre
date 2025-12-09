/**
 * Tierra Madre Design System - Stack Component
 *
 * Layout primitives: Stack, VStack, HStack
 * Built on MUI Stack with simplified API.
 *
 * Designed by ARIA - Capitana del Concilio de Creación
 */

import React from 'react';
import { Stack as MuiStack, StackProps as MuiStackProps, styled } from '@mui/material';
import { spacing as spacingTokens } from '../../tokens/spacing';

// =============================================================================
// TYPES
// =============================================================================

export type StackDirection = 'vertical' | 'horizontal';
export type StackSpacing = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 12;
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type StackJustify =
  | 'start'
  | 'center'
  | 'end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

export interface StackProps extends Omit<MuiStackProps, 'direction' | 'spacing'> {
  /** Stack direction */
  direction?: StackDirection;
  /** Spacing between items (8px units) */
  spacing?: StackSpacing;
  /** Cross-axis alignment */
  align?: StackAlign;
  /** Main-axis alignment */
  justify?: StackJustify;
  /** Allow items to wrap */
  wrap?: boolean;
  /** Children */
  children: React.ReactNode;
}

// =============================================================================
// ALIGNMENT MAPPING
// =============================================================================

const alignMap: Record<StackAlign, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

const justifyMap: Record<StackJustify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
  'space-around': 'space-around',
  'space-evenly': 'space-evenly',
};

// =============================================================================
// STYLED STACK
// =============================================================================

const StyledStack = styled(MuiStack, {
  shouldForwardProp: (prop) =>
    !['stackDirection', 'stackSpacing', 'stackAlign', 'stackJustify', 'stackWrap'].includes(
      prop as string
    ),
})<{
  stackDirection: StackDirection;
  stackSpacing: StackSpacing;
  stackAlign?: StackAlign;
  stackJustify?: StackJustify;
  stackWrap?: boolean;
}>(({ stackDirection, stackSpacing, stackAlign, stackJustify, stackWrap }) => ({
  display: 'flex',
  flexDirection: stackDirection === 'horizontal' ? 'row' : 'column',
  gap: stackSpacing * spacingTokens.sm, // 8px base unit
  alignItems: stackAlign ? alignMap[stackAlign] : undefined,
  justifyContent: stackJustify ? justifyMap[stackJustify] : undefined,
  flexWrap: stackWrap ? 'wrap' : 'nowrap',
}));

// =============================================================================
// STACK COMPONENT
// =============================================================================

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  (
    {
      direction = 'vertical',
      spacing = 2,
      align,
      justify,
      wrap = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <StyledStack
        ref={ref}
        stackDirection={direction}
        stackSpacing={spacing}
        stackAlign={align}
        stackJustify={justify}
        stackWrap={wrap}
        {...props}
      >
        {children}
      </StyledStack>
    );
  }
);

Stack.displayName = 'Stack';

// =============================================================================
// VSTACK (Vertical Stack)
// =============================================================================

export interface VStackProps extends Omit<StackProps, 'direction'> {}

export const VStack = React.forwardRef<HTMLDivElement, VStackProps>(
  (props, ref) => {
    return <Stack ref={ref} direction="vertical" {...props} />;
  }
);

VStack.displayName = 'VStack';

// =============================================================================
// HSTACK (Horizontal Stack)
// =============================================================================

export interface HStackProps extends Omit<StackProps, 'direction'> {}

export const HStack = React.forwardRef<HTMLDivElement, HStackProps>(
  (props, ref) => {
    return <Stack ref={ref} direction="horizontal" {...props} />;
  }
);

HStack.displayName = 'HStack';

export default Stack;
