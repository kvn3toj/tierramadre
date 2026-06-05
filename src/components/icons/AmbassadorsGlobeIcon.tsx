import { useId } from "react";
import type { CSSProperties } from "react";

/**
 * AmbassadorsGlobeIcon — V5 "Minimal Connections" globe.
 * Globe base + lat/lon grid + continent fills + route arcs radiating from
 * Colombia to NYC, London, Buenos Aires, Africa + city dots + Colombia heart.
 * Paths ported verbatim from the approved V5 Pencil frame (esmereo/esmereogenesis-v2.pen).
 * Lucide-compatible interface (size / color / strokeWidth) for IOSTabBar.
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
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const clipId = `globe-clip-${uid}`;
  const glowId = `globe-glow-${uid}`;
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
        <radialGradient id={glowId} cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Globe base */}
      <circle
        cx="20"
        cy="20"
        r="19"
        fill={color}
        fillOpacity={0.05}
        stroke={color}
        strokeOpacity={0.35}
        strokeWidth={sw * 0.5}
      />

      {/* Lat/lon grid — V5 orthographic-trimmed lines */}
      <path
        clipPath={`url(#${clipId})`}
        d="M11.4 2.5l17.2 0m-21.1 2.5l25 0m-27.5 2.5l30 0m-31.7 2.5l33.4 0m-34.7 2.5l36 0m-36.8 2.5l37.6 0m-38.1 2.5l38.6 0m-38.8 2.5l39 0m-38.8 2.5l38.6 0m-38.1 2.5l37.6 0m-36.8 2.5l36 0m-34.7 2.5l33.4 0m-31.7 2.5l30 0m-27.5 2.5l25 0m-21.1 2.5l17.2 0m-26.1-26.1l0 17.2m2.5-21.1l0 25m2.5-27.5l0 30m2.5-31.7l0 33.4m2.5-34.7l0 36m2.5-36.8l0 37.6m2.5-38.1l0 38.6m2.5-38.8l0 39m2.5-38.8l0 38.6m2.5-38.1l0 37.6m2.5-36.8l0 36m2.5-34.7l0 33.4m2.5-31.7l0 30m2.5-27.5l0 25m2.5-21.1l0 17.2"
        stroke={color}
        strokeWidth={sw * 0.12}
        strokeOpacity={0.18}
        strokeLinecap="butt"
      />

      {/* Continents — South America, North America, Central America, Africa, Cuba */}
      <g
        clipPath={`url(#${clipId})`}
        fill={color}
        fillOpacity={0.22}
        stroke={color}
        strokeOpacity={0.4}
        strokeWidth={sw * 0.28}
      >
        <path d="M18.9 18.8l3.9-1.7 2.7.4 2 1.3 2.5 2.4 4.5 2.8 1 1.5-1 2.5-2 3.5-2.5 3-2.5 2-2.5 1.5-2.5.5-1-1-.7-2.5-1.3-8-1.5-3 0-2z" />
        <path d="M13.5 15.5l2-2-2-2-.5-1 2.5 0 3 1 2.5-3.5 2.5-5-3.5-1.5-6 1.5-4 3-2 3.5 1 4 3.5 1.5z" />
        <path d="M13.5 15.5l2-1 3.5 4-2 1z" />
        <path d="M34 14l4 2 1 6-2 7-3 2-2-4 1-6z" />
        <path d="M15.5 12.5l2.5-.5 1.5.5-.5.5-3 0z" />
      </g>

      {/* Colombia glow */}
      <circle
        clipPath={`url(#${clipId})`}
        cx="20"
        cy="22"
        r="6"
        fill={`url(#${glowId})`}
      />

      {/* Route arcs from Colombia → NYC / London / Buenos Aires / Africa */}
      <g
        clipPath={`url(#${clipId})`}
        fill="none"
        stroke={color}
        strokeLinecap="round"
      >
        <path
          d="M20.5 21q-5.5-8-8.5-12"
          strokeWidth={sw * 0.35}
          strokeOpacity={0.75}
        />
        <path
          d="M20.5 21q7.5-10 11.5-14"
          strokeWidth={sw * 0.35}
          strokeOpacity={0.72}
        />
        <path
          d="M20.5 21q-1.5 7 1.5 13"
          strokeWidth={sw * 0.3}
          strokeOpacity={0.55}
        />
        <path
          d="M20.5 21q9.5-4 14.5-5"
          strokeWidth={sw * 0.28}
          strokeOpacity={0.5}
        />
      </g>

      {/* City dots at route endpoints */}
      <g clipPath={`url(#${clipId})`} fill={color}>
        <circle cx="12" cy="9" r="1.1" fillOpacity={0.85} />
        <circle cx="32" cy="7" r="1.1" fillOpacity={0.82} />
        <circle cx="22" cy="34" r="0.9" fillOpacity={0.68} />
        <circle cx="35" cy="16" r="0.85" fillOpacity={0.6} />
      </g>

      {/* Colombia heart */}
      <path
        clipPath={`url(#${clipId})`}
        d="M21 24.5c-3-2.5-3.5-4.5-3-6 0-2 2-1.5 3 0 1-1.5 3-2 3 0 .5 1.5 0 3.5-3 6z"
        fill={color}
        fillOpacity={0.95}
        stroke={color}
        strokeOpacity={0.35}
        strokeWidth={sw * 0.25}
      />
    </svg>
  );
}
