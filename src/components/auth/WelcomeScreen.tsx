/**
 * WelcomeScreen - Dual Access Entry Point
 * Offers Guest Mode (no PIN) or Full Access (PIN required)
 */

import { useState, useRef, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Fade, Stack } from '@mui/material';
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus hidden input for keyboard support when in PIN mode
  useEffect(() => {
    if (viewMode === 'pin') {
      inputRef.current?.focus();
    }
  }, [viewMode]);

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
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: brandColors.darkBg,
        background: `linear-gradient(180deg, ${brandColors.darkBg} 0%, #0a0a0a 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
      onKeyDown={viewMode === 'pin' ? handleKeyDown : undefined}
      tabIndex={0}
    >
      {/* Hidden input for keyboard support */}
      {viewMode === 'pin' && (
        <input
          ref={inputRef}
          type="tel"
          style={{
            position: 'absolute',
            opacity: 0,
            width: 0,
            height: 0,
          }}
          onKeyDown={handleKeyDown}
        />
      )}

      {/* Decorative emerald glow */}
      <Box
        sx={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${brandColors.emeraldGreen}15 0%, transparent 70%)`,
          top: '10%',
          filter: 'blur(60px)',
        }}
      />

      {/* Logo */}
      <Fade in timeout={800}>
        <Box
          component="img"
          src="/logo-tierra-madre.png"
          alt="Tierra Madre"
          sx={{
            height: 80,
            mb: 4,
            opacity: 0.9,
          }}
        />
      </Fade>

      {/* Title */}
      <Fade in timeout={1000}>
        <Typography
          variant="h5"
          sx={{
            color: '#ffffff',
            fontFamily: '"Libre Baskerville", Georgia, serif',
            fontWeight: 400,
            letterSpacing: '0.1em',
            mb: 1,
            textTransform: 'uppercase',
          }}
        >
          {t.auth.studio}
        </Typography>
      </Fade>

      <Fade in timeout={1200}>
        <Typography
          variant="body2"
          sx={{
            color: brandColors.emeraldGreen,
            letterSpacing: '0.2em',
            mb: 4,
            fontSize: '0.75rem',
          }}
        >
          {t.auth.welcomeSubtitle}
        </Typography>
      </Fade>

      {/* Choice View */}
      {viewMode === 'choice' && (
        <Fade in timeout={1400}>
          <Stack spacing={2} sx={{ width: 280 }}>
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

            <Typography
              variant="caption"
              sx={{
                color: '#666',
                textAlign: 'center',
                mt: 1,
              }}
            >
              {t.auth.guestDescription}
            </Typography>
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

          {/* Error message */}
          <Fade in={error}>
            <Typography
              variant="caption"
              sx={{
                color: '#ff4444',
                mb: 2,
                height: 20,
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
