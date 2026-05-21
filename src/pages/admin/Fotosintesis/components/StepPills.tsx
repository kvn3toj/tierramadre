import { Box } from "@mui/material";
import { getFoto } from "../../../../design-system";

export type StepState = "done" | "active" | "pending";

export interface Step {
  label: string;
  state: StepState;
}

interface StepPillsProps {
  steps: Step[];
  ariaLabel?: string;
}

/**
 * Done/active/pending pill strip used by Venta and (optionally) the captura
 * wizard (handoff §3.3). Semantic <ol> + aria-current on the active step.
 */
export function StepPills({ steps, ariaLabel = "Pasos" }: StepPillsProps) {
  const foto = getFoto("light");

  return (
    <Box
      component="ol"
      aria-label={ariaLabel}
      sx={{
        listStyle: "none",
        display: "flex",
        gap: "8px",
        margin: 0,
        padding: 0,
      }}
    >
      {steps.map((s, idx) => {
        const isDone = s.state === "done";
        const isActive = s.state === "active";
        return (
          <Box
            component="li"
            key={`${s.label}-${idx}`}
            aria-current={isActive ? "step" : undefined}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 11px",
              borderRadius: "999px",
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: "0.04em",
              border: `1px solid ${
                isActive
                  ? foto.accent.primary
                  : isDone
                    ? foto.accent.soft
                    : foto.surfaces.edge
              }`,
              background: isActive
                ? foto.accent.soft
                : isDone
                  ? foto.accent.soft
                  : foto.surfaces.canvas,
              color: isActive
                ? foto.accent.deep
                : isDone
                  ? foto.accent.primary
                  : foto.ink.tertiary,
            }}
          >
            <Box
              aria-hidden
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isActive
                  ? foto.accent.primary
                  : isDone
                    ? foto.accent.primary
                    : foto.ink.mute,
              }}
            />
            {s.label}
          </Box>
        );
      })}
    </Box>
  );
}

export default StepPills;
