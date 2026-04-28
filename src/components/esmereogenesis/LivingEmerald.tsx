/**
 * LivingEmerald
 *
 * The visual heart of Esmereogénesis. Renders the product image with seven
 * stacked layers that respond to `progress` (0..1):
 *   1. Ambient glow (radial)
 *   2. Particle field (gentle floating motes)
 *   3. Roots layer (OrganicRoots)
 *   4. Emerald crystal (real product image with dynamic CSS filter)
 *   5. Surface dust (musgo overlay, fades out as progress rises)
 *   6. Specular highlight (light reflection)
 *   7. Sparkle field (only when progress > 0.5)
 */

import React, { useMemo, useState } from 'react';
import { Box, alpha } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import { Sprout } from 'lucide-react';
import { OrganicRoots } from './OrganicRoots';
import type { EsmereoState } from '../../types/esmereogenesis';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';
import {
  emeraldGradients,
  radialGradients,
} from '../../design-system/tokens/gradients';

export type LivingEmeraldSize = 'sm' | 'md' | 'lg' | 'xl';

interface LivingEmeraldProps {
  imageSrc?: string;
  /** 0..1 */
  progress: number;
  state: EsmereoState;
  size?: LivingEmeraldSize;
  /** Idle gentle pulse */
  isPulsing?: boolean;
  /** Timestamp for last aporte — adds a glow boost briefly */
  recentAporteAt?: number;
}

