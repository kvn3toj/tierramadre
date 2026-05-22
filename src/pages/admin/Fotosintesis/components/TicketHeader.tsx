import { Box } from "@mui/material";
import { getFoto, fontFamilies } from "../../../../design-system";

export interface TicketMeta {
  label: string;
  value: React.ReactNode;
  /** Render value in red — used for missing/error states. */
  alert?: boolean;
}

export interface TicketProgress {
  /** 0-100 filled portion. */
  value: number;
  /** Target (usually 100). */
  target?: number;
  /** Short text above the bar. */
  label?: React.ReactNode;
}

interface TicketHeaderProps {
  /** Big mono ID — "B-008" or "V-0042". */
  id: string;
  /** Visual kind controls accent color of the bar. */
  kind?: "lot" | "sale";
  /** Optional subtitle line under the meta grid. */
  subtitle?: React.ReactNode;
  meta?: TicketMeta[];
  progress?: TicketProgress;
  /** Right-aligned slot — typically StepPills for the sale flow. */
  rightSlot?: React.ReactNode;
  /** Variant for missing-provider / error → ID renders in red. */
  alert?: boolean;
}

/**
 * Persistent header card with the big "ticket" ID, meta grid and optional
 * progress bar. Used by CapturaLote, LoteResumen and VentaPage (handoff §3.2).
 */
export function TicketHeader({
  id,
  kind = "lot",
  subtitle,
  meta = [],
  progress,
  rightSlot,
  alert = false,
}: TicketHeaderProps) {
  const foto = getFoto("light");

  const idColor = alert ? foto.status.sold : foto.ink.primary;
  const accentGradient =
    kind === "sale"
      ? `linear-gradient(90deg, ${foto.status.consigned} 0%, ${foto.accent.primary} 100%)`
      : `linear-gradient(90deg, ${foto.accent.primary} 0%, ${foto.accent.deep} 100%)`;

  return (
    <Box
      sx={{
        padding: "18px 28px",
        borderBottom: `1px solid ${foto.surfaces.rule}`,
        background: foto.surfaces.canvas,
      }}
    >
      <Box
        sx={{
          maxWidth: 1320,
          margin: "0 auto",
          display: "grid",
          // Stack the three slots on mobile so the 42px mono ID never
          // collides with meta + stepper. QA showed catastrophic wrap
          // at 360 — vertical stack below `md`.
          gridTemplateColumns: { xs: "1fr", md: "auto 1fr auto" },
          gap: { xs: "18px", md: "28px" },
          alignItems: { xs: "stretch", md: "end" },
        }}
      >
        <Box>
          <Box
            sx={{
              fontFamily: fontFamilies.mono,
              fontVariantNumeric: "tabular-nums",
              // Slightly smaller ID on phones so the 42px monospace
              // doesn't dominate a 360px viewport.
              fontSize: { xs: 32, sm: 38, md: 42 },
              fontWeight: 300,
              letterSpacing: "-0.055em",
              lineHeight: 1,
              color: idColor,
            }}
          >
            {id}
          </Box>
          {subtitle ? (
            <Box
              sx={{
                marginTop: "10px",
                fontSize: 12,
                color: foto.ink.secondary,
              }}
            >
              {subtitle}
            </Box>
          ) : null}
        </Box>

        <Box
          sx={{
            display: "grid",
            // Mobile: 2-col meta grid that wraps naturally.
            // Desktop: original auto-fit single row.
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              md: meta.length
                ? `repeat(${meta.length}, minmax(0, auto))`
                : "1fr",
            },
            gap: { xs: "12px 18px", md: "32px" },
            justifyContent: { xs: "stretch", md: "start" },
          }}
        >
          {meta.map((m) => (
            <Box key={m.label}>
              <Box
                sx={{
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: foto.ink.tertiary,
                  marginBottom: "6px",
                }}
              >
                {m.label}
              </Box>
              <Box
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: m.alert ? foto.status.sold : foto.ink.primary,
                  letterSpacing: "-0.01em",
                }}
              >
                {m.value}
              </Box>
            </Box>
          ))}
        </Box>

        {rightSlot ? (
          <Box
            sx={{
              display: "flex",
              alignItems: { xs: "stretch", md: "end" },
              // Horizontal scroll on mobile so the step pill row never
              // clips at the right edge — fits the "stepper as scroller"
              // QA recommendation.
              overflowX: { xs: "auto", md: "visible" },
              maxWidth: "100%",
              paddingBottom: { xs: "4px", md: 0 },
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {rightSlot}
          </Box>
        ) : null}
      </Box>

      {progress ? (
        <Box
          sx={{
            maxWidth: 1320,
            margin: "16px auto 0",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {progress.label ? (
            <Box
              sx={{
                fontSize: 10.5,
                color: foto.ink.tertiary,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{progress.label}</span>
              <span style={{ fontFamily: fontFamilies.mono }}>
                {Math.round(progress.value)}/{progress.target ?? 100}
              </span>
            </Box>
          ) : null}
          <Box
            sx={{
              position: "relative",
              height: 5,
              borderRadius: "2.5px",
              background: foto.surfaces.inset,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.min(
                  Math.max(
                    (progress.value / (progress.target ?? 100)) * 100,
                    0,
                  ),
                  100,
                )}%`,
                background: accentGradient,
                transition: "width 240ms cubic-bezier(0.3,0.7,0.4,1)",
              }}
            />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

export default TicketHeader;
