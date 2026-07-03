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

// Live GHL stage labels carry ordering + emoji prefixes ("1.", "🤖", "🆕", "🤝", …).
// Strip leading numbering and any leading/trailing non-letter noise (emoji, symbols,
// spaces) up to the first / after the last letter — WITHOUT touching internal
// punctuation such as the " / " in "Negociación / Agente". The settable-set
// assertion in buildSettableStageMap is the backstop if a live label still
// doesn't reduce to one of SETTABLE_STAGE_NAMES.
const stripPrefix = (name: string) =>
  name
    .normalize("NFC")
    .replace(/^\s*\d+[.)]?\s*/, "") // leading "1." / "2)" ordering
    .replace(/^[^\p{L}]+/u, "") // leading emoji / symbols / spaces up to the first letter
    .replace(/[^\p{L}]+$/u, "") // trailing emoji / symbols / spaces after the last letter
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
  // NOTE: outcome:"fantasma" deliberately does NOT auto-move to "Perdido /
  // Nurturing". `outcome` carries no confidence in the extraction schema, so an
  // ungated 8B label must never mark a live lead as LOST — that classification is
  // left to a human. The report's funnel-state summary still surfaces every
  // ghosted contact for review; a ghosted lead simply stays at its evidenced
  // stage (usually Nuevo Lead) instead of being written off automatically.
  // (pidio-humano -> Negociación / Agente is kept: it is a forward, human-visible
  // "please pick this up" flag whose worst case is a wasted glance, not a
  // written-off customer.)
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
  // A current stage OUTSIDE the settable set — Carrito Enviado (cart sent),
  // Venta Cerrada (closed-won), or any unknown stage — is UNTOUCHABLE: skip it.
  // (Previously this fell back to order 0, so any evidenced target > 0 would
  // pull such an opportunity BACKWARD into the settable set — resetting a won
  // deal or an active cart to an earlier funnel stage. That silently violated
  // the spec's forward-only/never-regress guarantee on the records that most
  // need protecting; the excluded stages must be unreachable as a MOVE SOURCE,
  // not just as a write target.)
  if (!current) return null;
  if (target.order <= current.order) return null; // forward-only, no no-op
  return { stageId: target.id };
}
