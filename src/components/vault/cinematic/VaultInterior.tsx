// src/components/vault/cinematic/VaultInterior.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { vaultCinema, vaultEasing, vaultDurations } from '../../../design-system';

export interface VaultInteriorProps {
  /** Active during Reveal+Dolly phases. */
  active: boolean;
  reducedMotion?: boolean;
}

const { color } = vaultCinema;

/**
 * Reveal del interior cálido tras la puerta + camera dolly final.
 * En reduced-motion: cross-fade simple sin scale.
 */
export function VaultInterior({ active, reducedMotion = false }: VaultInteriorProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.85 }}
          animate={{ opacity: 1, scale: reducedMotion ? 1 : 1.08 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: reducedMotion
              ? vaultDurations.reducedRevealMs / 1000
              : vaultDurations.revealMs / 1000,
            ease: vaultEasing.silk,
          }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%, ${color.interiorWarm} 0%, ${color.interiorMid} 40%, ${color.interiorDark} 100%)`,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        />
      )}
    </AnimatePresence>
  );
}
