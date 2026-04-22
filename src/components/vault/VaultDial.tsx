import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type MotionValue,
} from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { vaultPalette } from '../../config/vault';

export interface VaultDialItem {
  id: string;
  label: ReactNode;
  /** Optional color applied to the label wrapper. */
  color?: string;
}

interface VaultDialProps {
  items: VaultDialItem[];
  value: number;
  onChange: (index: number) => void;
  size: number;
  radius: number;
  disabled?: boolean;
  ariaLabel: string;
  /** Render prop for each label — receives the item and the ring's rotation. */
  renderLabel: (item: VaultDialItem, index: number, ringRotate: MotionValue<number>) => ReactNode;
}

function springCfg(reduce: boolean | null) {
  return reduce
    ? { stiffness: 520, damping: 44, mass: 0.35 }
    : { stiffness: 300, damping: 28, mass: 0.8 };
}

function normalizeDelta(delta: number): number {
  let d = delta;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

/**
 * Generic rotary dial — renders items on a ring, drag to rotate, release to snap.
 * Emits onChange with the new selected index after snap.
 */
export function VaultDial({
  items,
  value,
  onChange,
  size,
  radius: _radius,
  disabled = false,
  ariaLabel,
  renderLabel,
}: VaultDialProps) {
  const reduceMotion = useReducedMotion();
  const totalItems = items.length;
  const stepDeg = 360 / totalItems;

  const cfg = useMemo(() => springCfg(reduceMotion), [reduceMotion]);
  const accumulated = useRef(-value * stepDeg);
  const motionTarget = useMotionValue(accumulated.current);
  const spring = useSpring(motionTarget, cfg);

  // Sync when value changes externally (e.g. keyboard or programmatic).
  useEffect(() => {
    const expected = Math.round(accumulated.current / stepDeg) * stepDeg;
    const currentIndex = ((Math.round(-expected / stepDeg)) % totalItems + totalItems) % totalItems;
    if (currentIndex !== value) {
      accumulated.current = -value * stepDeg;
      motionTarget.set(accumulated.current);
    }
  }, [value, stepDeg, totalItems, motionTarget]);

  const ringRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const prevAngle = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const pointerAngle = useCallback((e: React.PointerEvent) => {
    const el = ringRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return (
      Math.atan2(
        e.clientY - (rect.top + rect.height / 2),
        e.clientX - (rect.left + rect.width / 2),
      ) *
      (180 / Math.PI)
    );
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragging.current = true;
      setIsDragging(true);
      prevAngle.current = pointerAngle(e);
    },
    [disabled, pointerAngle],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const now = pointerAngle(e);
      const delta = normalizeDelta(now - prevAngle.current);
      accumulated.current += delta;
      motionTarget.set(accumulated.current);
      prevAngle.current = now;
    },
    [pointerAngle, motionTarget],
  );

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    const snapped = Math.round(accumulated.current / stepDeg) * stepDeg;
    accumulated.current = snapped;
    motionTarget.set(snapped);
    const newIndex = ((Math.round(-snapped / stepDeg)) % totalItems + totalItems) % totalItems;
    if (newIndex !== value) onChange(newIndex);
  }, [stepDeg, totalItems, motionTarget, value, onChange]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      let next = value;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          next = (value + (e.shiftKey ? 3 : 1)) % totalItems;
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          next = (value - (e.shiftKey ? 3 : 1) + totalItems * 2) % totalItems;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = totalItems - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      onChange(next);
    },
    [value, totalItems, onChange, disabled],
  );

  return (
    <motion.div
      ref={ringRef}
      role="slider"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={totalItems - 1}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1px solid ${vaultPalette.steel}`,
        backgroundColor: 'rgba(10, 6, 4, 0.7)',
        boxShadow: `inset 0 0 60px rgba(0, 0, 0, 0.4), 0 0 30px rgba(212, 175, 55, 0.06)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        rotate: spring,
        outline: 'none',
        willChange: isDragging ? 'transform' : undefined,
      }}
    >
      {items.map((item, i) => renderLabel(item, i, spring))}
    </motion.div>
  );
}
