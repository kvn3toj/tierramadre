// scripts/lib/backfill-stage.ts
import { type ExtractionRow, MIN_CONFIDENCE } from "./types";

// Settable stages in pipeline order. Carrito Enviado (4) + Venta Cerrada (6)
// are intentionally EXCLUDED — they imply a real cart/payment.
export const SETTABLE_STAGE_NAMES = [
  "Nuevo Lead",
  "Calificado por IA",
  "Producto Recomendado",
  "Negociación / Agente",
  "Perdido / Nurturing",
] as const;
const ORDER: Record<string, number> = Object.fromEntries(
  SETTABLE_STAGE_NAMES.map((n, i) => [n, i + 1]),
);

const stripPrefix = (name: string) =>
  name
    .replace(/^\s*\d+[.)]?\s*/, "")
    .replace(/[✅❌]/g, "")
    .trim();

export function buildSettableStageMap(
  pipelineStages: { id: string; name: string }[],
): Map<string, { id: string; order: number }> {
  const map = new Map<string, { id: string; order: number }>();
  for (const st of pipelineStages) {
    const clean = stripPrefix(st.name);
    if (ORDER[clean] != null)
      map.set(clean, { id: st.id, order: ORDER[clean] });
  }
  const got = [...map.keys()].sort();
  const want = [...SETTABLE_STAGE_NAMES].sort();
  if (got.length !== want.length || got.some((n, i) => n !== want[i])) {
    throw new Error(
      `settable stage set mismatch — resolved [${got.join(", ")}], expected [${want.join(", ")}]`,
    );
  }
  return map;
}

const conf = (c: number) => c >= MIN_CONFIDENCE;

export function deriveTargetStageName(row: ExtractionRow): string {
  const s = row.signals;
  if (s.outcome === "fantasma") return "Perdido / Nurturing"; // order 5
  if (s.outcome === "pidio-humano") return "Negociación / Agente"; // order 4
  if (s.products_shown.value === true) return "Producto Recomendado"; // order 3
  const qualified =
    s.tipo_interes.value &&
    conf(s.tipo_interes.confidence) &&
    ((s.presupuesto_cop.value != null && conf(s.presupuesto_cop.confidence)) ||
      (s.ocasion.value != null && conf(s.ocasion.confidence)));
  if (qualified) return "Calificado por IA"; // order 2
  return "Nuevo Lead"; // order 1
}

export function chooseStageWrite(
  row: ExtractionRow,
  currentStageId: string,
  settable: Map<string, { id: string; order: number }>,
): { stageId: string } | null {
  const target = settable.get(deriveTargetStageName(row));
  if (!target) return null;
  const current = [...settable.values()].find((v) => v.id === currentStageId);
  const currentOrder = current?.order ?? 0; // unknown/forbidden current stage → treat as 0 so we still only advance into settable set
  if (target.order <= currentOrder) return null; // forward-only, no no-op
  return { stageId: target.id };
}
