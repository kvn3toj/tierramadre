/**
 * UnlockPrompt - Modal for upgrading from Guest to Full Access
 */

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  alpha,
} from '@mui/material';
import { LockOpenOutlined, Backspace as BackspaceIcon } from '@mui/icons-material';
import { emeraldCore, surfacesDark, semanticColors } from '../../design-system/tokens/colors';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';

interface UnlockPromptProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
}

export default function UnlockPrompt({ open, onClose, feature }: UnlockPromptProps) {
  const { upgradeToFull } = useAuth();
  const { t } = useLanguage();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPin('');
      setError(false);
      setShake(false);
      // Small delay to ensure dialog is rendered
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      const success = upgradeToFull(newPin);
      if (success) {
        onClose();
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
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: surfacesDark.background.primary,
          backgroundImage: 'none',
        },
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for keyboard support */}
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

      <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
        <LockOpenOutlined
          sx={{
            fontSize: 48,
            color: emeraldCore.primary,
            mb: 1,
          }}
        />
        <Typography variant="h6" color="white">
          {t.auth.unlockRequired}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {feature || t.auth.unlockFeature}
        </Typography>

        {/* PIN Dots */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            mb: 3,
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
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: `2px solid ${error ? semanticColors.error.main : emeraldCore.primary}`,
                bgcolor: pin.length > i
                  ? (error ? semanticColors.error.main : emeraldCore.primary)
                  : 'transparent',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </Box>

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {t.auth.incorrectPin}
          </Alert>
        )}

        {/* Compact Keypad */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            maxWidth: 220,
            mx: 'auto',
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
                    width: 56,
                    height: 56,
                    color: surfacesDark.text.secondary,
                    '&:hover': {
                      bgcolor: alpha('#FFFFFF', 0.03),
                    },
                  }}
                >
                  <BackspaceIcon fontSize="small" />
                </IconButton>
              );
            }
            return (
              <IconButton
                key={index}
                onClick={() => handleDigit(digit)}
                sx={{
                  width: 56,
                  height: 56,
                  fontSize: '1.5rem',
                  fontWeight: 300,
                  color: surfacesDark.text.primary,
                  bgcolor: alpha('#FFFFFF', 0.03),
                  border: `1px solid ${alpha('#FFFFFF', 0.06)}`,
                  borderRadius: '50%',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: alpha('#FFFFFF', 0.08),
                    borderColor: alpha(emeraldCore.primary, 0.25),
                  },
                  '&:active': {
                    bgcolor: alpha(emeraldCore.primary, 0.12),
                    transform: 'scale(0.95)',
                  },
                }}
              >
                {digit}
              </IconButton>
            );
          })}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center' }}>
        <Button
          onClick={onClose}
          sx={{
            color: surfacesDark.text.secondary,
            textTransform: 'none',
          }}
        >
          {t.actions.cancel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
