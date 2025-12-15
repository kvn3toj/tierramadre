/**
 * SectionSkeleton Component
 *
 * Loading placeholder for lazy-loaded home page sections.
 * Provides visual continuity during section loading.
 *
 * Refactored by: CoomÜnity Council - Evolutionary Refactor
 */

import React from 'react';
import { Box, Skeleton } from '@mui/material';

// =============================================================================
// TYPES
// =============================================================================

interface SectionSkeletonProps {
  /** Height of the skeleton in pixels */
  height?: number;
  /** Additional padding horizontal */
  px?: number;
  /** Margin bottom */
  mb?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const SectionSkeleton: React.FC<SectionSkeletonProps> = ({
  height = 200,
  px = 2,
  mb = 2,
}) => (
  <Box sx={{ px, mb }}>
    <Skeleton
      variant="rounded"
      height={height}
      animation="wave"
      sx={{
        bgcolor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
      }}
    />
  </Box>
);

export default SectionSkeleton;
