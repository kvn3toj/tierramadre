/**
 * InvitationGenerator Component
 *
 * Modal for Embajadores/Admins to generate shareable guest access links.
 * Links are valid for 24 hours after the guest first opens them.
 * Supports pricing mode toggle (with/without prices).
 * Generates short links for easier sharing.
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
  Switch,
  InputAdornment,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  QrCode2 as QrCodeIcon,
  LinkOutlined as LinkIcon,
  CheckCircle as CheckIcon,
  AttachMoney as PriceIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { useInvitation } from '../../hooks/useInvitation';
import { brand, typography } from '../../design-system';
import type { PricingMode } from '../../types/invitation';

interface InvitationGeneratorProps {
  open: boolean;
  onClose: () => void;
}

export default function InvitationGenerator({ open, onClose }: InvitationGeneratorProps) {
  const { generateInvitation, clearLastInvitation, isGenerating, error, lastInvitation } = useInvitation();
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Form state
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [showPrices, setShowPrices] = useState(true);
  const [formError, setFormError] = useState('');

  // Validation: name required, and at least one of email or phone
  const isFormValid = guestName.trim().length > 0 && (guestEmail.trim().length > 0 || guestPhone.trim().length > 0);

  const handleGenerate = async () => {
    // Validate
    if (!guestName.trim()) {
      setFormError('El nombre es requerido');
      return;
    }
    if (!guestEmail.trim() && !guestPhone.trim()) {
      setFormError('Ingresa al menos un email o telefono');
      return;
    }

    setFormError('');
    const pricingMode: PricingMode = showPrices ? 'with_prices' : 'no_prices';

    // Determine contact info - prefer email if both provided
    const contactInfo = guestEmail.trim() || guestPhone.trim();
    const contactType = guestEmail.trim() ? 'email' : 'phone';

    await generateInvitation({
      pricingMode,
      guestName: guestName.trim(),
      guestContact: contactInfo,
      contactType,
    });
  };

  const handleGenerateNew = () => {
    // Clear the last invitation from hook state (this shows the form again)
    clearLastInvitation();
    // Reset form state
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setShowPrices(true);
    setShowQR(false);
    setFormError('');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setSnackbarMessage('Enlace copiado al portapapeles');
      setSnackbarOpen(true);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setSnackbarMessage('Enlace copiado al portapapeles');
      setSnackbarOpen(true);
    }
  };

  const handleCopy = async () => {
    if (lastInvitation?.url) {
      await copyToClipboard(lastInvitation.url);
    }
  };

  const handleShare = async () => {
    const shareUrl = lastInvitation?.url;
    if (shareUrl && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'Tierra Madre - Invitacion',
          text: `Hola ${guestName}, te invito a explorar nuestra coleccion de esmeraldas colombianas. Este enlace es valido por 24 horas.`,
          url: shareUrl,
        });
      } catch {
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

  // Get the URL to display in QR code (prefer short URL)
  const qrUrl = lastInvitation?.url || '';

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
            nuestra coleccion de esmeraldas colombianas.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {formError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          {!lastInvitation ? (
            <Box>
              {/* Guest Info Card */}
              <Box
                sx={{
                  p: 2.5,
                  mb: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={typography.weight.semibold}
                  sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <PersonIcon fontSize="small" sx={{ color: brand.emerald[600] }} />
                  Datos del invitado
                </Typography>

                {/* Guest Name Field */}
                <TextField
                  fullWidth
                  label="Nombre"
                  placeholder="Maria Garcia"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                {/* Contact Fields - Both visible, one required */}
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Al menos uno requerido
                </Typography>

                <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <TextField
                    fullWidth
                    label="Email"
                    placeholder="maria@email.com"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon fontSize="small" sx={{ color: guestEmail ? brand.emerald[600] : 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderColor: guestEmail ? brand.emerald[300] : undefined,
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Teléfono"
                    placeholder="+57 300 123 4567"
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon fontSize="small" sx={{ color: guestPhone ? brand.emerald[600] : 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Box>

              {/* Pricing Mode Toggle */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  mb: 3,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: showPrices ? brand.emerald[200] : 'divider',
                  bgcolor: showPrices ? `${brand.emerald[50]}50` : 'background.paper',
                  transition: 'all 0.2s ease',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: showPrices ? brand.emerald[100] : 'action.hover',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <PriceIcon sx={{ color: showPrices ? brand.emerald[600] : 'text.disabled' }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={typography.weight.medium}>
                      {showPrices ? 'Con precios' : 'Solo informacion'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {showPrices
                        ? 'El invitado vera los precios'
                        : 'Solo caracteristicas, sin precios'}
                    </Typography>
                  </Box>
                </Box>
                <Switch
                  checked={showPrices}
                  onChange={(e) => setShowPrices(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: brand.emerald[600],
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: brand.emerald[400],
                    },
                  }}
                />
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleGenerate}
                disabled={isGenerating || !isFormValid}
                startIcon={isGenerating ? <CircularProgress size={20} /> : <LinkIcon />}
                sx={{
                  bgcolor: brand.emerald[600],
                  '&:hover': { bgcolor: brand.emerald[700] },
                  '&:disabled': { bgcolor: 'action.disabledBackground' },
                  py: 1.5,
                  borderRadius: 2,
                }}
              >
                {isGenerating ? 'Generando...' : 'Generar Enlace'}
              </Button>
            </Box>
          ) : (
            <Box>
              {/* Success Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                  bgcolor: `${brand.emerald[50]}`,
                  border: '1px solid',
                  borderColor: brand.emerald[200],
                }}
              >
                <CheckIcon sx={{ color: brand.emerald[600], fontSize: 28 }} />
                <Box>
                  <Typography variant="body1" fontWeight={typography.weight.semibold}>
                    Enlace generado para {guestName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Valido por 24 horas desde que lo abra
                  </Typography>
                </Box>
              </Box>

              {/* Invitation URL */}
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Enlace de invitacion
              </Typography>
              <TextField
                fullWidth
                value={lastInvitation.url}
                InputProps={{
                  readOnly: true,
                  sx: {
                    fontFamily: typography.fontFamily.mono,
                    fontSize: '0.9rem',
                    fontWeight: typography.weight.semibold,
                    bgcolor: 'background.default',
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

              {/* Summary chips */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  mb: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: lastInvitation.pricingMode === 'with_prices' ? brand.emerald[50] : 'action.hover',
                    border: '1px solid',
                    borderColor: lastInvitation.pricingMode === 'with_prices' ? brand.emerald[200] : 'divider',
                  }}
                >
                  <PriceIcon fontSize="small" sx={{ color: lastInvitation.pricingMode === 'with_prices' ? brand.emerald[600] : 'text.secondary' }} />
                  <Typography variant="caption" fontWeight={500}>
                    {lastInvitation.pricingMode === 'with_prices' ? 'Con precios' : 'Sin precios'}
                  </Typography>
                </Box>
                {guestEmail && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    <Typography variant="caption">{guestEmail}</Typography>
                  </Box>
                )}
                {guestPhone && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <PhoneIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    <Typography variant="caption">{guestPhone}</Typography>
                  </Box>
                )}
              </Box>

              {/* Action buttons */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<CopyIcon />}
                  onClick={handleCopy}
                  sx={{
                    flex: 1,
                    bgcolor: brand.emerald[600],
                    '&:hover': { bgcolor: brand.emerald[700] },
                  }}
                >
                  {copied ? 'Copiado!' : 'Copiar'}
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
                >
                  QR
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
                    value={qrUrl}
                    size={180}
                    level="M"
                    includeMargin
                    fgColor={brand.emerald[800]}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          {lastInvitation && (
            <Button
              onClick={handleGenerateNew}
              disabled={isGenerating}
              startIcon={<LinkIcon />}
              sx={{ color: brand.emerald[600] }}
            >
              Nuevo Enlace
            </Button>
          )}
          <Button onClick={handleClose} color="inherit">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
