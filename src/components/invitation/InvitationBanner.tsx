/**
 * InvitationBanner Component
 *
 * Shows a countdown timer banner for users accessing via invitation link.
 * Displays remaining time and auto-logs out when expired.
 * Fixed 24-hour duration.
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert, Box, Typography, LinearProgress, IconButton } from '@mui/material';
import { Timer, Close as CloseIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { brand, typography } from '../../design-system';
import { INVITATION_STORAGE_KEYS } from '../../types/invitation';

interface InvitationSession {
  expiresAt: string;
  token: string;
  durationHours: number;
}

function getInvitationSession(): InvitationSession | null {
  const expiresAt = sessionStorage.getItem(INVITATION_STORAGE_KEYS.EXPIRES);
  const token = sessionStorage.getItem(INVITATION_STORAGE_KEYS.TOKEN);
  // Fixed 24-hour duration
  const durationHours = 24;

  if (expiresAt && token) {
    return { expiresAt, token, durationHours };
  }
  return null;
}

function clearInvitationSession() {
  sessionStorage.removeItem(INVITATION_STORAGE_KEYS.EXPIRES);
  sessionStorage.removeItem(INVITATION_STORAGE_KEYS.TOKEN);
  sessionStorage.removeItem(INVITATION_STORAGE_KEYS.PRICING_MODE);
  sessionStorage.removeItem(INVITATION_STORAGE_KEYS.DURATION_HOURS);
  sessionStorage.removeItem(INVITATION_STORAGE_KEYS.INVITATION_ID);
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  // For durations > 1 hour, show hours:minutes:seconds
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  // For shorter durations, show minutes:seconds
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function InvitationBanner() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [session, setSession] = useState<InvitationSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [dismissed, setDismissed] = useState(false);

  // Check for invitation session on mount
  useEffect(() => {
    const invitationSession = getInvitationSession();
    if (invitationSession) {
      setSession(invitationSession);
      const expiresAt = new Date(invitationSession.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(remaining);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!session || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Handle expiration
  const handleExpiration = useCallback(() => {
    clearInvitationSession();
    logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    if (session && timeRemaining === 0) {
      handleExpiration();
    }
  }, [session, timeRemaining, handleExpiration]);

  // Don't render if no invitation session or dismissed
  if (!session || dismissed) return null;

  // Fixed 24-hour duration
  const totalDuration = 24 * 60 * 60; // in seconds
  const progress = (timeRemaining / totalDuration) * 100;
  // Low time threshold: 10% of total duration or 5 minutes, whichever is less
  const lowTimeThreshold = Math.min(totalDuration * 0.1, 5 * 60);
  const isLowTime = timeRemaining < lowTimeThreshold;

  return (
    <Alert
      severity={isLowTime ? 'warning' : 'info'}
      icon={<Timer />}
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
        '& .MuiAlert-message': {
          width: '100%',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: typography.weight.medium,
            fontSize: '0.8rem',
          }}
        >
          Acceso temporal
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: isLowTime ? 'error.light' : brand.emerald[100],
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: typography.weight.bold,
              fontFamily: typography.fontFamily.mono,
              fontSize: '0.85rem',
              color: isLowTime ? 'error.dark' : brand.emerald[800],
            }}
          >
            {formatTime(timeRemaining)}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            bgcolor: 'rgba(0,0,0,0.1)',
            '& .MuiLinearProgress-bar': {
              bgcolor: isLowTime ? 'error.main' : brand.emerald[500],
              borderRadius: 2,
            },
          }}
        />
      </Box>
    </Alert>
  );
}
