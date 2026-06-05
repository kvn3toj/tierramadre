import { useId } from "react";
import type { CSSProperties } from "react";

/**
 * AmbassadorsGlobeIcon — V1 "Hub Routes" globe.
 * Curved lat/lon grid + continents (stroke-only, always legible) + 5 route arcs
 * from Colombia to NYC / London / Tokyo / Cape Town / Buenos Aires + city dots +
 * Colombia heart.
 * Paths ported verbatim from the V1 Pencil frame (esmereo/esmereogenesis-v2.pen).
 * All elements use ONLY the `color` prop — no hardcoded hues — so the icon reads
 * cleanly as white (active) or gray (inactive) in the IOSTabBar.
 * viewBox: 40×40.
 */
const STROKE_SCALE = 1.15;

export interface AmbassadorsGlobeIconProps {
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
}

export default function AmbassadorsGlobeIcon({
  size = 24,
  color = "currentColor",
  strokeWidth = 1.8,
  className,
  style,
  "aria-hidden": ariaHidden = true,
  "aria-label": ariaLabel,
}: AmbassadorsGlobeIconProps) {
  const rawId = useId();
  const clipId = `globe-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const sw = strokeWidth * STROKE_SCALE;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      style={style}
      role={ariaLabel ? "img" : undefined}
      aria-hidden={ariaLabel ? undefined : ariaHidden}
      aria-label={ariaLabel}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="20" cy="20" r="19.5" />
        </clipPath>
      </defs>

      {/* Globe base */}
      <circle
        cx="20"
        cy="20"
        r="19"
        stroke={color}
        strokeWidth={sw * 0.55}
        fill={color}
        fillOpacity={0.06}
      />

      {/* Curved lat/lon grid — V1 spherical arcs */}
      <path
        clipPath={`url(#${clipId})`}
        d="M2 20q18 2 36 0m-33-8q15 2 30 0m-30 16q15-2 30 0m-15-26q-2 18 0 36m-8-34q2 16 0 32m16-32q-2 16 0 32"
        stroke={color}
        strokeWidth={sw * 0.2}
        strokeOpacity={0.3}
        strokeLinecap="butt"
      />

      {/* Continents — stroke-only so they stay legible at any color */}
      <g
        clipPath={`url(#${clipId})`}
        fill={color}
        fillOpacity={0.14}
        stroke={color}
        strokeOpacity={0.55}
        strokeWidth={sw * 0.32}
      >
        {/* South America */}
        <path d="M18.9 18.8l3.9-1.7 2.7.4 2 1.3 2.5 2.4 4.5 2.8 1 1.5-1 2.5-2 3.5-2.5 3-2.5 2-2.5 1.5-2.5.5-1-1-.7-2.5-1.3-8-1.5-3 0-2z" />
        {/* North America */}
        <path d="M13.5 15.5l2-2-2-2-.5-1 2.5 0 3 1 2.5-3.5 2.5-5-3.5-1.5-6 1.5-4 3-2 3.5 1 4 3.5 1.5z" />
        {/* Central America */}
        <path d="M13.5 15.5l2-1 3.5 4-2 1z" />
        {/* Africa */}
        <path d="M34 14l4 2 1 6-2 7-3 2-2-4 1-6z" />
        {/* Cuba */}
        <path d="M15.5 12.5l2.5-.5 1.5.5-.5.5-3 0z" />
      </g>

      {/* Route arcs from Colombia — V1: NYC / London / Tokyo / Cape Town / Buenos Aires */}
      <g
        clipPath={`url(#${clipId})`}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={sw * 0.38}
      >
        <path d="M20 19q-6-7-7-11" strokeOpacity={0.85} />
        <path d="M20 19q6-14 10-10" strokeOpacity={0.82} />
        <path d="M20 19q11-17 18-12" strokeOpacity={0.72} />
        <path d="M20 19q10 1 16 8" strokeOpacity={0.65} />
        <path d="M20 19q-3 6-1 11" strokeOpacity={0.6} />
      </g>

      {/* City dots at route endpoints */}
      <g clipPath={`url(#${clipId})`} fill={color}>
        <circle cx="13" cy="8" r="1.1" fillOpacity={0.9} />
        <circle cx="30" cy="9" r="1.0" fillOpacity={0.88} />
        <circle cx="38" cy="7" r="0.9" fillOpacity={0.78} />
        <circle cx="36" cy="27" r="0.9" fillOpacity={0.72} />
        <circle cx="19" cy="30" r="0.9" fillOpacity={0.7} />
      </g>

      {/* Colombia heart — the unmistakable focal point */}
      <path
        clipPath={`url(#${clipId})`}
        d="M21 24.5c-3-2.5-3.5-4.5-3-6 0-2 2-1.5 3 0 1-1.5 3-2 3 0 .5 1.5 0 3.5-3 6z"
        fill={color}
        stroke={color}
        strokeWidth={sw * 0.22}
        strokeOpacity={0.4}
      />
    </svg>
  );
}
