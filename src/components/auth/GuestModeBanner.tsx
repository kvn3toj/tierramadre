/**
 * GuestModeBanner - Top banner showing guest mode status
 */

import { useState } from 'react';
import { Alert, Collapse, IconButton } from '@mui/material';
import { VisibilityOutlined, CloseOutlined } from '@mui/icons-material';
import { useIsGuest } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';

export default function GuestModeBanner() {
  const isGuest = useIsGuest();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  // Don't render if not guest or if dismissed
  if (!isGuest || dismissed) return null;

  return (
    <Collapse in={!dismissed}>
      <Alert
        severity="info"
        icon={<VisibilityOutlined />}
        action={
          <IconButton
            size="small"
            onClick={() => setDismissed(true)}
            aria-label="Cerrar banner"
            sx={{ color: 'inherit' }}
          >
            <CloseOutlined fontSize="small" />
          </IconButton>
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
  );
}
