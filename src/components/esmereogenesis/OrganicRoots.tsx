/**
 * OrganicRoots
 *
 * SVG cluster of vine-like roots that bloom around the emerald as `progress`
 * advances from 0 to 1. Each root reveals at a specific progress threshold
 * using stroke-dashoffset animation.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';

interface OrganicRootsProps {
  /** 0..1 */
  progress: number;
  /** Render size in px (square viewport) */
  size: number;
  /** Disable internal animations (used for reduced motion) */
  reducedMotion?: boolean;
}

interface VinePath {
  /** Visual angle around the emerald in degrees (0 = up) */
  angle: number;
  /** SVG path d string in a 200x200 viewport, rooted at the center (100,100) */
  d: string;
  /** Tone: 'leaf' or 'gold' */
  tone: 'leaf' | 'gold';
  /** Total path length (used for dash animation) */
  length: number;
}

/**
 * Vine generator — emits N control-curve paths that fan out from the center.
 * Each path has a slight curl + a leaf-shaped tip.
 */
function buildVines(count: number): VinePath[] {
  const vines: VinePath[] = [];
  const center = { x: 100, y: 100 };
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i + (i % 2 === 0 ? 0 : 12); // alternate slight offset
    const rad = (angle - 90) * (Math.PI / 180);
    const r1 = 56; // start (just outside the emerald)
    const r2 = 88; // tip
    const x1 = center.x + Math.cos(rad) * r1;
    const y1 = center.y + Math.sin(rad) * r1;
    const xt = center.x + Math.cos(rad) * r2;
    const yt = center.y + Math.sin(rad) * r2;

    // Two control points for a gentle S-curve
    const c1x = x1 + Math.cos(rad + 0.7) * 18;
    const c1y = y1 + Math.sin(rad + 0.7) * 18;
    const c2x = xt + Math.cos(rad - 0.5) * 12;
    const c2y = yt + Math.sin(rad - 0.5) * 12;

    const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${xt.toFixed(2)} ${yt.toFixed(2)}`;
    const dx = xt - x1;
    const dy = yt - y1;
    const length = Math.sqrt(dx * dx + dy * dy) * 1.25; // approximation

    vines.push({
      angle,
      d,
      tone: i % 4 === 0 ? 'gold' : 'leaf',
      length: Math.max(36, length),
    });
  }
  return vines;
}

const VINE_COUNT = 10;

export const OrganicRoots: React.FC<OrganicRootsProps> = ({ progress, size, reducedMotion = false }) => {
  const vines = useMemo(() => buildVines(VINE_COUNT), []);
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {/* Halo behind vines — grows softly with progress */}
      <defs>
        <radialGradient id="esmereo-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={emeraldCore.primary} stopOpacity={0.18} />
          <stop offset="50%" stopColor={emeraldCore.primary} stopOpacity={0.07} />
          <stop offset="100%" stopColor={emeraldCore.primary} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r={50 + clamped * 40} fill="url(#esmereo-halo)" opacity={0.5 + clamped * 0.3} />

      {vines.map((vine, idx) => {
        // Each vine reveals at its own threshold
        const threshold = idx / VINE_COUNT;
        const localProgress = Math.max(0, Math.min(1, (clamped - threshold) / (1 / VINE_COUNT + 0.05)));
        const dashOffset = vine.length * (1 - localProgress);
        const stroke = vine.tone === 'gold' ? goldAccent.primary : emeraldCore.primary;
        const opacity = 0.35 + localProgress * 0.55;

        return (
          <g key={vine.angle}>
            <motion.path
              d={vine.d}
              fill="none"
              stroke={stroke}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray={vine.length}
              animate={{ strokeDashoffset: dashOffset }}
              initial={false}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 60, damping: 22, mass: 1 }
              }
              style={{ opacity }}
            />
            {/* Leaf tip (small circle) */}
            {localProgress > 0.6 && (
              <motion.circle
                cx={(() => {
                  const rad = (vine.angle - 90) * (Math.PI / 180);
                  return 100 + Math.cos(rad) * 88;
                })()}
                cy={(() => {
                  const rad = (vine.angle - 90) * (Math.PI / 180);
                  return 100 + Math.sin(rad) * 88;
                })()}
                r={2.4}
                fill={stroke}
                initial={{ scale: 0 }}
                animate={{ scale: 1, opacity: [0.8, 1, 0.85] }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                }
                style={{ filter: vine.tone === 'gold' ? 'drop-shadow(0 0 4px rgba(212,175,55,0.8))' : 'drop-shadow(0 0 4px rgba(0,174,122,0.8))' }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

export default OrganicRoots;
