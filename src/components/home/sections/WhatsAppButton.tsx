/**
 * WhatsAppButton Component
 *
 * Floating WhatsApp contact button.
 */

import { motion } from 'framer-motion';
import { Box, Fab, Tooltip } from '@mui/material';
import { WhatsApp } from '@mui/icons-material';

// =============================================================================
// CONSTANTS
// =============================================================================

const WHATSAPP_NUMBER = '+573113052755';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=Hola, estoy interesado en las esmeraldas de Tierra Madre`;

// =============================================================================
// COMPONENT
// =============================================================================

export const WhatsAppButton: React.FC = () => {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 200 }}
      sx={{
        position: 'fixed',
        // Position above tab bar: 65px (tab bar) + safe area + 16px margin
        bottom: 'calc(81px + env(safe-area-inset-bottom))',
        left: 16,
        zIndex: 999, // Below tab bar (1000) but above content
        // Landscape phone: adjust for smaller tab bar
        '@media (orientation: landscape) and (max-height: 500px)': {
          bottom: 'calc(65px + env(safe-area-inset-bottom))',
          left: 8,
        },
      }}
    >
      <Tooltip title="Contáctanos por WhatsApp" placement="right">
        <Fab
          component="a"
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
          sx={{
            bgcolor: '#25D366',
            color: 'white',
            boxShadow: '0 4px 20px rgba(37, 211, 102, 0.4)',
            '&:hover': {
              bgcolor: '#128C7E',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.2s ease',
            // Smaller button in landscape
            '@media (orientation: landscape) and (max-height: 500px)': {
              width: 48,
              height: 48,
              minHeight: 48,
            },
          }}
        >
          <WhatsApp sx={{ fontSize: 28 }} />
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default WhatsAppButton;
