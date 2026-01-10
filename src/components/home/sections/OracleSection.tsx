/**
 * OracleSection Component
 *
 * Liquid Glass Design - Compact inline quote
 * Inspired by Apple iOS 26 design language
 *
 * Designed by: Aria + Eunoia + Zeno
 */

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Share, Bookmark, BookmarkBorder } from '@mui/icons-material';
import { emeraldCore, surfacesLight } from '../../../design-system/tokens/colors';
import { blackAlpha, opacity } from '../../../design-system';
import { textOnGlass, iosLabels, iosSeparators } from '../../../design-system/utils/colorUtils';
import { DAILY_ORACLES } from '../../../data/homeContent';

// =============================================================================
// TYPES
// =============================================================================

interface OracleSectionProps {
  savedFacts: number[];
  onSaveFact: (factId: number) => void;
  onShare: (text: string) => void;
}

// =============================================================================
// COMPONENT - Compact Liquid Glass Quote
// =============================================================================

export const OracleSection: React.FC<OracleSectionProps> = ({
  savedFacts,
  onSaveFact,
  onShare,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Get daily oracle based on day of year
  const dailyOracle = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return DAILY_ORACLES[dayOfYear % DAILY_ORACLES.length];
  }, []);

  const isSaved = savedFacts.includes(dailyOracle.id);

  const handleSave = useCallback(() => {
    onSaveFact(dailyOracle.id);
  }, [dailyOracle.id, onSaveFact]);

  const handleShare = useCallback(() => {
    onShare(`${dailyOracle.title}: ${dailyOracle.content}`);
  }, [dailyOracle, onShare]);

  // Theme-aware colors for iOS HIG compliance
  const colors = {
    cardBg: isDarkMode ? blackAlpha(opacity.overlay) : surfacesLight.surface.glass,
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.1)' : iosSeparators.default.light,
    textPrimary: isDarkMode ? textOnGlass.onDarkGlass.primary : iosLabels.primary.light,
    textSecondary: isDarkMode ? textOnGlass.onDarkGlass.secondary : iosLabels.secondary.light,
    iconDefault: isDarkMode ? textOnGlass.onDarkGlass.tertiary : iosLabels.tertiary.light,
    iconHover: isDarkMode ? textOnGlass.onDarkGlass.primary : iosLabels.primary.light,
  };

  return (
    <Box sx={{ px: 2, py: 1.5 }} component="section" aria-labelledby="oracle-title">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {/* Compact Glass Card - Horizontal layout */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            // Theme-aware glass effect
            bgcolor: colors.cardBg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid',
            borderColor: colors.cardBorder,
            borderRadius: 3,
            px: 2,
            py: 1.5,
          }}
        >
          {/* Quote icon - small accent */}
          <Typography
            sx={{
              fontSize: '1.5rem',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {dailyOracle.icon}
          </Typography>

          {/* Content - left aligned, compact */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                color: colors.textPrimary, // WCAG AA compliant
                fontSize: '0.875rem',
                fontWeight: 400,
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {dailyOracle.content}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: colors.textSecondary, // WCAG AA compliant
                fontSize: '0.7rem',
                mt: 0.25,
                display: 'block',
              }}
            >
              {dailyOracle.source}
            </Typography>
          </Box>

          {/* Actions - inline, minimal */}
          <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
            <IconButton
              size="small"
              onClick={handleSave}
              aria-label={isSaved ? 'Guardado' : 'Guardar'}
              sx={{
                color: isSaved ? emeraldCore.primary : colors.iconDefault,
                p: 0.75,
                '&:hover': { color: emeraldCore.primary },
              }}
            >
              {isSaved ? <Bookmark sx={{ fontSize: 18 }} /> : <BookmarkBorder sx={{ fontSize: 18 }} />}
            </IconButton>
            <IconButton
              size="small"
              onClick={handleShare}
              aria-label="Compartir"
              sx={{
                color: colors.iconDefault,
                p: 0.75,
                '&:hover': { color: colors.iconHover },
              }}
            >
              <Share sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
};

export default OracleSection;
