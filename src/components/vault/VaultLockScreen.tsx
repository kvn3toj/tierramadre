// src/components/vault/VaultLockScreen.tsx
import { Box, Button } from '@mui/material';
import { motion, type MotionValue } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Volume2, VolumeX } from 'lucide-react';
import { vaultCinema, vaultDurations, vaultEasing } from '../../design-system';
import { VAULT_CONFIG, VAULT_STORAGE, VAULT_SYMBOLS } from '../../config/vault';
import { useVaultUnlock } from '../../hooks/useVaultUnlock';
import { useVaultReducedMotion } from '../../hooks/useVaultReducedMotion';
import type { UnlockMethod, VaultCombination } from '../../types/vault';
import { VaultDial, type VaultDialItem } from './VaultDial';
import { VaultDialLabel } from './VaultDialLabel';
import { VaultDoorFrame } from './cinematic/VaultDoorFrame';
import { VaultGemPointer } from './cinematic/VaultGemPointer';
import { VaultMonumentCenter } from './cinematic/VaultMonumentCenter';
import { VaultCardinalRelease } from './cinematic/VaultCardinalRelease';
import { VaultInterior } from './cinematic/VaultInterior';
import { useVaultCinematicSequence } from './cinematic/useVaultCinematicSequence';
import { useVaultAudio } from './audio/useVaultAudio';

export interface VaultLockScreenProps {
  onUnlock: (meta: UnlockMethod) => void;
  ambassadorCodes?: Map<string, VaultCombination>;
}

