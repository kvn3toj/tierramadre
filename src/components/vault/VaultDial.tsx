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
  /** Render prop for each label — receives the item, ring rotate, AND opacity (1 when focusMode is off). */
  renderLabel: (
    item: VaultDialItem,
    index: number,
    ringRotate: MotionValue<number>,
    opacity: number,
  ) => ReactNode;
  /** Si true, opacidad escalonada según distancia al activo (foco suave cinematográfico). */
  focusMode?: boolean;
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

function deriveValueText(item: VaultDialItem | undefined): string {
  if (!item) return '';
  if (typeof item.label === 'string' || typeof item.label === 'number') {
    return String(item.label);
  }
  return item.id;
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
  focusMode = false,
}: VaultDialProps) {
  const reduceMotion = useReducedMotion();
  const totalItems = items.length;
  const stepDeg = 360 / totalItems;

  const cfg = useMemo(() => springCfg(reduceMotion), [reduceMotion]);
  const accumulated = useRef(-value * stepDeg);
  const motionTarget = useMotionValue(accumulated.current);
  const spring = useSpring(motionTarget, cfg);

  const ringRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const prevAngle = useRef(0);

  // Sync when value changes externally (e.g. keyboard or programmatic).
  // Defer if a drag is in progress — the pointerUp handler will snap + notify.
  useEffect(() => {
    if (dragging.current) return;
    const expected = Math.round(accumulated.current / stepDeg) * stepDeg;
    const currentIndex = ((Math.round(-expected / stepDeg)) % totalItems + totalItems) % totalItems;
    if (currentIndex !== value) {
      accumulated.current = -value * stepDeg;
      motionTarget.set(accumulated.current);
    }
  }, [value, stepDeg, totalItems, motionTarget]);
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

  // Helper: distance in steps to active (wraps around the circle)
  const distanceTo = (i: number): number => {
    const total = items.length;
    const raw = Math.abs(i - value);
    return Math.min(raw, total - raw);
  };

  // Helper: opacity per label
  const opacityFor = (i: number): number => {
    if (!focusMode) return 1;
    const d = distanceTo(i);
    if (d === 0) return 1;
    if (d === 1) return 0.6;
    return 0.28;
  };

  return (
    <motion.div
      ref={ringRef}
      role="slider"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={totalItems - 1}
      aria-valuetext={deriveValueText(items[value])}
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
      {items.map((item, i) => renderLabel(item, i, spring, opacityFor(i)))}
    </motion.div>
  );
}
