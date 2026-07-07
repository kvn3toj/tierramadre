/**
 * InvitationGenerator Component
 *
 * Modal for staff to generate shareable guest access links.
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
import { useLanguage } from '../../contexts/LanguageContext';
import {
  brand,
  legacyTypography as typography,
  cssTransition,
  fontWeights,
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
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 0.5,
          }}
        >
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
              {inv.title}
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2.5, lineHeight: 1.5 }}
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
                borderRadius: '3px',
                bgcolor: lastInvitation
                  ? brand.emerald[300]
                  : brand.emerald[500],
                transition: cssTransition.default,
              }}
            />
            <Box
              sx={{
                width: lastInvitation ? 24 : 8,
                height: 6,
                borderRadius: '3px',
                bgcolor: lastInvitation ? brand.emerald[500] : 'divider',
                transition: cssTransition.default,
              }}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
              {error}
            </Alert>
          )}
          {formError && (
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '12px' }}>
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
                        sx={{
                          color: guestName
                            ? brand.emerald[600]
                            : 'text.disabled',
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 2.5,
                  '& .MuiOutlinedInput-root': { borderRadius: '12px' },
                }}
              />

              {/* Contact fields — grouped card */}
              <Box
                sx={{
                  border: '1px solid',
                  borderColor:
                    guestEmail || guestPhone ? brand.emerald[200] : 'divider',
                  borderRadius: '12px',
                  p: 1.5,
                  mb: 2.5,
                  transition: cssTransition.default,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, color: 'text.secondary' }}
                  >
                    {inv.contact}
                  </Typography>
                  <Box
                    sx={{
                      fontSize: '0.65rem',
                      color: 'text.disabled',
                      bgcolor: 'action.hover',
                      px: 0.75,
                      py: 0.15,
                      borderRadius: '4px',
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
                            sx={{
                              color: guestEmail
                                ? brand.emerald[600]
                                : 'text.disabled',
                            }}
                          />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: '12px' },
                    }}
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
                            sx={{
                              color: guestPhone
                                ? brand.emerald[600]
                                : 'text.disabled',
                            }}
                          />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: '12px' },
                    }}
                  />
                </Box>
              </Box>

              {/* Divider before pricing section */}
              <Box
                sx={{
                  height: '1px',
                  bgcolor: 'divider',
                  mb: 2.5,
                  opacity: 0.6,
                }}
              />

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
                      color: showPrices ? brand.emerald[600] : 'text.disabled',
                      transition: cssTransition.default,
                    }}
                  />
                  <Typography
                    variant="body2"
                    fontWeight={typography.weight.medium}
                  >
                    {inv.showPrices}
                  </Typography>
                </Box>
                <Switch
                  checked={showPrices}
                  onChange={(e) => setShowPrices(e.target.checked)}
                  inputProps={{ 'aria-label': inv.showPricesAria }}
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

              {/* Currency + Multiplier — indented sub-settings */}
              {showPrices && (
                <Box
                  sx={{
                    pl: 2.5,
                    ml: 0.75,
                    mb: 2.5,
                    borderLeft: '2px solid',
                    borderColor: brand.emerald[200],
                    transition: cssTransition.default,
                  }}
                >
                  {/* Currency selector row */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, minWidth: 52 }}
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
                          textTransform: 'none',
                          fontWeight: fontWeights.semibold,
                          fontSize: '0.78rem',
                          py: 0.5,
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
                  </Box>

                  {/* Multiplier label + value badge */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 0.25,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500 }}
                    >
                      {inv.priceMultiplier}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.8rem',
                        fontWeight: fontWeights.bold,
                        color: brand.emerald[700],
                        bgcolor: `${brand.emerald[50]}`,
                        px: 1,
                        py: 0.1,
                        borderRadius: '6px',
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
                    <Typography
                      sx={{ fontSize: '0.68rem', color: 'text.disabled' }}
                    >
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
                        color: brand.emerald[700],
                        '& .MuiSlider-thumb': { width: 18, height: 18 },
                        '& .MuiSlider-valueLabel': { fontSize: '0.72rem' },
                      }}
                    />
                    <Typography
                      sx={{ fontSize: '0.68rem', color: 'text.disabled' }}
                    >
                      x4
                    </Typography>
                  </Box>

                  {/* Live price preview */}
                  <Box
                    sx={{
                      mt: 1,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: '8px',
                      bgcolor: 'action.hover',
                      border: '1px dashed',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography
                      sx={{ fontSize: '0.7rem', color: 'text.secondary' }}
                    >
                      {inv.priceExample} {guestCurrency} &rarr;
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.78rem',
                        fontWeight: fontWeights.semibold,
                        color: 'text.primary',
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
                onClick={handleGenerate}
                disabled={isGenerating || !isFormValid}
                startIcon={
                  isGenerating ? <CircularProgress size={20} /> : <LinkIcon />
                }
                sx={{
                  background: `linear-gradient(135deg, ${brand.emerald[600]} 0%, ${brand.emerald[700]} 100%)`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${brand.emerald[500]} 0%, ${brand.emerald[600]} 100%)`,
                  },
                  '&:disabled': { opacity: 0.4 },
                  py: 1.5,
                  borderRadius: '14px',
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: `0 4px 16px ${brand.emerald[600]}40`,
                }}
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
                  borderRadius: '14px',
                  bgcolor: `${brand.emerald[50]}`,
                  border: '1px solid',
                  borderColor: brand.emerald[200],
                }}
              >
                <CheckIcon sx={{ color: brand.emerald[600], fontSize: 24 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    fontWeight={typography.weight.semibold}
                    noWrap
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
                    fontFamily: typography.fontFamily.mono,
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    bgcolor: 'action.hover',
                    borderRadius: '12px',
                  },
                  endAdornment: (
                    <IconButton onClick={handleCopy} size="small">
                      {copied ? (
                        <CheckIcon
                          sx={{ color: brand.emerald[600], fontSize: 18 }}
                        />
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
                    '&:focus-visible': {
                      outline: `2px solid ${brand.emerald[500]}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, minWidth: 64 }}
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
                            aria-hidden
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
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: brand.emerald[600],
                    }}
                  >
                    {copiedPin ? (
                      <CheckIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <CopyIcon sx={{ fontSize: 16 }} />
                    )}
                    <Typography variant="caption" fontWeight={500}>
                      {copiedPin ? inv.copied : inv.copy}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Hint — WCAG AA compliant contrast */}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  mb: 2.5,
                  textAlign: 'center',
                  fontSize: '0.75rem',
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
                      borderRadius: '8px',
                      bgcolor: tag.active
                        ? `${brand.emerald[50]}`
                        : 'action.hover',
                      border: '1px solid',
                      borderColor: tag.active ? brand.emerald[200] : 'divider',
                      color: tag.active ? brand.emerald[700] : 'text.secondary',
                    }}
                  >
                    {tag.icon}
                    <Typography
                      variant="caption"
                      fontWeight={tag.active ? 500 : 400}
                      noWrap
                      sx={{ maxWidth: 140 }}
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
                  startIcon={<CopyIcon sx={{ fontSize: '18px !important' }} />}
                  onClick={handleCopy}
                  sx={{
                    flex: 1,
                    background: `linear-gradient(135deg, ${brand.emerald[600]} 0%, ${brand.emerald[700]} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${brand.emerald[500]} 0%, ${brand.emerald[600]} 100%)`,
                    },
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1,
                  }}
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
                      borderRadius: '12px',
                      textTransform: 'none',
                      fontWeight: 500,
                      py: 1,
                      borderColor: 'divider',
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
              sx={{
                color: brand.emerald[600],
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              {inv.newLink}
            </Button>
          )}
          <Button
            onClick={handleClose}
            color="inherit"
            sx={{ textTransform: 'none', fontWeight: 500 }}
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
