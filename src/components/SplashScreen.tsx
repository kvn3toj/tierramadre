/**
 * SplashScreen - Opening animation for Tierra Madre app
 *
 * Matches WelcomeScreen styling exactly for seamless transition.
 * Displays on cold start with animated logo and brand elements.
 */

import { motion } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import { brandColors } from '../theme';
import { useLanguage } from '../contexts/LanguageContext';

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const { t } = useLanguage();

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: brandColors.darkBg,
        background: `linear-gradient(180deg, ${brandColors.darkBg} 0%, #0a0a0a 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative emerald glow - matches WelcomeScreen */}
      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        sx={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${brandColors.emeraldGreen}15 0%, transparent 70%)`,
          top: '10%',
          filter: 'blur(60px)',
        }}
      />

      {/* Logo - matches WelcomeScreen */}
      <Box
        component={motion.img}
        src="/logo-tierra-madre.png"
        alt="Tierra Madre"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.9 }}
        transition={{
          duration: 0.6,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        onAnimationComplete={() => {
          setTimeout(() => onComplete?.(), 1400);
        }}
        sx={{
          height: 80,
          mb: 4,
        }}
      />

      {/* Title - matches WelcomeScreen */}
      <Typography
        component={motion.h1}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        variant="h5"
        sx={{
          color: '#ffffff',
          fontFamily: '"Libre Baskerville", Georgia, serif',
          fontWeight: 400,
          letterSpacing: '0.1em',
          mb: 1,
          textTransform: 'uppercase',
        }}
      >
        {t.auth.studio}
      </Typography>

      {/* Subtitle - matches WelcomeScreen */}
      <Typography
        component={motion.p}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        variant="body2"
        sx={{
          color: brandColors.emeraldGreen,
          letterSpacing: '0.2em',
          mb: 4,
          fontSize: '0.75rem',
        }}
      >
        {t.auth.welcomeSubtitle}
      </Typography>

      {/* Footer - matches WelcomeScreen */}
      <Typography
        component={motion.span}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 32,
          color: '#444',
          letterSpacing: '0.1em',
        }}
      >
        {t.auth.colombianEmeralds}
      </Typography>
    </Box>
  );
}
