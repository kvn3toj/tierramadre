/**
 * WelcomeScreen - Entry Point
 * Offers: Google Sign-In (validated against Asesores sheet)
 *         Guest Mode (invitation-only)
 * Smooth fade-in transition from splash screen
 */

import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Typography, Button, Fade, Stack, alpha, Divider, Alert } from '@mui/material';
import { motion } from 'framer-motion';
import { VisibilityOutlined, OpenInNew, ContentCopy, CheckCircleOutline } from '@mui/icons-material';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { emeraldCore, surfacesDark, semanticColors } from '../../design-system/tokens/colors';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCachedBrowserInfo } from '../../utils/deviceTier';

// Check if Google OAuth is configured
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const isGoogleConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 10);

export default function WelcomeScreen() {
  const { signIn, authError, clearError } = useGoogleAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [showInvitationMessage, setShowInvitationMessage] = useState(false);
  const [googleLoginKey, setGoogleLoginKey] = useState(0);
  const [urlCopied, setUrlCopied] = useState(false);

  // Detect if user arrived at a product URL (shared link)
  const isProductUrl = location.pathname.startsWith('/product/');

  // Detect in-app browsers (Telegram, Instagram, etc.) that have OAuth issues
  const browserInfo = useMemo(() => getCachedBrowserInfo(), []);
  const isInAppBrowser = browserInfo.isInAppBrowser;

  // Handle copying URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    }
  };

  // Handle opening in external browser (iOS/Android specific)
  const handleOpenExternal = () => {
    const url = window.location.href;
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    // Try platform-specific deep links to external browsers
    if (isAndroid) {
      // Android: Use intent URL to open in default browser
      // Format: intent://HOST/PATH#Intent;scheme=https;package=com.android.chrome;end
      try {
        const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
        window.location.href = intentUrl;
        return;
      } catch {
        // Intent failed, fall through to share
      }
    }

    if (isIOS) {
      // iOS: Try x-safari-https scheme (works on some versions)
      // Also works: googlechrome:// for Chrome
      try {
        const safariUrl = url.replace(/^https:\/\//, 'x-safari-https://');
        window.location.href = safariUrl;
        // Give it a moment to redirect, then fall back
        setTimeout(() => {
          // If we're still here, Safari scheme didn't work - use share
          if (navigator.share) {
            navigator.share({
              title: 'Tierra Madre',
              text: 'Abre en Safari para iniciar sesión con Google',
              url: url,
            }).catch(() => handleCopyUrl());
          } else {
            handleCopyUrl();
          }
        }, 500);
        return;
      } catch {
        // Safari scheme failed, fall through to share
      }
    }

    // Fallback: Use native share API (shows "Open in Browser" option on most devices)
    if (navigator.share) {
      navigator.share({
        title: 'Tierra Madre',
        text: 'Abre este enlace en Chrome o Safari para iniciar sesión con Google',
        url: url,
      }).catch(() => {
        // User cancelled or error - just copy the URL
        handleCopyUrl();
      });
    } else {
      // Final fallback: copy URL
      handleCopyUrl();
    }
  };

  const handleGuestAccess = () => {
    // Guest mode is now invitation-only - show message instead of logging in
    setShowInvitationMessage(true);
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (response.credential) {
      try {
        await signIn(response.credential);
        // Auth context will automatically update on successful sign-in
      } catch (err) {
        setGoogleError('Error al iniciar sesión con Google');
      }
    }
  };

  const handleGoogleError = () => {
    setGoogleError('No se pudo completar el inicio de sesión con Google');
  };

  const handleTryAnotherAccount = () => {
    // Clear any auth errors (both local and context)
    setGoogleError(null);
    clearError();
    // Force Google to show account chooser by re-rendering GoogleLogin component
    setGoogleLoginKey(prev => prev + 1);
  };

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: surfacesDark.background.primary,
        background: `radial-gradient(ellipse at 50% 30%, #0d1a14 0%, ${surfacesDark.background.primary} 50%, #050505 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle ambient glow - top */}
      <Box
        sx={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(emeraldCore.primary, 0.07)} 0%, transparent 70%)`,
          top: '5%',
          filter: 'blur(50px)',
        }}
      />

      {/* Subtle ambient glow - bottom */}
      <Box
        sx={{
          position: 'absolute',
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(emeraldCore.primary, 0.03)} 0%, transparent 70%)`,
          bottom: '15%',
          filter: 'blur(40px)',
        }}
      />

      {/* Branded Logo - includes "TIERRA MADRE" and "Esencia y Poder" */}
      <Fade in timeout={400}>
        <Box
          component="img"
          src="/logo-brand.png"
          alt="Tierra Madre - Esencia y Poder"
          sx={{
            width: { xs: '70vw', sm: 360 },
            maxWidth: 400,
            height: 'auto',
            mb: 1,
          }}
        />
      </Fade>

      {/* Main Content */}
      <Fade in timeout={800}>
        <Stack spacing={2} sx={{ width: { xs: '80vw', sm: 340 }, maxWidth: 400, mt: 1.5 }}>
            {/* Product URL Access Alert - Show when arriving from shared link */}
            {isProductUrl && (
              <Alert
                severity="info"
                sx={{
                  bgcolor: alpha(emeraldCore.primary, 0.12),
                  color: surfacesDark.text.primary,
                  border: `1px solid ${alpha(emeraldCore.primary, 0.3)}`,
                  '& .MuiAlert-icon': { color: emeraldCore.primary },
                  mb: 1,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                  Acceso Exclusivo
                </Typography>
                <Typography variant="caption" sx={{ color: surfacesDark.text.secondary }}>
                  Para ver este producto necesitas una invitación de un asesor o embajador de Tierra Madre.
                </Typography>
              </Alert>
            )}

            {/* Google Sign-In - Only shown if configured */}
            {isGoogleConfigured && (
              <>
                {/* In-app browser notice (Telegram, Instagram, etc.) */}
                {isInAppBrowser ? (
                  <Box sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: alpha(emeraldCore.primary, 0.08),
                    border: `1px solid ${alpha(emeraldCore.primary, 0.2)}`,
                  }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: emeraldCore.light,
                        mb: 1,
                        textAlign: 'center',
                        fontWeight: 500,
                      }}
                    >
                      {t.auth.inAppBrowserTitle || 'Para una mejor experiencia'}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: surfacesDark.text.secondary,
                        mb: 2.5,
                        textAlign: 'center',
                        lineHeight: 1.5,
                      }}
                    >
                      {t.auth.inAppBrowserMessage || 'Abre en tu navegador favorito (Chrome, Safari, etc.) para iniciar sesión con Google.'}
                    </Typography>

                    <Stack spacing={1.5}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<OpenInNew />}
                        onClick={handleOpenExternal}
                        sx={{
                          bgcolor: emeraldCore.primary,
                          color: '#000',
                          textTransform: 'none',
                          py: 1.2,
                          fontWeight: 500,
                          '&:hover': {
                            bgcolor: emeraldCore.light,
                          },
                        }}
                      >
                        {t.auth.openInBrowser || 'Abrir en navegador'}
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        startIcon={urlCopied ? <CheckCircleOutline /> : <ContentCopy />}
                        onClick={handleCopyUrl}
                        sx={{
                          color: urlCopied ? emeraldCore.primary : surfacesDark.text.tertiary,
                          textTransform: 'none',
                          '&:hover': {
                            color: surfacesDark.text.secondary,
                          },
                        }}
                      >
                        {urlCopied
                          ? (t.auth.urlCopied || 'Copiado')
                          : (t.auth.copyUrl || 'Copiar enlace')}
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  /* Normal Google Sign-In button */
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    '& > div': { width: '100%' },
                    '& iframe': { colorScheme: 'normal' },
                  }}>
                    <GoogleLogin
                      key={googleLoginKey}
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      theme="filled_black"
                      shape="pill"
                      text="signin_with"
                      locale="es"
                      width="340"
                      useOneTap={false}
                    />
                  </Box>
                )}

                {/* Error messages */}
                {(googleError || authError) && !isInAppBrowser && (
                  <Alert
                    severity="warning"
                    sx={{
                      bgcolor: alpha(semanticColors.warning.main, 0.15),
                      color: semanticColors.warning.main,
                      border: `1px solid ${alpha(semanticColors.warning.main, 0.3)}`,
                      '& .MuiAlert-icon': { color: semanticColors.warning.main },
                    }}
                  >
                    {googleError || authError}
                  </Alert>
                )}

                {/* Try another account button - shown after auth error */}
                {authError && !isInAppBrowser && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleTryAnotherAccount}
                    sx={{
                      textTransform: 'none',
                      borderColor: alpha(emeraldCore.primary, 0.5),
                      color: emeraldCore.light,
                      '&:hover': {
                        borderColor: emeraldCore.primary,
                        bgcolor: alpha(emeraldCore.primary, 0.1),
                      },
                    }}
                  >
                    Intentar con otra cuenta
                  </Button>
                )}

                {/* Divider */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 1 }}>
                  <Divider sx={{ flex: 1, borderColor: alpha('#FFFFFF', 0.15) }} />
                  <Typography variant="caption" sx={{ color: surfacesDark.text.tertiary }}>
                    o
                  </Typography>
                  <Divider sx={{ flex: 1, borderColor: alpha('#FFFFFF', 0.15) }} />
                </Box>
              </>
            )}

            {/* Invitation-only message */}
            {showInvitationMessage && (
              <Alert
                severity="info"
                onClose={() => setShowInvitationMessage(false)}
                sx={{
                  bgcolor: alpha(emeraldCore.primary, 0.12),
                  color: surfacesDark.text.primary,
                  border: `1px solid ${alpha(emeraldCore.primary, 0.3)}`,
                  '& .MuiAlert-icon': { color: emeraldCore.primary },
                  '& .MuiAlert-action': { color: surfacesDark.text.secondary },
                }}
              >
                {t.auth.invitationOnlyMessage}
              </Alert>
            )}

            {/* Guest Access Button */}
            <Button
              variant="text"
              size="small"
              startIcon={<VisibilityOutlined sx={{ fontSize: 16 }} />}
              onClick={handleGuestAccess}
              fullWidth
              sx={{
                py: 1,
                fontSize: '0.85rem',
                textTransform: 'none',
                color: surfacesDark.text.tertiary,
                '&:hover': {
                  color: surfacesDark.text.secondary,
                  bgcolor: alpha('#FFFFFF', 0.03),
                },
              }}
            >
              {t.auth.guestAccess}
            </Button>

          </Stack>
      </Fade>

      {/* Footer */}
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 32,
          color: surfacesDark.text.tertiary,
          letterSpacing: '0.1em',
        }}
      >
        {t.auth.colombianEmeralds}
      </Typography>
    </Box>
  );
}
