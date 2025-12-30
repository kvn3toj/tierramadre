/**
 * SplashScreen - Premium breathing animation with symbol logo
 * Option A: Quick & Premium (2.5s total)
 * - 0-1.5s: Symbol fades in with subtle scale
 * - 1.5-2.2s: Breathing glow (1 pulse)
 * - 2.2-2.5s: Smooth fade out
 *
 * Respects prefers-reduced-motion for accessibility
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Box, useMediaQuery } from '@mui/material';
import { brandColors } from '../theme';

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    // Option A timing: 2.2s breathing then 0.3s fade out (2.5s total)
    const fadeTimer = setTimeout(() => setFadeOut(true), 2200);
    const completeTimer = setTimeout(() => onComplete?.(), 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <Box
      component={motion.div}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: brandColors.darkBg,
        background: `radial-gradient(ellipse at 50% 30%, #0d1a14 0%, ${brandColors.darkBg} 50%, #050505 100%)`,
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* Main breathing glow - behind logo */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={prefersReducedMotion ? { opacity: 0.5, scale: 1 } : {
          opacity: [0, 0.5, 0.7, 0.5],
          scale: [0.9, 1, 1.1, 1],
        }}
        transition={{
          duration: 2.2,
          times: [0, 0.3, 0.7, 1],
          ease: 'easeInOut',
        }}
        sx={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${brandColors.emeraldGreen}30 0%, ${brandColors.emeraldGreen}10 40%, transparent 70%)`,
          filter: 'blur(50px)',
        }}
      />

      {/* Inner glow ring - subtle pulse */}
      {!prefersReducedMotion && (
        <Box
          component={motion.div}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: [0, 0.4, 0.6, 0.4],
            scale: [0.95, 1, 1.05, 1],
          }}
          transition={{
            duration: 2.2,
            times: [0, 0.3, 0.7, 1],
            ease: 'easeInOut',
            delay: 0.15,
          }}
          sx={{
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${brandColors.emeraldGreen}35 0%, transparent 60%)`,
            filter: 'blur(25px)',
          }}
        />
      )}

      {/* Symbol Logo - fade in with subtle scale - 77% of original size */}
      <Box
        component={motion.img}
        src="/logo-symbol.png"
        alt="Tierra Madre - Esmeraldas Colombianas"
        initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.92 }}
        animate={prefersReducedMotion ? { opacity: 1 } : {
          opacity: [0, 1, 1, 1],
          scale: [0.92, 1, 1.03, 1],
        }}
        transition={{
          duration: 2.2,
          times: [0, 0.5, 0.75, 1],
          ease: [0.4, 0, 0.2, 1], // Custom ease for premium feel
        }}
        sx={{
          width: { xs: 'calc(42vw * 0.77)', sm: 170 },
          maxWidth: 185,
          height: 'auto',
          filter: 'drop-shadow(0 0 35px rgba(80, 200, 120, 0.35))',
          position: 'relative',
          zIndex: 1,
        }}
      />
    </Box>
  );
}
