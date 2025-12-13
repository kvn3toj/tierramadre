/**
 * VaultGate Component
 *
 * PIN lock screen for Secret Vault access
 * - Luxury design with vault aesthetics
 * - 4-digit PIN input
 * - Attempt limiting with cooldown
 * - Animated unlock transition
 */

import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Alert, alpha } from '@mui/material';
import { Vault, Lock, Sparkles, ChevronRight } from 'lucide-react';
import { useVaultAccess } from '../hooks/useVaultAccess';
import { useLanguage } from '../contexts/LanguageContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { emeraldCore, goldAccent, surfacesLight, surfacesDark } from '../design-system/tokens/colors';
import { spacing } from '../design-system/tokens/primitives/spacing';

interface VaultGateProps {
  onUnlock: () => void;
}

const VaultGate: React.FC<VaultGateProps> = ({ onUnlock }) => {
  const { t } = useLanguage();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const { unlock, remainingAttempts, isCooldown } = useVaultAccess();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('El PIN debe tener 4 dígitos');
      return;
    }

    setIsUnlocking(true);
    const result = await unlock(pin);

    if (result.success) {
      // Simulate vault opening animation
      setTimeout(() => {
        onUnlock();
      }, 800);
    } else {
      setError(result.message || 'PIN incorrecto');
      setPin('');
      setIsUnlocking(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isLight
          ? `linear-gradient(135deg, ${alpha(goldAccent.primary, 0.05)} 0%, ${alpha(
              emeraldCore.primary,
              0.05
            )} 100%)`
          : `linear-gradient(135deg, ${alpha(goldAccent.primary, 0.1)} 0%, ${alpha(
              emeraldCore.primary,
              0.1
            )} 100%)`,
        px: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: 480,
          width: '100%',
          p: { xs: 3, sm: 4 },
          borderRadius: spacing.xl,
          bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
          border: '2px solid',
          borderColor: alpha(goldAccent.primary, 0.3),
          boxShadow: `0 20px 60px ${alpha(goldAccent.primary, 0.2)}`,
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: alpha(goldAccent.primary, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: -2,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${goldAccent.primary}, ${emeraldCore.primary})`,
              opacity: 0.3,
              filter: 'blur(8px)',
            },
          }}
        >
          <Vault size={40} color={goldAccent.primary} />
        </Box>

        {/* Title */}
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '24px', sm: '28px' },
            fontWeight: 700,
            color: isLight ? surfacesLight.text.primary : surfacesDark.text.primary,
            textAlign: 'center',
            mb: 1,
          }}
        >
          {t.pages.vault.title}
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary,
            textAlign: 'center',
            mb: 4,
          }}
        >
          {t.pages.vault.subtitle}
        </Typography>

        {/* Info Badge */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            justifyContent: 'center',
            mb: 3,
            p: 2,
            borderRadius: spacing.md,
            bgcolor: alpha(emeraldCore.primary, 0.05),
            border: '1px solid',
            borderColor: alpha(emeraldCore.primary, 0.2),
          }}
        >
          <Sparkles size={16} color={emeraldCore.primary} />
          <Typography
            variant="body2"
            sx={{
              color: emeraldCore.dark,
              fontWeight: 500,
              fontSize: '14px',
            }}
          >
            Acceso a tesoros únicos y exóticos
          </Typography>
        </Box>

        {/* PIN Form */}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            type="password"
            value={pin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPin(value);
              setError('');
            }}
            placeholder="Ingresa PIN de 4 dígitos"
            disabled={isCooldown || isUnlocking}
            inputProps={{
              maxLength: 4,
              pattern: '[0-9]*',
              inputMode: 'numeric',
            }}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: spacing.md,
                bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.secondary,
                fontSize: '24px',
                letterSpacing: '8px',
                textAlign: 'center',
                fontWeight: 600,
              },
            }}
            InputProps={{
              startAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                  <Lock size={20} color={goldAccent.primary} />
                </Box>
              ),
            }}
          />

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: spacing.md }}>
              {error}
            </Alert>
          )}

          {/* Attempts Info */}
          {!isCooldown && remainingAttempts < 3 && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                color: isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary,
                mb: 2,
              }}
            >
              Intentos restantes: {remainingAttempts}
            </Typography>
          )}

          {/* Submit Button */}
          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={pin.length !== 4 || isCooldown || isUnlocking}
            endIcon={<ChevronRight size={20} />}
            sx={{
              py: 1.5,
              borderRadius: spacing.md,
              background: `linear-gradient(135deg, ${goldAccent.primary} 0%, ${goldAccent.dark} 100%)`,
              color: 'white',
              fontWeight: 600,
              fontSize: '16px',
              textTransform: 'none',
              boxShadow: `0 4px 16px ${alpha(goldAccent.primary, 0.4)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${goldAccent.dark} 0%, ${goldAccent.primary} 100%)`,
                boxShadow: `0 6px 20px ${alpha(goldAccent.primary, 0.5)}`,
              },
              '&:disabled': {
                bgcolor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
                color: isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary,
              },
            }}
          >
            {isUnlocking ? 'Desbloqueando...' : 'Desbloquear Bóveda'}
          </Button>
        </form>

        {/* Help Text */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            color: isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary,
            mt: 3,
          }}
        >
          ¿No tienes acceso? Contacta al administrador
        </Typography>
      </Box>
    </Box>
  );
};

export default VaultGate;
