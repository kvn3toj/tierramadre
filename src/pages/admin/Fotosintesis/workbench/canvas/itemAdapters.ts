/**
 * itemAdapters — GuidedDraft → typed item Draft coercion for the lote canvas.
 *
 * The Fotosynthia chat accumulates a flat, untyped `GuidedDraft`
 * (`Record<string, unknown>`, keyed to the form's Draft interface). The embedded
 * lote canvas (CapturaLotePage's `ActiveLotPage`) holds the strongly-typed
 * `GemaDraft` / `JoyaDraft` / `InsumoDraft` form state. These adapters bridge
 * the two: they coerce the loose chat draft into a *partial* typed draft that
 * can be merge-seeded into the active item draft (`setGema(p => ({...p, ...patch}))`),
 * without clobbering fields the operator already typed.
 *
 * This formalizes the private `toGemaDraft` / `toJoyaDraft` / `toInsumoDraft`
 * coercers in `copilot/executeAction.ts`, but returns a `Partial<Draft>` (only
 * keys actually present in the chat draft) so seeding is non-destructive.
 *
 * The COMMIT side is intentionally NOT here: the embedded canvas reuses
 * `ActiveLotPage.handleSaveAndNext`, which already calls the proven
 * `buildGemaPayload` / `buildJoyaPayload` / `buildInsumoPayload` (the DOM-coupled
 * path that also uploads photos + certificates to Drive). This module only owns
 * the inbound seed coercion.
 */
import type { GuidedDraft, GuidedFlow } from "../../copilot/flowSchemas";
import type { GemaDraft } from "../../components/GemaFields";
import type { JoyaDraft } from "../../components/JoyaFields";
import type { InsumoDraft } from "../../components/InsumoFields";

// ── value coercers (mirror executeAction.ts) ────────────────────────────────

const str = (v: unknown): string =>
  typeof v === "string" ? v : v == null ? "" : String(v);

const numOrEmpty = (v: unknown): number | "" => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : "";
};

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** A slot is "present" when it carries a meaningful value worth seeding. */
const has = (v: unknown): boolean => {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
};

// ── GuidedDraft → typed item Draft (partial, non-destructive) ────────────────

/**
 * Coerce a chat GuidedDraft into a partial GemaDraft. Only present slots are
 * mapped (so the merge keeps the operator's in-progress fields); the routing-only
 * `loteId` hint and any unknown key are dropped.
 */
export function guidedDraftToGemaDraft(a: GuidedDraft): Partial<GemaDraft> {
  const out: Partial<GemaDraft> = {};
  if (has(a.nombre)) out.nombre = str(a.nombre);
  if (has(a.peso)) out.peso = str(a.peso);
  if (has(a.color)) out.color = str(a.color);
  if (has(a.calidad)) out.calidad = str(a.calidad) as GemaDraft["calidad"];
  if (has(a.procedencia)) out.procedencia = str(a.procedencia);
  if (has(a.preponderancia)) out.preponderancia = numOrEmpty(a.preponderancia);
  if (has(a.precioPublicoCOP))
    out.precioPublicoCOP = numOrEmpty(a.precioPublicoCOP);
  if (has(a.cantidad)) out.cantidad = numOrEmpty(a.cantidad);
  if (has(a.tipoEsmeralda))
    out.tipoEsmeralda = str(a.tipoEsmeralda) as GemaDraft["tipoEsmeralda"];
  if (has(a.corte)) out.corte = str(a.corte) as GemaDraft["corte"];
  if (has(a.medidasAncho)) out.medidasAncho = str(a.medidasAncho);
  if (has(a.medidasAlto)) out.medidasAlto = str(a.medidasAlto);
  if (has(a.medidasCono)) out.medidasCono = str(a.medidasCono);
  if (has(a.nivelRareza)) out.nivelRareza = numOrEmpty(a.nivelRareza);
  if (has(a.calificacion)) out.calificacion = numOrEmpty(a.calificacion);
  return out;
}

/** Coerce a chat GuidedDraft into a partial JoyaDraft. */
export function guidedDraftToJoyaDraft(a: GuidedDraft): Partial<JoyaDraft> {
  const out: Partial<JoyaDraft> = {};
  if (has(a.nombre)) out.nombre = str(a.nombre);
  if (has(a.descripcion)) out.descripcion = str(a.descripcion);
  if (has(a.cantidad)) out.cantidad = numOrEmpty(a.cantidad);
  if (has(a.pesoValor)) out.pesoValor = numOrEmpty(a.pesoValor);
  if (has(a.pesoUnidad))
    out.pesoUnidad = (
      a.pesoUnidad === "ct" ? "ct" : "gr"
    ) as JoyaDraft["pesoUnidad"];
  if (has(a.tipoJoya)) out.tipoJoya = str(a.tipoJoya) as JoyaDraft["tipoJoya"];
  if (has(a.tecnica)) out.tecnica = str(a.tecnica);
  if (has(a.minerales))
    out.minerales = strArr(a.minerales) as JoyaDraft["minerales"];
  if (has(a.complementos))
    out.complementos = strArr(a.complementos) as JoyaDraft["complementos"];
  if (has(a.preponderancia)) out.preponderancia = numOrEmpty(a.preponderancia);
  if (has(a.precioPublicoCOP))
    out.precioPublicoCOP = numOrEmpty(a.precioPublicoCOP);
  return out;
}

/** Coerce a chat GuidedDraft into a partial InsumoDraft. */
export function guidedDraftToInsumoDraft(a: GuidedDraft): Partial<InsumoDraft> {
  const out: Partial<InsumoDraft> = {};
  if (has(a.nombre)) out.nombre = str(a.nombre);
  if (has(a.categoria)) out.categoria = str(a.categoria);
  if (has(a.cantidad)) out.cantidad = numOrEmpty(a.cantidad);
  if (has(a.preponderancia)) out.preponderancia = numOrEmpty(a.preponderancia);
  if (has(a.precioPublicoCOP))
    out.precioPublicoCOP = numOrEmpty(a.precioPublicoCOP);
  return out;
}

/** The item flows the lote canvas can seed from the conversation. */
export type ItemFlow = "item-gema" | "item-joya" | "item-insumo";

export function isItemFlow(flow: GuidedFlow | undefined): flow is ItemFlow {
  return flow === "item-gema" || flow === "item-joya" || flow === "item-insumo";
}

/**
 * Dispatch the right per-type coercer for an item flow. Returns a `GuidedDraft`
 * (the partial typed draft is structurally compatible) so callers can hand it
 * straight to the draft bus's `seedDraftForm(flow, data)`.
 */
export function coerceGuidedItemDraft(
  flow: ItemFlow,
  draft: GuidedDraft,
): GuidedDraft {
  switch (flow) {
    case "item-gema":
      return guidedDraftToGemaDraft(draft);
    case "item-joya":
      return guidedDraftToJoyaDraft(draft);
    case "item-insumo":
      return guidedDraftToInsumoDraft(draft);
  }
}
