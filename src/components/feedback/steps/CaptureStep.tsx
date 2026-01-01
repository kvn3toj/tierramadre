/**
 * CaptureStep - Screenshot Capture Step
 *
 * Two modes:
 * 1. Manual mode: Shows instructions, user clicks to start capture mode
 * 2. Capture mode: Closes dialog, shows floating capture button
 */

import { useState, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { alpha } from '@mui/material/styles';
import { emeraldCore } from '../../../design-system/tokens/colors';

interface CaptureStepProps {
  onCapture: (screenshot: string) => void;
  onClose: () => void;
  onStartCaptureMode?: () => void; // Called to close wizard and show floating button
  existingScreenshot?: string | null; // If user already captured
}

export default function CaptureStep({
  onCapture,
  onClose,
  onStartCaptureMode,
  existingScreenshot
}: CaptureStepProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Direct capture (for cases where wizard is already hidden or FAB mode)
  const captureDirectly = useCallback(async () => {
    setIsCapturing(true);
    setError(null);

    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // Hide the dialog temporarily for capture
      const dialogs = document.querySelectorAll('[role="dialog"]');
      dialogs.forEach((d) => ((d as HTMLElement).style.visibility = 'hidden'));

      // Small delay to ensure dialog is hidden
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture the entire visible area
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        x: 0,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
      });

      // Show dialogs again
      dialogs.forEach((d) => ((d as HTMLElement).style.visibility = 'visible'));

      // Convert to base64 (JPEG for smaller size)
      const screenshot = canvas.toDataURL('image/jpeg', 0.8);
      onCapture(screenshot);
    } catch (err) {
      console.error('Screenshot capture error:', err);
      setError('Error al capturar pantalla. Intenta de nuevo.');
      // Show dialogs again in case of error
      const dialogs = document.querySelectorAll('[role="dialog"]');
      dialogs.forEach((d) => ((d as HTMLElement).style.visibility = 'visible'));
    } finally {
      setIsCapturing(false);
    }
  }, [onCapture]);

  // Start manual capture mode (closes wizard, shows floating button)
  const handleStartCaptureMode = useCallback(() => {
    if (onStartCaptureMode) {
      onStartCaptureMode();
    } else {
      // Fallback to direct capture if no callback provided
      captureDirectly();
    }
  }, [onStartCaptureMode, captureDirectly]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        textAlign: 'center',
        gap: 3,
      }}
    >
      {/* Chatbot message */}
      <Box
        sx={{
          bgcolor: alpha(emeraldCore.primary, 0.1),
          borderRadius: 3,
          p: 3,
          maxWidth: 340,
          border: `1px solid ${alpha(emeraldCore.primary, 0.2)}`,
        }}
      >
        <Typography
          sx={{
            color: 'white',
            fontSize: '1rem',
            lineHeight: 1.6,
          }}
        >
          {existingScreenshot ? (
            <>
              <strong>Ya tienes una captura.</strong>
              <br />
              Puedes continuar o capturar una nueva.
            </>
          ) : (
            <>
              Te ayudaré a reportar un problema.
              <br />
              <strong>Primero, captura la pantalla donde está el problema.</strong>
            </>
          )}
        </Typography>
      </Box>

      {/* Instructions */}
      {!existingScreenshot && (
        <Box
          sx={{
            bgcolor: alpha('#fff', 0.05),
            borderRadius: 2,
            p: 2,
            maxWidth: 300,
          }}
        >
          <Typography
            sx={{
              color: alpha('#fff', 0.7),
              fontSize: '0.85rem',
              lineHeight: 1.5,
            }}
          >
            📸 Al presionar, este menú se cerrará.
            <br />
            Navega a la pantalla con el problema y presiona el botón flotante para capturar.
          </Typography>
        </Box>
      )}

      {/* Existing screenshot preview */}
      {existingScreenshot && (
        <Box
          sx={{
            width: 200,
            height: 120,
            borderRadius: 2,
            overflow: 'hidden',
            border: `2px solid ${emeraldCore.primary}`,
            position: 'relative',
          }}
        >
          <img
            src={existingScreenshot}
            alt="Captura actual"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: alpha('#000', 0.7),
              py: 0.5,
            }}
          >
            <Typography sx={{ color: 'white', fontSize: '0.75rem' }}>
              Captura actual
            </Typography>
          </Box>
        </Box>
      )}

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        {existingScreenshot ? (
          <>
            {/* Continue with existing */}
            <Button
              variant="contained"
              size="large"
              startIcon={<PhotoLibraryIcon />}
              onClick={() => onCapture(existingScreenshot)}
              sx={{
                bgcolor: emeraldCore.primary,
                px: 3,
                py: 1.5,
                borderRadius: 2,
                fontSize: '0.95rem',
                '&:hover': {
                  bgcolor: emeraldCore.dark,
                },
              }}
            >
              Usar esta captura
            </Button>
            {/* Capture new */}
            <Button
              variant="outlined"
              size="large"
              startIcon={isCapturing ? <CircularProgress size={20} color="inherit" /> : <CameraAltIcon />}
              onClick={handleStartCaptureMode}
              disabled={isCapturing}
              sx={{
                borderColor: alpha('#fff', 0.3),
                color: 'white',
                px: 3,
                py: 1.5,
                borderRadius: 2,
                fontSize: '0.95rem',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: alpha('#fff', 0.05),
                },
              }}
            >
              Capturar nueva
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            size="large"
            startIcon={isCapturing ? <CircularProgress size={20} color="inherit" /> : <CameraAltIcon />}
            onClick={handleStartCaptureMode}
            disabled={isCapturing}
            sx={{
              bgcolor: emeraldCore.primary,
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontSize: '1rem',
              '&:hover': {
                bgcolor: emeraldCore.dark,
              },
              '&:disabled': {
                bgcolor: alpha(emeraldCore.primary, 0.5),
                color: 'white',
              },
            }}
          >
            {isCapturing ? 'Preparando...' : 'Iniciar Captura'}
          </Button>
        )}
      </Box>

      {/* Error message */}
      {error && (
        <Typography
          sx={{
            color: '#f44336',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </Typography>
      )}

      {/* Cancel option */}
      <Button
        variant="text"
        onClick={onClose}
        sx={{
          color: alpha('#fff', 0.5),
          '&:hover': {
            color: 'white',
            bgcolor: 'transparent',
          },
        }}
      >
        Cancelar
      </Button>
    </Box>
  );
}
