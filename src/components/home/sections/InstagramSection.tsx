/**
 * Instagram Section Component
 *
 * HIG Minimalistic Design - Simple follow card
 * Principles: Clarity, Deference
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, Avatar } from '@mui/material';
import { Instagram, OpenInNew } from '@mui/icons-material';
import { fadeInUp, cssTransition } from '../../../design-system/tokens/motion';
import { blurValues } from '../../../design-system';

// =============================================================================
// CONSTANTS
// =============================================================================

const INSTAGRAM_LINK = 'https://www.instagram.com/tierramadre.co?igsh=dnJ3djRkOGIwdHhy';
const INSTAGRAM_HANDLE = '@tierramadre.co';
const INSTAGRAM_GRADIENT = 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';

// =============================================================================
// COMPONENT - HIG Minimalistic
// =============================================================================

export const InstagramSection: React.FC = () => {
  const handleOpenInstagram = () => {
    window.open(INSTAGRAM_LINK, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box component="section" aria-label="Instagram" sx={{ px: 2, py: 1 }}>
      <motion.div variants={fadeInUp} initial="initial" animate="animate">
        <Box
          onClick={handleOpenInstagram}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleOpenInstagram()}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: 'rgba(0,0,0,0.3)',
            backdropFilter: `blur(${blurValues.xl})`,
            borderRadius: 3,
            p: 2,
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            transition: cssTransition.default,
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(225, 48, 108, 0.2)',
            },
          }}
        >
          {/* Instagram Icon */}
          <Avatar
            sx={{
              width: 44,
              height: 44,
              background: INSTAGRAM_GRADIENT,
            }}
          >
            <Instagram sx={{ fontSize: 24, color: '#fff' }} />
          </Avatar>

          {/* Text */}
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}
            >
              {INSTAGRAM_HANDLE}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}
            >
              Síguenos en Instagram
            </Typography>
          </Box>

          {/* Arrow */}
          <OpenInNew sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }} />
        </Box>
      </motion.div>
    </Box>
  );
};

export default InstagramSection;
