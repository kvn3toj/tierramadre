/**
 * AmbassadorsPage Component
 *
 * Public ambassadors directory with refined editorial header.
 * Shows embajadores from Google Sheets.
 */

import React from 'react';
import { AmbassadorDirectory } from '../../components/ambassador';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { Asesor } from '../../hooks/useAsesores';
import { goldAccent } from '../../design-system/index';
import { fadeInUp } from '../../design-system/tokens/motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface AmbassadorsPageProps {
  onViewProducts?: (asesor: Asesor) => void;
  onContact?: (asesor: Asesor) => void;
}

const AmbassadorsPage: React.FC<AmbassadorsPageProps> = ({ onViewProducts, onContact }) => {
  const theme = useTheme();
  const { t } = useLanguage();
  const isLight = theme.palette.mode === 'light';
  const prefersReducedMotion = useReducedMotion();
  return (
    <Box>
      {/* Editorial Page Header */}
      <motion.div
        variants={fadeInUp}
        initial={prefersReducedMotion ? false : "initial"}
        animate="animate"
      >
        <Box sx={{ mb: 4, pt: 1 }}>
          <Typography
            component="h1"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '1.6rem', md: '1.85rem' },
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
              mb: 1,
            }}
          >
            {t.ambassador.pageTitle}
          </Typography>

          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: '0.8rem',
              letterSpacing: '0.02em',
              maxWidth: 420,
              lineHeight: 1.5,
              mb: 2.5,
            }}
          >
            {t.ambassador.pageSubtitle}
          </Typography>

          {/* Decorative gold hairline */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: '1px',
                background: goldAccent.primary,
              }}
            />
            <Box
              sx={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                bgcolor: goldAccent.primary,
                opacity: 0.6,
              }}
            />
            <Box
              sx={{
                flex: 1,
                height: '1px',
                background: isLight
                  ? `linear-gradient(90deg, ${alpha(goldAccent.primary, 0.2)} 0%, transparent 100%)`
                  : `linear-gradient(90deg, ${alpha(goldAccent.primary, 0.15)} 0%, transparent 100%)`,
              }}
            />
          </Box>
        </Box>
      </motion.div>

      <AmbassadorDirectory
        onViewProducts={onViewProducts}
        onContact={onContact}
      />
    </Box>
  );
};

export default AmbassadorsPage;
