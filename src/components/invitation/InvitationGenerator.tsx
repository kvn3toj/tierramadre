/**
 * InvitationGenerator Component
 *
 * Modal for Embajadores/Admins to generate shareable guest access links.
 * Links are valid for 24 hours after the guest first opens them.
 * Supports pricing mode toggle (with/without prices).
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
  ToggleButton,
  ToggleButtonGroup,
  Slider,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  QrCode2 as QrCodeIcon,
  LinkOutlined as LinkIcon,
  CheckCircle as CheckIcon,
  AttachMoney as PriceIcon,
  CurrencyExchange as CurrencyIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { useInvitation } from '../../hooks/useInvitation';
import { brand, legacyTypography as typography, cssTransition } from '../../design-system';
import type { PricingMode, GuestCurrencyMode, GuestMultiplier } from '../../types/invitation';

interface InvitationGeneratorProps {
  open: boolean;
  onClose: () => void;
}

export default function InvitationGenerator({ open, onClose }: InvitationGeneratorProps) {
  const { generateInvitation, clearLastInvitation, isGenerating, error, lastInvitation } = useInvitation();
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Form state
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [showPrices, setShowPrices] = useState(true);
  const [guestCurrency, setGuestCurrency] = useState<GuestCurrencyMode>('COP');
  const [guestMultiplier, setGuestMultiplier] = useState<GuestMultiplier>(4);
  const [formError, setFormError] = useState('');

  const isFormValid = guestName.trim().length > 0 && (guestEmail.trim().length > 0 || guestPhone.trim().length > 0);

  const handleGenerate = async () => {
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
    const contactInfo = guestEmail.trim() || guestPhone.trim();
    const contactType = guestEmail.trim() ? 'email' : 'phone';

    await generateInvitation({
      pricingMode,
      guestName: guestName.trim(),
      guestContact: contactInfo,
      contactType,
      ...(showPrices && { guestCurrencyMode: guestCurrency }),
      ...(showPrices && guestCurrency === 'USD' && { guestMultiplier }),
    });
  };

  const handleGenerateNew = () => {
    clearLastInvitation();
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setShowPrices(true);
    setGuestCurrency('COP');
    setGuestMultiplier(4);
    setShowQR(false);
    setFormError('');
    setCopiedPin(false);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setSnackbarMessage('Enlace copiado al portapapeles');
      setSnackbarOpen(true);
    } catch {
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

  const handleCopyPin = async () => {
    if (lastInvitation?.pin) {
      try {
        await navigator.clipboard.writeText(lastInvitation.pin);
      } catch {
        const textArea = document.createElement('textarea');
        textArea.value = lastInvitation.pin;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
      setSnackbarMessage('PIN copiado al portapapeles');
      setSnackbarOpen(true);
    }
  };

  const handleShare = async () => {
    const shareUrl = lastInvitation?.url;
    if (shareUrl && 'share' in navigator) {
      const pin = lastInvitation?.pin;
      const pinLine = pin ? `\n\nTu PIN de acceso: ${pin}` : '';
      const shareText = `Hola ${guestName}, te invito a explorar nuestra coleccion de esmeraldas colombianas. Este enlace es valido por 24 horas.\n\n${shareUrl}${pinLine}`;
      try {
        await navigator.share({
          title: 'Tierra Madre - Invitacion',
          text: shareText,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopy();
    }
  };

  const handleClose = () => {
    setShowQR(false);
    onClose();
  };

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
            borderRadius: '20px',
            maxHeight: '90vh',
            overflow: 'hidden',
          },
        }}
      >
        {/* ─── Header ─── */}
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${brand.emerald[50]}`,
                border: '1px solid',
                borderColor: brand.emerald[200],
              }}
            >
              <LinkIcon sx={{ color: brand.emerald[600], fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={typography.weight.semibold}>
              Invitar a Explorar
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.5 }}>
            Genera un enlace de acceso temporal para que tus clientes exploren
            nuestra coleccion de esmeraldas colombianas.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>
          )}
          {formError && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: '12px' }}>{formError}</Alert>
          )}

          {/* ─── PHASE 1: Form ─── */}
          {!lastInvitation ? (
            <Box>
              {/* Guest name */}
              <TextField
                fullWidth
                label="Nombre del invitado"
                placeholder="Maria Garcia"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                size="small"
                inputProps={{ autoComplete: 'name' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" sx={{ color: guestName ? brand.emerald[600] : 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />

              {/* Contact fields */}
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Contacto (al menos uno)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label="Email"
                  placeholder="maria@email.com"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  size="small"
                  inputProps={{ autoComplete: 'email' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon fontSize="small" sx={{ color: guestEmail ? brand.emerald[600] : 'text.disabled' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
                <TextField
                  fullWidth
                  label="Telefono"
                  placeholder="+57 300 123 4567"
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  size="small"
                  inputProps={{ autoComplete: 'tel' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon fontSize="small" sx={{ color: guestPhone ? brand.emerald[600] : 'text.disabled' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Box>

              {/* Pricing toggle */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.5,
                  mb: 3,
                  borderRadius: '14px',
                  border: '1px solid',
                  borderColor: showPrices ? brand.emerald[200] : 'divider',
                  bgcolor: showPrices ? `${brand.emerald[50]}60` : 'transparent',
                  transition: cssTransition.default,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: showPrices ? brand.emerald[100] : 'action.hover',
                      transition: cssTransition.default,
                    }}
                  >
                    <PriceIcon fontSize="small" sx={{ color: showPrices ? brand.emerald[600] : 'text.disabled' }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={typography.weight.medium} sx={{ lineHeight: 1.3 }}>
                      {showPrices ? 'Con precios' : 'Solo informacion'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {showPrices ? 'El invitado vera los precios' : 'Solo caracteristicas, sin precios'}
                    </Typography>
                  </Box>
                </Box>
                <Switch
                  checked={showPrices}
                  onChange={(e) => setShowPrices(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: brand.emerald[600] },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: brand.emerald[400] },
                  }}
                />
              </Box>

              {/* Guest Currency Selection - Only when prices are ON */}
              {showPrices && (
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    mb: 3,
                    borderRadius: '14px',
                    border: '1px solid',
                    borderColor: guestCurrency === 'USD' ? brand.emerald[200] : 'divider',
                    bgcolor: guestCurrency === 'USD' ? `${brand.emerald[50]}40` : 'transparent',
                    transition: cssTransition.default,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: guestCurrency === 'USD' ? brand.emerald[100] : 'action.hover',
                        transition: cssTransition.default,
                      }}
                    >
                      <CurrencyIcon fontSize="small" sx={{ color: guestCurrency === 'USD' ? brand.emerald[600] : 'text.disabled' }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={typography.weight.medium} sx={{ lineHeight: 1.3 }}>
                        Moneda del invitado
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {guestCurrency === 'COP' ? 'Pesos colombianos' : `Dolares (x${guestMultiplier})`}
                      </Typography>
                    </Box>
                  </Box>

                  <ToggleButtonGroup
                    value={guestCurrency}
                    exclusive
                    onChange={(_e, val) => { if (val !== null) setGuestCurrency(val as GuestCurrencyMode); }}
                    fullWidth
                    size="small"
                    sx={{
                      mb: guestCurrency === 'USD' ? 1.5 : 0,
                      '& .MuiToggleButton-root': {
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        py: 0.75,
                        borderColor: 'divider',
                        '&.Mui-selected': {
                          backgroundColor: `${brand.emerald[50]}`,
                          color: brand.emerald[700],
                          borderColor: brand.emerald[300],
                          '&:hover': { backgroundColor: brand.emerald[100] },
                        },
                      },
                    }}
                  >
                    <ToggleButton value="COP">COP</ToggleButton>
                    <ToggleButton value="USD">USD</ToggleButton>
                  </ToggleButtonGroup>

                  {/* Multiplier slider - only when USD */}
                  {guestCurrency === 'USD' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1 }}>
                      <Slider
                        value={guestMultiplier}
                        onChange={(_e, val) => setGuestMultiplier(val as number)}
                        min={1}
                        max={4}
                        step={0.1}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(v) => `x${v}`}
                        sx={{
                          color: brand.emerald[700],
                          '& .MuiSlider-thumb': { width: 20, height: 20 },
                          '& .MuiSlider-valueLabel': { fontSize: '0.75rem' },
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: brand.emerald[700],
                          minWidth: 28,
                          textAlign: 'right',
                        }}
                      >
                        x{guestMultiplier}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* Generate button */}
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleGenerate}
                disabled={isGenerating || !isFormValid}
                startIcon={isGenerating ? <CircularProgress size={20} /> : <LinkIcon />}
                sx={{
                  background: `linear-gradient(135deg, ${brand.emerald[600]} 0%, ${brand.emerald[700]} 100%)`,
                  '&:hover': { background: `linear-gradient(135deg, ${brand.emerald[500]} 0%, ${brand.emerald[600]} 100%)` },
                  '&:disabled': { opacity: 0.4 },
                  py: 1.5,
                  borderRadius: '14px',
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: `0 4px 16px ${brand.emerald[600]}40`,
                }}
              >
                {isGenerating ? 'Generando...' : 'Generar Enlace'}
              </Button>
            </Box>
          ) : (
            /* ─── PHASE 2: Success ─── */
            <Box>
              {/* Success banner */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 2,
                  mb: 2.5,
                  borderRadius: '14px',
                  bgcolor: `${brand.emerald[50]}`,
                  border: '1px solid',
                  borderColor: brand.emerald[200],
                }}
              >
                <CheckIcon sx={{ color: brand.emerald[600], fontSize: 24 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={typography.weight.semibold} noWrap>
                    Enlace generado para {guestName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Valido por 24 horas desde que lo abra
                  </Typography>
                </Box>
              </Box>

              {/* URL field */}
              <TextField
                fullWidth
                value={lastInvitation.url}
                InputProps={{
                  readOnly: true,
                  sx: {
                    fontFamily: typography.fontFamily.mono,
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    bgcolor: 'action.hover',
                    borderRadius: '12px',
                  },
                  endAdornment: (
                    <IconButton onClick={handleCopy} size="small">
                      {copied ? (
                        <CheckIcon sx={{ color: brand.emerald[600], fontSize: 18 }} />
                      ) : (
                        <CopyIcon sx={{ fontSize: 18 }} />
                      )}
                    </IconButton>
                  ),
                }}
                size="small"
                sx={{ mb: 1.5 }}
              />

              {/* PIN — compact inline bar */}
              {lastInvitation.pin && (
                <Box
                  onClick={handleCopyPin}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    px: 2,
                    mb: 2,
                    borderRadius: '12px',
                    bgcolor: `${brand.emerald[50]}`,
                    border: '1px solid',
                    borderColor: brand.emerald[200],
                    cursor: 'pointer',
                    transition: cssTransition.fast,
                    '&:hover': {
                      borderColor: brand.emerald[400],
                      boxShadow: `0 0 0 1px ${brand.emerald[200]}`,
                    },
                    '&:active': { transform: 'scale(0.99)' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, minWidth: 64 }}
                    >
                      PIN de acceso
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                      {lastInvitation.pin.split('').map((digit, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 32,
                            height: 36,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: brand.emerald[100],
                            border: '1px solid',
                            borderColor: brand.emerald[300],
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '1.1rem',
                              color: brand.emerald[800],
                              lineHeight: 1,
                            }}
                          >
                            {digit}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: brand.emerald[600] }}>
                    {copiedPin ? (
                      <CheckIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <CopyIcon sx={{ fontSize: 16 }} />
                    )}
                    <Typography variant="caption" fontWeight={500}>
                      {copiedPin ? 'Copiado' : 'Copiar'}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Hint */}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 2, textAlign: 'center', opacity: 0.7, fontSize: '0.7rem' }}
              >
                Comparte el PIN por separado (WhatsApp, llamada, etc.)
              </Typography>

              {/* Summary tags */}
              <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
                {[
                  {
                    icon: <PriceIcon sx={{ fontSize: 14 }} />,
                    label: lastInvitation.pricingMode === 'with_prices' ? 'Con precios' : 'Sin precios',
                    active: lastInvitation.pricingMode === 'with_prices',
                  },
                  ...(lastInvitation.guestCurrencyMode ? [{
                    icon: <CurrencyIcon sx={{ fontSize: 14 }} />,
                    label: lastInvitation.guestCurrencyMode === 'USD'
                      ? `USD x${lastInvitation.guestMultiplier || 4}`
                      : 'COP',
                    active: lastInvitation.guestCurrencyMode === 'USD',
                  }] : []),
                  ...(guestEmail ? [{ icon: <EmailIcon sx={{ fontSize: 14 }} />, label: guestEmail, active: false }] : []),
                  ...(guestPhone ? [{ icon: <PhoneIcon sx={{ fontSize: 14 }} />, label: guestPhone, active: false }] : []),
                ].map((tag, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1.25,
                      py: 0.4,
                      borderRadius: '8px',
                      bgcolor: tag.active ? `${brand.emerald[50]}` : 'action.hover',
                      border: '1px solid',
                      borderColor: tag.active ? brand.emerald[200] : 'divider',
                      color: tag.active ? brand.emerald[700] : 'text.secondary',
                    }}
                  >
                    {tag.icon}
                    <Typography variant="caption" fontWeight={tag.active ? 500 : 400} noWrap sx={{ maxWidth: 140 }}>
                      {tag.label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Action buttons */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<CopyIcon sx={{ fontSize: '18px !important' }} />}
                  onClick={handleCopy}
                  sx={{
                    flex: 1,
                    background: `linear-gradient(135deg, ${brand.emerald[600]} 0%, ${brand.emerald[700]} 100%)`,
                    '&:hover': { background: `linear-gradient(135deg, ${brand.emerald[500]} 0%, ${brand.emerald[600]} 100%)` },
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1,
                  }}
                >
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
                {'share' in navigator && (
                  <Button
                    variant="outlined"
                    startIcon={<ShareIcon sx={{ fontSize: '18px !important' }} />}
                    onClick={handleShare}
                    sx={{
                      flex: 1,
                      borderRadius: '12px',
                      textTransform: 'none',
                      fontWeight: 500,
                      py: 1,
                      borderColor: 'divider',
                    }}
                  >
                    Compartir
                  </Button>
                )}
                <IconButton
                  onClick={() => setShowQR(!showQR)}
                  sx={{
                    border: '1px solid',
                    borderColor: showQR ? brand.emerald[300] : 'divider',
                    borderRadius: '12px',
                    bgcolor: showQR ? `${brand.emerald[50]}` : 'transparent',
                    width: 42,
                    height: 42,
                  }}
                >
                  <QrCodeIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Box>

              {showQR && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    p: 2.5,
                    mt: 1.5,
                    bgcolor: 'white',
                    borderRadius: '14px',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <QRCodeSVG
                    value={qrUrl}
                    size={160}
                    level="M"
                    includeMargin
                    fgColor={brand.emerald[800]}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          {lastInvitation && (
            <Button
              onClick={handleGenerateNew}
              disabled={isGenerating}
              startIcon={<LinkIcon sx={{ fontSize: '18px !important' }} />}
              sx={{ color: brand.emerald[600], textTransform: 'none', fontWeight: 500 }}
            >
              Nuevo Enlace
            </Button>
          )}
          <Button onClick={handleClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 500 }}>
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
