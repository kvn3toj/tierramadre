/**
 * Workbench progress stepper — derived purely from the live draft via
 * `resolveSteps` (which calls the pure `computeMissing`, zero Convex cost).
 * Visual only: it never gates the commit (the server `ready` flag does).
 *
 * Anti-blink: segment fills are instant color swaps (no layout shift, no
 * crossfade); only `background`/`color` transition, and that is disabled under
 * `prefers-reduced-motion`.
 */
import { Box } from "@mui/material";
import { getFoto } from "../../../../design-system";
import type { GuidedDraft } from "../copilot/flowSchemas";
import { resolveSteps, type WorkbenchFlow } from "./workbenchSteps";

export function WorkbenchStepper({
  flow,
  draft,
}: {
  flow: WorkbenchFlow;
  draft: GuidedDraft;
}) {
  const foto = getFoto("light");
  const { steps, currentIndex, total } = resolveSteps(flow, draft);
  const current = steps[currentIndex];

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}
        role="list"
        aria-label="Progreso de la captura"
      >
        {steps.map((step, i) => {
          const color =
            step.state === "done"
              ? foto.accent.primary
              : step.state === "current"
                ? foto.accent.deep
                : foto.surfaces.edgeStrong;
          return (
            <Box
              key={step.label}
              role="listitem"
              aria-label={`${step.label} · ${
                step.state === "done"
                  ? "listo"
                  : step.state === "current"
                    ? "en curso"
                    : "pendiente"
              }`}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: step.state === "current" ? 9 : 7,
                  height: step.state === "current" ? 9 : 7,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                  "@media (prefers-reduced-motion: no-preference)": {
                    transition: "background 160ms ease, width 160ms ease",
                  },
                }}
              />
              {i < total - 1 && (
                <Box
                  sx={{
                    width: 16,
                    height: 1.5,
                    borderRadius: 1,
                    background:
                      step.state === "done"
                        ? foto.accent.primary
                        : foto.surfaces.rule,
                    flexShrink: 0,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
      <Box
        sx={{
          fontSize: "11px",
          color: foto.ink.tertiary,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        Paso {Math.min(currentIndex + 1, total)} de {total}
        {current ? ` · ${current.label}` : ""}
      </Box>
    </Box>
  );
}
