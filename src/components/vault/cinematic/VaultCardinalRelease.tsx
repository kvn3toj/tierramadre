// src/components/vault/cinematic/VaultCardinalRelease.tsx
import { Box } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { vaultCinema, vaultEasing, vaultDurations } from '../../../design-system';

export interface VaultCardinalReleaseProps {
  /** When true, plays the release sequence once. */
  active: boolean;
  reducedMotion?: boolean;
}

const { color, layout } = vaultCinema;

const CARDINALS: Array<{ dir: 'n' | 'e' | 's' | 'w'; deg: number; pos: Record<string, string | number> }> = [
  { dir: 'n', deg: 270, pos: { top: '3%', left: '50%', transform: 'translateX(-50%)' } },
  { dir: 'e', deg: 0, pos: { right: '3%', top: '50%', transform: 'translateY(-50%)' } },
  { dir: 's', deg: 90, pos: { bottom: '3%', left: '50%', transform: 'translateX(-50%)' } },
  { dir: 'w', deg: 180, pos: { left: '3%', top: '50%', transform: 'translateY(-50%)' } },
];

/**
 * 4 hairlines doradas que emergen desde el centro hacia los 4 puntos cardinales en stagger N→E→S→W.
 * Al final de cada línea aparece una micro-esmeralda con spring overshoot.
 * En reduced-motion las 4 gemas aparecen simultáneas con fade simple.
 */
export function VaultCardinalRelease({ active, reducedMotion = false }: VaultCardinalReleaseProps) {
  if (!active) return null;

  const lineDur = reducedMotion ? 0 : vaultDurations.releaseMs / 1000 / 2; // 250 ms
  const gemDur = reducedMotion ? vaultDurations.reducedReleaseMs / 1000 : 0.26;

  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
      <AnimatePresence>
        {CARDINALS.map((c, i) => {
          const lineDelay = reducedMotion ? 0 : (i * vaultDurations.releaseStaggerMs) / 1000;
          const gemDelay = reducedMotion ? 0 : lineDelay + lineDur * 0.7;

          return (
            <Box key={c.dir}>
              {/* Hairline (skip in reduced-motion) */}
              {!reducedMotion && (
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{
                    duration: lineDur,
                    delay: lineDelay,
                    ease: vaultEasing.silk,
                  }}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    height: 1,
                    width: '46%',
                    background: `linear-gradient(90deg, rgba(201, 169, 97, 0.8) 0%, rgba(201, 169, 97, 0.4) 80%, transparent 100%)`,
                    transformOrigin: '0 50%',
                    transform: `translateY(-50%) rotate(${c.deg}deg)`,
                    boxShadow: '0 0 4px rgba(201, 169, 97, 0.5)',
                  }}
                />
              )}
              {/* Cardinal gem */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: reducedMotion ? 1 : [0, 1.3, 1], opacity: 1 }}
                transition={{
                  duration: gemDur,
                  delay: gemDelay,
                  ease: vaultEasing.silk,
                }}
                style={{
                  position: 'absolute',
                  width: layout.cardinalGemSize,
                  height: layout.cardinalGemSize,
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 30% 30%, ${color.emeraldLight}, ${color.emerald} 65%, ${color.emeraldDeep})`,
                  boxShadow: '0 0 8px rgba(0, 174, 122, 0.7)',
                  ...c.pos,
                }}
              />
            </Box>
          );
        })}
      </AnimatePresence>
    </Box>
  );
}
