/**
 * CollectionSplashScreen - Extended splash for CEO collection
 * Longer timing (8s) to allow video preloading
 * - English quotes for international audience
 * - Displays while videos load in background
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, useMediaQuery, LinearProgress } from '@mui/material';
import { brandColors } from '../../theme';

// Inspirational English quotes for exclusive collection
const COLLECTION_QUOTES = [
  "Where nature crafts its masterpieces",
  "Emeralds that capture the light of the soul",
  "The essence of Colombia in every stone",
  "Treasures from the earth, jewels of the heart",
  "The power of the earth in your hand",
  "Colombia's green brilliance in every facet",
  "Each emerald tells a story of millions of years",
  "The beauty of an emerald lies in its authenticity",
];

interface CollectionSplashScreenProps {
  onComplete?: () => void;
  /** Show loading progress bar */
  showProgress?: boolean;
}

export default function CollectionSplashScreen({
  onComplete,
  showProgress = true
}: CollectionSplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Select random quote
  const randomQuote = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * COLLECTION_QUOTES.length);
    return COLLECTION_QUOTES[randomIndex];
  }, []);

  useEffect(() => {
    // Extended timing: 8s total for video preloading
    // 7.5s content + 0.5s fade out
    const fadeTimer = setTimeout(() => setFadeOut(true), 7500);
    const completeTimer = setTimeout(() => onComplete?.(), 8000);

    // Progress simulation (for visual feedback)
    if (showProgress) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 100;
          // Exponential easing: fast start, slower end
          const increment = (100 - prev) * 0.08;
          return Math.min(prev + increment, 100);
        });
      }, 100);

      return () => {
        clearInterval(interval);
        clearTimeout(fadeTimer);
        clearTimeout(completeTimer);
      };
    }

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, showProgress]);

  return (
    <Box
      component={motion.div}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
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
          opacity: [0, 0.5, 0.7, 0.5, 0.7, 0.5, 0.7, 0.5],
          scale: [0.9, 1, 1.1, 1, 1.1, 1, 1.1, 1],
        }}
        transition={{
          duration: 7.5,
          times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
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
            opacity: [0, 0.4, 0.6, 0.4, 0.6, 0.4, 0.6, 0.4],
            scale: [0.95, 1, 1.05, 1, 1.05, 1, 1.05, 1],
          }}
          transition={{
            duration: 7.5,
            times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
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
          zIndex: 1,
          px: 2,
        }}
      >
        {/* Symbol Logo */}
        <Box
          component={motion.img}
          src="/logo-symbol.png"
          alt="Tierra Mädre - Colombian Emeralds"
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.92 }}
          animate={prefersReducedMotion ? { opacity: 1 } : {
            opacity: [0, 1, 1, 1, 1, 1, 1, 1],
            scale: [0.92, 1, 1.03, 1, 1.03, 1, 1.03, 1],
          }}
          transition={{
            duration: 7.5,
            times: [0, 0.25, 0.4, 0.5, 0.65, 0.75, 0.9, 1],
            ease: [0.4, 0, 0.2, 1],
          }}
          sx={{
            width: { xs: 'calc(42vw * 0.77)', sm: 170 },
            maxWidth: 185,
            height: 'auto',
            filter: 'drop-shadow(0 0 35px rgba(80, 200, 120, 0.35))',
          }}
        />

        {/* Brand Name */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={prefersReducedMotion ? { opacity: 1, y: 0 } : {
            opacity: [0, 0, 1],
            y: [10, 10, 0],
          }}
          transition={{
            duration: 7.5,
            times: [0, 0.25, 1],
            ease: 'easeOut',
          }}
          sx={{ textAlign: 'center', mt: 0.5 }}
        >
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.95)',
              fontSize: { xs: '1.2rem', sm: '1.4rem' },
              fontWeight: 300,
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            Tierra Mädre
          </Typography>
        </Box>

        {/* Collection Title */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={prefersReducedMotion ? { opacity: 1, y: 0 } : {
            opacity: [0, 0, 1],
            y: [10, 10, 0],
          }}
          transition={{
            duration: 7.5,
            times: [0, 0.3, 1],
            ease: 'easeOut',
          }}
          sx={{ textAlign: 'center', mt: -1 }}
        >
          <Typography
            variant="h6"
            sx={{
              color: brandColors.emeraldGreen,
              fontSize: { xs: '1rem', sm: '1.1rem' },
              fontWeight: 500,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              mb: 1,
            }}
          >
            Exclusive Collection
          </Typography>
        </Box>

        {/* Inspirational Quote */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={prefersReducedMotion ? { opacity: 1, y: 0 } : {
            opacity: [0, 0, 1],
            y: [10, 10, 0],
          }}
          transition={{
            duration: 7.5,
            times: [0, 0.4, 1],
            ease: 'easeOut',
          }}
          sx={{
            textAlign: 'center',
            maxWidth: { xs: 280, sm: 360 },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              fontWeight: 300,
              lineHeight: 1.7,
              fontStyle: 'italic',
              letterSpacing: 0.3,
            }}
          >
            "{randomQuote}"
          </Typography>
        </Box>

        {/* Loading Progress Bar */}
        {showProgress && (
          <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: progress > 5 ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            sx={{
              width: { xs: 200, sm: 280 },
              mt: 2,
            }}
          >
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 2,
                borderRadius: 1,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: brandColors.emeraldGreen,
                  borderRadius: 1,
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.7rem',
                mt: 1,
                letterSpacing: 0.5,
              }}
            >
              Preparing collection...
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
