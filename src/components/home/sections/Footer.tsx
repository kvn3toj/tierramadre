/**
 * Footer Component
 *
 * Social links and contact information for Tierra Madre.
 * Glass effect design with emerald brand accents.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, IconButton, Link } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Instagram, Language, WhatsApp } from '@mui/icons-material';
import { fadeInUp, cssTransition } from '../../../design-system/tokens/motion';
import { emeraldCore } from '../../../design-system/tokens/colors';
import { whiteAlpha, blackAlpha } from '../../../design-system/utils/colorUtils';

// =============================================================================
// CONSTANTS
// =============================================================================

const WHATSAPP_NUMBER = '+573113052755';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`;
const INSTAGRAM_LINK = 'https://www.instagram.com/tierramadre.co?igsh=dnJ3djRkOGIwdHhy';
const WEBSITE_LINK = 'https://www.tierramadre.co';

const SOCIAL_LINKS = [
  { icon: WhatsApp, href: WHATSAPP_LINK, label: 'WhatsApp', color: emeraldCore.primary },
  { icon: Instagram, href: INSTAGRAM_LINK, label: 'Instagram', color: '#E1306C' },
  { icon: Language, href: WEBSITE_LINK, label: 'Sitio web', color: emeraldCore.primary },
];

// =============================================================================
// COMPONENT
// =============================================================================

export const Footer: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

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
            bgcolor: isDarkMode ? blackAlpha(0.35) : 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderRadius: 4,
            p: 3,
            border: `1px solid ${isDarkMode ? whiteAlpha(0.08) : 'rgba(0,0,0,0.06)'}`,
            boxShadow: isDarkMode
              ? `0 4px 24px ${blackAlpha(0.2)}, inset 0 1px 0 ${whiteAlpha(0.04)}`
              : `0 4px 16px rgba(0,0,0,0.05)`,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            // Subtle emerald gradient accent at top
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '20%',
              right: '20%',
              height: '1px',
              background: `linear-gradient(90deg, transparent, ${emeraldCore.primary}60, transparent)`,
            },
          }}
        >
          {/* Social Icons with glass effect */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2.5 }}>
            {SOCIAL_LINKS.map(({ icon: Icon, href, label, color }) => (
              <IconButton
                key={label}
                component="a"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                sx={{
                  bgcolor: isDarkMode ? `${color}1A` : `${color}12`,
                  color: color,
                  width: 44,
                  height: 44,
                  border: `1px solid ${isDarkMode ? `${color}25` : `${color}18`}`,
                  '&:hover': {
                    bgcolor: `${color}30`,
                    transform: 'scale(1.08) translateY(-2px)',
                    boxShadow: `0 4px 16px ${color}30`,
                  },
                  transition: cssTransition.slow,
                }}
              >
                <Icon sx={{ fontSize: 22 }} />
              </IconButton>
            ))}
          </Box>

          {/* Contact Info */}
          <Typography
            variant="body2"
            sx={{
              color: isDarkMode ? whiteAlpha(0.8) : 'rgba(0,0,0,0.7)',
              mb: 0.75,
              fontWeight: 500,
            }}
          >
            <Link
              href={WEBSITE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'inherit',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                  color: emeraldCore.primary,
                },
                transition: 'color 0.2s ease',
              }}
            >
              www.tierramadre.co
            </Link>
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color: isDarkMode ? whiteAlpha(0.5) : 'rgba(0,0,0,0.45)',
              display: 'block',
              letterSpacing: '0.03em',
            }}
          >
            Esmeraldas Colombianas de Alta Calidad
          </Typography>

          {/* Divider */}
          <Box
            sx={{
              my: 2,
              height: '1px',
              background: isDarkMode
                ? `linear-gradient(90deg, transparent, ${whiteAlpha(0.08)}, transparent)`
                : `linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)`,
            }}
          />

          {/* Copyright */}
          <Typography
            variant="caption"
            sx={{
              color: isDarkMode ? whiteAlpha(0.35) : 'rgba(0,0,0,0.3)',
              display: 'block',
              fontSize: '0.7rem',
            }}
          >
            {new Date().getFullYear()} Tierra Madre. Todos los derechos reservados.
          </Typography>

          {/* Legal Links */}
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Link
              href="/privacy.html"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: isDarkMode ? whiteAlpha(0.3) : 'rgba(0,0,0,0.25)',
                fontSize: '0.65rem',
                textDecoration: 'none',
                '&:hover': {
                  color: isDarkMode ? whiteAlpha(0.6) : 'rgba(0,0,0,0.5)',
                },
                transition: 'color 0.2s ease',
              }}
            >
              Privacidad
            </Link>
            <Link
              href="/terms.html"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: isDarkMode ? whiteAlpha(0.3) : 'rgba(0,0,0,0.25)',
                fontSize: '0.65rem',
                textDecoration: 'none',
                '&:hover': {
                  color: isDarkMode ? whiteAlpha(0.6) : 'rgba(0,0,0,0.5)',
                },
                transition: 'color 0.2s ease',
              }}
            >
              Condiciones
            </Link>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
};

export default Footer;
