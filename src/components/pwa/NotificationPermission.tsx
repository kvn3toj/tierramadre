/**
 * NotificationPermission Component
 *
 * Gentle prompt card to request notification permission.
 * Shows in settings or as a dismissible card.
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
} from '@mui/material';
import { Notifications, Close, CheckCircle } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import {
  isNotificationSupported,
  getPermissionStatus,
  requestPermission,
} from '../../services/notifications';

interface NotificationPermissionProps {
  variant?: 'card' | 'compact';
  onDismiss?: () => void;
}

export default function NotificationPermission({
  variant = 'card',
  onDismiss,
}: NotificationPermissionProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setPermission(getPermissionStatus());

    // Check if already dismissed
    const dismissedAt = localStorage.getItem('tierramadre-notification-dismissed');
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismiss < 7) {
        setDismissed(true);
      }
    }
  }, []);

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    setPermission(result);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('tierramadre-notification-dismissed', Date.now().toString());
    onDismiss?.();
  };

  // Don't show if not supported, already granted, or dismissed
  if (!isNotificationSupported() || permission === 'granted' || dismissed) {
    return null;
  }

  // Don't show if denied (user explicitly rejected)
  if (permission === 'denied') {
    return null;
  }

  if (variant === 'compact') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          borderRadius: 2,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
        }}
      >
        <Notifications sx={{ color: 'primary.main' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={500}>
            Activar notificaciones
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Recibe recordatorios de meditación
          </Typography>
        </Box>
        <Button size="small" variant="contained" onClick={handleRequestPermission}>
          Activar
        </Button>
      </Box>
    );
  }

  return (
    <Card
      sx={{
        bgcolor: 'var(--surface-secondary)',
        borderRadius: 3,
        border: '1px dashed',
        borderColor: 'primary.main',
        position: 'relative',
      }}
    >
      <IconButton
        size="small"
        onClick={handleDismiss}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: 'text.secondary',
        }}
      >
        <Close fontSize="small" />
      </IconButton>

      <CardContent sx={{ textAlign: 'center', py: 3 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <Notifications sx={{ fontSize: 28, color: 'primary.main' }} />
        </Box>

        <Typography variant="h6" gutterBottom fontWeight={600}>
          Activa las Notificaciones
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Recibe recordatorios diarios de meditación y alertas de nuevos productos
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            onClick={handleRequestPermission}
            fullWidth
          >
            Activar Notificaciones
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={handleDismiss}
            sx={{ color: 'text.secondary' }}
          >
            Ahora no
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
