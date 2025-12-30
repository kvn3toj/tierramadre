/**
 * WhatsAppButton Component
 *
 * Floating WhatsApp contact button.
 * Positioned above the bottom navigation bar using brand emerald green.
 */

import { motion } from 'framer-motion';
import { Fab, Tooltip, useMediaQuery } from '@mui/material';
import { WhatsApp } from '@mui/icons-material';
import { emeraldCore } from '../../../design-system/tokens/colors';

// =============================================================================
// CONSTANTS
// =============================================================================

const WHATSAPP_NUMBER = '+573113052755';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=Hola, estoy interesado en las esmeraldas de Tierra Madre`;

// Tab bar height + safe margin
const TAB_BAR_CLEARANCE = 96; // 56px tab + 40px margin

// =============================================================================
// COMPONENT
// =============================================================================

export const WhatsAppButton = () => {
  // Check for landscape phone
  const isLandscapePhone = useMediaQuery('(orientation: landscape) and (max-height: 500px)');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
      style={{
        position: 'fixed',
        // Position well above tab bar
        bottom: `calc(${TAB_BAR_CLEARANCE}px + env(safe-area-inset-bottom))`,
        right: isLandscapePhone ? 8 : 16,
        zIndex: 999, // Below tab bar (1000) but above content
      }}
    >
      <Tooltip title="Contáctanos por WhatsApp" placement="left">
        <Fab
          component="a"
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
          size={isLandscapePhone ? 'small' : 'medium'}
          sx={{
            bgcolor: emeraldCore.primary,
            color: 'white',
            boxShadow: `0 4px 20px ${emeraldCore.primary}66`,
            '&:hover': {
              bgcolor: emeraldCore.dark,
              transform: 'scale(1.1)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          <WhatsApp sx={{ fontSize: isLandscapePhone ? 24 : 28 }} />
        </Fab>
      </Tooltip>
    </motion.div>
  );
};

export default WhatsAppButton;
