/**
 * NotificationPermission Component
 *
 * HIG Minimalistic - Tooltip/Snackbar style prompt
 * Shows as a minimal floating bar at bottom
 */

import { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Snackbar, Slide } from '@mui/material';
import { Notifications, Close } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import {
  isNotificationSupported,
  getPermissionStatus,
  requestPermission,
} from '../../services/notifications';
import { STORAGE_KEYS } from '../../constants/storage-keys';

interface NotificationPermissionProps {
  variant?: 'card' | 'compact' | 'tooltip';
  onDismiss?: () => void;
}

export default function NotificationPermission({
  variant = 'tooltip',
  onDismiss,
}: NotificationPermissionProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [dismissed, setDismissed] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);

  useEffect(() => {
    setPermission(getPermissionStatus());

    // Check if already dismissed
    const dismissedAt = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_DISMISSED);
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      // Show again after 14 days
      if (daysSinceDismiss < 14) {
        setDismissed(true);
      }
    }

    // Show snackbar after 3 seconds delay
    const timer = setTimeout(() => setShowSnackbar(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    setPermission(result);
    setShowSnackbar(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowSnackbar(false);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATION_DISMISSED, Date.now().toString());
    onDismiss?.();
  };

  // Don't show if not supported, already granted, denied, or dismissed
  if (!isNotificationSupported() || permission === 'granted' || permission === 'denied' || dismissed) {
    return null;
  }

  // Tooltip variant - minimal snackbar style
  if (variant === 'tooltip' || variant === 'card') {
    return (
      <AnimatePresence>
        {showSnackbar && (
          <Snackbar
            open={showSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            TransitionComponent={Slide}
            sx={{ bottom: { xs: 80, sm: 24 } }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  bgcolor: 'rgba(0,0,0,0.85)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 3,
                  px: 2,
                  py: 1.5,
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Notifications sx={{ fontSize: 18, color: 'primary.main' }} />
                </Box>

                <Box
                  onClick={handleRequestPermission}
                  sx={{ cursor: 'pointer', flex: 1 }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: 'white', fontWeight: 500, fontSize: '0.875rem' }}
                  >
                    Activar notificaciones
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}
                  >
                    Nuevos productos
                  </Typography>
                </Box>

                <IconButton
                  size="small"
                  onClick={handleDismiss}
                  sx={{ color: 'rgba(255,255,255,0.4)', ml: 0.5 }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            </motion.div>
          </Snackbar>
        )}
      </AnimatePresence>
    );
  }

  // Compact variant for settings
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
          Recibe alertas de nuevos productos
        </Typography>
      </Box>
      <IconButton size="small" onClick={handleRequestPermission}>
        <Notifications fontSize="small" />
      </IconButton>
    </Box>
  );
}
