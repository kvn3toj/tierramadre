import { useEffect, useState, useCallback } from 'react';
import { Snackbar, Button, Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';

// In development, the PWA virtual module is not available
// We'll use a simple fallback that does nothing
const isDev = import.meta.env.DEV;

export default function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Register service worker and listen for updates
  useEffect(() => {
    // Skip in development mode
    if (isDev || !('serviceWorker' in navigator)) {
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        setSwRegistration(registration);

        // Check for updates immediately
        registration.update();

        // Check for updates every 30 minutes
        intervalId = setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);

        // Listen for new service worker waiting
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available
                setShowPrompt(true);
              }
            });
          }
        });
      } catch (error) {
        console.error('SW registration error:', error);
      }
    };

    registerSW();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  const handleUpdate = useCallback(() => {
    if (swRegistration?.waiting) {
      // Tell the waiting service worker to take control
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Reload the page to load the new version
    window.location.reload();
  }, [swRegistration]);

  const handleClose = useCallback(() => {
    setShowPrompt(false);
  }, []);

  // Don't render anything in dev mode
  if (isDev) {
    return null;
  }

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
          backdropFilter: 'blur(10px)',
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
