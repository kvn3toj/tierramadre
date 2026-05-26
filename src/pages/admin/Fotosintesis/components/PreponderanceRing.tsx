import { Box } from "@mui/material";
import { getFoto, fontFamilies } from "../../../../design-system";

interface PreponderanceRingProps {
  /** Current accumulated percentage (0-100+). */
  value: number;
  /** Target percentage. Defaults to 100. */
  target?: number;
  /** Replace the centered text. Falls back to "{value}%" rounded. */
  overrideLabel?: React.ReactNode;
  /** Sub-label below the percentage. Defaults to "acumulado". */
  sublabel?: React.ReactNode;
  /** Ring outer diameter in px. */
  size?: number;
}

/**
 * Circular progress ring driven by `lotItems.sumPreponderancia` (handoff §3.10).
 * Turns red when the accumulated value exceeds the target — that's the BR-2
 * frontend signal to Maritza that she's over 100%.
 */
export function PreponderanceRing({
  value,
  target = 100,
  overrideLabel,
  sublabel = "acumulado",
  size = 132,
}: PreponderanceRingProps) {
  const foto = getFoto("light");

  const ratio = Math.min(Math.max(value / target, 0), 1);
  const overshoot = value > target + 0.01;
  const strokeColor = overshoot ? foto.status.sold : foto.accent.primary;
  const trackColor = foto.surfaces.inset;

  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * ratio;

  const display =
    overrideLabel ??
    (Number.isFinite(value) ? `${Math.round(value * 10) / 10}%` : "—");

  return (
    <Box
      role="progressbar"
      aria-valuenow={Number.isFinite(value) ? Math.round(value) : 0}
      aria-valuemin={0}
      aria-valuemax={target}
      aria-label={`Preponderancia acumulada ${Math.round(value)} de ${target}`}
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: size,
        aspectRatio: "1 / 1",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        component="span"
        aria-live="polite"
        sx={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {`Preponderancia ${Math.round(value)} de ${target}`}
      </Box>
      <Box
        component="svg"
        viewBox={`0 0 ${size} ${size}`}
        sx={{
          width: "100%",
          height: "auto",
          maxWidth: size,
          transform: "rotate(-90deg)",
        }}
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{
            transition:
              "stroke-dasharray 240ms cubic-bezier(0.3,0.7,0.4,1), stroke 200ms ease",
          }}
        />
      </Box>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2px",
        }}
      >
        <Box
          sx={{
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: "tabular-nums",
            fontSize: size >= 120 ? 22 : 18,
            fontWeight: 600,
            color: overshoot ? foto.status.sold : foto.ink.primary,
            letterSpacing: "-0.02em",
          }}
        >
          {display}
        </Box>
        {sublabel ? (
          <Box
            sx={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: foto.ink.tertiary,
            }}
          >
            {sublabel}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export default PreponderanceRing;
