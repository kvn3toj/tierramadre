import { motion, useTransform, type MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';

interface VaultDialLabelProps {
  /** Contenido a renderizar (símbolo, dígito, lo que sea). */
  children: ReactNode;
  /** Índice de este label en el anillo. */
  index: number;
  /** Total de labels en el anillo (usado para calcular ángulo). */
  totalItems: number;
  /** Distancia del centro del anillo al label (px). */
  radius: number;
  /** MotionValue de la rotación del anillo padre. */
  ringRotate: MotionValue<number>;
  /** Ancho fijo del label (px). */
  width?: number;
}

/**
 * Posiciona el label en un punto del círculo y lo contrarrota con el spring del anillo
 * para que siempre quede horizontal al lector.
 */
export function VaultDialLabel({
  children,
  index,
  totalItems,
  radius,
  ringRotate,
  width = 64,
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
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
