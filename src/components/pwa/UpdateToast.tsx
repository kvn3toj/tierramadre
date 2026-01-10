/**
 * UpdateToast Component
 *
 * Shows a toast notification when a new version is available.
 * User can tap to refresh or dismiss.
 */

import React from 'react';
import { Box, Typography, Button, alpha } from '@mui/material';
import { RefreshCw, X } from 'lucide-react';
import { forceRefreshPWA } from '../../utils/pwa';
import { useThemeMode } from '../../contexts/ThemeContext';
import {
  emeraldCore,
  surfacesLight,
  surfacesDark,
} from '../../design-system/tokens/colors';
import {
  iosTypographyScale,
  radius,
  animation,
} from '../../design-system';

interface UpdateToastProps {
  visible: boolean;
  onDismiss: () => void;
}

const UpdateToast: React.FC<UpdateToastProps> = ({ visible, onDismiss }) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const handleUpdate = async () => {
    await forceRefreshPWA();
  };

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: `calc(80px + env(safe-area-inset-bottom))`, // Above tab bar
        left: 16,
        right: 16,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderRadius: radius.lg,
        bgcolor: isLight
          ? surfacesLight.background.primary
          : surfacesDark.background.secondary,
        border: '1px solid',
        borderColor: emeraldCore.primary,
        boxShadow: `0 8px 32px ${alpha(emeraldCore.primary, 0.2)}, 0 4px 16px rgba(0,0,0,0.15)`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        animation: `slideUp 0.3s ${animation.easing.spring}`,
        '@keyframes slideUp': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: alpha(emeraldCore.primary, 0.15),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <RefreshCw size={20} color={emeraldCore.primary} />
      </Box>

      {/* Message */}
      <Box sx={{ flex: 1 }}>
        <Typography
          sx={{
            fontSize: iosTypographyScale.subhead,
            fontWeight: 600,
            color: isLight ? surfacesLight.text.primary : surfacesDark.text.primary,
            mb: 0.25,
          }}
        >
          Nueva version disponible
        </Typography>
        <Typography
          sx={{
            fontSize: iosTypographyScale.footnote,
            color: isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary,
          }}
        >
          Toca para actualizar la app
        </Typography>
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          onClick={handleUpdate}
          variant="contained"
          size="small"
          sx={{
            minWidth: 'auto',
            height: 36,
            px: 2,
            borderRadius: radius.md,
            bgcolor: emeraldCore.primary,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: iosTypographyScale.footnote,
            '&:hover': {
              bgcolor: emeraldCore.dark,
            },
          }}
        >
          Actualizar
        </Button>
        <Button
          onClick={onDismiss}
          variant="text"
          size="small"
          sx={{
            minWidth: 36,
            width: 36,
            height: 36,
            p: 0,
            borderRadius: radius.md,
            color: isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary,
          }}
        >
          <X size={18} />
        </Button>
      </Box>
    </Box>
  );
};

export default UpdateToast;
