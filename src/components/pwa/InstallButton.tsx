import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import GetAppIcon from '@mui/icons-material/GetApp';
import IosShareIcon from '@mui/icons-material/IosShare';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { cssTransition } from '../../design-system';

interface InstallButtonProps {
  variant?: 'button' | 'card' | 'minimal';
  fullWidth?: boolean;
}

export default function InstallButton({ variant = 'button', fullWidth = false }: InstallButtonProps) {
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  // If already installed, show a subtle "installed" state or hide
  if (isInstalled) {
    if (variant === 'minimal') return null;

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          borderRadius: 2,
          bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
          color: 'success.main',
        }}
      >
        <CheckCircleIcon fontSize="small" />
        <Typography variant="body2" fontWeight={500}>
          App instalada
        </Typography>
      </Box>
    );
  }

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSDialog(true);
    } else if (canInstall) {
      await install();
    } else {
      // Fallback: show instructions dialog
      setShowIOSDialog(true);
    }
  };

  // Card variant - larger, more prominent
  if (variant === 'card') {
    return (
      <>
        <Box
          onClick={handleClick}
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
            border: '2px dashed',
            borderColor: 'primary.main',
            cursor: 'pointer',
            transition: cssTransition.default,
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
              transform: 'scale(1.02)',
            },
            '&:active': {
              transform: 'scale(0.98)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'white',
              }}
            >
              <GetAppIcon fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Instalar Tierra Madre
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Acceso rápido desde tu pantalla de inicio
              </Typography>
            </Box>
          </Box>
        </Box>
        <IOSInstructionsDialog open={showIOSDialog} onClose={() => setShowIOSDialog(false)} />
      </>
    );
  }

  // Minimal variant - just icon button
  if (variant === 'minimal') {
    return (
      <>
        <IconButton
          onClick={handleClick}
          sx={{
            color: 'primary.main',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
            },
          }}
        >
          <GetAppIcon />
        </IconButton>
        <IOSInstructionsDialog open={showIOSDialog} onClose={() => setShowIOSDialog(false)} />
      </>
    );
  }

  // Default button variant
  return (
    <>
      <Button
        variant="contained"
        startIcon={<GetAppIcon />}
        onClick={handleClick}
        fullWidth={fullWidth}
        sx={{
          py: 1.5,
          px: 3,
          borderRadius: 2,
          fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0, 174, 122, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 25px rgba(0, 174, 122, 0.4)',
          },
        }}
      >
        Instalar App
      </Button>
      <IOSInstructionsDialog open={showIOSDialog} onClose={() => setShowIOSDialog(false)} />
    </>
  );
}

// iOS Instructions Dialog
function IOSInstructionsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: 'background.paper',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={600}>
            Instalar Tierra Madre
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Step 1 */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              }}
            >
              <IosShareIcon />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                1. Toca el botón Compartir
              </Typography>
              <Typography variant="body2" color="text.secondary">
                En Safari, busca el icono de compartir en la barra inferior
              </Typography>
            </Box>
          </Box>

          {/* Step 2 */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              }}
            >
              <AddBoxOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                2. Añadir a pantalla de inicio
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Desplázate y selecciona "Añadir a pantalla de inicio"
              </Typography>
            </Box>
          </Box>

          {/* Step 3 */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              }}
            >
              <CheckCircleIcon />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                3. Confirmar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Toca "Añadir" y listo. La app aparecerá en tu inicio
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} variant="outlined" fullWidth sx={{ borderRadius: 2 }}>
          Entendido
        </Button>
      </DialogActions>
    </Dialog>
  );
}
