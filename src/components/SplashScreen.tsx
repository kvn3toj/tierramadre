/**
 * SplashScreen - Premium opening animation for Tierra Madre app
 *
 * Best practices applied:
 * - iOS/Android native easing curves
 * - Orchestrated staggered animations
 * - Three-phase lifecycle (enter → pulse → exit)
 * - Smooth coordinated exit transition
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Box, Typography } from '@mui/material';

// Premium easing curves following iOS/Android native patterns
const easings = {
  easeOutQuint: [0.22, 1, 0.36, 1] as const,
  easeInQuint: [0.7, 0, 0.84, 0] as const,
  easeInOutSine: [0.37, 0, 0.63, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
};

// Animation timing (seconds)
const timing = {
  glowFadeIn: 0.8,
  logoDelay: 0.3,
  logoDuration: 0.6,
  textDelay: 0.6,
  textDuration: 0.5,
  taglineDelay: 0.9,
  taglineDuration: 0.5,
  holdDuration: 1.2,
  exitDuration: 0.6,
};

// Glow variants with pulse
const glowVariants: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: {
    opacity: 0.6,
    scale: 1,
    transition: { duration: timing.glowFadeIn, ease: easings.easeOutQuint },
  },
  pulse: {
    opacity: [0.6, 0.8, 0.6],
    scale: [1, 1.1, 1],
    transition: { duration: 2, ease: easings.easeInOutSine, repeat: 1 },
  },
  exit: {
    opacity: 0,
    scale: 1.4,
    filter: 'blur(30px)',
    transition: { duration: timing.exitDuration, ease: easings.easeInQuint },
  },
};

// Logo variants
const logoVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: timing.logoDelay,
      duration: timing.logoDuration,
      ease: easings.spring,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -15,
    transition: { duration: timing.exitDuration * 0.8, ease: easings.easeInQuint },
  },
};

// Text variants
const textVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: timing.textDelay,
      duration: timing.textDuration,
      ease: easings.easeOutQuint,
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { delay: 0.05, duration: timing.exitDuration * 0.7, ease: easings.easeInQuint },
  },
};

// Tagline variants
const taglineVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 0.7,
    y: 0,
    transition: {
      delay: timing.taglineDelay,
      duration: timing.taglineDuration,
      ease: easings.easeOutQuint,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { delay: 0.1, duration: timing.exitDuration * 0.6, ease: easings.easeInQuint },
  },
};

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'entering' | 'holding' | 'exiting'>('entering');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // After enter animations complete, start holding phase
    const holdTimer = setTimeout(() => {
      setPhase('holding');
    }, (timing.taglineDelay + timing.taglineDuration) * 1000);

    // After hold, begin exit
    const exitTimer = setTimeout(() => {
      setPhase('exiting');
      setIsVisible(false);
    }, (timing.taglineDelay + timing.taglineDuration + timing.holdDuration) * 1000);

    // Complete after exit animation
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, (timing.taglineDelay + timing.taglineDuration + timing.holdDuration + timing.exitDuration) * 1000);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence mode="wait" onExitComplete={() => onComplete?.()}>
      {isVisible && (
        <Box
          component={motion.div}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: timing.exitDuration, ease: easings.easeInQuint } }}
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
              radial-gradient(ellipse at center, rgba(0, 174, 122, 0.12) 0%, transparent 50%),
              linear-gradient(180deg, #0D0D0D 0%, #1C1C1E 100%)
            `,
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          {/* Primary glow */}
          <Box
            component={motion.div}
            variants={glowVariants}
            initial="hidden"
            animate={phase === 'holding' ? 'pulse' : 'visible'}
            exit="exit"
            sx={{
              position: 'absolute',
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 174, 122, 0.3) 0%, transparent 70%)',
              filter: 'blur(40px)',
              willChange: 'transform, opacity',
            }}
          />

          {/* Inner glow */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: 0.4,
              scale: 1,
              transition: { delay: 0.2, duration: 0.8, ease: easings.easeOutQuint }
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            sx={{
              position: 'absolute',
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 200, 130, 0.25) 0%, transparent 70%)',
              filter: 'blur(25px)',
            }}
          />

          {/* Logo */}
          <Box
            component={motion.img}
            src="/logo-symbol-only.png"
            alt="Tierra Madre"
            variants={logoVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            sx={{
              width: 120,
              height: 'auto',
              mb: 3,
              filter: 'drop-shadow(0 0 30px rgba(0, 174, 122, 0.4))',
              willChange: 'transform, opacity',
            }}
          />

          {/* Brand Name */}
          <Typography
            component={motion.h1}
            variants={textVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            sx={{
              fontFamily: '"Libre Baskerville", serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.4)',
              willChange: 'transform, opacity',
            }}
          >
            Tierra Madre
          </Typography>

          {/* Tagline */}
          <Typography
            component={motion.p}
            variants={taglineVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.875rem',
              color: '#00AE7A',
              mt: 1,
              letterSpacing: '0.1em',
              willChange: 'transform, opacity',
            }}
          >
            Esencia y Poder
          </Typography>
        </Box>
      )}
    </AnimatePresence>
  );
}
