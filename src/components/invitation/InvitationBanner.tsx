/**
 * InvitationBanner Component
 *
 * Shows a simple info banner for users accessing via invitation link.
 * No countdown — guest access has no time limit.
 */

import { useState, useEffect } from 'react';
import { Alert, Typography, IconButton } from '@mui/material';
import { CardGiftcard, Close as CloseIcon } from '@mui/icons-material';
import { INVITATION_STORAGE_KEYS } from '../../types/invitation';

function getInviterName(): string | null {
  return sessionStorage.getItem(INVITATION_STORAGE_KEYS.INVITER_NAME) || null;
}

function hasInvitationSession(): boolean {
  const token = sessionStorage.getItem(INVITATION_STORAGE_KEYS.TOKEN);
  return !!token;
}

export default function InvitationBanner() {
  const [visible, setVisible] = useState(false);
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (hasInvitationSession()) {
      setVisible(true);
      setInviterName(getInviterName());
    }
  }, []);

  if (!visible || dismissed) return null;

  return (
    <Alert
      severity="info"
      icon={<CardGiftcard />}
      action={
        <IconButton
          size="small"
          onClick={() => setDismissed(true)}
          sx={{ color: 'inherit' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      }
      sx={{
        borderRadius: 0,
        py: 0.5,
      }}
    >
      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
        Acceso como invitado
        {inviterName ? ` · Invitado por ${inviterName}` : ''}
      </Typography>
    </Alert>
  );
}
