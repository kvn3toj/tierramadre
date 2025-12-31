/**
 * CaptureStep - Screenshot Capture Step
 *
 * Captures the current screen using html2canvas.
 */

import { useState, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { alpha } from '@mui/material/styles';
import html2canvas from 'html2canvas';
import { emeraldCore } from '../../../design-system/tokens/colors';

interface CaptureStepProps {
  onCapture: (screenshot: string) => void;
  onClose: () => void;
}

export default function CaptureStep({ onCapture, onClose }: CaptureStepProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureScreen = useCallback(async () => {
    setIsCapturing(true);
    setError(null);

    try {
      // Hide the dialog temporarily for capture
      const dialogs = document.querySelectorAll('[role="dialog"]');
      dialogs.forEach((d) => ((d as HTMLElement).style.visibility = 'hidden'));

      // Small delay to ensure dialog is hidden
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture the entire visible area
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 1, // Reduce scale to keep file size manageable
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
          maxWidth: 320,
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
          Te ayudaré a reportar un problema de UI.
          <br />
          <strong>Primero, voy a capturar la pantalla actual.</strong>
        </Typography>
      </Box>

      {/* Capture button */}
      <Button
        variant="contained"
        size="large"
        startIcon={isCapturing ? <CircularProgress size={20} color="inherit" /> : <CameraAltIcon />}
        onClick={captureScreen}
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
        {isCapturing ? 'Capturando...' : 'Capturar Pantalla'}
      </Button>

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
