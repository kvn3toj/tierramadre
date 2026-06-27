/**
 * Fotosynthia Co-pilot Workbench — feature flag.
 *
 * The workbench (dedicated two-pane copilot+canvas route) ships flow-by-flow
 * behind this flag. When OFF, every entry point falls back to the existing
 * standalone pages + the ambient rail, untouched.
 *
 * - Production: opt-in via `VITE_FOTOSYNTHIA_WORKBENCH=1`.
 * - Dev: on by default (so it can be dogfooded locally) unless explicitly
 *   disabled with `VITE_FOTOSYNTHIA_WORKBENCH=0`.
 */
const raw = import.meta.env?.VITE_FOTOSYNTHIA_WORKBENCH as string | undefined;

export const WORKBENCH_ENABLED: boolean =
  raw === "1" || raw === "true"
    ? true
    : raw === "0" || raw === "false"
      ? false
      : !!import.meta.env?.DEV;
