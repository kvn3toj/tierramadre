/**
 * Footer Component
 *
 * Social links and contact information for Tierra Madre.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, IconButton, Link } from '@mui/material';
import { Instagram, Language, WhatsApp } from '@mui/icons-material';
import { fadeInUp } from '../../../theme/motionTokens';

// =============================================================================
// CONSTANTS
// =============================================================================

const WHATSAPP_NUMBER = '+573113052755';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`;
const INSTAGRAM_LINK = 'https://www.instagram.com/tierramadre.co?igsh=dnJ3djRkOGIwdHhy';
const WEBSITE_LINK = 'https://www.tierramadre.co';

// =============================================================================
// COMPONENT
// =============================================================================

export const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        px: 2,
        py: 3,
        mb: 2,
      }}
    >
      <motion.div variants={fadeInUp} initial="initial" animate="animate">
        <Box
          sx={{
            bgcolor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            p: 3,
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
          }}
        >
          {/* Social Icons */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
            <IconButton
              component="a"
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              sx={{
                bgcolor: 'rgba(37, 211, 102, 0.2)',
                color: '#25D366',
                '&:hover': {
                  bgcolor: 'rgba(37, 211, 102, 0.3)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <WhatsApp />
            </IconButton>

            <IconButton
              component="a"
              href={INSTAGRAM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              sx={{
                bgcolor: 'rgba(225, 48, 108, 0.2)',
                color: '#E1306C',
                '&:hover': {
                  bgcolor: 'rgba(225, 48, 108, 0.3)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Instagram />
            </IconButton>

            <IconButton
              component="a"
              href={WEBSITE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Sitio web"
              sx={{
                bgcolor: 'rgba(0, 174, 122, 0.2)',
                color: '#00AE7A',
                '&:hover': {
                  bgcolor: 'rgba(0, 174, 122, 0.3)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Language />
            </IconButton>
          </Box>

          {/* Contact Info */}
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
            <Link
              href={WEBSITE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              www.tierramadre.co
            </Link>
          </Typography>

          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
            Esmeraldas Colombianas de Alta Calidad
          </Typography>

          {/* Copyright */}
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.4)',
              display: 'block',
              mt: 2,
              fontSize: '0.7rem',
            }}
          >
            © {new Date().getFullYear()} Tierra Mädre. Todos los derechos reservados.
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
};

export default Footer;
