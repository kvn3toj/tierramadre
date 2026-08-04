/**
 * InvitationPage
 *
 * Handles invitation link validation and grants temporary guest access.
 * "Emerald Vault" — immersive dark luxury experience for guests.
 *
 * Route: /invite/:shortCode (or /g/:shortCode via redirect)
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { CheckCircle, Explore } from '@mui/icons-material';
import { useInvitation } from '../hooks/useInvitation';
import { useAuth } from '../hooks/useAuth';
import { INVITATION_STORAGE_KEYS } from '../types/invitation';
import { alpha } from '@mui/material/styles';
import {
  emeraldCore,
  emeraldAlpha,
  whiteAlpha,
  primitiveColors,
  zIndex,
  fontWeights,
  qeDark,
  qeAccent,
  qeFont,
  Card,
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
  background: qeAccent.dark.strong, // #00C992 solid, no gradient
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
  // Forced-dark immersive vault, regardless of the app-wide theme: scope the
  // --tm-* runtime vars to dark locally via data-theme, then render the
  // canonical Card so the vault stays on one Card implementation.
  return (
    <Box
      data-theme="dark"
      sx={{
        maxWidth: 400,
        width: '100%',
        mx: 'auto',
        position: 'relative',
        zIndex: zIndex.base,
      }}
    >
      <Card
        variant="outlined"
        sx={{
          p: { xs: 3.5, sm: 4.5 },
          borderRadius: '20px',
          boxShadow: 'var(--tm-shadow)',
        }}
      >
        {children}
      </Card>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATUS ICONS
// ═══════════════════════════════════════════════════════════════

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

type PageStatus = 'loading' | 'valid' | 'expired' | 'error';

export default function InvitationPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = safeInternalPath(searchParams.get('redirect'));
  const { validateInvitation, isValidating } = useInvitation();
  const { loginAsGuest } = useAuth();

  const [status, setStatus] = useState<PageStatus>('loading');
  const [createdBy, setCreatedBy] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

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

        setCreatedBy(resolvedCreatedBy);

        // Resolve inviter WhatsApp so the guest keeps the "contact my asesor"
        // button. Held as a local because state updates aren't visible within
        // this same synchronous validation run.
        let resolvedInviterWhatsApp = '';
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
                resolvedInviterWhatsApp = inviter.whatsapp;
              }
            }
          } catch (error) {
            console.warn('Could not fetch inviter WhatsApp:', error);
          }
        }

        // No access code / PIN: opening a valid invitation link grants guest
        // access immediately. The asesor's invitation generator is the only
        // gate — whoever holds the link is treated as the invited guest.
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
        const deviceToken = localStorage.getItem(
          INVITATION_STORAGE_KEYS.DEVICE_TOKEN,
        );
        if (deviceToken) {
          invitationData[INVITATION_STORAGE_KEYS.DEVICE_TOKEN] = deviceToken;
        }
        if (resolvedInviterWhatsApp) {
          invitationData[INVITATION_STORAGE_KEYS.INVITER_WHATSAPP] =
            resolvedInviterWhatsApp;
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
