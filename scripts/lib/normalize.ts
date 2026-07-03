// scripts/lib/normalize.ts
//
// PURE coercion of a raw LLM extraction (untrusted `any`) into a well-formed
// ExtractionRow (spec step 6: "Validate/coerce against live enums; attach
// confidence + evidence"). An 8B model, over 100+ transcripts, WILL emit at
// least one malformed row — a missing signal, a string budget, an out-of-enum
// value, a confidence of 1.5. Without this, buildReport dereferences
// `r.signals.tipo_interes.value` and CRASHES the whole run after every paid LLM
// call, and a string budget would land in the numeric presupuesto field.
//
// The raw object is the FLAT model output (top-level tipo_interes, ocasion, …,
// outcome, plus the `__`-prefixed __channel / __tipo_evidence). We also tolerate
// a `{ signals: {...} }` wrapper defensively.
import type { ExtractionRow, Signal } from "./types";
import {
  TIPO_INTERES_VALUES,
  OCASION_VALUES,
  CONOCIMIENTO_VALUES,
  CANAL_VALUES,
} from "./backfill-fields";

const URGENCIA_VALUES = ["alta", "media", "baja"] as const;
const SENTIMENT_VALUES = [
  "interesado",
  "sensible-precio",
  "frustrado",
  "listo-comprar",
  "indeciso",
] as const;
const OUTCOME_VALUES = [
  "sin-respuesta-negocio",
  "respondido-sin-cierre",
  "pidio-humano",
  "compro",
  "fantasma",
] as const;

// Confidence → number clamped to [0,1]; anything not a finite number → 0.
function clampConf(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

function withEvidence<T>(sig: Signal<T>, obj: any): Signal<T> {
  if (obj && typeof obj.evidence === "string") sig.evidence = obj.evidence;
  return sig;
}

// Graded enum signal: value nulled unless it is in `allowed`; confidence clamped.
function enumSignal<T extends string>(
  obj: any,
  allowed: readonly T[],
): Signal<T> {
  if (!obj || typeof obj !== "object") return { value: null, confidence: 0 };
  const value: T | null = allowed.includes(obj.value) ? obj.value : null;
  return withEvidence({ value, confidence: clampConf(obj.confidence) }, obj);
}

// Free-text string signal (ciudad): non-empty string or null.
function stringSignal(obj: any): Signal<string> {
  if (!obj || typeof obj !== "object") return { value: null, confidence: 0 };
  const value =
    typeof obj.value === "string" && obj.value.trim() !== "" ? obj.value : null;
  return withEvidence({ value, confidence: clampConf(obj.confidence) }, obj);
}

// Numeric budget signal: coerce to Number; NaN or <= 0 → null.
function budgetSignal(obj: any): Signal<number> {
  if (!obj || typeof obj !== "object") return { value: null, confidence: 0 };
  const n = Number(obj.value);
  const value = !Number.isFinite(n) || n <= 0 ? null : n;
  return withEvidence({ value, confidence: clampConf(obj.confidence) }, obj);
}

/**
 * Coerce one raw LLM extraction into a complete, well-typed ExtractionRow.
 * Pure: no I/O, deterministic. Never throws on malformed input.
 */
export function coerceExtractionRow(
  raw: any,
  meta: {
    contactId: string;
    contactName?: string;
    conversationId: string;
    conversationIds: string[];
  },
): ExtractionRow {
  // Graded signals live at the top level of the flat model output; tolerate a
  // `{ signals: {...} }` wrapper too. __channel / __tipo_evidence are always the
  // top-level `__`-prefixed extras alongside the signals.
  const src =
    raw && typeof raw.signals === "object" && raw.signals
      ? raw.signals
      : (raw ?? {});

  const rawChannel = String(raw?.__channel ?? "")
    .toLowerCase()
    .trim();
  const channel: ExtractionRow["channel"] = (
    CANAL_VALUES as readonly string[]
  ).includes(rawChannel)
    ? (rawChannel as ExtractionRow["channel"])
    : "unknown";

  const outcome: ExtractionRow["signals"]["outcome"] = (
    OUTCOME_VALUES as readonly string[]
  ).includes(src?.outcome)
    ? src.outcome
    : // Neutral default — MUST NOT be a consequential outcome (fantasma /
      // pidio-humano drive stage moves to Perdido / Negociación).
      "respondido-sin-cierre";

  const objeciones: string[] = Array.isArray(src?.objeciones)
    ? src.objeciones.filter((o: unknown): o is string => typeof o === "string")
    : [];

  const tipo_interes_evidence =
    raw?.__tipo_evidence && typeof raw.__tipo_evidence === "object"
      ? raw.__tipo_evidence
      : undefined;

  return {
    contactId: meta.contactId,
    contactName: meta.contactName,
    conversationId: meta.conversationId,
    conversationIds: meta.conversationIds,
    channel,
    signals: {
      tipo_interes: enumSignal(src?.tipo_interes, TIPO_INTERES_VALUES),
      presupuesto_cop: budgetSignal(src?.presupuesto_cop),
      ocasion: enumSignal(src?.ocasion, OCASION_VALUES),
      ciudad: stringSignal(src?.ciudad),
      conocimiento: enumSignal(src?.conocimiento, CONOCIMIENTO_VALUES),
      urgencia: enumSignal(src?.urgencia, URGENCIA_VALUES),
      products_shown: { value: src?.products_shown?.value === true },
      sentiment: enumSignal(src?.sentiment, SENTIMENT_VALUES),
      objeciones,
      outcome,
    },
    tipo_interes_evidence,
  };
}
