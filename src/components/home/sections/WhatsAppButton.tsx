/**
 * WhatsAppButton Component
 *
 * Floating WhatsApp contact button.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Fab, Tooltip } from '@mui/material';
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
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 200 }}
      style={{
        position: 'fixed',
        bottom: 100,
        left: 16,
        zIndex: 1000,
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
          }}
        >
          <WhatsApp sx={{ fontSize: 28 }} />
        </Fab>
      </Tooltip>
    </motion.div>
  );
};

export default WhatsAppButton;
