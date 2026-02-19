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
import { blackAlpha, emeraldAlpha, opacity } from '../../../design-system';
import { textOnGlass, iosLabels, iosSeparators } from '../../../design-system/utils/colorUtils';
import { ORACLE_QUOTES, OracleQuote } from '../../../data/homeContent';

// =============================================================================
// HELPERS
// =============================================================================

const getRandomQuote = (): OracleQuote => {
  const sessionKey = 'oracle_quote_id';
  const storedId = sessionStorage.getItem(sessionKey);

  const availableQuotes = storedId
    ? ORACLE_QUOTES.filter(q => q.id !== parseInt(storedId, 10))
    : ORACLE_QUOTES;

  const quotesToChoose = availableQuotes.length > 0 ? availableQuotes : ORACLE_QUOTES;
  const randomIndex = Math.floor(Math.random() * quotesToChoose.length);
  const selectedQuote = quotesToChoose[randomIndex];
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

  const [quote, setQuote] = useState<OracleQuote | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setQuote(getRandomQuote());
    setKey(prev => prev + 1);
  }, []);

  const colors = useMemo(() => ({
    cardBg: isDarkMode ? blackAlpha(opacity.overlay) : surfacesLight.surface.glass,
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.1)' : iosSeparators.default.light,
    textPrimary: isDarkMode ? textOnGlass.onDarkGlass.primary : iosLabels.primary.light,
    textSecondary: isDarkMode ? textOnGlass.onDarkGlass.secondary : iosLabels.secondary.light,
    iconBg: isDarkMode
      ? `linear-gradient(135deg, ${emeraldAlpha(0.2)} 0%, ${emeraldAlpha(0.1)} 100%)`
      : `linear-gradient(135deg, ${emeraldCore.lightest} 0%, rgba(0,174,122,0.08) 100%)`,
    iconBorder: isDarkMode ? emeraldAlpha(0.2) : emeraldAlpha(0.15),
  }), [isDarkMode]);

  if (!quote) return null;

  return (
    <Box sx={{ px: 2, py: 1.5 }} component="section" aria-labelledby="oracle-title">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Glass Card with ambient glow */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              bgcolor: colors.cardBg,
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid',
              borderColor: colors.cardBorder,
              borderRadius: 4,
              px: 2.5,
              py: 2,
              position: 'relative',
              overflow: 'hidden',
              // Ambient emerald glow
              boxShadow: isDarkMode
                ? `0 4px 24px ${emeraldAlpha(0.08)}, inset 0 1px 0 rgba(255,255,255,0.04)`
                : `0 4px 16px rgba(0,0,0,0.06)`,
              // Emerald gradient top accent
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '10%',
                right: '10%',
                height: '2px',
                background: `linear-gradient(90deg, transparent, ${emeraldCore.primary}, ${emeraldCore.light}, transparent)`,
                opacity: isDarkMode ? 0.5 : 0.4,
                borderRadius: '0 0 2px 2px',
              },
            }}
          >
            {/* Animated Icon with emerald glass effect */}
            <motion.div variants={iconVariants}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 3,
                  background: colors.iconBg,
                  border: `1px solid ${colors.iconBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 2px 8px ${emeraldAlpha(0.1)}`,
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
                  lineHeight: 1.65,
                  mb: 0.75,
                  display: 'block',
                }}
              >
                {quote.content}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: isDarkMode ? emeraldCore.light : emeraldCore.dark,
                  fontSize: '0.7rem',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  opacity: 0.8,
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
