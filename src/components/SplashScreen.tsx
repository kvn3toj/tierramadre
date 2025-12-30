/**
 * SplashScreen - Elegant breathing animation with dynamic background
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
    // Breathe for 4.2s then fade out (5s total with 0.8s fade)
    const fadeTimer = setTimeout(() => setFadeOut(true), 4200);
    const completeTimer = setTimeout(() => onComplete?.(), 5000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <Box
      component={motion.div}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: 0.8 }}
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
      {/* Ambient floating orb - top left */}
      {!prefersReducedMotion && (
        <Box
          component={motion.div}
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          sx={{
            position: 'absolute',
            top: '15%',
            left: '10%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${brandColors.emeraldGreen}18 0%, transparent 70%)`,
            filter: 'blur(40px)',
          }}
        />
      )}

      {/* Ambient floating orb - bottom right */}
      {!prefersReducedMotion && (
        <Box
          component={motion.div}
          animate={{
            x: [0, -25, 0],
            y: [0, 15, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          sx={{
            position: 'absolute',
            bottom: '20%',
            right: '15%',
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${brandColors.emeraldGreen}15 0%, transparent 70%)`,
            filter: 'blur(35px)',
          }}
        />
      )}

      {/* Main breathing glow - behind logo */}
      <Box
        component={motion.div}
        animate={prefersReducedMotion ? { opacity: 0.5 } : {
          scale: [1, 1.15, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 3,
          repeat: prefersReducedMotion ? 0 : Infinity,
          ease: 'easeInOut',
        }}
        sx={{
          position: 'absolute',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${brandColors.emeraldGreen}25 0%, ${brandColors.emeraldGreen}08 40%, transparent 70%)`,
          filter: 'blur(60px)',
        }}
      />

      {/* Inner glow ring */}
      {!prefersReducedMotion && (
        <Box
          component={motion.div}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
          sx={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${brandColors.emeraldGreen}30 0%, transparent 60%)`,
            filter: 'blur(30px)',
          }}
        />
      )}

      {/* Symbol Logo - breathing */}
      <Box
        component={motion.img}
        src="/logo-symbol.png"
        alt="Tierra Madre - Esmeraldas Colombianas"
        initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.85 }}
        animate={prefersReducedMotion ? { opacity: 1 } : {
          opacity: 1,
          scale: [1, 1.06, 1],
        }}
        transition={{
          opacity: { duration: 1 },
          scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
        }}
        sx={{
          width: { xs: '45vw', sm: 240 },
          maxWidth: 270,
          height: 'auto',
          filter: 'drop-shadow(0 0 30px rgba(80, 200, 120, 0.3))',
        }}
      />
    </Box>
  );
}
