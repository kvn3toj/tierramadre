/**
 * SplashScreen - Opening animation for Tierra Madre app
 *
 * Displays on cold start with:
 * - Dark background with emerald glow
 * - Logo scale-up animation
 * - Brand name fade-in
 * - Smooth exit transition
 */

import { motion } from 'framer-motion';
import { Box, Typography } from '@mui/material';

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `
          radial-gradient(ellipse at center, rgba(0, 174, 122, 0.15) 0%, transparent 50%),
          linear-gradient(180deg, #0D0D0D 0%, #1C1C1E 100%)
        `,
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* Emerald glow effect behind logo */}
      <Box
        component={motion.div}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.6 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        sx={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 174, 122, 0.25) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Logo */}
      <Box
        component={motion.img}
        src="/logo-symbol-only.png"
        alt="Tierra Madre"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.6,
          ease: [0.34, 1.56, 0.64, 1], // Spring-like ease
        }}
        sx={{
          width: 120,
          height: 'auto',
          mb: 3,
          filter: 'drop-shadow(0 0 20px rgba(0, 174, 122, 0.3))',
        }}
        onAnimationComplete={() => {
          // After logo animation, wait a moment then signal complete
          setTimeout(() => onComplete?.(), 1400);
        }}
      />

      {/* Brand Name */}
      <Typography
        component={motion.h1}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        sx={{
          fontFamily: '"Libre Baskerville", serif',
          fontSize: '1.75rem',
          fontWeight: 700,
          color: '#FFFFFF',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        Tierra Madre
      </Typography>

      {/* Tagline */}
      <Typography
        component={motion.p}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        sx={{
          fontFamily: '"Inter", sans-serif',
          fontSize: '0.875rem',
          color: '#00AE7A',
          mt: 1,
          letterSpacing: '0.1em',
        }}
      >
        Esencia y Poder
      </Typography>
    </Box>
  );
}
