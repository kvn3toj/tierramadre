import { Box, Button, Typography, alpha } from '@mui/material';
import { motion, type MotionValue } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { VAULT_CONFIG, VAULT_STORAGE, VAULT_SYMBOLS, vaultPalette } from '../../config/vault';
import { useVaultUnlock } from '../../hooks/useVaultUnlock';
import type { UnlockMethod, VaultCombination, VaultSymbolMeta } from '../../types/vault';
import { VaultCenter } from './VaultCenter';
import { VaultDial, type VaultDialItem } from './VaultDial';
import { VaultDialLabel } from './VaultDialLabel';
import { VaultSymbol } from './VaultSymbol';

export interface VaultLockScreenProps {
  onUnlock: (meta: UnlockMethod) => void;
  ambassadorCodes?: Map<string, VaultCombination>;
}

export function VaultLockScreen({ onUnlock, ambassadorCodes }: VaultLockScreenProps) {
  const {
    outerIdx,
    innerIdx,
    setOuterIdx,
    setInnerIdx,
    state,
    attemptsLeft,
    cooldownSecondsLeft,
    tryUnlock,
  } = useVaultUnlock({ ambassadorCodes });

  const outerSymbol: VaultSymbolMeta = VAULT_SYMBOLS[outerIdx];

  const wheelRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [fadeOut, setFadeOut] = useState(false);

  // Responsive scale.
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / VAULT_CONFIG.WHEEL_BASE));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Fire onUnlock after glow + fade.
  useEffect(() => {
    if (state !== 'unlocking') return;
    const glow = setTimeout(() => setFadeOut(true), VAULT_CONFIG.UNLOCK_ANIMATION_MS);
    const finish = setTimeout(() => {
      const raw = (() => {
        try {
          return localStorage.getItem(VAULT_STORAGE.UNLOCK_METHOD);
        } catch {
          return null;
        }
      })();
      if (raw === 'universal') {
        onUnlock({ method: 'universal' });
      } else if (raw && raw.startsWith('ambassador:')) {
        onUnlock({ method: 'ambassador', ambassadorSlug: raw.slice('ambassador:'.length) });
      } else {
        onUnlock({ method: 'universal' });
      }
    }, VAULT_CONFIG.UNLOCK_ANIMATION_MS + VAULT_CONFIG.FADE_OUT_MS);
    return () => {
      clearTimeout(glow);
      clearTimeout(finish);
    };
  }, [state, onUnlock]);

  // Outer items (symbols).
  const outerItems: VaultDialItem[] = useMemo(
    () =>
      VAULT_SYMBOLS.map((s) => ({
        id: s.id,
        label: s.name,
        color: s.color,
      })),
    [],
  );

  // Inner items (digits 0-9).
  const innerItems: VaultDialItem[] = useMemo(
    () =>
      Array.from({ length: VAULT_CONFIG.INNER_STEPS }, (_, i) => ({
        id: String(i),
        label: i,
      })),
    [],
  );

  const renderOuterLabel = useCallback(
    (item: VaultDialItem, i: number, ringRotate: MotionValue<number>) => (
      <VaultDialLabel
        key={item.id}
        index={i}
        totalItems={VAULT_CONFIG.OUTER_STEPS}
        radius={VAULT_CONFIG.OUTER_RADIUS}
        ringRotate={ringRotate}
        width={72}
      >
        <VaultSymbol id={VAULT_SYMBOLS[i].id} size={22} color={item.color} />
        <Box
          component="span"
          sx={{
            mt: 0.3,
            fontSize: { xs: '9px', md: '10px' },
            fontWeight: 600,
            textAlign: 'center',
            lineHeight: 1.1,
            color: item.color,
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
          }}
        >
          {VAULT_SYMBOLS[i].name}
        </Box>
      </VaultDialLabel>
    ),
    [],
  );

  const renderInnerLabel = useCallback(
    (item: VaultDialItem, i: number, ringRotate: MotionValue<number>) => (
      <VaultDialLabel
        key={item.id}
        index={i}
        totalItems={VAULT_CONFIG.INNER_STEPS}
        radius={VAULT_CONFIG.INNER_RADIUS}
        ringRotate={ringRotate}
        width={40}
      >
        <Box
          component="span"
          sx={{
            fontFamily: '"Playfair Display", serif',
            fontSize: { xs: '18px', md: '20px' },
            fontWeight: 700,
            color: vaultPalette.gold,
            textShadow: '0 1px 6px rgba(0, 0, 0, 0.8)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {i}
        </Box>
      </VaultDialLabel>
    ),
    [],
  );

  const disabled = state === 'unlocking' || state === 'cooldown';

  const combinationLabel = `Combinación: ${outerSymbol.name}, ${innerIdx}`;

  return (
    <motion.div
      animate={fadeOut ? { opacity: 0, scale: 1.06 } : { opacity: 1, scale: 1 }}
      transition={{ duration: VAULT_CONFIG.FADE_OUT_MS / 1000, ease: 'easeIn' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background layers */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at center, ${vaultPalette.bg} 0%, #000 70%)`,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundColor: vaultPalette.bgOverlay,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Content */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          px: 2,
          py: 2.5,
          width: '100%',
          maxWidth: 460,
          paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontFamily: '"Playfair Display", serif',
            fontSize: '2.25rem',
            fontWeight: 700,
            color: '#fff',
            textShadow: '0 2px 12px rgba(0, 0, 0, 0.5)',
            letterSpacing: '-0.02em',
          }}
        >
          Bóveda Secreta
        </Typography>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: vaultPalette.textMuted,
            mt: -0.5,
            mb: 1,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Gira las ruedas y abre
        </Typography>

        {/* Wheel container */}
        <Box
          ref={wheelRef}
          role="group"
          aria-label={combinationLabel}
          sx={{
            position: 'relative',
            aspectRatio: '1 / 1',
            width: '100%',
            maxWidth: `min(92vw, ${VAULT_CONFIG.WHEEL_BASE}px)`,
          }}
        >
          {/* Top pointer */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              left: '50%',
              top: 0,
              transform: 'translateX(-50%)',
              zIndex: 20,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6))',
              width: 0,
              height: 0,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: `20px solid ${vaultPalette.gold}`,
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${scale})`,
            }}
          >
            <VaultDial
              items={outerItems}
              value={outerIdx}
              onChange={setOuterIdx}
              size={VAULT_CONFIG.OUTER_SIZE}
              radius={VAULT_CONFIG.OUTER_RADIUS}
              disabled={disabled}
              ariaLabel="Anillo exterior: símbolo"
              renderLabel={renderOuterLabel}
            />
            <VaultDial
              items={innerItems}
              value={innerIdx}
              onChange={setInnerIdx}
              size={VAULT_CONFIG.INNER_SIZE}
              radius={VAULT_CONFIG.INNER_RADIUS}
              disabled={disabled}
              ariaLabel="Anillo interior: dígito"
              renderLabel={renderInnerLabel}
            />
            <VaultCenter
              outerSymbol={outerSymbol}
              innerDigit={innerIdx}
              state={state}
              cooldownSecondsLeft={cooldownSecondsLeft}
            />
          </Box>
        </Box>

        {/* Error / attempt feedback */}
        <Box
          aria-live="polite"
          sx={{
            height: 20,
            mt: 0.5,
            fontSize: '0.75rem',
            color: vaultPalette.error,
            textAlign: 'center',
          }}
        >
          {state === 'error' &&
            (attemptsLeft > 0
              ? `Combinación incorrecta. ${attemptsLeft} intento${attemptsLeft === 1 ? '' : 's'} restante${attemptsLeft === 1 ? '' : 's'}.`
              : 'Demasiados intentos. Bóveda bloqueada.')}
        </Box>

        {/* Confirm */}
        <Button
          onClick={tryUnlock}
          disabled={disabled}
          aria-label="Confirmar combinación"
          sx={{
            minWidth: 130,
            height: 46,
            borderRadius: '14px',
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.85)',
            backgroundColor: alpha(vaultPalette.gold, 0.12),
            border: `1px solid ${alpha(vaultPalette.gold, 0.3)}`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
            mt: 1,
            '&:hover': {
              backgroundColor: alpha(vaultPalette.gold, 0.2),
              borderColor: alpha(vaultPalette.gold, 0.45),
            },
            '&:active': {
              backgroundColor: alpha(vaultPalette.gold, 0.25),
            },
            '&.Mui-disabled': {
              color: 'rgba(255, 255, 255, 0.4)',
              borderColor: alpha(vaultPalette.gold, 0.2),
              backgroundColor: alpha(vaultPalette.gold, 0.05),
            },
          }}
        >
          {state === 'unlocking' ? <Lock size={16} color={vaultPalette.gold} /> : 'Abrir'}
        </Button>
      </Box>
    </motion.div>
  );
}
