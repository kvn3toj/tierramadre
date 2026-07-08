/**
 * InvitationPage
 *
 * Handles invitation link validation and grants temporary guest access.
 * "Emerald Vault" — immersive dark luxury experience for guests.
 *
 * Route: /invite/:shortCode (or /g/:shortCode via redirect)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Explore,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useInvitation } from '../hooks/useInvitation';
import { useAuth } from '../hooks/useAuth';
import { INVITATION_STORAGE_KEYS } from '../types/invitation';
import type { ContactType, PricingMode } from '../types/invitation';
import { alpha } from '@mui/material/styles';
import {
  emeraldCore,
  emeraldAlpha,
  whiteAlpha,
  cssTransition,
  primitiveColors,
  zIndex,
  fontWeights,
  qeDark,
  qeAccent,
  qeFont,
} from '../design-system';

// ═══════════════════════════════════════════════════════════════
// VAULT DESIGN TOKENS — Self-contained dark luxury theme
// ═══════════════════════════════════════════════════════════════

const vault = {
  bg: qeDark.base, // #0E1110 flat
  card: qeDark.surface, // #15191A solid (no translucency)
  cardBorder: qeDark.border, // #272C2B hairline
  surface: qeDark.surfaceRaised, // #1B1F1F
  text: qeDark.text, // #EAEDEB
  textMuted: qeDark.textMuted, // #9AA09D
  textDim: qeDark.subtle, // #6B726F
  emerald: qeAccent.dark.accent, // #34C99B
  emeraldGlow: 'none',
  error: primitiveColors.system.red.dark,
  errorDim: 'rgba(255, 69, 58, 0.12)',
  warning: primitiveColors.system.orange.dark,
  warningDim: 'rgba(255, 159, 10, 0.12)',
  serif: qeFont.serif,
  mono: qeFont.mono,
  system: qeFont.ui,
} as const;

// ═══════════════════════════════════════════════════════════════
// SAFE REDIRECT
// ═══════════════════════════════════════════════════════════════

const DEFAULT_REDIRECT = '/treasure';

// Guard against open-redirects: only accept internal app paths. A valid path
// starts with a single '/' (not '//', which is protocol-relative) and has no
// scheme ('://'). Anything else — absolute URLs, protocol-relative hosts,
// missing/empty values — falls back to the default.
export function safeInternalPath(raw: string | null): string {
  if (
    typeof raw === 'string' &&
    raw.startsWith('/') &&
    !raw.startsWith('//') &&
    !raw.includes('://')
  ) {
    return raw;
  }
  return DEFAULT_REDIRECT;
}

// ═══════════════════════════════════════════════════════════════
// ANIMATION
// ═══════════════════════════════════════════════════════════════

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// ═══════════════════════════════════════════════════════════════
// SHARED BUTTON STYLES
// ═══════════════════════════════════════════════════════════════

const emeraldBtnSx = {
  py: 1.5,
  borderRadius: '14px',
  fontSize: '0.95rem',
  fontWeight: fontWeights.semibold,
  fontFamily: vault.system,
  textTransform: 'none' as const,
  background: qeAccent.dark.strong, // #00AF84 solid, no gradient
  color: qeAccent.dark.on, // #06140E
  border: 'none',
  boxShadow: 'none',
  '&:hover': { background: qeAccent.dark.accent },
  '&:disabled': {
    background: emeraldAlpha(0.15),
    color: whiteAlpha(0.3),
    boxShadow: 'none',
  },
};

const ghostBtnSx = {
  py: 1.5,
  borderRadius: '14px',
  fontSize: '0.95rem',
  fontWeight: fontWeights.medium,
  fontFamily: vault.system,
  textTransform: 'none' as const,
  color: vault.textMuted,
  border: `1px solid ${whiteAlpha(0.08)}`,
  bgcolor: whiteAlpha(0.03),
  '&:hover': {
    bgcolor: whiteAlpha(0.06),
    borderColor: whiteAlpha(0.12),
  },
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    color: vault.text,
    borderRadius: '12px',
    bgcolor: whiteAlpha(0.03),
    '& fieldset': { borderColor: whiteAlpha(0.1) },
    '&:hover fieldset': { borderColor: whiteAlpha(0.2) },
    '&.Mui-focused fieldset': { borderColor: vault.emerald },
  },
  '& .MuiInputLabel-root': { color: vault.textMuted },
  '& .MuiInputLabel-root.Mui-focused': { color: vault.emerald },
};

// ═══════════════════════════════════════════════════════════════
// MODULE-LEVEL LAYOUT (prevents remount → fixes mobile keyboard)
// ═══════════════════════════════════════════════════════════════

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: ['100vh', '100dvh'],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: vault.bg,
        p: 3,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 30%, ${emeraldAlpha(0.06)} 0%, transparent 60%)`,
          pointerEvents: 'none',
        },
      }}
    >
      {children}
    </Box>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        maxWidth: 400,
        width: '100%',
        mx: 'auto',
        position: 'relative',
        zIndex: zIndex.base,
        p: { xs: 3.5, sm: 4.5 },
        borderRadius: '20px',
        bgcolor: vault.card,
        border: '1px solid',
        borderColor: vault.cardBorder,
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        boxShadow: '0 20px 46px -26px rgba(0,0,0,0.8)', // qeShadow.dark value (qeDark has no shadow key)
      }}
    >
      {children}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════
// PIN DIGIT INPUT — Crystal facet boxes + hidden native input
// ═══════════════════════════════════════════════════════════════

function PinInput({
  value,
  onChange,
  onSubmit,
  disabled,
  inputRef,
}: {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const digits = value.split('');

  return (
    <Box
      sx={{
        position: 'relative',
        mb: 3.5,
        mx: 'auto',
        maxWidth: { xs: 256, sm: 280 },
      }}
    >
      {/* Hidden native input — always mounted, keyboard stays open */}
      <input
        ref={inputRef as React.LegacyRef<HTMLInputElement>}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={4}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
          onChange(val);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.length === 4 && !disabled) {
            onSubmit();
          }
        }}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          width: '100%',
          height: '100%',
          fontSize: '16px',
          zIndex: zIndex.base,
          cursor: 'pointer',
        }}
      />

      {/* Visual digit boxes */}
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
        {[0, 1, 2, 3].map((i) => {
          const filled = i < digits.length;
          const active = i === digits.length;

          return (
            <Box
              key={i}
              sx={{
                width: { xs: 52, sm: 58 },
                height: { xs: 62, sm: 68 },
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: filled ? emeraldAlpha(0.1) : vault.surface,
                border: '1.5px solid',
                borderColor: filled
                  ? qeAccent.dark.strong
                  : active
                    ? vault.textDim
                    : vault.cardBorder,
                boxShadow: 'none',
                transition: cssTransition.fast,
              }}
            >
              <motion.div
                key={`d-${i}-${digits[i] || ''}`}
                initial={filled ? { scale: 1.25, opacity: 0 } : false}
                animate={{ scale: 1, opacity: filled ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <Typography
                  sx={{
                    fontSize: '1.75rem',
                    fontWeight: fontWeights.bold,
                    fontFamily: vault.mono,
                    color: vault.emerald,
                    lineHeight: 1,
                  }}
                >
                  {digits[i] || ''}
                </Typography>
              </motion.div>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATUS ICONS
// ═══════════════════════════════════════════════════════════════

function LockGlyph() {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2.5 }}>
      <Box
        sx={{
          position: 'absolute',
          inset: -12,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${emeraldAlpha(0.15)} 0%, transparent 70%)`,
        }}
      />
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: emeraldAlpha(0.08),
          border: `1px solid ${emeraldAlpha(0.18)}`,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M16.5 10.5V6.5C16.5 4.01 14.49 2 12 2S7.5 4.01 7.5 6.5V10.5"
            stroke={vault.emerald}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <rect
            x="5"
            y="10"
            width="14"
            height="12"
            rx="3"
            stroke={vault.emerald}
            strokeWidth="1.5"
          />
          <circle cx="12" cy="16" r="1.5" fill={vault.emerald} />
        </svg>
      </Box>
    </Box>
  );
}

function SuccessGlyph() {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2.5 }}>
      <Box
        sx={{
          position: 'absolute',
          inset: -16,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${emeraldAlpha(0.2)} 0%, transparent 70%)`,
          animation: 'glowPulse 3s ease-in-out infinite',
          '@keyframes glowPulse': {
            '0%, 100%': { opacity: 0.5, transform: 'scale(0.95)' },
            '50%': { opacity: 1, transform: 'scale(1.05)' },
          },
        }}
      />
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${emeraldAlpha(0.15)} 0%, ${alpha(emeraldCore.darker, 0.15)} 100%)`,
          border: `1px solid ${emeraldAlpha(0.25)}`,
        }}
      >
        <CheckCircle sx={{ fontSize: 36, color: vault.emerald }} />
      </Box>
    </Box>
  );
}

function AlertGlyph({ variant }: { variant: 'error' | 'warning' }) {
  const color = variant === 'error' ? vault.error : vault.warning;
  const bg = variant === 'error' ? vault.errorDim : vault.warningDim;
  const borderTint =
    variant === 'error' ? alpha(vault.error, 0.18) : alpha(vault.warning, 0.18);

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2.5 }}>
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: bg,
          border: `1px solid ${borderTint}`,
        }}
      >
        {variant === 'error' ? (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 9v4"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="12" cy="16" r="1" fill={color} />
            <path
              d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke={color}
              strokeWidth="1.5"
            />
          </svg>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
            <path
              d="M5.5 5.5L18.5 18.5"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

type PageStatus =
  | 'loading'
  | 'pin'
  | 'form'
  | 'valid'
  | 'expired'
  | 'error'
  | 'ip-blocked';

const MAX_PIN_ATTEMPTS = 5;

export default function InvitationPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = safeInternalPath(searchParams.get('redirect'));
  const {
    validateInvitation,
    verifyPin,
    registerGuest,
    isValidating,
    isVerifyingPin,
    isRegistering,
  } = useInvitation();
  const { loginAsGuest } = useAuth();

  const [status, setStatus] = useState<PageStatus>('loading');
  const [pricingMode, setPricingMode] = useState<PricingMode>('with_prices');
  const [guestCurrencyMode, setGuestCurrencyMode] = useState<string>('');
  const [guestMultiplier, setGuestMultiplier] = useState<string>('');
  const [invitationId, setInvitationId] = useState<string>('');
  const [createdBy, setCreatedBy] = useState<string>('');
  const [creatorEmail, setCreatorEmail] = useState<string>('');
  const [inviterWhatsApp, setInviterWhatsApp] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentShortCode, setCurrentShortCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  // PIN state
  const [pinValue, setPinValue] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinError, setPinError] = useState<string>('');
  const [preRegisteredGuestName, setPreRegisteredGuestName] =
    useState<string>('');
  const [preRegisteredGuestContact, setPreRegisteredGuestContact] =
    useState<string>('');

  // Guest form state
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [contactType, setContactType] = useState<ContactType>('email');
  const [formError, setFormError] = useState<string>('');

  const pinInputRef = useRef<HTMLInputElement>(null);

  // ─── Grant access helper ───
  const grantAccess = useCallback(
    (overrides?: { guestName?: string; guestContact?: string }) => {
      loginAsGuest();

      const resolvedGuestName =
        overrides?.guestName || guestName.trim() || preRegisteredGuestName;
      const resolvedGuestContact =
        overrides?.guestContact ||
        guestContact.trim() ||
        preRegisteredGuestContact;

      const invitationData: Record<string, string> = {
        [INVITATION_STORAGE_KEYS.EXPIRES]: expiresAt,
        [INVITATION_STORAGE_KEYS.TOKEN]: currentShortCode,
        [INVITATION_STORAGE_KEYS.PRICING_MODE]: pricingMode,
        [INVITATION_STORAGE_KEYS.DURATION_HOURS]: '24',
        [INVITATION_STORAGE_KEYS.INVITATION_ID]: invitationId,
        [INVITATION_STORAGE_KEYS.INVITER_NAME]: createdBy,
        [INVITATION_STORAGE_KEYS.INVITER_EMAIL]: creatorEmail,
        [INVITATION_STORAGE_KEYS.GUEST_NAME]: resolvedGuestName,
        [INVITATION_STORAGE_KEYS.GUEST_CONTACT]: resolvedGuestContact,
        // Scope the verified flag to THIS invite's shortCode (not a global
        // 'true') so a device that verified one bound invite can't skip the
        // PIN gate on a different bound invite. See the skip-PIN check below.
        [INVITATION_STORAGE_KEYS.PIN_VERIFIED]: currentShortCode.toUpperCase(),
      };
      if (guestCurrencyMode) {
        invitationData[INVITATION_STORAGE_KEYS.GUEST_CURRENCY_MODE] =
          guestCurrencyMode;
      }
      if (guestMultiplier) {
        invitationData[INVITATION_STORAGE_KEYS.GUEST_MULTIPLIER] =
          guestMultiplier;
      }
      const deviceToken = localStorage.getItem(
        INVITATION_STORAGE_KEYS.DEVICE_TOKEN,
      );
      if (deviceToken) {
        invitationData[INVITATION_STORAGE_KEYS.DEVICE_TOKEN] = deviceToken;
      }
      if (inviterWhatsApp) {
        invitationData[INVITATION_STORAGE_KEYS.INVITER_WHATSAPP] =
          inviterWhatsApp;
      }

      for (const [key, value] of Object.entries(invitationData)) {
        sessionStorage.setItem(key, value);
      }
      localStorage.setItem(
        'tm_guest_invitation',
        JSON.stringify(invitationData),
      );
      sessionStorage.removeItem('treasure-filters');

      setStatus('valid');
    },
    [
      loginAsGuest,
      guestName,
      guestContact,
      preRegisteredGuestName,
      preRegisteredGuestContact,
      expiresAt,
      currentShortCode,
      pricingMode,
      invitationId,
      createdBy,
      creatorEmail,
      inviterWhatsApp,
      guestCurrencyMode,
      guestMultiplier,
    ],
  );

  // ─── Validate on mount ───
  useEffect(() => {
    if (!shortCode) {
      setStatus('error');
      setErrorMessage('Enlace de invitacion invalido');
      return;
    }

    const validate = async () => {
      const result = await validateInvitation(shortCode);

      if (result.isValid) {
        const resolvedPricingMode = result.pricingMode || 'with_prices';
        const resolvedCreatedBy = result.createdBy || '';
        const resolvedCreatorEmail = result.creatorEmail || '';
        const resolvedInvitationId = result.invitationId || '';
        const resolvedShortCode = result.shortCode || shortCode;
        const resolvedExpiresAt = result.expiresAt || '';

        setPricingMode(resolvedPricingMode);
        setCreatedBy(resolvedCreatedBy);
        setCreatorEmail(resolvedCreatorEmail);
        setInvitationId(resolvedInvitationId);
        setCurrentShortCode(resolvedShortCode);
        setExpiresAt(resolvedExpiresAt);

        if (result.guestCurrencyMode) {
          setGuestCurrencyMode(result.guestCurrencyMode);
        }
        if (result.guestMultiplier) {
          setGuestMultiplier(String(result.guestMultiplier));
        }

        if (result.guestName) {
          setPreRegisteredGuestName(result.guestName);
          setPreRegisteredGuestContact(result.guestContact || '');
        }

        if (result.creatorEmail) {
          try {
            const asesoresResponse = await fetch('/api/get-asesores');
            const asesoresData = await asesoresResponse.json();
            if (asesoresData.success && asesoresData.asesores) {
              const inviter = asesoresData.asesores.find(
                (a: { name: string; email?: string }) =>
                  a.name
                    .toLowerCase()
                    .includes((result.createdBy || '').toLowerCase()) ||
                  (a.email &&
                    a.email.toLowerCase() ===
                      result.creatorEmail?.toLowerCase()),
              );
              if (inviter?.whatsapp) {
                setInviterWhatsApp(inviter.whatsapp);
              }
            }
          } catch (error) {
            console.warn('Could not fetch inviter WhatsApp:', error);
          }
        }

        // Already verified THIS invite on this device — skip PIN. The stored
        // flag holds the verified shortCode (not a global 'true'), so a device
        // that verified a different bound invite still has to enter this one's
        // PIN — closes the cross-invitation bypass.
        if (
          result.isPinBound &&
          sessionStorage
            .getItem(INVITATION_STORAGE_KEYS.PIN_VERIFIED)
            ?.toUpperCase() === resolvedShortCode.toUpperCase()
        ) {
          loginAsGuest();

          const invitationData: Record<string, string> = {
            [INVITATION_STORAGE_KEYS.EXPIRES]: resolvedExpiresAt,
            [INVITATION_STORAGE_KEYS.TOKEN]: resolvedShortCode,
            [INVITATION_STORAGE_KEYS.PRICING_MODE]: resolvedPricingMode,
            [INVITATION_STORAGE_KEYS.DURATION_HOURS]: '24',
            [INVITATION_STORAGE_KEYS.INVITATION_ID]: resolvedInvitationId,
            [INVITATION_STORAGE_KEYS.INVITER_NAME]: resolvedCreatedBy,
            [INVITATION_STORAGE_KEYS.INVITER_EMAIL]: resolvedCreatorEmail,
            [INVITATION_STORAGE_KEYS.GUEST_NAME]: result.guestName || '',
            [INVITATION_STORAGE_KEYS.GUEST_CONTACT]: result.guestContact || '',
            [INVITATION_STORAGE_KEYS.PIN_VERIFIED]:
              resolvedShortCode.toUpperCase(),
          };
          if (result.guestCurrencyMode) {
            invitationData[INVITATION_STORAGE_KEYS.GUEST_CURRENCY_MODE] =
              result.guestCurrencyMode;
          }
          if (result.guestMultiplier) {
            invitationData[INVITATION_STORAGE_KEYS.GUEST_MULTIPLIER] = String(
              result.guestMultiplier,
            );
          }

          for (const [key, value] of Object.entries(invitationData)) {
            sessionStorage.setItem(key, value);
          }
          localStorage.setItem(
            'tm_guest_invitation',
            JSON.stringify(invitationData),
          );
          sessionStorage.removeItem('treasure-filters');

          setStatus('valid');
          return;
        }

        setStatus('pin');
      } else if (result.status === 'expired') {
        setStatus('expired');
        setErrorMessage('Esta invitacion ha expirado');
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Invitacion no valida');
      }
    };

    validate();
  }, [shortCode, validateInvitation, loginAsGuest]);

  // ─── PIN submit ───
  const handlePinSubmit = async () => {
    if (!shortCode || !pinValue || pinValue.length !== 4) {
      setPinError('Ingresa un PIN de 4 digitos');
      return;
    }

    if (pinAttempts >= MAX_PIN_ATTEMPTS) {
      setPinError('Demasiados intentos. Solicita una nueva invitacion.');
      return;
    }

    setPinError('');
    const result = await verifyPin(shortCode, pinValue);

    if (result.pinVerified) {
      if (result.guestName || preRegisteredGuestName) {
        grantAccess({
          guestName: result.guestName || preRegisteredGuestName,
          guestContact: result.guestContact || preRegisteredGuestContact,
        });
      } else {
        setStatus('form');
      }
    } else if (result.isIpBlocked) {
      setStatus('ip-blocked');
    } else if (result.isPinWrong) {
      const newAttempts = pinAttempts + 1;
      setPinAttempts(newAttempts);
      setPinValue('');
      if (newAttempts >= MAX_PIN_ATTEMPTS) {
        setPinError('Demasiados intentos. Solicita una nueva invitacion.');
      } else {
        setPinError(
          `PIN incorrecto. ${MAX_PIN_ATTEMPTS - newAttempts} intentos restantes.`,
        );
      }
      pinInputRef.current?.focus();
    } else {
      setPinError(result.error || 'Error al verificar PIN');
    }
  };

  // ─── Form validation ───
  const validateForm = (): boolean => {
    if (!guestName.trim()) {
      setFormError('Por favor ingresa tu nombre');
      return false;
    }
    if (!guestContact.trim()) {
      setFormError(
        `Por favor ingresa tu ${contactType === 'email' ? 'email' : 'telefono'}`,
      );
      return false;
    }
    if (contactType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestContact)) {
        setFormError('Por favor ingresa un email valido');
        return false;
      }
    }
    if (contactType === 'phone') {
      const phoneRegex = /^[\d\s\-+()]{7,20}$/;
      if (!phoneRegex.test(guestContact)) {
        setFormError('Por favor ingresa un telefono valido');
        return false;
      }
    }
    setFormError('');
    return true;
  };

  // ─── Guest submit ───
  const handleGuestSubmit = async () => {
    if (!validateForm()) return;

    if (invitationId) {
      const success = await registerGuest({
        invitationId,
        guestName: guestName.trim(),
        guestContact: guestContact.trim(),
        contactType,
      });
      if (!success) {
        console.warn('Guest registration failed, continuing...');
      }
    }

    grantAccess();
  };

  const handleExplore = () => {
    navigate(redirectTo, { replace: true });
  };

  // ─── Auto-navigate after success ───
  useEffect(() => {
    if (status === 'valid') {
      const timer = setTimeout(() => {
        navigate(redirectTo, { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate, redirectTo]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  // Loading
  if (status === 'loading' || isValidating) {
    return (
      <PageShell>
        <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: `2px solid ${emeraldAlpha(0.15)}`,
                borderTopColor: vault.emerald,
                animation: 'spin 0.9s linear infinite',
                mx: 'auto',
                mb: 3,
                '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
              }}
            />
            <Typography
              sx={{
                fontFamily: vault.serif,
                fontSize: '0.95rem',
                color: vault.textMuted,
                letterSpacing: '0.02em',
              }}
            >
              Validando invitacion...
            </Typography>
          </Box>
        </motion.div>
      </PageShell>
    );
  }

  // Expired / Error
  if (status === 'expired' || status === 'error') {
    return (
      <PageShell>
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <GlassCard>
            <Box sx={{ textAlign: 'center' }}>
              <AlertGlyph variant="error" />
              <Typography
                sx={{
                  fontFamily: vault.serif,
                  fontSize: '1.5rem',
                  fontWeight: fontWeights.bold,
                  color: vault.text,
                  mb: 1,
                }}
              >
                {status === 'expired'
                  ? 'Invitacion Expirada'
                  : 'Enlace Invalido'}
              </Typography>
              <Typography
                sx={{
                  color: vault.textMuted,
                  fontSize: '0.9rem',
                  mb: 3,
                  lineHeight: 1.6,
                }}
              >
                {errorMessage}
              </Typography>

              <Box
                sx={{
                  p: 2,
                  mb: 3,
                  borderRadius: '12px',
                  bgcolor: vault.surface,
                  border: `1px solid ${emeraldAlpha(0.08)}`,
                }}
              >
                <Typography
                  sx={{
                    color: vault.textMuted,
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                  }}
                >
                  Solicita un nuevo enlace al embajador que te invito.
                </Typography>
              </Box>

              <Button
                fullWidth
                onClick={() => navigate('/home')}
                sx={ghostBtnSx}
              >
                Ir al Inicio
              </Button>
            </Box>
          </GlassCard>
        </motion.div>
      </PageShell>
    );
  }

  // Device blocked
  if (status === 'ip-blocked') {
    return (
      <PageShell>
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <GlassCard>
            <Box sx={{ textAlign: 'center' }}>
              <AlertGlyph variant="warning" />
              <Typography
                sx={{
                  fontFamily: vault.serif,
                  fontSize: '1.5rem',
                  fontWeight: fontWeights.bold,
                  color: vault.text,
                  mb: 1,
                }}
              >
                Acceso Restringido
              </Typography>
              <Typography
                sx={{
                  color: vault.textMuted,
                  fontSize: '0.9rem',
                  mb: 3,
                  lineHeight: 1.6,
                }}
              >
                Esta invitacion esta vinculada a otro dispositivo. Solo puede
                usarse desde el dispositivo donde se verifico por primera vez.
              </Typography>

              <Box
                sx={{
                  p: 2,
                  mb: 3,
                  borderRadius: '12px',
                  bgcolor: vault.warningDim,
                  border: `1px solid ${alpha(vault.warning, 0.12)}`,
                }}
              >
                <Typography
                  sx={{
                    color: 'rgba(255, 200, 100, 0.8)',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                  }}
                >
                  Si necesitas acceso, solicita una nueva invitacion a tu
                  embajador.
                </Typography>
              </Box>

              <Button
                fullWidth
                onClick={() => navigate('/home')}
                sx={ghostBtnSx}
              >
                Ir al Inicio
              </Button>
            </Box>
          </GlassCard>
        </motion.div>
      </PageShell>
    );
  }

  // PIN entry
  if (status === 'pin') {
    const isLockedOut = pinAttempts >= MAX_PIN_ATTEMPTS;

    return (
      <PageShell>
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <GlassCard>
            <Box sx={{ textAlign: 'center' }}>
              <LockGlyph />

              <Typography
                sx={{
                  fontFamily: vault.serif,
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: vault.text,
                  mb: 0.5,
                }}
              >
                Ingresa tu PIN
              </Typography>

              {createdBy && (
                <>
                  <Typography
                    sx={{ color: vault.textDim, fontSize: '0.8rem', mb: 0.5 }}
                  >
                    Invitado por
                  </Typography>
                  <Typography
                    sx={{
                      color: vault.emerald,
                      fontSize: '0.9rem',
                      fontWeight: fontWeights.medium,
                      mb: 2,
                    }}
                  >
                    {createdBy}
                  </Typography>
                </>
              )}

              <Typography
                sx={{
                  color: vault.textMuted,
                  fontSize: '0.85rem',
                  mb: 3,
                  lineHeight: 1.5,
                }}
              >
                Ingresa el PIN de 4 digitos que te compartio tu embajador.
              </Typography>

              {pinError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      mb: 2.5,
                      borderRadius: '12px',
                      bgcolor: isLockedOut ? vault.errorDim : vault.warningDim,
                      border: '1px solid',
                      borderColor: isLockedOut
                        ? alpha(vault.error, 0.15)
                        : alpha(vault.warning, 0.15),
                    }}
                  >
                    <Typography
                      sx={{
                        color: isLockedOut ? vault.error : vault.warning,
                        fontSize: '0.85rem',
                      }}
                    >
                      {pinError}
                    </Typography>
                  </Box>
                </motion.div>
              )}

              <PinInput
                value={pinValue}
                onChange={setPinValue}
                onSubmit={handlePinSubmit}
                disabled={isLockedOut}
                inputRef={pinInputRef}
              />

              <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={
                  pinValue.length !== 4 || isVerifyingPin || isLockedOut
                }
                onClick={handlePinSubmit}
                sx={emeraldBtnSx}
              >
                {isVerifyingPin ? (
                  <CircularProgress size={22} sx={{ color: whiteAlpha(0.7) }} />
                ) : (
                  'Confirmar PIN'
                )}
              </Button>
            </Box>
          </GlassCard>
        </motion.div>
      </PageShell>
    );
  }

  // Guest registration form
  if (status === 'form') {
    return (
      <PageShell>
        <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
          <GlassCard>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <SuccessGlyph />
              <Typography
                sx={{
                  fontFamily: vault.serif,
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: vault.text,
                  mb: 0.5,
                }}
              >
                Bienvenido a Tierra Madre
              </Typography>
              {createdBy && (
                <Typography
                  sx={{ color: vault.textMuted, fontSize: '0.85rem' }}
                >
                  Invitado por {createdBy}
                </Typography>
              )}
            </Box>

            <Typography
              sx={{
                color: vault.textMuted,
                fontSize: '0.9rem',
                mb: 3,
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              Para explorar nuestra colección, por favor déjanos tus datos de
              contacto.
            </Typography>

            {formError && (
              <Box
                sx={{
                  p: 1.5,
                  mb: 2,
                  borderRadius: '12px',
                  bgcolor: vault.errorDim,
                  border: `1px solid ${alpha(vault.error, 0.15)}`,
                }}
              >
                <Typography sx={{ color: vault.error, fontSize: '0.85rem' }}>
                  {formError}
                </Typography>
              </Box>
            )}

            <TextField
              fullWidth
              label="Tu nombre"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
              sx={{ ...inputSx, mb: 2 }}
            />

            <Typography
              sx={{ color: vault.textDim, fontSize: '0.8rem', mb: 1 }}
            >
              Forma de contacto preferida
            </Typography>

            <ToggleButtonGroup
              exclusive
              value={contactType}
              onChange={(_, value) => value && setContactType(value)}
              fullWidth
              sx={{
                mb: 2,
                '& .MuiToggleButton-root': {
                  color: vault.textMuted,
                  borderColor: whiteAlpha(0.08),
                  borderRadius: '12px !important',
                  fontFamily: vault.system,
                  textTransform: 'none',
                  py: 1,
                  '&.Mui-selected': {
                    bgcolor: emeraldAlpha(0.1),
                    color: vault.emerald,
                    borderColor: emeraldAlpha(0.25),
                    '&:hover': { bgcolor: emeraldAlpha(0.15) },
                  },
                },
              }}
            >
              <ToggleButton value="email" sx={{ flex: 1 }}>
                <EmailIcon sx={{ mr: 1 }} fontSize="small" />
                Email
              </ToggleButton>
              <ToggleButton value="phone" sx={{ flex: 1 }}>
                <PhoneIcon sx={{ mr: 1 }} fontSize="small" />
                Telefono
              </ToggleButton>
            </ToggleButtonGroup>

            <TextField
              fullWidth
              label={contactType === 'email' ? 'Tu email' : 'Tu telefono'}
              type={contactType === 'email' ? 'email' : 'tel'}
              value={guestContact}
              onChange={(e) => setGuestContact(e.target.value)}
              placeholder={
                contactType === 'email'
                  ? 'ejemplo@email.com'
                  : '+57 300 123 4567'
              }
              required
              sx={{ ...inputSx, mb: 3 }}
            />

            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={isRegistering}
              onClick={handleGuestSubmit}
              startIcon={
                isRegistering ? (
                  <CircularProgress size={20} sx={{ color: whiteAlpha(0.7) }} />
                ) : (
                  <Explore />
                )
              }
              sx={emeraldBtnSx}
            >
              {isRegistering ? 'Registrando...' : 'Explorar Coleccion'}
            </Button>
          </GlassCard>
        </motion.div>
      </PageShell>
    );
  }

  // Welcome — access granted
  if (status === 'valid') {
    return (
      <PageShell>
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <GlassCard>
            <Box sx={{ textAlign: 'center' }}>
              <SuccessGlyph />
              <Typography
                sx={{
                  fontFamily: vault.serif,
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: vault.text,
                  mb: 0.5,
                }}
              >
                Bienvenido a Tierra Madre
              </Typography>
              {createdBy && (
                <Typography
                  sx={{ color: vault.textMuted, fontSize: '0.85rem', mb: 2.5 }}
                >
                  Invitado por {createdBy}
                </Typography>
              )}

              <Typography
                sx={{
                  color: vault.textMuted,
                  fontSize: '0.9rem',
                  mb: 3.5,
                  lineHeight: 1.6,
                }}
              >
                Tienes acceso para explorar nuestra colección exclusiva de
                esmeraldas colombianas.
              </Typography>

              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<Explore />}
                onClick={handleExplore}
                sx={{ ...emeraldBtnSx, mb: 1.5 }}
              >
                Explorar Coleccion
              </Button>

              <Button
                fullWidth
                onClick={() => navigate('/home')}
                sx={{ ...ghostBtnSx, border: 'none', color: vault.textDim }}
              >
                Ir al Inicio
              </Button>
            </Box>
          </GlassCard>
        </motion.div>
      </PageShell>
    );
  }

  // Fallback — unexpected state
  return (
    <PageShell>
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress
          size={32}
          aria-label="Cargando"
          sx={{ color: vault.emerald }}
        />
      </Box>
    </PageShell>
  );
}