const SIZE_PX: Record<LivingEmeraldSize, number> = {
  sm: 96,
  md: 160,
  lg: 240,
  xl: 320,
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function buildCrystalFilter(progress: number): string {
  const p = clamp01(progress);
  const brightness = 0.5 + 0.7 * p;
  const saturate = 0.3 + 0.9 * p;
  const contrast = 0.9 + 0.25 * p;
  const blur = Math.max(0, 0.5 - 0.5 * p);
  return `brightness(${brightness.toFixed(2)}) saturate(${saturate.toFixed(2)}) contrast(${contrast.toFixed(2)}) blur(${blur.toFixed(2)}px)`;
}

const SPARKLE_POSITIONS = [
  { top: '12%', left: '20%', delay: 0 },
  { top: '24%', left: '78%', delay: 0.6 },
  { top: '60%', left: '14%', delay: 1.1 },
  { top: '70%', left: '82%', delay: 0.3 },
  { top: '36%', left: '50%', delay: 1.6 },
];

export const LivingEmerald: React.FC<LivingEmeraldProps> = ({
  imageSrc,
  progress,
  state,
  size = 'lg',
  isPulsing = true,
  recentAporteAt,
}) => {
  const px = SIZE_PX[size];
  const innerPx = Math.round(px * 0.62);
  const reducedMotion = useReducedMotion();
  const clampedProgress = clamp01(progress);
  const isComplete = state === 'completed' || state === 'claimed';
  const showSparkles = clampedProgress >= 0.5 || isComplete;
  const dustOpacity = isComplete ? 0 : Math.max(0, 1 - clampedProgress * 1.05);
  // When the image proxy fails (dev env / missing fileId) we fall back to the
  // emerald gradient — never leave the user staring at a black sphere.
  const [imageFailed, setImageFailed] = useState(false);
  const useImage = Boolean(imageSrc) && !imageFailed;

  const recentBoost = useMemo(() => {
    if (!recentAporteAt) return 0;
    const elapsed = Date.now() - recentAporteAt;
    if (elapsed < 0 || elapsed > 30_000) return 0;
    return 1 - elapsed / 30_000;
  }, [recentAporteAt]);

  const crystalFilter = buildCrystalFilter(clampedProgress);

  return (
    <Box
      role="img"
      aria-label={`Esmeralda ${Math.round(clampedProgress * 100)}% revelada`}
      sx={{
        position: 'relative',
        width: px,
        height: px,
        flexShrink: 0,
      }}
    >
      {/* Layer 1 — Ambient glow */}
      <Box
        component={motion.div}
        aria-hidden
        sx={{
          position: 'absolute',
          inset: -px * 0.15,
          borderRadius: '50%',
          background: radialGradients.hoverGlow,
          filter: 'blur(8px)',
        }}
        animate={
          reducedMotion
            ? { opacity: 0.6 }
            : {
                opacity: [0.45 + recentBoost * 0.4, 0.7 + recentBoost * 0.2, 0.45 + recentBoost * 0.4],
              }
        }
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Layer 2 — Particle field (subtle floating motes) */}
      {!reducedMotion && (
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Box
              key={i}
              component={motion.div}
              sx={{
                position: 'absolute',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: i % 2 === 0 ? emeraldCore.light : alpha(goldAccent.primary, 0.7),
                top: `${20 + i * 12}%`,
                left: `${10 + i * 18}%`,
                filter: 'blur(0.5px)',
              }}
              animate={{
                y: [0, -16, 0],
                opacity: [0.3 + clampedProgress * 0.5, 0.8, 0.3 + clampedProgress * 0.5],
              }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
            />
          ))}
        </Box>
      )}

      {/* Layer 3 — Organic roots */}
      <OrganicRoots progress={clampedProgress} size={px} reducedMotion={!!reducedMotion} />

      {/* Layer 4 — Emerald crystal (idle pulse wrapper) */}
      <Box
        component={motion.div}
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        animate={
          reducedMotion || !isPulsing
            ? undefined
            : { scale: [1, 1.025, 1] }
        }
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Box
          sx={{
            width: innerPx,
            height: innerPx,
            borderRadius: '50%',
            overflow: 'hidden',
            position: 'relative',
            // Always use the emerald gradient as the underlying surface so a
            // failed image (dev env, missing fileId) never reveals raw black.
            background: emeraldGradients.intense,
            boxShadow: `0 ${px * 0.05}px ${px * 0.18}px ${alpha(emeraldCore.dark, 0.35 + recentBoost * 0.2)}, 0 0 ${px * 0.12 + recentBoost * 30}px ${alpha(emeraldCore.primary, 0.3 + recentBoost * 0.4)}`,
            transition: 'box-shadow 0.6s ease-out',
          }}
        >
          {useImage ? (
            <Box
              component="img"
              src={imageSrc}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: crystalFilter,
                transition: 'filter 0.6s ease-out',
              }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <Sprout size={Math.round(innerPx * 0.45)} strokeWidth={1.5} />
            </Box>
          )}

          {/* Layer 5 — Surface dust overlay */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: dustOpacity,
              transition: 'opacity 0.7s ease-out',
              background:
                'radial-gradient(ellipse at 30% 30%, rgba(101,67,33,0.55) 0%, rgba(80,52,28,0.4) 35%, rgba(60,40,22,0.55) 75%, rgba(40,28,16,0.7) 100%)',
              mixBlendMode: 'multiply',
            }}
          />

          {/* Layer 6 — Specular highlight */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              top: '8%',
              left: '12%',
              width: '40%',
              height: '30%',
              borderRadius: '50%',
              background:
                'radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 50%, transparent 90%)',
              opacity: 0.35 + clampedProgress * 0.55,
              filter: 'blur(2px)',
              pointerEvents: 'none',
            }}
          />
        </Box>
      </Box>

      {/* Layer 7 — Sparkles (only when revealed) */}
      {showSparkles && !reducedMotion && (
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {SPARKLE_POSITIONS.map((s, i) => (
            <Box
              key={i}
              component={motion.div}
              sx={{
                position: 'absolute',
                top: s.top,
                left: s.left,
                width: 6,
                height: 6,
                background: '#FFFFFF',
                borderRadius: '50%',
                boxShadow: `0 0 8px ${alpha('#FFFFFF', 0.9)}, 0 0 14px ${alpha(goldAccent.primary, 0.7)}`,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                rotate: [0, 90, 180],
              }}
              transition={{ duration: 1.8, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default LivingEmerald;
