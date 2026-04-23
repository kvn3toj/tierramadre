// src/components/vault/VaultDialLabel.tsx
import { motion, useTransform, type MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';

interface VaultDialLabelProps {
  children: ReactNode;
  index: number;
  totalItems: number;
  radius: number;
  ringRotate: MotionValue<number>;
  width?: number;
  /** Opacidad del label (foco suave: 1 active, 0.6 vecinos, 0.28 resto). */
  opacity?: number;
}

/**
 * Posiciona el label en un punto del círculo y lo contrarrota con el spring del anillo
 * para que siempre quede horizontal al lector. Acepta opacity para implementar el foco suave.
 */
export function VaultDialLabel({
  children,
  index,
  totalItems,
  radius,
  ringRotate,
  width = 64,
  opacity = 1,
}: VaultDialLabelProps) {
  const itemDeg = 360 / totalItems;
  const rot = index * itemDeg;
  const labelRotate = useTransform(ringRotate, (v) => -rot - v);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transformOrigin: 'center center',
        transform: `rotate(${rot}deg)`,
        pointerEvents: 'none',
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          left: '50%',
          x: '-50%',
          y: -radius,
          rotate: labelRotate,
          width,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          opacity,
          transition: 'opacity 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
