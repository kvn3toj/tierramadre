/**
 * WelcomeScreen - Dual Access Entry Point
 * Offers Guest Mode (no PIN) or Full Access (PIN required)
 * Smooth fade-in transition from splash screen
 */

import { useState } from 'react';
import { Box, Typography, Button, IconButton, Fade, Stack } from '@mui/material';
import { motion } from 'framer-motion';
import { Backspace as BackspaceIcon, VisibilityOutlined, LockOpenOutlined } from '@mui/icons-material';
import { brandColors } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';

type ViewMode = 'choice' | 'pin';

export default function WelcomeScreen() {
  const { loginAsGuest, loginWithPin } = useAuth();
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>('choice');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      const success = loginWithPin(newPin);
      if (!success) {
        setError(true);
        setShake(true);
        setTimeout(() => {
          setPin('');
          setShake(false);
        }, 500);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      handleDigit(e.key);
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (e.key === 'Escape') {
      setViewMode('choice');
      setPin('');
      setError(false);
    }
  };

  const handleGuestAccess = () => {
    loginAsGuest();
  };

  const handleFullAccessClick = () => {
    setViewMode('pin');
    setPin('');
    setError(false);
  };

  const handleBackToChoice = () => {
    setViewMode('choice');
    setPin('');
    setError(false);
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

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
        bgcolor: brandColors.darkBg,
        background: `radial-gradient(ellipse at 50% 30%, #0d1a14 0%, ${brandColors.darkBg} 50%, #050505 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
      onKeyDown={viewMode === 'pin' ? handleKeyDown : undefined}
      tabIndex={0}
    >
      {/* Subtle ambient glow - top */}
      <Box
        sx={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${brandColors.emeraldGreen}12 0%, transparent 70%)`,
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
          background: `radial-gradient(circle, ${brandColors.emeraldGreen}08 0%, transparent 70%)`,
          bottom: '15%',
          filter: 'blur(40px)',
        }}
      />

      {/* Branded Logo - includes "TIERRA MÄDRE" and "Esencia y Poder" */}
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

      {/* Choice View */}
      {viewMode === 'choice' && (
        <Fade in timeout={800}>
          <Stack spacing={2} sx={{ width: { xs: '70vw', sm: 340 }, maxWidth: 400, mt: 1.5 }}>
            {/* Full Access Button */}
            <Button
              variant="contained"
              size="large"
              startIcon={<LockOpenOutlined />}
              onClick={handleFullAccessClick}
              fullWidth
              sx={{
                py: 1.5,
                fontSize: '1rem',
                textTransform: 'none',
                bgcolor: brandColors.emeraldGreen,
                color: '#ffffff',
                borderRadius: 2,
                '&:hover': {
                  bgcolor: brandColors.emeraldGreen + 'dd',
                },
              }}
            >
              {t.auth.fullAccess}
            </Button>

            {/* Guest Access Button */}
            <Button
              variant="outlined"
              size="large"
              startIcon={<VisibilityOutlined />}
              onClick={handleGuestAccess}
              fullWidth
              sx={{
                py: 1.5,
                fontSize: '1rem',
                textTransform: 'none',
                borderColor: '#ffffff40',
                color: '#ffffff',
                borderRadius: 2,
                '&:hover': {
                  borderColor: brandColors.emeraldGreen,
                  bgcolor: '#ffffff08',
                },
              }}
            >
              {t.auth.guestAccess}
            </Button>

          </Stack>
        </Fade>
      )}

      {/* PIN Entry View */}
      {viewMode === 'pin' && (
        <>
          {/* PIN Dots */}
          <Fade in timeout={400}>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                mb: 4,
                animation: shake ? 'shake 0.5s ease-in-out' : 'none',
                '@keyframes shake': {
                  '0%, 100%': { transform: 'translateX(0)' },
                  '20%, 60%': { transform: 'translateX(-10px)' },
                  '40%, 80%': { transform: 'translateX(10px)' },
                },
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: `2px solid ${error ? '#ff4444' : brandColors.emeraldGreen}`,
                    bgcolor: pin.length > i
                      ? (error ? '#ff4444' : brandColors.emeraldGreen)
                      : 'transparent',
                    transition: 'all 0.2s ease',
                    boxShadow: pin.length > i
                      ? `0 0 10px ${error ? '#ff4444' : brandColors.emeraldGreen}50`
                      : 'none',
                  }}
                />
              ))}
            </Box>
          </Fade>

          {/* Error message - with ARIA live region for accessibility */}
          <Fade in={error}>
            <Typography
              variant="caption"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              sx={{
                color: '#ff4444',
                mb: 2,
                minHeight: 20,
              }}
            >
              {error ? t.auth.incorrectPin : ''}
            </Typography>
          </Fade>

          {/* Keypad */}
          <Fade in timeout={600}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1.5,
                maxWidth: 280,
              }}
            >
              {digits.map((digit, index) => {
                if (digit === '') {
                  return <Box key={index} />;
                }
                if (digit === 'back') {
                  return (
                    <IconButton
                      key={index}
                      onClick={handleBackspace}
                      sx={{
                        width: 72,
                        height: 72,
                        color: '#666',
                        '&:hover': {
                          bgcolor: '#ffffff08',
                        },
                      }}
                    >
                      <BackspaceIcon />
                    </IconButton>
                  );
                }
                return (
                  <IconButton
                    key={index}
                    onClick={() => handleDigit(digit)}
                    sx={{
                      width: 72,
                      height: 72,
                      fontSize: '1.75rem',
                      fontWeight: 300,
                      color: '#ffffff',
                      bgcolor: '#ffffff08',
                      border: '1px solid #ffffff10',
                      borderRadius: '50%',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: '#ffffff15',
                        borderColor: brandColors.emeraldGreen + '40',
                      },
                      '&:active': {
                        bgcolor: brandColors.emeraldGreen + '20',
                        transform: 'scale(0.95)',
                      },
                    }}
                  >
                    {digit}
                  </IconButton>
                );
              })}
            </Box>
          </Fade>

          {/* Back Button */}
          <Fade in timeout={800}>
            <Button
              onClick={handleBackToChoice}
              sx={{
                mt: 3,
                color: '#666',
                textTransform: 'none',
                '&:hover': {
                  color: '#999',
                  bgcolor: 'transparent',
                },
              }}
            >
              {t.auth.back}
            </Button>
          </Fade>
        </>
      )}

      {/* Footer */}
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 32,
          color: '#444',
          letterSpacing: '0.1em',
        }}
      >
        {t.auth.colombianEmeralds}
      </Typography>
    </Box>
  );
}
