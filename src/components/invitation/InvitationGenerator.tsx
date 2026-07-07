/**
 * InvitationGenerator Component
 *
 * Modal for staff to generate shareable guest access links.
 * Supports pricing mode toggle (with/without prices).
 *
 * Design language: Quiet Emerald ("Una joya en calma") — grayscale surfaces,
 * a single emerald accent, Cormorant serif title, DM Mono for data.
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
import { alpha } from '@mui/material/styles';
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
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getQuietEmerald,
  qeType,
  qeFont,
  qeRadius,
  qeMotion,
  qeGray,
} from '../../design-system';
import type {
  PricingMode,
  GuestCurrencyMode,
  GuestMultiplier,
} from '../../types/invitation';

interface InvitationGeneratorProps {
  open: boolean;
  onClose: () => void;
}

export default function InvitationGenerator({
  open,
  onClose,
}: InvitationGeneratorProps) {
  const {
    generateInvitation,
    clearLastInvitation,
    isGenerating,
    error,
    lastInvitation,
  } = useInvitation();
  const { t } = useLanguage();
  const inv = t.tools.invitation;
  const { mode } = useTheme();
  const qe = getQuietEmerald(mode);
  const isDark = mode === 'dark';
  /** Emerald tint at a given alpha — the one accent color, applied quietly. */
  const tint = (a: number) => alpha(qe.accent, a);
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

  const isFormValid =
    guestName.trim().length > 0 &&
    (guestEmail.trim().length > 0 || guestPhone.trim().length > 0);

  const handleGenerate = async () => {
    if (!guestName.trim()) {
      setFormError(inv.nameRequired);
      return;
    }
    if (!guestEmail.trim() && !guestPhone.trim()) {
      setFormError(inv.contactRequired);
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
      ...(showPrices && { guestMultiplier }),
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
      setSnackbarMessage(inv.linkCopied);
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
      setSnackbarMessage(inv.linkCopied);
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
      setSnackbarMessage(inv.pinCopied);
      setSnackbarOpen(true);
    }
  };

  const handleShare = async () => {
    const shareUrl = lastInvitation?.url;
    if (shareUrl && 'share' in navigator) {
      const pin = lastInvitation?.pin;
      const pinLine = pin
        ? `\n\n${inv.sharePinLine.replace('{pin}', pin)}`
        : '';
      const shareBody = `${inv.shareText.replace('{name}', guestName)}\n\n${shareUrl}${pinLine}`;
      try {
        await navigator.share({
          title: inv.shareTitle,
          text: shareBody,
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
  const firstName = guestName.trim().split(' ')[0];

  const ease = `${qeMotion.base} ${qeMotion.ease}`;
  const easeFast = `${qeMotion.fast} ${qeMotion.ease}`;

  // Shared input styling — quiet neutral borders, emerald on focus.
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: qeRadius.md,
      transition: `border-color ${easeFast}`,
      '& fieldset': { borderColor: qe.border },
      '&:hover fieldset': { borderColor: tint(0.45) },
      '&.Mui-focused fieldset': {
        borderColor: qe.accent,
        borderWidth: '1.5px',
      },
    },
    '& .MuiInputLabel-root': { color: qe.subtle },
    '& label.Mui-focused': { color: qe.accent },
    '& .MuiInputBase-input': { color: qe.text },
    '& .MuiInputBase-input::placeholder': { color: qe.subtle, opacity: 1 },
  } as const;

  // Primary action — solid accent-strong fill, no loud gradient/glow.
  const primaryButtonSx = {
    bgcolor: qe.accentStrong,
    color: qe.onAccent,
    borderRadius: qeRadius.lg,
    textTransform: 'none' as const,
    fontFamily: qeFont.ui,
    fontWeight: 600,
    letterSpacing: '0.01em',
    boxShadow: `0 8px 22px -14px ${alpha(qe.accentStrong, 0.9)}`,
    transition: `background-color ${easeFast}, box-shadow ${easeFast}`,
    '&:hover': {
      bgcolor: qe.accent,
      boxShadow: `0 10px 26px -14px ${alpha(qe.accentStrong, 0.9)}`,
    },
    '&:disabled': {
      bgcolor: qe.accentStrong,
      color: qe.onAccent,
      opacity: 0.35,
    },
  } as const;

  const switchSx = {
    '& .MuiSwitch-switchBase.Mui-checked': {
      color: qe.accent,
      '&:hover': { backgroundColor: tint(0.08) },
    },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
      backgroundColor: qe.accent,
    },
  } as const;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: qeRadius.xl,
            maxHeight: '90vh',
            overflow: 'hidden',
            bgcolor: qe.surface,
            color: qe.text,
            backgroundImage: 'none',
            border: `1px solid ${qe.border}`,
            boxShadow: qe.shadow,
          },
        }}
      >
        {/* ─── Header ─── */}
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 0.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: qeRadius.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: tint(0.1),
                border: `1px solid ${tint(0.22)}`,
              }}
            >
              <LinkIcon sx={{ color: qe.accent, fontSize: 19 }} />
            </Box>
            <Typography
              component="h2"
              sx={{ ...qeType.title, fontSize: '1.35rem', color: qe.text }}
            >
              {inv.title}
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{ color: qe.subtle, '&:hover': { color: qe.text } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Typography
            sx={{
              ...qeType.body,
              fontSize: '0.9rem',
              color: qe.muted,
              mb: 2.5,
            }}
          >
            {inv.description}
          </Typography>

          {/* Step indicator */}
          <Box
            sx={{
              display: 'flex',
              gap: 0.75,
              justifyContent: 'center',
              mb: 2.5,
            }}
          >
            <Box
              sx={{
                width: lastInvitation ? 8 : 24,
                height: 6,
                borderRadius: qeRadius.pill,
                bgcolor: lastInvitation ? tint(0.45) : qe.accent,
                transition: `all ${ease}`,
              }}
            />
            <Box
              sx={{
                width: lastInvitation ? 24 : 8,
                height: 6,
                borderRadius: qeRadius.pill,
                bgcolor: lastInvitation ? qe.accent : qe.border,
                transition: `all ${ease}`,
              }}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: qeRadius.md }}>
              {error}
            </Alert>
          )}
          {formError && (
            <Alert
              severity="warning"
              sx={{ mb: 2.5, borderRadius: qeRadius.md }}
            >
              {formError}
            </Alert>
          )}

          {/* ─── PHASE 1: Form ─── */}
          {!lastInvitation ? (
            <Box>
              {/* Guest name */}
              <TextField
                fullWidth
                label={inv.guestName}
                placeholder={inv.guestNamePlaceholder}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                size="small"
                inputProps={{ autoComplete: 'name' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon
                        fontSize="small"
                        sx={{ color: guestName ? qe.accent : qe.subtle }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2.5, ...fieldSx }}
              />

              {/* Contact fields — grouped card */}
              <Box
                sx={{
                  border: '1px solid',
                  borderColor:
                    guestEmail || guestPhone ? tint(0.28) : qe.border,
                  borderRadius: qeRadius.md,
                  p: 1.5,
                  mb: 2.5,
                  transition: `border-color ${ease}`,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    mb: 1.25,
                  }}
                >
                  <Typography sx={{ ...qeType.overline, color: qe.muted }}>
                    {inv.contact}
                  </Typography>
                  <Box
                    sx={{
                      ...qeType.spec,
                      color: qe.subtle,
                      bgcolor: qe.well,
                      px: 0.75,
                      py: 0.15,
                      borderRadius: qeRadius.xs,
                    }}
                  >
                    {inv.contactAtLeastOne}
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <TextField
                    fullWidth
                    label="Email"
                    placeholder={inv.emailPlaceholder}
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    size="small"
                    inputProps={{ autoComplete: 'email' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon
                            fontSize="small"
                            sx={{ color: guestEmail ? qe.accent : qe.subtle }}
                          />
                        </InputAdornment>
                      ),
                    }}
                    sx={fieldSx}
                  />
                  <TextField
                    fullWidth
                    label={inv.phoneLabel}
                    placeholder={inv.phonePlaceholder}
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    size="small"
                    inputProps={{ autoComplete: 'tel' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon
                            fontSize="small"
                            sx={{ color: guestPhone ? qe.accent : qe.subtle }}
                          />
                        </InputAdornment>
                      ),
                    }}
                    sx={fieldSx}
                  />
                </Box>
              </Box>

              {/* Divider before pricing section */}
              <Box sx={{ height: '1px', bgcolor: qe.hairline, mb: 2.5 }} />

              {/* Pricing toggle — compact row */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: showPrices ? 1.5 : 2.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PriceIcon
                    fontSize="small"
                    sx={{
                      color: showPrices ? qe.accent : qe.subtle,
                      transition: `color ${ease}`,
                    }}
                  />
                  <Typography
                    sx={{ ...qeType.body, fontWeight: 500, color: qe.text }}
                  >
                    {inv.showPrices}
                  </Typography>
                </Box>
                <Switch
                  checked={showPrices}
                  onChange={(e) => setShowPrices(e.target.checked)}
                  inputProps={{ 'aria-label': inv.showPricesAria }}
                  sx={switchSx}
                />
              </Box>

              {/* Currency + Multiplier — indented sub-settings */}
              {showPrices && (
                <Box
                  sx={{
                    pl: 2.5,
                    ml: 0.75,
                    mb: 2.5,
                    borderLeft: `2px solid ${tint(0.28)}`,
                    transition: `border-color ${ease}`,
                  }}
                >
                  {/* Currency selector row */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      mb: 1.75,
                    }}
                  >
                    <Typography
                      sx={{ ...qeType.overline, color: qe.muted, minWidth: 60 }}
                    >
                      {inv.currency}
                    </Typography>
                    <ToggleButtonGroup
                      value={guestCurrency}
                      exclusive
                      onChange={(_e, val) => {
                        if (val !== null)
                          setGuestCurrency(val as GuestCurrencyMode);
                      }}
                      size="small"
                      aria-label={inv.currencyAria}
                      sx={{
                        flex: 1,
                        maxWidth: 180,
                        '& .MuiToggleButton-root': {
                          fontFamily: qeFont.mono,
                          textTransform: 'none',
                          fontWeight: 500,
                          fontSize: '0.78rem',
                          letterSpacing: '0.02em',
                          py: 0.5,
                          color: qe.muted,
                          borderColor: qe.border,
                          transition: `all ${easeFast}`,
                          '&.Mui-selected': {
                            backgroundColor: tint(0.1),
                            color: qe.accent,
                            borderColor: tint(0.35),
                            '&:hover': { backgroundColor: tint(0.16) },
                          },
                        },
                      }}
                    >
                      <ToggleButton value="COP">COP</ToggleButton>
                      <ToggleButton value="USD">USD</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  {/* Multiplier label + value badge */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 0.5,
                    }}
                  >
                    <Typography sx={{ ...qeType.overline, color: qe.muted }}>
                      {inv.priceMultiplier}
                    </Typography>
                    <Typography
                      sx={{
                        ...qeType.data,
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: qe.accent,
                        bgcolor: tint(0.1),
                        px: 1,
                        py: 0.15,
                        borderRadius: qeRadius.sm,
                        border: `1px solid ${tint(0.22)}`,
                      }}
                    >
                      x{guestMultiplier}
                    </Typography>
                  </Box>

                  {/* Slider with range labels */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 0.25,
                    }}
                  >
                    <Typography sx={{ ...qeType.spec, color: qe.subtle }}>
                      x1
                    </Typography>
                    <Slider
                      value={guestMultiplier}
                      onChange={(_e, val) => setGuestMultiplier(val as number)}
                      min={1}
                      max={4}
                      step={0.1}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `x${v}`}
                      aria-label={inv.priceMultiplier}
                      aria-valuetext={`x${guestMultiplier}`}
                      sx={{
                        color: qe.accent,
                        '& .MuiSlider-rail': { opacity: 1, bgcolor: qe.border },
                        '& .MuiSlider-thumb': {
                          width: 18,
                          height: 18,
                          boxShadow: `0 0 0 2px ${qe.surface}`,
                          '&:hover, &.Mui-focusVisible': {
                            boxShadow: `0 0 0 6px ${tint(0.16)}`,
                          },
                        },
                        '& .MuiSlider-valueLabel': {
                          fontFamily: qeFont.mono,
                          fontSize: '0.72rem',
                          bgcolor: qe.accentStrong,
                          color: qe.onAccent,
                        },
                      }}
                    />
                    <Typography sx={{ ...qeType.spec, color: qe.subtle }}>
                      x4
                    </Typography>
                  </Box>

                  {/* Live price preview */}
                  <Box
                    sx={{
                      mt: 1.25,
                      px: 1.5,
                      py: 0.85,
                      borderRadius: qeRadius.sm,
                      bgcolor: qe.well,
                      border: `1px dashed ${qe.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography sx={{ ...qeType.spec, color: qe.muted }}>
                      {inv.priceExample} {guestCurrency} &rarr;
                    </Typography>
                    <Typography
                      sx={{
                        ...qeType.data,
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: qe.text,
                      }}
                    >
                      {guestCurrency === 'COP'
                        ? `$${(2_000_000 * guestMultiplier).toLocaleString('es-CO')} COP`
                        : `$${Math.round((2_000_000 / 4200) * guestMultiplier).toLocaleString('en-US')} USD`}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Generate button */}
              <Button
                variant="contained"
                size="large"
                fullWidth
                disableElevation
                onClick={handleGenerate}
                disabled={isGenerating || !isFormValid}
                startIcon={
                  isGenerating ? (
                    <CircularProgress size={20} sx={{ color: qe.onAccent }} />
                  ) : (
                    <LinkIcon />
                  )
                }
                sx={{ ...primaryButtonSx, py: 1.5 }}
              >
                {isGenerating
                  ? inv.generating
                  : firstName
                    ? `${inv.createLinkFor} ${firstName}`
                    : inv.generateLink}
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
                  borderRadius: qeRadius.lg,
                  bgcolor: tint(0.08),
                  border: `1px solid ${tint(0.22)}`,
                }}
              >
                <CheckIcon sx={{ color: qe.accentPure, fontSize: 24 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    noWrap
                    sx={{ ...qeType.body, fontWeight: 600, color: qe.text }}
                  >
                    {inv.linkGeneratedFor} {guestName}
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
                    fontFamily: qeFont.mono,
                    fontSize: '0.8rem',
                    color: qe.text,
                    bgcolor: qe.well,
                    borderRadius: qeRadius.md,
                    '& fieldset': { borderColor: qe.border },
                  },
                  endAdornment: (
                    <IconButton onClick={handleCopy} size="small">
                      {copied ? (
                        <CheckIcon sx={{ color: qe.accent, fontSize: 18 }} />
                      ) : (
                        <CopyIcon sx={{ fontSize: 18, color: qe.muted }} />
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
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleCopyPin();
                  }}
                  aria-label={`${inv.pinAccess}: ${lastInvitation.pin.split('').join(' ')}. ${inv.copy}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    px: 2,
                    mb: 2,
                    borderRadius: qeRadius.md,
                    bgcolor: tint(0.08),
                    border: `1px solid ${tint(0.22)}`,
                    cursor: 'pointer',
                    transition: `all ${easeFast}`,
                    '&:hover': {
                      borderColor: tint(0.4),
                      boxShadow: `0 0 0 1px ${tint(0.22)}`,
                    },
                    '&:active': { transform: 'scale(0.99)' },
                    '&:focus-visible': {
                      outline: `2px solid ${qe.accent}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography
                      sx={{ ...qeType.overline, color: qe.muted, minWidth: 64 }}
                    >
                      {inv.pinAccess}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                      {lastInvitation.pin.split('').map((digit, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 32,
                            height: 36,
                            borderRadius: qeRadius.sm,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: tint(0.14),
                            border: `1px solid ${tint(0.3)}`,
                          }}
                        >
                          <Typography
                            aria-hidden
                            sx={{
                              fontFamily: qeFont.mono,
                              fontWeight: 500,
                              fontSize: '1.1rem',
                              color: isDark ? qe.accentPure : qe.accentStrong,
                              lineHeight: 1,
                            }}
                          >
                            {digit}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: qe.accent,
                    }}
                  >
                    {copiedPin ? (
                      <CheckIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <CopyIcon sx={{ fontSize: 16 }} />
                    )}
                    <Typography
                      sx={{
                        ...qeType.body,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      {copiedPin ? inv.copied : inv.copy}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Hint — WCAG AA compliant contrast */}
              <Typography
                sx={{
                  ...qeType.body,
                  display: 'block',
                  mb: 2.5,
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: qe.subtle,
                }}
              >
                {inv.sharePinSeparately}
              </Typography>

              {/* Summary tags */}
              <Box
                sx={{ display: 'flex', gap: 0.75, mb: 2.5, flexWrap: 'wrap' }}
              >
                {[
                  {
                    icon: <PriceIcon sx={{ fontSize: 14 }} />,
                    label:
                      lastInvitation.pricingMode === 'with_prices'
                        ? inv.withPrices
                        : inv.withoutPrices,
                    active: lastInvitation.pricingMode === 'with_prices',
                  },
                  ...(lastInvitation.guestCurrencyMode
                    ? [
                        {
                          icon: <CurrencyIcon sx={{ fontSize: 14 }} />,
                          label:
                            lastInvitation.guestCurrencyMode === 'USD'
                              ? `USD x${lastInvitation.guestMultiplier || 4}`
                              : `COP x${lastInvitation.guestMultiplier || 4}`,
                          active: true,
                        },
                      ]
                    : []),
                  ...(guestEmail
                    ? [
                        {
                          icon: <EmailIcon sx={{ fontSize: 14 }} />,
                          label: guestEmail,
                          active: false,
                        },
                      ]
                    : []),
                  ...(guestPhone
                    ? [
                        {
                          icon: <PhoneIcon sx={{ fontSize: 14 }} />,
                          label: guestPhone,
                          active: false,
                        },
                      ]
                    : []),
                ].map((tag, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1.25,
                      py: 0.4,
                      borderRadius: qeRadius.sm,
                      bgcolor: tag.active ? tint(0.08) : qe.well,
                      border: '1px solid',
                      borderColor: tag.active ? tint(0.22) : qe.border,
                      color: tag.active ? qe.accent : qe.muted,
                    }}
                  >
                    {tag.icon}
                    <Typography
                      noWrap
                      sx={{
                        ...qeType.body,
                        fontSize: '0.75rem',
                        fontWeight: tag.active ? 500 : 400,
                        maxWidth: 140,
                      }}
                    >
                      {tag.label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Action buttons */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  disableElevation
                  startIcon={<CopyIcon sx={{ fontSize: '18px !important' }} />}
                  onClick={handleCopy}
                  sx={{ ...primaryButtonSx, flex: 1, py: 1 }}
                >
                  {copied ? inv.copiedBang : inv.copy}
                </Button>
                {'share' in navigator && (
                  <Button
                    variant="outlined"
                    startIcon={
                      <ShareIcon sx={{ fontSize: '18px !important' }} />
                    }
                    onClick={handleShare}
                    sx={{
                      flex: 1,
                      borderRadius: qeRadius.md,
                      textTransform: 'none',
                      fontFamily: qeFont.ui,
                      fontWeight: 500,
                      py: 1,
                      color: qe.text,
                      borderColor: qe.border,
                      '&:hover': {
                        borderColor: tint(0.45),
                        bgcolor: tint(0.06),
                      },
                    }}
                  >
                    {inv.share}
                  </Button>
                )}
                <IconButton
                  onClick={() => setShowQR(!showQR)}
                  aria-label="QR Code"
                  sx={{
                    border: '1px solid',
                    borderColor: showQR ? tint(0.35) : qe.border,
                    borderRadius: qeRadius.md,
                    bgcolor: showQR ? tint(0.08) : 'transparent',
                    color: showQR ? qe.accent : qe.muted,
                    width: 42,
                    height: 42,
                    transition: `all ${easeFast}`,
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
                    bgcolor: qeGray[0],
                    borderRadius: qeRadius.lg,
                    border: `1px solid ${qe.border}`,
                  }}
                >
                  <QRCodeSVG
                    value={qrUrl}
                    size={160}
                    level="M"
                    includeMargin
                    fgColor={qeGray[900]}
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
              sx={{
                color: qe.accent,
                textTransform: 'none',
                fontFamily: qeFont.ui,
                fontWeight: 500,
                '&:hover': { bgcolor: tint(0.06) },
              }}
            >
              {inv.newLink}
            </Button>
          )}
          <Button
            onClick={handleClose}
            sx={{
              color: qe.muted,
              textTransform: 'none',
              fontFamily: qeFont.ui,
              fontWeight: 500,
              '&:hover': { color: qe.text, bgcolor: qe.well },
            }}
          >
            {t.actions.close}
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
