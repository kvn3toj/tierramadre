import { Box } from '@mui/material';
import { Lock } from 'lucide-react';
import { vaultPalette } from '../../config/vault';
import type { VaultState, VaultSymbolMeta } from '../../types/vault';
import { VaultSymbol } from './VaultSymbol';

interface VaultCenterProps {
  outerSymbol: VaultSymbolMeta;
  innerDigit: number;
  state: VaultState;
  cooldownSecondsLeft?: number;
}

function formatCooldown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function VaultCenter({
  outerSymbol,
  innerDigit,
  state,
  cooldownSecondsLeft = 0,
}: VaultCenterProps) {
  const isUnlocking = state === 'unlocking';
  const isError = state === 'error';
  const isCooldown = state === 'cooldown';

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'relative',
        zIndex: 10,
        width: { xs: 100, md: 108 },
        height: { xs: 100, md: 108 },
        borderRadius: '50%',
        border: '1px solid',
        borderColor: isUnlocking
          ? 'rgba(212, 175, 55, 0.7)'
          : isCooldown
            ? vaultPalette.error
            : 'rgba(212, 165, 116, 0.3)',
        background: isUnlocking
          ? `radial-gradient(circle, ${vaultPalette.goldGlow}, rgba(12, 6, 3, 0.9))`
          : 'radial-gradient(circle, rgba(20, 12, 8, 0.92), rgba(8, 4, 2, 0.97))',
        boxShadow: isUnlocking
          ? `0 0 50px ${vaultPalette.goldGlow}, inset 0 0 20px rgba(212, 175, 55, 0.15)`
          : '0 4px 24px rgba(0, 0, 0, 0.6)',
        transition: 'border-color 0.4s, background 0.4s, box-shadow 0.4s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: 1,
        animation: isError
          ? 'vaultShake 0.4s ease'
          : isUnlocking
            ? 'vaultGlow 1s ease-in-out'
            : undefined,
        '@keyframes vaultShake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        '@keyframes vaultGlow': {
          '0%': { boxShadow: '0 4px 24px rgba(0, 0, 0, 0.6)' },
          '50%': {
            boxShadow:
              '0 0 70px rgba(212, 175, 55, 0.7), 0 0 140px rgba(212, 175, 55, 0.25)',
          },
          '100%': {
            boxShadow:
              '0 0 50px rgba(212, 175, 55, 0.5), inset 0 0 20px rgba(212, 175, 55, 0.15)',
          },
        },
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none !important',
        },
      }}
    >
      {isCooldown ? (
        <>
          <Lock size={24} color={vaultPalette.gold} aria-hidden />
          <Box
            component="span"
            sx={{
              mt: 0.5,
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: vaultPalette.gold,
              fontVariantNumeric: 'tabular-nums',
            }}
            aria-label={`Bloqueado por ${formatCooldown(cooldownSecondsLeft)}`}
          >
            {formatCooldown(cooldownSecondsLeft)}
          </Box>
        </>
      ) : (
        <>
          <VaultSymbol id={outerSymbol.id} size={26} color={outerSymbol.color} />
          <Box
            component="span"
            sx={{
              mt: 0.5,
              fontFamily: '"Playfair Display", serif',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: outerSymbol.color,
              textShadow: '0 1px 6px rgba(0, 0, 0, 0.7)',
              lineHeight: 1,
            }}
          >
            {outerSymbol.name}
          </Box>
          <Box
            component="span"
            sx={{
              mt: 0.5,
              fontSize: '1.2rem',
              fontWeight: 700,
              color: vaultPalette.gold,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {innerDigit}
          </Box>
        </>
      )}
    </Box>
  );
}
