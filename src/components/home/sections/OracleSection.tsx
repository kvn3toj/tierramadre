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
import { Share, Bookmark, BookmarkBorder } from '@mui/icons-material';
import { emeraldCore } from '../../../design-system/tokens/colors';
import {
  glassStyle,
  overlays,
  whiteAlpha,
  opacity,
} from '../../../design-system';
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
            // Liquid Glass effect - using design system tokens
            ...glassStyle.light,
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
                color: overlays.text.primary,
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
                color: whiteAlpha(opacity.strong),
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
                color: isSaved ? emeraldCore.primary : whiteAlpha(opacity.prominent),
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
                color: whiteAlpha(opacity.prominent),
                p: 0.75,
                '&:hover': { color: whiteAlpha(opacity.intense) },
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
