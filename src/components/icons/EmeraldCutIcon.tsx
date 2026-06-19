import type { CSSProperties } from "react";

/**
 * EmeraldCutIcon — a landscape emerald-cut gem (rectangle with 45° cut corners,
 * nested step facets), NOT a pointed brilliant. Geometry matches the Bóveda
 * handoff spec §3.5 / the prototype's `EmeraldCutIcon` exactly.
 *
 * Lucide-compatible interface (`size` / `color` / `strokeWidth` / `style`) so it
 * drops straight into IOSTabBar's lucide-icon branch. The artwork lives on a
 * 100×76 viewBox, so the incoming lucide-scale `strokeWidth` (~1.8–2.2) is
 * multiplied by STROKE_SCALE to read at the same optical weight as the 24px
 * lucide tab icons.
 */

// 100-unit canvas vs lucide's 24-unit canvas, tuned down for this icon's denser
// nested-facet linework (so it doesn't read heavier than its neighbours).
const STROKE_SCALE = 2.9;

export interface EmeraldCutIconProps {
  /** Square footprint in px (height is rendered at size × 0.76 — landscape cut). */
  size?: number | string;
  /** Stroke color; defaults to currentColor (inherits text color). */
  color?: string;
  /** Lucide-scale stroke width (~1.5–2.5); scaled internally for the 100-unit canvas. */
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
}

export default function EmeraldCutIcon({
  size = 24,
  color = "currentColor",
  strokeWidth = 1.8,
  className,
  style,
  "aria-hidden": ariaHidden = true,
  "aria-label": ariaLabel,
}: EmeraldCutIconProps) {
  const numeric = typeof size === "number" ? size : parseFloat(size) || 24;
  const sw = strokeWidth * STROKE_SCALE;
  return (
    <svg
      width={size}
      height={numeric * 0.76}
      viewBox="0 0 100 76"
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      style={style}
      role={ariaLabel ? "img" : undefined}
      aria-hidden={ariaLabel ? undefined : ariaHidden}
      aria-label={ariaLabel}
    >
      {/* outer octagon */}
      <path d="M26 6 L74 6 L94 26 L94 50 L74 70 L26 70 L6 50 L6 26 Z" />
      {/* table octagon */}
      <path d="M35 21 L65 21 L79 35 L79 41 L65 55 L35 55 L21 41 L21 35 Z" />
      {/* 8 corner facets */}
      <path d="M26 6 L35 21 M74 6 L65 21 M94 26 L79 35 M94 50 L79 41 M74 70 L65 55 M26 70 L35 55 M6 50 L21 41 M6 26 L21 35" />
    </svg>
  );
}
