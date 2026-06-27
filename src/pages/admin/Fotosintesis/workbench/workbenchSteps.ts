/**
 * Workbench flow whitelist + progress-step definitions.
 *
 * The dedicated Co-pilot Workbench accepts only the CAPTURE flows (a strict
 * subset of `GuidedFlow`). `edit-existing` / `batch-edit` / `advisory` have no
 * single-record canvas and are intentionally excluded. `certificados` is not a
 * `GuidedFlow` at all (it has no slot schema / server classifier) — it stays on
 * its standalone route.
 *
 * Steps group a flow's required keys into named stages. A step is "done" when
 * none of its keys remain in `computeMissing(flow, draft)`. The final review
 * step is "done" only when the whole draft is ready (missing is empty). Steps
 * are VISUAL ONLY — they never gate the commit (the server `ready` flag does).
 */
import { computeMissing } from "../copilot/flowSchemas";
import type { GuidedDraft } from "../copilot/flowSchemas";

export const WORKBENCH_FLOWS = [
  "venta",
  "lote",
  "provider",
  "client",
  "item-gema",
  "item-joya",
  "item-insumo",
] as const;

export type WorkbenchFlow = (typeof WORKBENCH_FLOWS)[number];

export function isWorkbenchFlow(value: unknown): value is WorkbenchFlow {
  return (
    typeof value === "string" &&
    (WORKBENCH_FLOWS as readonly string[]).includes(value)
  );
}

export interface WorkbenchStep {
  /** Spanish label shown in the stepper. */
  label: string;
  /**
   * Required keys this step covers. Empty = a terminal/optional stage (e.g.
   * "Revisión", "Ítems") that completes when the whole draft is ready.
   */
  keys: readonly string[];
}

/**
 * Per-flow ordered steps. Keys mirror `FLOW_REQUIRED_KEYS` in flowSchemas.ts —
 * keep them in sync. The last step of each flow is the review/commit stage.
 */
export const WORKBENCH_STEPS: Record<WorkbenchFlow, readonly WorkbenchStep[]> =
  {
    venta: [
      { label: "Bóveda", keys: ["sede"] },
      { label: "Pieza", keys: ["itemId"] },
      {
        label: "Comprador",
        keys: ["compradorTipo", "clientId", "clienteFinalData"],
      },
      {
        label: "Precio y pago",
        keys: ["precioAcordado", "formaPago", "metodoContado"],
      },
      { label: "Revisión", keys: [] },
    ],
    lote: [
      { label: "Bóveda", keys: ["sede"] },
      { label: "Proveedor", keys: ["providerId", "providerName"] },
      {
        label: "Costo y pago",
        keys: ["costoTotalCOP", "unidadesDeclaradas", "formaPago"],
      },
      { label: "Ítems", keys: [] },
      { label: "Cierre", keys: [] },
    ],
    provider: [
      { label: "Identidad", keys: ["nombreORazonSocial"] },
      { label: "Tipo", keys: ["tipo"] },
      { label: "Documento", keys: ["documento"] },
      { label: "Contacto", keys: [] },
    ],
    client: [
      { label: "Tipo", keys: ["tipo"] },
      { label: "Nombre", keys: ["nombre"] },
      { label: "Documento", keys: ["documento"] },
      { label: "Dirección", keys: ["direccion"] },
    ],
    "item-gema": [
      { label: "Identidad", keys: ["nombre"] },
      { label: "Peso", keys: ["peso"] },
      { label: "Preponderancia", keys: ["preponderancia"] },
      { label: "Detalle", keys: [] },
    ],
    "item-joya": [
      { label: "Identidad", keys: ["nombre"] },
      { label: "Tipo", keys: ["tipoJoya"] },
      { label: "Preponderancia", keys: ["preponderancia"] },
      { label: "Detalle", keys: [] },
    ],
    "item-insumo": [
      { label: "Identidad", keys: ["nombre"] },
      { label: "Categoría", keys: ["categoria"] },
      { label: "Cantidad", keys: ["cantidad"] },
      { label: "Preponderancia", keys: ["preponderancia"] },
    ],
  };

export type StepState = "done" | "current" | "pending";

export interface StepStatus extends WorkbenchStep {
  state: StepState;
}

/**
 * Resolve each step's state from the live draft. A step is `done` when none of
 * its keys are missing; the first not-done step is `current`; the rest are
 * `pending`. A terminal step (no keys) is `done` only when the whole draft is
 * ready (nothing missing).
 */
export function resolveSteps(
  flow: WorkbenchFlow,
  draft: GuidedDraft,
): { steps: StepStatus[]; currentIndex: number; total: number } {
  const missing = new Set(computeMissing(flow, draft));
  const steps = WORKBENCH_STEPS[flow];
  let currentIndex = -1;

  const resolved: StepStatus[] = steps.map((step) => {
    const done =
      step.keys.length === 0
        ? missing.size === 0
        : step.keys.every((k) => !missing.has(k));
    return { ...step, state: done ? "done" : "pending" };
  });

  // Mark the first not-done step as `current`.
  for (let i = 0; i < resolved.length; i++) {
    if (resolved[i].state !== "done") {
      resolved[i] = { ...resolved[i], state: "current" };
      currentIndex = i;
      break;
    }
  }
  if (currentIndex === -1) currentIndex = resolved.length - 1; // all done

  return { steps: resolved, currentIndex, total: steps.length };
}
