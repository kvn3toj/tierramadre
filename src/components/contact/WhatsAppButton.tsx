/**
 * WhatsAppButton
 *
 * Opens a WhatsApp conversation with the Tierra Madre house line.
 *
 * Two shapes:
 *  - `variant="floating"` — a FAB pinned bottom-right, for pages where contact
 *    should always be one tap away (Home).
 *  - `variant="inline"` — a normal button to drop inside a section or dialog.
 *
 * The message is pre-filled into the chat; the visitor still presses send, so
 * nothing is dispatched on their behalf by tapping this.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Box, Fab, Button, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { WhatsApp } from '@mui/icons-material';
import { emeraldCore } from '../../design-system/tokens/colors';
import { defaultShadows } from '../../design-system/tokens/shadows';
import { cssTransition } from '../../design-system/tokens/motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { houseWhatsAppLink, DEFAULT_WHATSAPP_MESSAGE } from '../../constants/contact';

interface WhatsAppButtonProps {
  /** Pre-filled chat text. Defaults to a neutral opener. */
  message?: string;
  variant?: 'floating' | 'inline';
  /** Entrance delay in ms — lets the page settle before the button appears. */
  delay?: number;
  /** Floating only: which corner to pin to. */
  position?: 'bottom-right' | 'bottom-left';
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  message = DEFAULT_WHATSAPP_MESSAGE,
  variant = 'floating',
  delay = 0,
  position = 'bottom-right',
}) => {
  const { t } = useLanguage();
  const theme = useTheme();

  const label = t.contact.whatsapp;
  const ariaLabel = t.contact.whatsappAria;
  const href = houseWhatsAppLink(message);

  const open = () => {
    // noopener/noreferrer: the WhatsApp tab must not get a handle on this window.
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'inline') {
    return (
      <Button
        onClick={open}
        aria-label={ariaLabel}
        startIcon={<WhatsApp />}
        sx={{
          borderRadius: '999px',
          px: 2.5,
          py: 1,
          textTransform: 'none',
          fontWeight: 600,
          color: '#fff',
          backgroundColor: emeraldCore.primary,
          transition: cssTransition.default,
          '&:hover': { backgroundColor: emeraldCore.dark },
        }}
      >
        {label}
      </Button>
    );
  }

  const corner =
    position === 'bottom-right'
      ? { right: 16 }
      : { left: 16 };

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, scale: 0.8, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: delay / 1000, type: 'spring', stiffness: 400, damping: 25 }}
      sx={{
        position: 'fixed',
        ...corner,
        // Clear the iPhone home indicator instead of sitting under it.
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        zIndex: theme.zIndex.fab,
      }}
    >
      <Tooltip title={label} placement="left">
        <Fab
          onClick={open}
          aria-label={ariaLabel}
          sx={{
            backgroundColor: emeraldCore.primary,
            color: '#fff',
            boxShadow: defaultShadows.lg,
            transition: cssTransition.default,
            '&:hover': { backgroundColor: emeraldCore.dark },
          }}
        >
          <WhatsApp />
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default WhatsAppButton;
