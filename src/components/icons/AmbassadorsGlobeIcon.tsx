import { useId } from "react";
import type { CSSProperties } from "react";

/**
 * AmbassadorsGlobeIcon — planet 🌎 with the Americas and a Colombia heart spotlight.
 * Lucide-compatible interface so it drops into IOSTabBar's icon slot.
 * Uses a clipPath (unique per instance via useId) to clip grid + continents to the circle.
 * viewBox: 40×40 square.
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
      stroke={color}
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
          <circle cx="20" cy="20" r="19" />
        </clipPath>
      </defs>

      {/* Globe outer ring */}
      <circle cx="20" cy="20" r="19" strokeWidth={sw} />

      {/* Lat/lon grid — filigrana, clipped to globe circle */}
      <g clipPath={`url(#${clipId})`} strokeWidth={sw * 0.22} opacity={0.28}>
        <line x1="0" y1="7" x2="40" y2="7" />
        <line x1="0" y1="13" x2="40" y2="13" />
        <line x1="0" y1="20" x2="40" y2="20" />
        <line x1="0" y1="27" x2="40" y2="27" />
        <line x1="0" y1="33" x2="40" y2="33" />
        <line x1="10" y1="0" x2="10" y2="40" />
        <line x1="20" y1="0" x2="20" y2="40" />
        <line x1="30" y1="0" x2="30" y2="40" />
      </g>

      {/* South America */}
      <path
        clipPath={`url(#${clipId})`}
        fill={color}
        fillOpacity={0.2}
        strokeWidth={sw * 0.45}
        d="M18.9,18.8 L22.8,17.1 L25.5,17.5 L27.5,18.8 L30,21.2 L34.5,24 L35.5,25.5 L34.5,28 L32.5,31.5 L30,34.5 L27.5,36.5 L25,38 L22.5,38.5 L21.5,37.5 L20.8,35 L19.5,27 L18,24 L18,22 Z"
      />

      {/* North America */}
      <path
        clipPath={`url(#${clipId})`}
        fill={color}
        fillOpacity={0.2}
        strokeWidth={sw * 0.45}
        d="M13.5,15.5 L15.5,13.5 L13.5,11.5 L13,10.5 L15.5,10.5 L18.5,11.5 L21,8 L23.5,3 L20,1.5 L14,3 L10,6 L8,9.5 L9,13.5 L12.5,15 Z"
      />

      {/* Central America isthmus */}
      <path
        clipPath={`url(#${clipId})`}
        fill={color}
        fillOpacity={0.2}
        strokeWidth={sw * 0.45}
        d="M13.5,15.5 L15.5,14.5 L19,18.5 L17,19.5 Z"
      />

      {/* Colombia — heart spotlight */}
      <path
        clipPath={`url(#${clipId})`}
        fill={color}
        stroke={color}
        strokeWidth={sw * 0.4}
        d="M21,24.5 C18,22 17.5,20 18,18.5 C18,16.5 20,17 21,18.5 C22,17 24,16.5 24,18.5 C24.5,20 24,22 21,24.5 Z"
      />
    </svg>
  );
}
