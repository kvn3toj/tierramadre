/**
 * Instagram Section Component
 *
 * Displays a beautiful Instagram profile preview card
 * with link to follow Tierra Madre on Instagram.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, Button, Avatar } from '@mui/material';
import { Instagram } from '@mui/icons-material';
import { fadeInUp } from '../../../design-system/tokens/motion';

// =============================================================================
// CONSTANTS
// =============================================================================

const INSTAGRAM_LINK = 'https://www.instagram.com/tierramadre.co?igsh=dnJ3djRkOGIwdHhy';
const INSTAGRAM_HANDLE = '@tierramadre.co';

// Instagram gradient colors
const INSTAGRAM_GRADIENT = 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';

// =============================================================================
// COMPONENT
// =============================================================================

export const InstagramSection: React.FC = () => {
  const handleOpenInstagram = () => {
    window.open(INSTAGRAM_LINK, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      component="section"
      aria-label="Instagram"
      sx={{ px: 2, mb: 2 }}
    >
      <motion.div variants={fadeInUp} initial="initial" animate="animate">
        <Box
          sx={{
            bgcolor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            p: 2.5,
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(225, 48, 108, 0.3)',
              transform: 'translateY(-2px)',
            },
          }}
          onClick={handleOpenInstagram}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleOpenInstagram()}
        >
          {/* Header with Instagram branding */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 2,
            }}
          >
            {/* Instagram Icon with gradient background */}
            <Avatar
              sx={{
                width: 48,
                height: 48,
                background: INSTAGRAM_GRADIENT,
              }}
            >
              <Instagram sx={{ fontSize: 28, color: '#fff' }} />
            </Avatar>

            <Box sx={{ flex: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  color: '#fff',
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                Tierra Madre
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.85rem',
                }}
              >
                {INSTAGRAM_HANDLE}
              </Typography>
            </Box>

            {/* Follow Button */}
            <Button
              variant="contained"
              size="small"
              sx={{
                background: INSTAGRAM_GRADIENT,
                color: '#fff',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 2,
                py: 0.75,
                minWidth: 'auto',
                boxShadow: '0 2px 8px rgba(225, 48, 108, 0.3)',
                '&:hover': {
                  background: INSTAGRAM_GRADIENT,
                  boxShadow: '0 4px 12px rgba(225, 48, 108, 0.5)',
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenInstagram();
              }}
            >
              Seguir
            </Button>
          </Box>

          {/* Description */}
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.8)',
              lineHeight: 1.5,
              mb: 1.5,
            }}
          >
            Esmeraldas colombianas de alta calidad. Descubre nuestra coleccion exclusiva y las historias detras de cada gema.
          </Typography>

          {/* Stats row (decorative) */}
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              pt: 1.5,
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="body2"
                sx={{ color: '#fff', fontWeight: 600 }}
              >
                Publicaciones
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Ver mas
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="body2"
                sx={{ color: '#fff', fontWeight: 600 }}
              >
                Historias
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Destacadas
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="body2"
                sx={{ color: '#fff', fontWeight: 600 }}
              >
                Reels
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Nuevos
              </Typography>
            </Box>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
};

export default InstagramSection;
