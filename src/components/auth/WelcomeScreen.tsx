/**
 * WelcomeScreen - Entry Point
 * Offers: Google Sign-In (validated against Asesores sheet)
 *         Guest Mode (invitation-only)
 * Smooth fade-in transition from splash screen
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Fade,
  Stack,
  alpha,
  Divider,
  Alert,
} from "@mui/material";
import { motion } from "framer-motion";
import {
  VisibilityOutlined,
  OpenInNew,
  ContentCopy,
  CheckCircleOutline,
} from "@mui/icons-material";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import {
  emeraldCore,
  surfacesDark,
  semanticColors,
} from "../../design-system/tokens/colors";
import { useGoogleAuth } from "../../contexts/GoogleAuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { getCachedBrowserInfo } from "../../utils/deviceTier";

// Check if Google OAuth is configured
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const isGoogleConfigured = Boolean(
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 10,
);

// Watchdog: if the user clicks the GIS button and no onSuccess/onError fires
// within this window, we assume the popup → postMessage handshake failed
// (typical on iOS Safari, Brave, Firefox-strict, in-app WebViews) and surface
// a fallback CTA so they aren't stuck on a silent screen.
const POPUP_TIMEOUT_MS = 8000;

export default function WelcomeScreen() {
  const { signIn, authError, clearError } = useGoogleAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [showInvitationMessage, setShowInvitationMessage] = useState(false);
  const [googleLoginKey, setGoogleLoginKey] = useState(0);
  const [urlCopied, setUrlCopied] = useState(false);
  const [popupStuck, setPopupStuck] = useState(false);
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ?debug=auth — reveals visible diagnostics so a user reporting login
  // issues can screenshot what's happening in their browser.
  const debugAuth = useMemo(
    () => new URLSearchParams(location.search).get("debug") === "auth",
    [location.search],
  );

  // Detect if user arrived at a product URL (shared link)
  const isProductUrl = location.pathname.startsWith("/product/");

  // Detect in-app browsers (Telegram, Instagram, etc.) that have OAuth issues
  const browserInfo = useMemo(() => getCachedBrowserInfo(), []);
  const isInAppBrowser = browserInfo.isInAppBrowser;

  // Cleanup popup timer on unmount
  useEffect(() => {
    return () => {
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    };
  }, []);

  // Handle copying URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
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
        const intentUrl = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
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
        const safariUrl = url.replace(/^https:\/\//, "x-safari-https://");
        window.location.href = safariUrl;
        // Give it a moment to redirect, then fall back
        setTimeout(() => {
          // If we're still here, Safari scheme didn't work - use share
          if (navigator.share) {
            navigator
              .share({
                title: "Tierra Madre",
                text: "Abre en Safari para iniciar sesión con Google",
                url: url,
              })
              .catch(() => handleCopyUrl());
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
      navigator
        .share({
          title: "Tierra Madre",
          text: "Abre este enlace en Chrome o Safari para iniciar sesión con Google",
          url: url,
        })
        .catch(() => {
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

  // Stop the popup-stuck watchdog (called when GIS finally responds)
  const clearPopupWatchdog = () => {
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    setPopupStuck(false);
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    clearPopupWatchdog();
    if (response.credential) {
      try {
        await signIn(response.credential);
        // Auth context will automatically update on successful sign-in
      } catch (err) {
        setGoogleError("Error al iniciar sesión con Google");
      }
    }
  };

  const handleGoogleError = () => {
    clearPopupWatchdog();
    setGoogleError("No se pudo completar el inicio de sesión con Google");
  };

  // Start the watchdog when the GIS button receives a click. We can't hook
  // GoogleLogin's iframe directly, so we use pointerdown on the wrapper.
  const handleButtonAreaPointerDown = () => {
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    setPopupStuck(false);
    popupTimerRef.current = setTimeout(() => {
      setPopupStuck(true);
    }, POPUP_TIMEOUT_MS);
  };

  const handleTryAnotherAccount = () => {
    // Clear any auth errors (both local and context)
    setGoogleError(null);
    clearError();
    clearPopupWatchdog();
    // Force Google to show account chooser by re-rendering GoogleLogin component
    setGoogleLoginKey((prev) => prev + 1);
  };

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: surfacesDark.background.primary,
        background: `radial-gradient(ellipse at 50% 30%, #0d1a14 0%, ${surfacesDark.background.primary} 50%, #050505 100%)`,
        position: "relative",
        // overflowX hides the glow blobs spilling sideways; overflowY auto
        // lets users scroll when alerts + debug panel push past 100vh
        // (otherwise centered flex would clip both ends).
        overflowX: "hidden",
        overflowY: "auto",
        // Top breathing room so the logo doesn't kiss the status bar;
        // bottom padding clears the absolute footer (footer = 24px text +
        // 32px bottom offset, so ~80px keeps Stack content above it).
        pt: { xs: 6, sm: 4 },
        pb: { xs: 12, sm: 10 },
      }}
    >
      {/* Subtle ambient glow - top */}
      <Box
        sx={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(emeraldCore.primary, 0.07)} 0%, transparent 70%)`,
          top: "5%",
          filter: "blur(50px)",
        }}
      />

      {/* Subtle ambient glow - bottom */}
      <Box
        sx={{
          position: "absolute",
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(emeraldCore.primary, 0.03)} 0%, transparent 70%)`,
          bottom: "15%",
          filter: "blur(40px)",
        }}
      />

      {/* Branded Logo - includes "TIERRA MADRE" and "Esmeraldas con ADN de Paz" */}
      <Fade in timeout={400}>
        <Box
          component="img"
          src="/logo-brand.png"
          alt="Tierra Madre - Esmeraldas con ADN de Paz"
          sx={{
            width: { xs: "70vw", sm: 360 },
            maxWidth: 400,
            height: "auto",
            mb: 1,
          }}
        />
      </Fade>

      {/* Main Content */}
      <Fade in timeout={800}>
        <Stack
          spacing={2}
          sx={{ width: { xs: "80vw", sm: 340 }, maxWidth: 400, mt: 1.5 }}
        >
          {/* Product URL Access Alert - Show when arriving from shared link */}
          {isProductUrl && (
            <Alert
              severity="info"
              sx={{
                bgcolor: alpha(emeraldCore.primary, 0.12),
                color: surfacesDark.text.primary,
                border: `1px solid ${alpha(emeraldCore.primary, 0.3)}`,
                "& .MuiAlert-icon": { color: emeraldCore.primary },
                mb: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                Acceso Exclusivo
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: surfacesDark.text.secondary }}
              >
                Para ver este producto necesitas una invitación de un asesor o
                embajador de Tierra Madre.
              </Typography>
            </Alert>
          )}

          {/* Auth diagnostics panel — visible only with ?debug=auth.
              Ask an affected user to add ?debug=auth to the URL and screenshot.
              Capped height with internal scroll so a long UA string can't
              push the Google button off-screen. */}
          {debugAuth && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha("#000", 0.5),
                border: `1px solid ${alpha(emeraldCore.primary, 0.3)}`,
                fontFamily: "monospace",
                fontSize: "0.7rem",
                color: surfacesDark.text.secondary,
                wordBreak: "break-all",
                lineHeight: 1.6,
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: emeraldCore.light,
                  fontWeight: 600,
                  display: "block",
                  mb: 0.5,
                }}
              >
                debug=auth
              </Typography>
              <div>googleConfigured: {String(isGoogleConfigured)}</div>
              <div>
                clientId:{" "}
                {GOOGLE_CLIENT_ID
                  ? `${GOOGLE_CLIENT_ID.slice(0, 12)}…`
                  : "(unset)"}
              </div>
              <div>browser: {browserInfo.browserName || "standard"}</div>
              <div>isInAppBrowser: {String(isInAppBrowser)}</div>
              <div>cookies: {String(navigator.cookieEnabled)}</div>
              <div>
                fedcm:{" "}
                {String(
                  typeof window !== "undefined" &&
                    "IdentityCredential" in window,
                )}
              </div>
              <div>online: {String(navigator.onLine)}</div>
              <div>
                authError: {authError || "—"} | googleError:{" "}
                {googleError || "—"} | popupStuck: {String(popupStuck)}
              </div>
              <div style={{ marginTop: 4, opacity: 0.7 }}>
                ua: {navigator.userAgent}
              </div>
            </Box>
          )}

          {/* Google Sign-In - Only shown if configured */}
          {isGoogleConfigured && (
            <>
              {/* In-app browser notice (Telegram, Instagram, etc.) */}
              {isInAppBrowser ? (
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: alpha(emeraldCore.primary, 0.08),
                    border: `1px solid ${alpha(emeraldCore.primary, 0.2)}`,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: emeraldCore.light,
                      mb: 1,
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    {t.auth.inAppBrowserTitle || "Para una mejor experiencia"}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: surfacesDark.text.secondary,
                      mb: 2.5,
                      textAlign: "center",
                      lineHeight: 1.5,
                    }}
                  >
                    {t.auth.inAppBrowserMessage ||
                      "Abre en tu navegador favorito (Chrome, Safari, etc.) para iniciar sesión con Google."}
                  </Typography>

                  <Stack spacing={1.5}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<OpenInNew />}
                      onClick={handleOpenExternal}
                      sx={{
                        bgcolor: emeraldCore.primary,
                        color: "#000",
                        textTransform: "none",
                        py: 1.2,
                        fontWeight: 500,
                        "&:hover": {
                          bgcolor: emeraldCore.light,
                        },
                      }}
                    >
                      {t.auth.openInBrowser || "Abrir en navegador"}
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      startIcon={
                        urlCopied ? <CheckCircleOutline /> : <ContentCopy />
                      }
                      onClick={handleCopyUrl}
                      sx={{
                        color: urlCopied
                          ? emeraldCore.primary
                          : surfacesDark.text.tertiary,
                        textTransform: "none",
                        "&:hover": {
                          color: surfacesDark.text.secondary,
                        },
                      }}
                    >
                      {urlCopied
                        ? t.auth.urlCopied || "Copiado"
                        : t.auth.copyUrl || "Copiar enlace"}
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <>
                  {/* Error messages — placed ABOVE the button so users on
                      small screens can't miss them after a failed attempt. */}
                  {(googleError || authError) && (
                    <Alert
                      severity="warning"
                      sx={{
                        bgcolor: alpha(semanticColors.warning.main, 0.15),
                        color: semanticColors.warning.main,
                        border: `1px solid ${alpha(semanticColors.warning.main, 0.3)}`,
                        "& .MuiAlert-icon": {
                          color: semanticColors.warning.main,
                        },
                      }}
                    >
                      {googleError || authError}
                    </Alert>
                  )}

                  {/* Popup-stuck watchdog warning: GIS button was clicked but
                      no callback fired in time → likely a Safari ITP / 3rd-party
                      cookie / WebView issue. Surface a redirect fallback. */}
                  {popupStuck && !googleError && !authError && (
                    <Alert
                      severity="info"
                      sx={{
                        bgcolor: alpha(emeraldCore.primary, 0.12),
                        color: surfacesDark.text.primary,
                        border: `1px solid ${alpha(emeraldCore.primary, 0.3)}`,
                        "& .MuiAlert-icon": { color: emeraldCore.primary },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, mb: 0.5 }}
                      >
                        ¿No avanza?
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: surfacesDark.text.secondary,
                          display: "block",
                          mb: 1.5,
                        }}
                      >
                        Tu navegador puede estar bloqueando el inicio de sesión.
                        Abre el sitio en Chrome o Safari para continuar.
                      </Typography>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<OpenInNew />}
                        onClick={handleOpenExternal}
                        sx={{
                          bgcolor: emeraldCore.primary,
                          color: "#000",
                          textTransform: "none",
                          "&:hover": { bgcolor: emeraldCore.light },
                        }}
                      >
                        Abrir en navegador
                      </Button>
                    </Alert>
                  )}

                  {/* Normal Google Sign-In button */}
                  <Box
                    onPointerDown={handleButtonAreaPointerDown}
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      "& > div": { width: "100%" },
                      "& iframe": { colorScheme: "normal" },
                    }}
                  >
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
                </>
              )}

              {/* Try another account button - shown after auth error */}
              {authError && !isInAppBrowser && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleTryAnotherAccount}
                  sx={{
                    textTransform: "none",
                    borderColor: alpha(emeraldCore.primary, 0.5),
                    color: emeraldCore.light,
                    "&:hover": {
                      borderColor: emeraldCore.primary,
                      bgcolor: alpha(emeraldCore.primary, 0.1),
                    },
                  }}
                >
                  Intentar con otra cuenta
                </Button>
              )}

              {/* Divider */}
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, my: 1 }}
              >
                <Divider
                  sx={{ flex: 1, borderColor: alpha("#FFFFFF", 0.15) }}
                />
                <Typography
                  variant="caption"
                  sx={{ color: surfacesDark.text.tertiary }}
                >
                  o
                </Typography>
                <Divider
                  sx={{ flex: 1, borderColor: alpha("#FFFFFF", 0.15) }}
                />
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
                "& .MuiAlert-icon": { color: emeraldCore.primary },
                "& .MuiAlert-action": { color: surfacesDark.text.secondary },
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
              fontSize: "0.85rem",
              textTransform: "none",
              color: surfacesDark.text.tertiary,
              "&:hover": {
                color: surfacesDark.text.secondary,
                bgcolor: alpha("#FFFFFF", 0.03),
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
          position: "absolute",
          bottom: 32,
          color: surfacesDark.text.tertiary,
          letterSpacing: "0.1em",
        }}
      >
        {t.auth.colombianEmeralds}
      </Typography>
    </Box>
  );
}
