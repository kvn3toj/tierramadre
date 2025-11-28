import { useState, useEffect, useRef } from 'react';
import { Box, Typography, IconButton, Fade } from '@mui/material';
import { Backspace as BackspaceIcon } from '@mui/icons-material';
import { brandColors } from '../theme';

interface PinLockProps {
  onUnlock: () => void;
}

const CORRECT_PIN = '5555';
const STORAGE_KEY = 'tierra-madre-auth';

export default function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if already authenticated
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem(STORAGE_KEY);
    if (isAuthenticated === 'true') {
      onUnlock();
    }
  }, [onUnlock]);

  // Focus hidden input for keyboard support
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      if (newPin === CORRECT_PIN) {
        sessionStorage.setItem(STORAGE_KEY, 'true');
        setTimeout(() => onUnlock(), 300);
      } else {
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
    }
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
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Hidden input for mobile keyboard if needed */}
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
          Studio
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
          ACCESO PRIVADO
        </Typography>
      </Fade>

      {/* PIN Dots */}
      <Fade in timeout={1400}>
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
          {error ? 'PIN incorrecto' : ''}
        </Typography>
      </Fade>

      {/* Keypad */}
      <Fade in timeout={1600}>
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
        Colombian Emeralds
      </Typography>
    </Box>
  );
}