const { color, alpha, typography } = vaultCinema;

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

  const { reducedMotion } = useVaultReducedMotion();
  const audio = useVaultAudio();
  const wheelRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerOpacity, setContainerOpacity] = useState(1);
  const lastUnlockAttempt = useRef<number>(0);

  const outerSymbol = VAULT_SYMBOLS[outerIdx];

  const sequence = useVaultCinematicSequence({
    state,
    reducedMotion,
    onSequenceComplete: useCallback(() => {
      setContainerOpacity(0);
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
    }, [onUnlock]),
  });

  // Trigger audio per phase
  useEffect(() => {
    if (sequence.phase === 'confirm') void audio.play('click-suizo');
    if (sequence.phase === 'release') void audio.play('thunk-mecanico');
    if (sequence.phase === 'swing') void audio.play('crujido-swing');
    if (sequence.phase === 'reveal') void audio.play('pad-reveal');
    if (sequence.phase === 'failure') void audio.play('shake-error');
  }, [sequence.phase, audio]);

  // Responsive scale (keep existing behaviour from previous version)
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / VAULT_CONFIG.WHEEL_BASE));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const outerItems: VaultDialItem[] = useMemo(
    () => VAULT_SYMBOLS.map((s) => ({ id: s.id, label: s.name, color: s.color })),
    [],
  );
  const innerItems: VaultDialItem[] = useMemo(
    () => Array.from({ length: VAULT_CONFIG.INNER_STEPS }, (_, i) => ({ id: String(i), label: i })),
    [],
  );

  // Render labels: vertical Playfair, opacity from focusMode
  const renderOuterLabel = useCallback(
    (item: VaultDialItem, i: number, ringRotate: MotionValue<number>, opacity: number) => (
      <VaultDialLabel
        key={item.id}
        index={i}
        totalItems={VAULT_CONFIG.OUTER_STEPS}
        radius={VAULT_CONFIG.OUTER_RADIUS}
        ringRotate={ringRotate}
        width={72}
        opacity={opacity}
      >
        <Box
          component="span"
          sx={{
            fontFamily: typography.family,
            fontStyle: 'italic',
            fontSize:
              opacity === 1
                ? typography.dialSymbolSizeActive
                : typography.dialSymbolSize,
            color:
              opacity === 1
                ? color.emeraldLight
                : `rgba(201, 169, 97, ${alpha.rimMedium})`,
            textAlign: 'center',
            textShadow:
              opacity === 1
                ? '0 0 8px rgba(0, 174, 122, 0.5)'
                : 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {VAULT_SYMBOLS[i].name}
        </Box>
      </VaultDialLabel>
    ),
    [],
  );

  const renderInnerLabel = useCallback(
    (item: VaultDialItem, i: number, ringRotate: MotionValue<number>, opacity: number) => (
      <VaultDialLabel
        key={item.id}
        index={i}
        totalItems={VAULT_CONFIG.INNER_STEPS}
        radius={VAULT_CONFIG.INNER_RADIUS}
        ringRotate={ringRotate}
        width={40}
        opacity={opacity}
      >
        <Box
          component="span"
          sx={{
            fontFamily: typography.family,
            fontSize:
              opacity === 1
                ? typography.dialDigitSizeActive
                : typography.dialDigitSize,
            fontWeight: opacity === 1 ? 500 : 400,
            color: opacity === 1 ? color.champagneBright : color.champagne,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {i}
        </Box>
      </VaultDialLabel>
    ),
    [],
  );

  const isInteractive =
    state === 'idle' && sequence.phase === 'idle';
  const isCooldown = state === 'cooldown';

  const onConfirmClick = useCallback(() => {
    const now = Date.now();
    if (now - lastUnlockAttempt.current < vaultDurations.unlockDebounceMs) return;
    lastUnlockAttempt.current = now;
    if (!isInteractive) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        /* no-op */
      }
    }
    tryUnlock();
  }, [tryUnlock, isInteractive]);

  const isFailure = sequence.phase === 'failure';
  const isUnlocking = ['anticipate', 'confirm', 'release', 'swing', 'reveal', 'dolly'].includes(
    sequence.phase,
  );
  const isCenterHighlighted = ['confirm', 'release'].includes(sequence.phase);
  const isCardinalActive = ['release', 'swing', 'reveal', 'dolly'].includes(sequence.phase);
  const isInteriorActive = ['reveal', 'dolly'].includes(sequence.phase);
  const isPointerPulsing = sequence.phase === 'confirm';

  return (
    <motion.div
      animate={{ opacity: containerOpacity, scale: containerOpacity === 0 ? 1.06 : 1 }}
      transition={{
        duration: vaultDurations.dollyMs / 1000,
        ease: vaultEasing.silk,
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: color.ink,
      }}
    >
      <Box
        // inert is a valid HTML attribute (React 18 supports it via spread); MUI Box types lag behind.
        {...({ inert: isUnlocking ? '' : undefined } as Record<string, unknown>)}
        aria-hidden={isUnlocking ? true : undefined}
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 2.5,
          width: '100%',
          maxWidth: 480,
          paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Box
          component="h1"
          sx={{
            fontFamily: typography.family,
            fontSize: '2.25rem',
            fontWeight: 400,
            color: color.champagneBright,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Bóveda Secreta
        </Box>
        <Box
          component="p"
          sx={{
            fontSize: '0.7rem',
            color: `rgba(201, 169, 97, 0.55)`,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            fontFamily: typography.metaFamily,
          }}
        >
          Gira las ruedas y abre
        </Box>

        {/* Cinematic door frame */}
        <Box
          ref={wheelRef}
          sx={{
            position: 'relative',
            aspectRatio: '1 / 1',
            width: '100%',
            maxWidth: `min(92vw, ${VAULT_CONFIG.WHEEL_BASE}px)`,
            mt: 1.5,
          }}
        >
          <VaultDoorFrame
            ariaLabel={`Combinación: ${outerSymbol.name}, ${innerIdx}`}
            makerMark={isFailure ? `${attemptsLeft} intentos restantes` : 'Tierra Madre · Esencia y Poder'}
          >
            {/* Dials */}
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
                disabled={!isInteractive}
                ariaLabel="Anillo exterior: símbolo"
                renderLabel={renderOuterLabel}
                focusMode
              />
              <VaultDial
                items={innerItems}
                value={innerIdx}
                onChange={setInnerIdx}
                size={VAULT_CONFIG.INNER_SIZE}
                radius={VAULT_CONFIG.INNER_RADIUS}
                disabled={!isInteractive}
                ariaLabel="Anillo interior: dígito"
                renderLabel={renderInnerLabel}
                focusMode
              />
            </Box>

            {/* Center display */}
            <VaultMonumentCenter
              symbolName={outerSymbol.name}
              digit={innerIdx}
              highlighted={isCenterHighlighted}
              reducedMotion={reducedMotion}
              cooldownText={
                isCooldown ? formatCooldown(cooldownSecondsLeft) : undefined
              }
            />

            {/* Cardinal release */}
            <VaultCardinalRelease active={isCardinalActive} reducedMotion={reducedMotion} />

            {/* Interior reveal */}
            <VaultInterior active={isInteriorActive} reducedMotion={reducedMotion} />

            {/* Top pointer + gem */}
            <VaultGemPointer
              reducedMotion={reducedMotion}
              pulse={isPointerPulsing}
              gemColor={isFailure ? color.coral : undefined}
            />
          </VaultDoorFrame>
        </Box>

        {/* Status line */}
        <Box
          aria-live={isFailure ? 'polite' : 'off'}
          sx={{
            height: 20,
            mt: 0.5,
            fontSize: '0.75rem',
            color: color.coral,
            textAlign: 'center',
          }}
        >
          {isFailure &&
            (attemptsLeft > 0
              ? `Combinación incorrecta. ${attemptsLeft} intento${attemptsLeft === 1 ? '' : 's'} restante${attemptsLeft === 1 ? '' : 's'}.`
              : 'Demasiados intentos. Bóveda bloqueada.')}
        </Box>

        {/* Confirm button */}
        <Button
          onClick={onConfirmClick}
          disabled={!isInteractive}
          aria-label="Confirmar combinación"
          sx={{
            minWidth: 130,
            height: 46,
            borderRadius: '14px',
            fontFamily: typography.metaFamily,
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: color.champagneBright,
            background: 'transparent',
            border: `1px solid rgba(201, 169, 97, ${alpha.rimMedium})`,
            transition: 'all 200ms cubic-bezier(0.22, 1, 0.36, 1)',
            mt: 1,
            '&:hover': {
              background: `rgba(201, 169, 97, 0.08)`,
              borderColor: `rgba(201, 169, 97, 0.5)`,
            },
            '&:disabled': {
              color: `rgba(201, 169, 97, 0.4)`,
              borderColor: `rgba(201, 169, 97, 0.15)`,
            },
          }}
        >
          {isUnlocking ? <Lock size={16} color={color.champagne} /> : 'Abrir'}
        </Button>

        {/* Audio toggle */}
        <Button
          onClick={audio.toggle}
          aria-label={audio.enabled ? 'Silenciar audio' : 'Activar audio'}
          sx={{
            minWidth: 0,
            width: 36,
            height: 36,
            mt: 0.5,
            borderRadius: '50%',
            color: `rgba(201, 169, 97, 0.5)`,
            '&:hover': { background: 'rgba(201, 169, 97, 0.08)' },
          }}
        >
          {audio.enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </Button>
      </Box>
    </motion.div>
  );
}

function formatCooldown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
