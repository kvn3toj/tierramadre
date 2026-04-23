// src/components/vault/cinematic/VaultGemPointer.tsx
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { vaultCinema, vaultEasing, vaultDurations } from '../../../design-system';

export interface VaultGemPointerProps {
  /** Desactiva las loop animations (idle breath off). */
  reducedMotion?: boolean;
  /** Pulsa la gema (used by the cinematic sequence Confirm phase). */
  pulse?: boolean;
  /** Override color (used during failure to lerp to coral). */
  gemColor?: string;
}

const { color, layout } = vaultCinema;

/**
 * Puntero hairline superior con gema esmeralda triangular.
 * Heartbeat continuo en idle (scale 1→1.08, box-shadow 8→16px) — desactivado en reduced-motion.
 */
export function VaultGemPointer({
  reducedMotion = false,
  pulse = false,
  gemColor,
}: VaultGemPointerProps) {
  const gemBackground = `linear-gradient(135deg, ${color.emeraldLight} 0%, ${gemColor ?? color.emerald} 60%, ${color.emeraldDeep} 100%)`;

  const animateProps = pulse
    ? { scale: [1, 1.4, 1] }
    : reducedMotion
      ? undefined
      : { scale: [1, 1.08, 1] };

  const transitionProps = pulse
    ? { duration: vaultDurations.confirmMs / 1000, ease: vaultEasing.silk }
    : reducedMotion
      ? undefined
      : {
          duration: vaultDurations.heartbeatMs / 1000,
          ease: vaultEasing.breath,
          repeat: Infinity,
        };

  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: '50%',
        top: '2%',
        transform: 'translateX(-50%)',
        width: layout.pointerWidth,
        height: layout.pointerHeight,
        background: `linear-gradient(180deg, ${color.champagne} 0%, rgba(201, 169, 97, 0.15) 100%)`,
        zIndex: 6,
      }}
    >
      <motion.div
        animate={animateProps}
        transition={transitionProps}
        style={{
          position: 'absolute',
          top: -4,
          left: '50%',
          translateX: '-50%',
          rotate: 45,
          width: pulse ? layout.gemSizePulse : layout.gemSize,
          height: pulse ? layout.gemSizePulse : layout.gemSize,
          background: gemBackground,
          boxShadow: pulse
            ? '0 0 22px rgba(77, 224, 176, 0.95), 0 0 40px rgba(0, 174, 122, 0.6)'
            : '0 0 8px rgba(0, 174, 122, 0.55)',
          border: '0.5px solid rgba(201, 169, 97, 0.5)',
          willChange: pulse || !reducedMotion ? 'transform, box-shadow' : undefined,
        }}
      />
    </Box>
  );
}
