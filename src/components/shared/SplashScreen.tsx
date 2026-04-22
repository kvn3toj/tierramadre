/**
 * SplashScreen - Premium breathing animation with symbol logo and random quote
 * Extended timing (4s total) to preload hero images
 * - 0-1.5s: Symbol fades in with subtle scale
 * - 1.5-3.7s: Breathing glow (1.5 pulses) + Random quote appears
 * - 3.7-4.0s: Smooth fade out
 *
 * Video Mode (?video=true): 60s animation with full branding
 * - Symbol logo → Wordmark "Tierra Madre" → Slogan → Rotating quotes
 * - Continuous breathing glow (infinite loop)
 *
 * Respects prefers-reduced-motion for accessibility
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, useMediaQuery, IconButton } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { brandColors } from '../../theme';
import { zIndex, goldAccent } from '../../design-system';

// Splash screen quotes - different from Oracle quotes
const SPLASH_QUOTES = [
  'La belleza de una esmeralda radica en su autenticidad',
  'Cada esmeralda cuenta la historia de millones de años',
  'El verde de Colombia brilla en cada faceta',
  'Tesoros de la tierra, joyas del corazón',
  'La esencia de Colombia en cada piedra',
  'Donde la naturaleza crea obras maestras',
  'Esmeraldas que capturan la luz del alma',
  'El poder de la tierra en tu mano',
  // Peace-aligned additions
  'Donde nace la paz, brotan esmeraldas',
  'Raíces de montaña, destellos de alma',
  'Verde como el origen, puro como la intención',
  'Del corazón de Colombia para el mundo',
  'La paz también brilla en facetas',
  'Herencia de la tierra, promesa de futuro',
  'Cada esmeralda lleva el latido de una comunidad',
  'Lo que la montaña protege, el corazón honra',
];

const VIDEO_DURATION_MS = 60000;
const VIDEO_FADE_TIME_MS = 59000;
const VIDEO_QUOTE_INTERVAL_MS = 5500;
const VIDEO_QUOTE_COUNT = 10; // 10 × 5.5s = 55s, leaves room for intro + fade
const NORMAL_DURATION_MS = 4000;
const NORMAL_FADE_TIME_MS = 3700;

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Check if we are in video generation mode
  const isVideoMode = new URLSearchParams(window.location.search).get('video') === 'true';
  const durationMs = isVideoMode ? VIDEO_DURATION_MS : NORMAL_DURATION_MS;

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  // Key used to restart the entire animation in-memory when recording begins
  const [animationKey, setAnimationKey] = useState(0);

  // Select quotes for video mode — 10 random, shuffled fresh on every restart
  const videoQuotes = useMemo(() => {
    const shuffled = [...SPLASH_QUOTES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, VIDEO_QUOTE_COUNT);
  }, [animationKey]);

  // Select random quote for normal mode
  const randomQuote = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * SPLASH_QUOTES.length);
    return SPLASH_QUOTES[randomIndex];
  }, []);

  useEffect(() => {
    const fadeTime = isVideoMode ? VIDEO_FADE_TIME_MS : NORMAL_FADE_TIME_MS;

    const fadeTimer = setTimeout(() => setFadeOut(true), fadeTime);
    const completeTimer = setTimeout(() => {
      if (!isVideoMode) onComplete?.();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, isVideoMode, durationMs, animationKey]);

  // Quote cycle effect for video mode
  useEffect(() => {
    if (!isVideoMode) return;

    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % videoQuotes.length);
    }, VIDEO_QUOTE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isVideoMode, animationKey, videoQuotes.length]);

  // Handle Video Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          frameRate: 60,
        } as MediaTrackConstraints,
        audio: false,
      });

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tierra-madre-splash-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
      };

      // Stop if user ends screen share manually
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (recorder.state !== 'inactive') recorder.stop();
      });

      // Restart the animation in-memory (no reload, which would kill the recorder)
      setFadeOut(false);
      setQuoteIndex(0);
      setAnimationKey(k => k + 1);
      setIsRecording(true);

      recorder.start();

      // Auto-stop shortly after the full video window (buffer for final fade-out)
      setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, VIDEO_DURATION_MS + 500);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setIsRecording(false);
    }
  };

  // Animation curves
  const easeSmooth: [number, number, number, number] = [0.16, 1, 0.3, 1];
  const easeStandard: [number, number, number, number] = [0.4, 0, 0.2, 1];

  const logoTransition = isVideoMode
    ? { duration: 2.2, ease: easeSmooth }
    : { duration: 3.7, times: [0, 0.35, 0.55, 0.7, 0.85, 1], ease: easeStandard };

  const logoAnimate = prefersReducedMotion
    ? { opacity: 1 }
    : isVideoMode
      ? { opacity: [0, 1], scale: [0.85, 1] }
      : { opacity: [0, 1, 1, 1, 1, 1], scale: [0.92, 1, 1.03, 1, 1.03, 1] };

  return (
    <Box
      key={animationKey}
      component={motion.div}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: isVideoMode ? 1.0 : 0.3, ease: 'easeOut' }}
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: brandColors.darkBg,
        background: `radial-gradient(ellipse at 50% 30%, #0d1a14 0%, ${brandColors.darkBg} 50%, #050505 100%)`,
        zIndex: zIndex.modal,
        overflow: 'hidden',
      }}
    >
      {/* Video Mode Record Button - Hidden during recording */}
      {isVideoMode && !isRecording && (
        <IconButton
          onClick={startRecording}
          sx={{ position: 'absolute', top: 20, right: 20, color: 'white', zIndex: zIndex.modal + 10 }}
        >
          <DownloadIcon />
        </IconButton>
      )}

      {/* Main breathing glow - behind logo */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={
          prefersReducedMotion
            ? { opacity: 0.5, scale: 1 }
            : isVideoMode
              ? { opacity: [0.45, 0.7, 0.45], scale: [0.95, 1.1, 0.95] }
              : { opacity: [0, 0.5, 0.7, 0.5, 0.7, 0.5], scale: [0.9, 1, 1.1, 1, 1.1, 1] }
        }
        transition={{
          duration: isVideoMode ? 6 : 3.7,
          ease: 'easeInOut',
          repeat: isVideoMode ? Infinity : 0,
        }}
        sx={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${brandColors.emeraldGreen}30 0%, ${brandColors.emeraldGreen}10 40%, transparent 70%)`,
          filter: 'blur(50px)',
        }}
      />

      {/* Inner glow ring - subtle pulse */}
      {!prefersReducedMotion && (
        <Box
          component={motion.div}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={
            isVideoMode
              ? { opacity: [0.35, 0.55, 0.35], scale: [0.98, 1.05, 0.98] }
              : { opacity: [0, 0.4, 0.6, 0.4, 0.6, 0.4], scale: [0.95, 1, 1.05, 1, 1.05, 1] }
          }
          transition={{
            duration: isVideoMode ? 5 : 3.7,
            ease: 'easeInOut',
            delay: 0.15,
            repeat: isVideoMode ? Infinity : 0,
          }}
          sx={{
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${brandColors.emeraldGreen}35 0%, transparent 60%)`,
            filter: 'blur(25px)',
          }}
        />
      )}

      {/* Logo + Branding + Quote Container */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: { xs: 2.5, sm: 3 },
          position: 'relative',
          zIndex: zIndex.base,
        }}
      >
        {/* Symbol Logo */}
        <Box
          component={motion.img}
          src="/logo-symbol.png"
          alt="Tierra Madre - Esmeraldas Colombianas"
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : (isVideoMode ? 0.85 : 0.92) }}
          animate={logoAnimate}
          transition={logoTransition}
          sx={{
            width: { xs: 'calc(42vw * 0.77)', sm: 170 },
            maxWidth: 185,
            height: 'auto',
            filter: 'drop-shadow(0 0 35px rgba(80, 200, 120, 0.35))',
          }}
        />

        {/* Wordmark + Slogan (video mode only) */}
        {isVideoMode && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              textAlign: 'center',
            }}
          >
            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 12 }}
              animate={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 1.6, ease: easeSmooth }}
            >
              <Typography
                component="h1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.96)',
                  fontSize: { xs: '1.8rem', sm: '2.1rem' },
                  fontWeight: 300,
                  letterSpacing: { xs: '0.35em', sm: '0.42em' },
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  textIndent: { xs: '0.35em', sm: '0.42em' }, // compensate for trailing tracking
                  fontFamily: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
                }}
              >
                Tierra Madre
              </Typography>
            </Box>

            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              transition={{ duration: 1.0, delay: 2.4, ease: easeSmooth }}
            >
              <Typography
                sx={{
                  color: goldAccent.primary,
                  fontSize: { xs: '0.78rem', sm: '0.88rem' },
                  fontWeight: 400,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  fontStyle: 'normal',
                }}
              >
                Esmeraldas con ADN de Paz
              </Typography>
            </Box>
          </Box>
        )}

        {/* Quotes */}
        <Box
          sx={{
            textAlign: 'center',
            maxWidth: { xs: 300, sm: 360 },
            px: 2,
            mt: isVideoMode ? 1 : 0,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isVideoMode ? (
            <Box
              component={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 3.2, ease: easeSmooth }}
              sx={{ width: '100%' }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={quoteIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.8, ease: easeSmooth }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.78)',
                      fontSize: { xs: '0.85rem', sm: '0.95rem' },
                      fontWeight: 300,
                      lineHeight: 1.6,
                      fontStyle: 'italic',
                      letterSpacing: 0.3,
                    }}
                  >
                    "{videoQuotes[quoteIndex]}"
                  </Typography>
                </motion.div>
              </AnimatePresence>
            </Box>
          ) : (
            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 10 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 1, y: 0 }
                  : { opacity: [0, 0, 1], y: [10, 10, 0] }
              }
              transition={{
                duration: 3.7,
                times: [0, 0.4, 1],
                ease: 'easeOut',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: { xs: '0.85rem', sm: '0.9rem' },
                  fontWeight: 300,
                  lineHeight: 1.6,
                  fontStyle: 'italic',
                  letterSpacing: 0.3,
                }}
              >
                "{randomQuote}"
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
