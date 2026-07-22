/**
 * Skeleton — the ONE loading placeholder (DS v3, Fase 3 gap).
 *
 * Thin wrapper over MUI Skeleton pinned to --tm-* tokens (no ad hoc grey),
 * and disables the shimmer under prefers-reduced-motion. Geometry-matched
 * (exact width/height props) is the caller's job — this only standardizes
 * color/radius/motion so every loading state in the app looks like one system.
 */
import React from 'react';
import { Skeleton as MuiSkeleton } from '@mui/material';

export interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle';
  width?: number | string;
  height?: number | string;
  className?: string;
}

const MUI_VARIANT: Record<
  NonNullable<SkeletonProps['variant']>,
  'text' | 'rounded' | 'circular'
> = {
  text: 'text',
  rect: 'rounded',
  circle: 'circular',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  width,
  height,
  className,
}) => {
  return (
    <MuiSkeleton
      variant={MUI_VARIANT[variant]}
      width={width}
      height={height}
      className={className}
      sx={{
        backgroundColor: 'var(--tm-well)',
        borderRadius: variant === 'circle' ? '50%' : 'var(--tm-radius-well)',
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
      }}
    />
  );
};

export default Skeleton;
