/**
 * Footer Component
 *
 * Social links and contact information for Tierra Madre.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, IconButton, Link } from '@mui/material';
import { Instagram, Language, WhatsApp } from '@mui/icons-material';
import { fadeInUp } from '../../../design-system/tokens/motion';
import { emeraldCore } from '../../../design-system/tokens/colors';

// =============================================================================
// CONSTANTS
// =============================================================================

const WHATSAPP_NUMBER = '+573113052755';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`;
const INSTAGRAM_LINK = 'https://www.instagram.com/tierramadre.co?igsh=dnJ3djRkOGIwdHhy';
const WEBSITE_LINK = 'https://www.tierramadre.co';

// Social links configuration
const SOCIAL_LINKS = [
  { icon: WhatsApp, href: WHATSAPP_LINK, label: 'WhatsApp', color: emeraldCore.primary },
  { icon: Instagram, href: INSTAGRAM_LINK, label: 'Instagram', color: '#E1306C' },
  { icon: Language, href: WEBSITE_LINK, label: 'Sitio web', color: emeraldCore.primary },
];

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
            {SOCIAL_LINKS.map(({ icon: Icon, href, label, color }) => (
              <IconButton
                key={label}
                component="a"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                sx={{
                  bgcolor: `${color}33`,
                  color: color,
                  '&:hover': {
                    bgcolor: `${color}4D`,
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon />
              </IconButton>
            ))}
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
