/**
 * SplashScreen - Premium breathing animation with symbol logo and random quote
 * Extended timing (4s total) to preload hero images
 * - 0-1.5s: Symbol fades in with subtle scale
 * - 1.5-3.7s: Breathing glow (1.5 pulses) + Random quote appears
 * - 3.7-4.0s: Smooth fade out
 *
 * Respects prefers-reduced-motion for accessibility
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, useMediaQuery } from '@mui/material';
import { brandColors } from '../../theme';
import { zIndex } from '../../design-system';

// Splash screen quotes - different from Oracle quotes
const SPLASH_QUOTES = [
  "La belleza de una esmeralda radica en su autenticidad",
  "Cada esmeralda cuenta la historia de millones de años",
  "El verde de Colombia brilla en cada faceta",
  "Tesoros de la tierra, joyas del corazón",
  "La esencia de Colombia en cada piedra",
  "Donde la naturaleza crea obras maestras",
  "Esmeraldas que capturan la luz del alma",
  "El poder de la tierra en tu mano",
];

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Select random quote on each splash screen display
  const randomQuote = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * SPLASH_QUOTES.length);
    return SPLASH_QUOTES[randomIndex];
  }, []);

  useEffect(() => {
    // Extended timing: 3.7s breathing then 0.3s fade out (4s total)
    // Extra time allows preloading hero carousel high-quality images
    const fadeTimer = setTimeout(() => setFadeOut(true), 3700);
    const completeTimer = setTimeout(() => onComplete?.(), 4000);

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
        zIndex: zIndex.modal,
        overflow: 'hidden',
      }}
    >
      {/* Main breathing glow - behind logo */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={prefersReducedMotion ? { opacity: 0.5, scale: 1 } : {
          opacity: [0, 0.5, 0.7, 0.5, 0.7, 0.5],
          scale: [0.9, 1, 1.1, 1, 1.1, 1],
        }}
        transition={{
          duration: 3.7,
          times: [0, 0.2, 0.45, 0.65, 0.85, 1],
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
            opacity: [0, 0.4, 0.6, 0.4, 0.6, 0.4],
            scale: [0.95, 1, 1.05, 1, 1.05, 1],
          }}
          transition={{
            duration: 3.7,
            times: [0, 0.2, 0.45, 0.65, 0.85, 1],
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

      {/* Logo and Quote Container */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2.5,
          position: 'relative',
          zIndex: zIndex.base,
        }}
      >
        {/* Symbol Logo - fade in with subtle scale - 77% of original size */}
        <Box
          component={motion.img}
          src="/logo-symbol.png"
          alt="Tierra Madre - Esmeraldas Colombianas"
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.92 }}
          animate={prefersReducedMotion ? { opacity: 1 } : {
            opacity: [0, 1, 1, 1, 1, 1],
            scale: [0.92, 1, 1.03, 1, 1.03, 1],
          }}
          transition={{
            duration: 3.7,
            times: [0, 0.35, 0.55, 0.7, 0.85, 1],
            ease: [0.4, 0, 0.2, 1], // Custom ease for premium feel
          }}
          sx={{
            width: { xs: 'calc(42vw * 0.77)', sm: 170 },
            maxWidth: 185,
            height: 'auto',
            filter: 'drop-shadow(0 0 35px rgba(80, 200, 120, 0.35))',
          }}
        />

        {/* Random Inspirational Quote - appears after logo */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={prefersReducedMotion ? { opacity: 1, y: 0 } : {
            opacity: [0, 0, 1],
            y: [10, 10, 0],
          }}
          transition={{
            duration: 3.7,
            times: [0, 0.4, 1],
            ease: 'easeOut',
          }}
          sx={{
            textAlign: 'center',
            maxWidth: { xs: 280, sm: 320 },
            px: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: { xs: '0.85rem', sm: '0.9rem' },
              fontWeight: 300,
              lineHeight: 1.6,
              fontStyle: 'italic',
              letterSpacing: 0.3,
            }}
          >
            "{randomQuote}"
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
