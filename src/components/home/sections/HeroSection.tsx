/**
 * HeroSection Component
 *
 * Liquid Glass Design - Full-screen hero with floating elements
 * Inspired by Apple iOS 26 design language
 *
 * Designed by: Aria + Eunoia + Moksart
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

// Featured hero image from gallery
const HERO_IMAGE = 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621976/tierramadre/gallery/gems/koso3gazzgfiakzg867r.jpg';

// =============================================================================
// COMPONENT - Liquid Glass Hero
// =============================================================================

export const HeroSection: React.FC = () => {
  return (
    <Box
      component="section"
      aria-label="Hero"
      sx={{
        position: 'relative',
        height: { xs: '45vh', sm: '50vh' },
        minHeight: 320,
        maxHeight: 450,
        overflow: 'hidden',
      }}
    >
      {/* Full-bleed hero image */}
      <Box
        component="img"
        src={HERO_IMAGE}
        alt="Esmeraldas colombianas"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />

      {/* Gradient overlay for depth */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Floating glass card at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        style={{
          position: 'absolute',
          bottom: 24,
          left: 16,
          right: 16,
        }}
      >
        <Box
          sx={{
            // Liquid Glass effect
            bgcolor: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.2)',
            p: 2.5,
            // Subtle inner glow
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.65rem',
              letterSpacing: '0.15em',
              display: 'block',
              mb: 0.5,
            }}
          >
            Colección Exclusiva
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: 'white',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            Esmeraldas de Muzo
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
};

export default HeroSection;
