import React, { useState, useCallback } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

let rippleIdCounter = 0;

/**
 * TouchRipple - Emerald-tinted touch ripple effect
 *
 * Renders expanding ripple circles from the touch/click point.
 * Self-cleaning via onAnimationEnd. Respects reduced motion.
 *
 * Design spec (03A): Touch point 25% opacity, 400ms ease-out expand
 */
const TouchRipple: React.FC = () => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const addRipple = useCallback((e: React.PointerEvent<HTMLSpanElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    setRipples(prev => [...prev, { id: ++rippleIdCounter, x, y, size }]);
  }, []);

  const removeRipple = useCallback((id: number) => {
    setRipples(prev => prev.filter(r => r.id !== id));
  }, []);

  return (
    <span
      onPointerDown={addRipple}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        borderRadius: 'inherit',
        pointerEvents: 'auto',
        zIndex: 0,
      }}
    >
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          onAnimationEnd={() => removeRipple(ripple.id)}
          style={{
            position: 'absolute',
            left: ripple.x - ripple.size / 2,
            top: ripple.y - ripple.size / 2,
            width: ripple.size,
            height: ripple.size,
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 174, 122, 0.25)',
            transform: 'scale(0)',
            animation: 'rippleExpand 400ms ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes rippleExpand {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes rippleExpand {
            to {
              transform: scale(4);
              opacity: 0;
            }
          }
          span > span {
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
    </span>
  );
};

export default TouchRipple;
