/**
 * FloatingCaptureButton - Temporary floating button for screenshot capture
 *
 * Appears when user wants to capture a screenshot.
 * User navigates to the issue, then taps to capture.
 */

import { useState } from 'react';
import { Fab, Typography, Box, CircularProgress, Zoom, Tooltip } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';
import { alpha } from '@mui/material/styles';
import { emeraldCore } from '../../design-system/tokens/colors';
import { blurValues } from '../../design-system';
import { getMainScrollY } from '../../utils/mainScroll';

interface FloatingCaptureButtonProps {
  onCapture: (screenshot: string) => void;
  onCancel: () => void;
}

export default function FloatingCaptureButton({ onCapture, onCancel }: FloatingCaptureButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    setIsCapturing(true);

    try {
      // Small delay to let UI settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { default: html2canvas } = await import('html2canvas');

      // Hide capture buttons during screenshot
      const captureUI = document.getElementById('floating-capture-ui');
      if (captureUI) captureUI.style.visibility = 'hidden';

      // Capture the screen
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        x: 0,
        y: getMainScrollY(),
        width: window.innerWidth,
        height: window.innerHeight,
      });

      // Show UI again
      if (captureUI) captureUI.style.visibility = 'visible';

      // Convert to base64
      const screenshot = canvas.toDataURL('image/jpeg', 0.8);
      onCapture(screenshot);
    } catch (err) {
      console.error('Screenshot capture error:', err);
      // Show UI again on error
      const captureUI = document.getElementById('floating-capture-ui');
      if (captureUI) captureUI.style.visibility = 'visible';
      setIsCapturing(false);
    }
  };

  return (
    <Box
      id="floating-capture-ui"
      sx={{
        position: 'fixed',
        bottom: 100,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        pointerEvents: 'none',
      }}
    >
      {/* Instructions */}
      <Zoom in>
        <Box
          sx={{
            bgcolor: alpha('#000', 0.9),
            backdropFilter: `blur(${blurValues.sm})`,
            borderRadius: 3,
            px: 3,
            py: 2,
            maxWidth: 300,
            textAlign: 'center',
            border: `1px solid ${alpha(emeraldCore.primary, 0.3)}`,
            boxShadow: `0 8px 32px ${alpha('#000', 0.3)}`,
            pointerEvents: 'auto',
          }}
        >
          <Typography
            sx={{
              color: 'white',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            <strong>📸 Navega al problema</strong>
            <br />
            Cuando estés listo, toca el botón para capturar.
          </Typography>
        </Box>
      </Zoom>

      {/* Buttons */}
      <Box sx={{ display: 'flex', gap: 2, pointerEvents: 'auto' }}>
        {/* Cancel button */}
        <Tooltip title="Cancelar" placement="top">
          <Fab
            size="medium"
            onClick={onCancel}
            sx={{
              bgcolor: alpha('#fff', 0.1),
              color: 'white',
              '&:hover': {
                bgcolor: alpha('#fff', 0.2),
              },
            }}
          >
            <CloseIcon />
          </Fab>
        </Tooltip>

        {/* Capture button */}
        <Tooltip title="Capturar pantalla" placement="top">
          <Fab
            size="large"
            onClick={handleCapture}
            disabled={isCapturing}
            sx={{
              bgcolor: emeraldCore.primary,
              color: 'white',
              width: 72,
              height: 72,
              '&:hover': {
                bgcolor: emeraldCore.dark,
              },
              '&:disabled': {
                bgcolor: alpha(emeraldCore.primary, 0.7),
                color: 'white',
              },
              boxShadow: `0 4px 20px ${alpha(emeraldCore.primary, 0.5)}`,
              animation: isCapturing ? 'none' : 'pulse-capture 2s infinite',
              '@keyframes pulse-capture': {
                '0%': {
                  boxShadow: `0 4px 20px ${alpha(emeraldCore.primary, 0.5)}`,
                },
                '50%': {
                  boxShadow: `0 4px 30px ${alpha(emeraldCore.primary, 0.8)}`,
                },
                '100%': {
                  boxShadow: `0 4px 20px ${alpha(emeraldCore.primary, 0.5)}`,
                },
              },
            }}
          >
            {isCapturing ? (
              <CircularProgress size={32} color="inherit" />
            ) : (
              <CameraAltIcon sx={{ fontSize: 32 }} />
            )}
          </Fab>
        </Tooltip>
      </Box>
    </Box>
  );
}
