/**
 * InvitationGenerator Component
 *
 * Modal for Embajadores/Admins to generate shareable guest access links.
 * Links are valid for 1 hour after the guest first opens them.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  QrCode2 as QrCodeIcon,
  LinkOutlined as LinkIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { useInvitation } from '../../hooks/useInvitation';
import { brand, typography } from '../../design-system';

interface InvitationGeneratorProps {
  open: boolean;
  onClose: () => void;
}

export default function InvitationGenerator({ open, onClose }: InvitationGeneratorProps) {
  const { generateInvitation, isGenerating, error, lastInvitation } = useInvitation();
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleGenerate = async () => {
    await generateInvitation();
  };

  const handleCopy = async () => {
    if (lastInvitation?.url) {
      try {
        await navigator.clipboard.writeText(lastInvitation.url);
        setCopied(true);
        setSnackbarOpen(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = lastInvitation.url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setSnackbarOpen(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleShare = async () => {
    if (lastInvitation?.url && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'Tierra Madre - Invitacion',
          text: 'Te invito a explorar nuestra coleccion de esmeraldas colombianas. Este enlace es valido por 1 hora.',
          url: lastInvitation.url,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  const handleClose = () => {
    setShowQR(false);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinkIcon sx={{ color: brand.emerald[600] }} />
            <Typography variant="h6" fontWeight={typography.weight.semibold}>
              Invitar a Explorar
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Genera un enlace de acceso temporal para que tus clientes exploren
            nuestra coleccion. El enlace sera valido por 1 hora desde que lo abran.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!lastInvitation ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 4,
              }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={handleGenerate}
                disabled={isGenerating}
                startIcon={isGenerating ? <CircularProgress size={20} /> : <LinkIcon />}
                sx={{
                  bgcolor: brand.emerald[600],
                  '&:hover': { bgcolor: brand.emerald[700] },
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                }}
              >
                {isGenerating ? 'Generando...' : 'Generar Enlace'}
              </Button>
            </Box>
          ) : (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Enlace generado exitosamente
              </Alert>

              <TextField
                fullWidth
                value={lastInvitation.url}
                InputProps={{
                  readOnly: true,
                  sx: {
                    fontFamily: typography.fontFamily.mono,
                    fontSize: '0.85rem',
                  },
                  endAdornment: (
                    <IconButton onClick={handleCopy} size="small">
                      {copied ? (
                        <CheckIcon sx={{ color: brand.emerald[600] }} />
                      ) : (
                        <CopyIcon />
                      )}
                    </IconButton>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<CopyIcon />}
                  onClick={handleCopy}
                  sx={{ flex: 1 }}
                >
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
                {'share' in navigator && (
                  <Button
                    variant="outlined"
                    startIcon={<ShareIcon />}
                    onClick={handleShare}
                    sx={{ flex: 1 }}
                  >
                    Compartir
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<QrCodeIcon />}
                  onClick={() => setShowQR(!showQR)}
                  sx={{ flex: 1 }}
                >
                  {showQR ? 'Ocultar QR' : 'Ver QR'}
                </Button>
              </Box>

              {showQR && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    p: 3,
                    bgcolor: 'white',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <QRCodeSVG
                    value={lastInvitation.url}
                    size={200}
                    level="M"
                    includeMargin
                    fgColor={brand.emerald[800]}
                  />
                </Box>
              )}

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 2, textAlign: 'center' }}
              >
                El enlace expirara 1 hora despues de que el invitado lo abra
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          {lastInvitation && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              startIcon={isGenerating ? <CircularProgress size={16} /> : <LinkIcon />}
            >
              Generar Nuevo
            </Button>
          )}
          <Button onClick={handleClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message="Enlace copiado al portapapeles"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
