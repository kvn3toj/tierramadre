/**
 * GuestModeBanner - Top banner showing guest mode status with unlock option
 */

import { useState } from 'react';
import { Alert, Button, Collapse, IconButton, Box } from '@mui/material';
import { VisibilityOutlined, CloseOutlined, LockOpenOutlined } from '@mui/icons-material';
import { useIsGuest } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import UnlockPrompt from './UnlockPrompt';

export default function GuestModeBanner() {
  const isGuest = useIsGuest();
  const { t } = useLanguage();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't render if not guest or if dismissed
  if (!isGuest || dismissed) return null;

  return (
    <>
      <Collapse in={!dismissed}>
        <Alert
          severity="info"
          icon={<VisibilityOutlined />}
          action={
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Button
                size="small"
                startIcon={<LockOpenOutlined />}
                onClick={() => setShowPrompt(true)}
                sx={{
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  color: 'inherit',
                  fontSize: '0.75rem',
                }}
              >
                {t.auth.unlock}
              </Button>
              <IconButton
                size="small"
                onClick={() => setDismissed(true)}
                aria-label="Cerrar banner"
                sx={{ color: 'inherit' }}
              >
                <CloseOutlined fontSize="small" />
              </IconButton>
            </Box>
          }
          sx={{
            borderRadius: 0,
            py: 0.5,
            '& .MuiAlert-message': {
              fontSize: '0.8rem',
            },
            '& .MuiAlert-icon': {
              fontSize: '1.25rem',
            },
          }}
        >
          {t.auth.guestModeBanner}
        </Alert>
      </Collapse>

      <UnlockPrompt
        open={showPrompt}
        onClose={() => setShowPrompt(false)}
      />
    </>
  );
}
