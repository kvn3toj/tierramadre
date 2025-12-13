/**
 * HeroSection Component
 *
 * Minimal spacer - logo is now in the header.
 *
 * Designed by: Aria + Eunoia + Moksart
 */

import React from 'react';
import { Box } from '@mui/material';

// =============================================================================
// COMPONENT
// =============================================================================

export const HeroSection: React.FC = () => {
  return (
    <Box
      component="section"
      aria-label="Hero"
      sx={{
        py: 1,
      }}
    />
  );
};

export default HeroSection;
