/**
 * UpdatePrompt Component
 *
 * Shows a snackbar notification when a new PWA version is available.
 * Works with vite-plugin-pwa's generated service worker.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Snackbar, Button, Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import { blurValues } from '../../design-system';
import { createLogger } from '../../utils/logger';

const log = createLogger('PWA');

export default function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Skip if service workers aren't supported
    if (!('serviceWorker' in navigator)) {
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;

    const checkForUpdates = async () => {
      try {
        // Get existing registration or register new one
        const registration = await navigator.serviceWorker.ready;
        registrationRef.current = registration;

        // Check for waiting worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowPrompt(true);
        }

        // Listen for new service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setShowPrompt(true);
              }
            });
          }
        });

        // Check for updates periodically (every 30 minutes)
        intervalId = setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);

        // Initial update check
        registration.update();
      } catch (error) {
        log.error('Service worker registration error:', error);
      }
    };

    checkForUpdates();

    // Listen for controller change (happens when skipWaiting is called)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  const handleUpdate = useCallback(() => {
    if (waitingWorker) {
      // Tell the waiting service worker to become active
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [waitingWorker]);

  const handleClose = useCallback(() => {
    setShowPrompt(false);
  }, []);

  return (
    <Snackbar
      open={showPrompt}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        bottom: { xs: 80, sm: 24 }, // Above mobile nav if present
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2,
          py: 1.5,
          borderRadius: 2,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.95),
          backdropFilter: `blur(${blurValues.sm})`,
          boxShadow: '0 8px 32px rgba(0, 174, 122, 0.3)',
          border: '1px solid',
          borderColor: 'primary.light',
        }}
      >
        <SystemUpdateAltIcon sx={{ color: 'white', fontSize: 28 }} />
        <Typography sx={{ color: 'white', fontWeight: 500 }}>
          Nueva versión disponible
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={handleUpdate}
          sx={{
            bgcolor: 'white',
            color: 'primary.main',
            fontWeight: 600,
            '&:hover': {
              bgcolor: 'grey.100',
            },
          }}
        >
          Actualizar
        </Button>
        <Button
          size="small"
          onClick={handleClose}
          sx={{
            color: 'white',
            opacity: 0.8,
            minWidth: 'auto',
            '&:hover': {
              opacity: 1,
              bgcolor: 'transparent',
            },
          }}
        >
          Luego
        </Button>
      </Box>
    </Snackbar>
  );
}
