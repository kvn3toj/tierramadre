/**
 * OracleSection Component
 *
 * Animated Oracle - Random emerald wisdom on each Home visit
 * Liquid Glass Design - Apple iOS 26 inspired
 *
 * Features:
 * - Random quote selection on each page visit
 * - Elegant fade-in animation
 * - No save/share buttons - pure contemplation
 *
 * Designed by: Aria + Eunoia + Zeno
 */

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { emeraldCore, surfacesLight } from '../../../design-system/tokens/colors';
import { blackAlpha, opacity } from '../../../design-system';
import { textOnGlass, iosLabels, iosSeparators } from '../../../design-system/utils/colorUtils';
import { ORACLE_QUOTES, OracleQuote } from '../../../data/homeContent';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get a random quote from the collection.
 * Uses session storage to avoid repeating the same quote on navigation within session.
 */
const getRandomQuote = (): OracleQuote => {
  const sessionKey = 'oracle_quote_id';
  const storedId = sessionStorage.getItem(sessionKey);

  // Filter out the last shown quote to avoid immediate repetition
  const availableQuotes = storedId
    ? ORACLE_QUOTES.filter(q => q.id !== parseInt(storedId, 10))
    : ORACLE_QUOTES;

  // If somehow all quotes were filtered, use all
  const quotesToChoose = availableQuotes.length > 0 ? availableQuotes : ORACLE_QUOTES;

  // Random selection
  const randomIndex = Math.floor(Math.random() * quotesToChoose.length);
  const selectedQuote = quotesToChoose[randomIndex];

  // Store for next time
  sessionStorage.setItem(sessionKey, selectedQuote.id.toString());

  return selectedQuote;
};

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: 'easeOut' as const,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.3,
    },
  },
};

const iconVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      delay: 0.2,
      duration: 0.5,
      type: 'spring' as const,
      stiffness: 200,
      damping: 15,
    },
  },
};

const textVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.3,
      duration: 0.4,
    },
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const OracleSection: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // State for the current quote
  const [quote, setQuote] = useState<OracleQuote | null>(null);
  const [key, setKey] = useState(0); // For re-triggering animation

  // Select random quote on mount
  useEffect(() => {
    setQuote(getRandomQuote());
    setKey(prev => prev + 1);
  }, []);

  // Theme-aware colors for iOS HIG compliance
  const colors = useMemo(() => ({
    cardBg: isDarkMode ? blackAlpha(opacity.overlay) : surfacesLight.surface.glass,
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.12)' : iosSeparators.default.light,
    textPrimary: isDarkMode ? textOnGlass.onDarkGlass.primary : iosLabels.primary.light,
    textSecondary: isDarkMode ? textOnGlass.onDarkGlass.secondary : iosLabels.secondary.light,
    accentGlow: isDarkMode ? `${emeraldCore.primary}30` : `${emeraldCore.primary}20`,
  }), [isDarkMode]);

  if (!quote) return null;

  return (
    <Box sx={{ px: 2, py: 2 }} component="section" aria-labelledby="oracle-title">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Glass Card */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              bgcolor: colors.cardBg,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid',
              borderColor: colors.cardBorder,
              borderRadius: 4,
              px: 2.5,
              py: 2,
              position: 'relative',
              overflow: 'hidden',
              // Subtle emerald glow effect
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: `linear-gradient(90deg, transparent, ${emeraldCore.primary}, transparent)`,
                opacity: 0.6,
              },
            }}
          >
            {/* Animated Icon */}
            <motion.div variants={iconVariants}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 3,
                  bgcolor: colors.accentGlow,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '1.5rem',
                    lineHeight: 1,
                  }}
                >
                  {quote.icon}
                </Typography>
              </Box>
            </motion.div>

            {/* Content */}
            <motion.div variants={textVariants} style={{ flex: 1, minWidth: 0 }}>
              <Typography
                id="oracle-title"
                variant="body1"
                sx={{
                  color: colors.textPrimary,
                  fontSize: '0.95rem',
                  fontWeight: 400,
                  lineHeight: 1.6,
                  mb: 0.75,
                  // Allow full text display
                  display: 'block',
                }}
              >
                {quote.content}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: colors.textSecondary,
                  fontSize: '0.7rem',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  '&::before': {
                    content: '"—"',
                    opacity: 0.6,
                  },
                }}
              >
                {quote.source}
              </Typography>
            </motion.div>
          </Box>
        </motion.div>
      </AnimatePresence>
    </Box>
  );
};

export default OracleSection;
