/**
 * Fotosynthia v2 · flow schemas — the SINGLE SOURCE OF TRUTH for the guided
 * data-entry copilot.
 *
 * Imported by BOTH:
 *   - the server (`api/fotosintesis-ai.ts`) — to build the prompt schema,
 *     whitelist keys, coerce vocabularies, and RECOMPUTE the missing/ready
 *     state (the model is never trusted to self-report completeness), and
 *   - the client seeding effects — for the flow→subtipo map and types.
 *
 * IMPORTANT (server-safety): this module must stay free of React / MUI / any
 * browser-only import so it bundles cleanly into the Vercel serverless
 * function. Its ONLY runtime dependency is `src/data/vocabularies.ts`, which
 * is pure data + pure functions. Draft shapes are modelled structurally as
 * `GuidedDraft = Record<string, unknown>` rather than importing the `*.tsx`
 * field components, so nothing visual leaks into the API bundle.
 *
 * Keep the per-flow key/required tables in sync with the form `Draft`
 * interfaces (GemaFields/JoyaFields/InsumoFields) and each form's
 * `canSave`/`canConfirm` guard.
 */

import {
  CALIDADES,
  COLORS,
  COMPLEMENTOS,
  CORTES,
  CLIENT_TIPOS,
  DEFAULT_CALIDAD,
  FORMA_PAGO,
  FORMA_PAGO_VENTA,
  METODO_CONTADO,
  METODO_RECEPCION,
  MINERALES,
  PROVIDER_TIPOS,
  TIPOS_ESMERALDA,
  TIPOS_JOYA,
  normalizeCalidad,
  normalizeColor,
  sanitizeSedeCode,
} from "../../../../data/vocabularies.js";

// ─── Flow taxonomy ───────────────────────────────────────────────────

export type GuidedFlow =
  | "item-gema"
  | "item-joya"
  | "item-insumo"
  | "lote"
  | "venta"
  | "provider"
  | "client"
  | "edit-existing"
  | "batch-edit"
  | "advisory";

export const GUIDED_FLOWS: readonly GuidedFlow[] = [
  "item-gema",
  "item-joya",
  "item-insumo",
  "lote",
  "venta",
  "provider",
  "client",
  "edit-existing",
  "batch-edit",
  "advisory",
] as const;

export function isGuidedFlow(value: unknown): value is GuidedFlow {
  return (
    typeof value === "string" &&
    (GUIDED_FLOWS as readonly string[]).includes(value)
  );
}

/** A flat, untyped field map keyed to the target form's Draft interface. */
export type GuidedDraft = Record<string, unknown>;

/** A single edit in a batch-edit plan. */
export interface BatchEditPatch {
  itemHint?: string;
  targetItemId?: string;
  patch: GuidedDraft;
}

/** The structured object the model emits each turn, after server hardening. */
export interface GuidedEnvelope {
  flow: GuidedFlow;
  say: string;
  draft: GuidedDraft;
  edits?: BatchEditPatch[];
  missing: string[];
  ready: boolean;
  coercedKeys: string[];
  model?: string;
}

/** Map a capture flow to the operator-facing subtipo radio value. */
export function flowToSubtipo(
  flow: GuidedFlow,
): "gema" | "joya" | "insumo" | null {
  switch (flow) {
    case "item-gema":
      return "gema";
    case "item-joya":
      return "joya";
    case "item-insumo":
      return "insumo";
    default:
      return null;
  }
}

// ─── Allowed keys per flow ───────────────────────────────────────────
//
// Anything the model emits outside this set is STRIPPED server-side before
// it can reach a form setState or a Convex mutation. preponderancia is
// intentionally ABSENT from the edit/batch sets (it is lot-derived, never
// AI-set on edits); photos/cert are never present (no File over the wire).

const GEMA_KEYS = [
  "nombre",
  "peso",
  "color",
  "calidad",
  "procedencia",
  "preponderancia",
  "precioPublicoCOP",
  "cantidad",
  "tipoEsmeralda",
  "corte",
  "medidasAncho",
  "medidasAlto",
  "medidasCono",
  "nivelRareza",
  "calificacion",
  // Routing-only hint (NOT a form field): the target lot when Maritza names
  // it explicitly. The Copilot panel strips it before seeding the form.
  "loteId",
] as const;

const JOYA_KEYS = [
  "nombre",
  "descripcion",
  "cantidad",
  "pesoValor",
  "pesoUnidad",
  "tipoJoya",
  "tecnica",
  "minerales",
  "complementos",
  "preponderancia",
  "precioPublicoCOP",
  "loteId",
] as const;

const INSUMO_KEYS = [
  "nombre",
  "categoria",
  "cantidad",
  "preponderancia",
  "precioPublicoCOP",
  "loteId",
] as const;

const LOTE_KEYS = [
  "sede",
  "providerId",
  "providerName",
  "fechaRecepcion",
  "costoTotalCOP",
  "unidadesDeclaradas",
  "formaPago",
  "metodoContado",
  "renombreLote",
  "tratamiento",
  "mina",
  "pesoTotalQuilates",
  "notas",
  "creditoFechaVenc",
  "creditoCuotas",
  "creditoTasa",
] as const;

const VENTA_KEYS = [
  "itemId",
  "clientId",
  "clienteFinalData",
  "sede",
  "compradorTipo",
  "formaPago",
  "metodoContado",
  "precioAcordado",
  "descuentoCOP",
  "adicionales",
  "creditoFechaVenc",
  "creditoCuotas",
  "creditoTasa",
  "esmereoPlazo",
  "esmereoCuotas",
  "esmereoFechaVenc",
  "esmereoNotas",
] as const;

const PROVIDER_KEYS = [
  "nombreORazonSocial",
  "tipo",
  "tipoDocumento",
  "documento",
  "telefono",
  "email",
  "direccion",
  "notas",
] as const;

const CLIENT_KEYS = [
  "nombre",
  "tipo",
  "tipoDocumento",
  "documento",
  "direccion",
  "telefono",
  "email",
  "asesorId",
] as const;

/**
 * Fields an item edit may touch. Union of the gema/joya/insumo patch shapes
 * plus the catalog tiers. preponderancia and photo/cert are intentionally
 * excluded — preponderancia is lot-derived and photos can't ride over JSON.
 */
export const EDIT_PATCH_KEYS = [
  "nombre",
  "peso",
  "color",
  "calidad",
  "procedencia",
  "observacion",
  "corte",
  "medidasAncho",
  "medidasAlto",
  "medidasCono",
  "cantidad",
  "tipoEsmeralda",
  "nivelRareza",
  "calificacion",
  "precioPublicoCOP",
  "precioEmbajadorCOP",
  "precioConscienteCOP",
  "mostrarEnCatalogo",
  "tipoJoya",
  "tecnica",
  "minerales",
  "complementos",
  "descripcion",
  "categoria",
  "pesoValor",
  "pesoUnidad",
] as const;

export const FLOW_ALLOWED_KEYS: Record<GuidedFlow, readonly string[]> = {
  "item-gema": GEMA_KEYS,
  "item-joya": JOYA_KEYS,
  "item-insumo": INSUMO_KEYS,
  lote: LOTE_KEYS,
  venta: VENTA_KEYS,
  provider: PROVIDER_KEYS,
  client: CLIENT_KEYS,
  // edit-existing carries the patch keys plus a target hint; handled below.
  "edit-existing": [...EDIT_PATCH_KEYS, "itemHint", "targetItemId"],
  // batch-edit carries only `edits`; each edit.patch is whitelisted to EDIT_PATCH_KEYS.
  "batch-edit": ["edits"],
  advisory: [],
};

// ─── Required keys per flow (mirror each form's guard) ───────────────
//
// A nested array is an OR-group: satisfied if ANY member is present/defaulted
// (e.g. a lote needs providerId OR providerName).

type RequiredSpec = (string | string[])[];

const FLOW_REQUIRED_KEYS: Record<GuidedFlow, RequiredSpec> = {
  "item-gema": ["nombre", "peso", "preponderancia"],
  "item-joya": ["nombre", "tipoJoya", "preponderancia"],
  "item-insumo": ["nombre", "categoria", "cantidad", "preponderancia"],
  lote: [
    "sede",
    ["providerId", "providerName"],
    "costoTotalCOP",
    "unidadesDeclaradas",
    "formaPago",
  ],
  venta: [
    "sede",
    "itemId",
    ["clientId", "clienteFinalData"],
    "precioAcordado",
    "formaPago",
  ],
  provider: ["nombreORazonSocial", "tipo", "documento"],
  client: ["nombre", "tipo", "documento", "direccion"],
  "edit-existing": [], // handled specially: needs a target + ≥1 change
  "batch-edit": [], // handled specially: needs ≥1 edit
  advisory: [],
};

// ─── Defaults the model must NOT ask for ─────────────────────────────
//
// These mirror the EMPTY_*_DRAFT seeds + form defaults. A required key that
// has a default is treated as already satisfied (the form supplies it), so
// the interview never re-asks an inferable value.

const FLOW_DEFAULTS: Record<GuidedFlow, Record<string, unknown>> = {
  "item-gema": { calidad: DEFAULT_CALIDAD, procedencia: "Boyacá", cantidad: 1 },
  "item-joya": { cantidad: 1, pesoUnidad: "gr" },
  "item-insumo": {},
  lote: { formaPago: "contado", metodoContado: "transferencia" },
  venta: {
    compradorTipo: "embajador",
    formaPago: "contado",
    metodoContado: "efectivo",
  },
  provider: { tipo: "gemas" },
  client: { tipo: "final" },
  "edit-existing": {},
  "batch-edit": {},
  advisory: {},
};

export function flowDefaults(flow: GuidedFlow): Record<string, unknown> {
  return FLOW_DEFAULTS[flow] ?? {};
}

// ─── Value helpers ───────────────────────────────────────────────────

function hasValue(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
}

// ─── Whitelist ───────────────────────────────────────────────────────

function pick(obj: GuidedDraft, keys: readonly string[]): GuidedDraft {
  const out: GuidedDraft = {};
  for (const k of keys) {
    if (k in obj && obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

/**
 * Strip any field the model emitted that the target flow does not allow, so a
 * hallucinated key can never reach a form setState or a mutation. Returns a
 * fresh object; the input is never mutated.
 */
export function whitelistDraft(
  flow: GuidedFlow,
  draft: GuidedDraft,
): GuidedDraft {
  if (!draft || typeof draft !== "object") return {};
  if (flow === "batch-edit") {
    const edits = Array.isArray(draft.edits) ? (draft.edits as unknown[]) : [];
    return {
      edits: edits
        .map((e) => sanitizeEdit(e))
        .filter((e): e is BatchEditPatch => e !== null),
    };
  }
  if (flow === "edit-existing") {
    const out = pick(draft, [...EDIT_PATCH_KEYS]);
    if (typeof draft.itemHint === "string") out.itemHint = draft.itemHint;
    if (typeof draft.targetItemId === "string")
      out.targetItemId = draft.targetItemId;
    return out;
  }
  return pick(draft, FLOW_ALLOWED_KEYS[flow]);
}

function sanitizeEdit(raw: unknown): BatchEditPatch | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const patch =
    e.patch && typeof e.patch === "object"
      ? pick(e.patch as GuidedDraft, [...EDIT_PATCH_KEYS])
      : {};
  if (Object.keys(patch).length === 0) return null;
  const out: BatchEditPatch = { patch };
  if (typeof e.itemHint === "string") out.itemHint = e.itemHint;
  if (typeof e.targetItemId === "string") out.targetItemId = e.targetItemId;
  if (!out.itemHint && !out.targetItemId) return null;
  return out;
}

// ─── Vocabulary coercion ─────────────────────────────────────────────

// Fields the forms hold as `number | ""` — the model sometimes emits them as
// numeric strings ("100"), which would fail the form's `typeof === "number"`
// guards (e.g. canSave). Coerce a numeric string to a real number. `peso` is
// deliberately absent: it is free text ("3.2 ct" / "Plata").
const NUMERIC_FIELDS = new Set<string>([
  "preponderancia",
  "precioPublicoCOP",
  "precioEmbajadorCOP",
  "precioConscienteCOP",
  "cantidad",
  "nivelRareza",
  "calificacion",
  "pesoValor",
  "costoTotalCOP",
  "unidadesDeclaradas",
  "pesoTotalQuilates",
  "creditoCuotas",
  "creditoTasa",
  "precioAcordado",
  "descuentoCOP",
  "esmereoPlazo",
  "esmereoCuotas",
]);

function coerceNumericStrings(draft: GuidedDraft): void {
  for (const key of NUMERIC_FIELDS) {
    const v = draft[key];
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    const n = Number(trimmed);
    if (Number.isFinite(n)) draft[key] = n;
  }
}

function coerceEnum(value: unknown, allowed: readonly string[]): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  const exact = allowed.find((a) => a === s);
  if (exact) return exact;
  const lower = s.toLowerCase();
  return allowed.find((a) => a.toLowerCase() === lower) ?? null;
}

// Single-value enum fields, by flow.
const FLOW_ENUM_FIELDS: Record<
  GuidedFlow,
  Record<string, readonly string[]>
> = {
  "item-gema": { corte: CORTES, tipoEsmeralda: TIPOS_ESMERALDA },
  "item-joya": { tipoJoya: TIPOS_JOYA },
  "item-insumo": {},
  lote: { formaPago: FORMA_PAGO, metodoContado: METODO_CONTADO },
  venta: {
    formaPago: FORMA_PAGO_VENTA,
    metodoContado: METODO_RECEPCION,
    compradorTipo: CLIENT_TIPOS,
  },
  provider: { tipo: PROVIDER_TIPOS },
  client: { tipo: CLIENT_TIPOS },
  "edit-existing": {
    corte: CORTES,
    tipoEsmeralda: TIPOS_ESMERALDA,
    tipoJoya: TIPOS_JOYA,
  },
  "batch-edit": {},
  advisory: {},
};

// Array enum fields (multi-select), by flow.
const FLOW_ARRAY_ENUM_FIELDS: Partial<
  Record<GuidedFlow, Record<string, readonly string[]>>
> = {
  "item-joya": { minerales: MINERALES, complementos: COMPLEMENTOS },
  "edit-existing": { minerales: MINERALES, complementos: COMPLEMENTOS },
};

function coerceDraftFields(
  flow: GuidedFlow,
  draft: GuidedDraft,
): { draft: GuidedDraft; coercedKeys: string[] } {
  const out: GuidedDraft = { ...draft };
  const coercedKeys: string[] = [];
  const flag = (k: string) => {
    if (!coercedKeys.includes(k)) coercedKeys.push(k);
  };

  // calidad / color — normalizers that PRESERVE write-ins.
  if (typeof out.calidad === "string" && out.calidad.trim()) {
    const norm = normalizeCalidad(out.calidad);
    if (norm !== out.calidad) {
      out.calidad = norm;
      flag("calidad");
    }
  }
  if (typeof out.color === "string" && out.color.trim()) {
    const norm = normalizeColor(out.color);
    if (norm !== out.color) {
      out.color = norm;
      flag("color");
    }
  }

  // sede — ID-safe token.
  if (typeof out.sede === "string" && out.sede.trim()) {
    const norm = sanitizeSedeCode(out.sede);
    if (norm !== out.sede) {
      out.sede = norm;
      flag("sede");
    }
  }

  // pesoUnidad — strict gr|ct, default gr.
  if (
    "pesoUnidad" in out &&
    out.pesoUnidad !== "gr" &&
    out.pesoUnidad !== "ct"
  ) {
    out.pesoUnidad = "gr";
    flag("pesoUnidad");
  }

  // Strict single-value enums — coerce to canonical or drop + flag.
  const enums = FLOW_ENUM_FIELDS[flow] ?? {};
  for (const [field, allowed] of Object.entries(enums)) {
    if (!(field in out) || !hasValue(out[field])) continue;
    const match = coerceEnum(out[field], allowed);
    if (match === null) {
      delete out[field];
      flag(field);
    } else if (match !== out[field]) {
      out[field] = match;
      flag(field);
    }
  }

  // Multi-select enums — filter to canonical members.
  const arrEnums = FLOW_ARRAY_ENUM_FIELDS[flow] ?? {};
  for (const [field, allowed] of Object.entries(arrEnums)) {
    if (!Array.isArray(out[field])) continue;
    const input = out[field] as unknown[];
    const mapped: string[] = [];
    let changed = false;
    for (const v of input) {
      const match = coerceEnum(v, allowed);
      if (match === null) {
        changed = true; // dropped an invalid member
      } else {
        if (match !== v) changed = true;
        if (!mapped.includes(match)) mapped.push(match);
      }
    }
    if (changed) {
      out[field] = mapped;
      flag(field);
    }
  }

  // Normalize numeric-string fields to real numbers (no flag — this is a type
  // fix, not a value substitution the human needs to review).
  coerceNumericStrings(out);

  return { draft: out, coercedKeys };
}

/**
 * Coerce vocabulary-constrained fields to canonical values (or drop unknown
 * strict-enum values), returning the cleaned draft plus the list of keys that
 * were substituted/dropped so the UI can surface them to the human. Handles
 * batch-edit by coercing each edit.patch under the edit-existing rules.
 */
export function coerceVocabulary(
  flow: GuidedFlow,
  draft: GuidedDraft,
): { draft: GuidedDraft; coercedKeys: string[] } {
  if (flow === "batch-edit") {
    const edits = Array.isArray(draft.edits)
      ? (draft.edits as BatchEditPatch[])
      : [];
    const coercedKeys: string[] = [];
    const nextEdits = edits.map((e, i) => {
      const { draft: patch, coercedKeys: ck } = coerceDraftFields(
        "edit-existing",
        e.patch ?? {},
      );
      ck.forEach((k) => coercedKeys.push(`edits[${i}].${k}`));
      return { ...e, patch };
    });
    return { draft: { ...draft, edits: nextEdits }, coercedKeys };
  }
  return coerceDraftFields(flow, draft);
}

// ─── Missing / ready recomputation ───────────────────────────────────

/**
 * Recompute the still-missing REQUIRED fields from the (whitelisted, coerced)
 * draft — the model's own `missing`/`ready` claim is never trusted. A required
 * key is satisfied when it has a value OR a flow default. OR-groups are
 * satisfied by any member.
 */
export function computeMissing(flow: GuidedFlow, draft: GuidedDraft): string[] {
  if (flow === "advisory") return [];

  if (flow === "batch-edit") {
    const edits = Array.isArray(draft.edits) ? draft.edits : [];
    return edits.length > 0 ? [] : ["edits"];
  }

  if (flow === "edit-existing") {
    const hasTarget = hasValue(draft.itemHint) || hasValue(draft.targetItemId);
    const hasChange = [...EDIT_PATCH_KEYS].some((k) => k in draft);
    const missing: string[] = [];
    if (!hasTarget) missing.push("itemHint");
    if (!hasChange) missing.push("changes");
    return missing;
  }

  const defaults = FLOW_DEFAULTS[flow] ?? {};
  const satisfied = (key: string): boolean =>
    hasValue(draft[key]) || hasValue(defaults[key]);

  const missing: string[] = [];
  for (const spec of FLOW_REQUIRED_KEYS[flow]) {
    if (Array.isArray(spec)) {
      if (!spec.some((k) => satisfied(k))) missing.push(spec.join("|"));
    } else if (!satisfied(spec)) {
      missing.push(spec);
    }
  }
  return missing;
}

// ─── Prompt schema text ──────────────────────────────────────────────

function fmtRequired(spec: RequiredSpec): string {
  return spec
    .map((s) => (Array.isArray(s) ? `(${s.join(" o ")})` : s))
    .join(", ");
}

/**
 * Build the compact schema description embedded in the guided system prompt.
 * Generated from the tables above so the prompt contract can never drift from
 * the whitelist / required logic.
 */
export function buildFlowSchemaText(): string {
  const lines: string[] = [];
  lines.push("FLUJOS Y CAMPOS (devuelve JSON con la forma indicada):");

  const describe = (flow: GuidedFlow, label: string) => {
    const required = fmtRequired(FLOW_REQUIRED_KEYS[flow]);
    const defaults = Object.entries(FLOW_DEFAULTS[flow])
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(", ");
    const allowed = FLOW_ALLOWED_KEYS[flow].join(", ");
    lines.push(
      `- ${flow} (${label}): obligatorios → ${required || "—"}; ` +
        `defaults (NO los preguntes) → ${defaults || "—"}; ` +
        `campos permitidos → ${allowed}`,
    );
  };

  describe("item-gema", "registrar gema/piedra en un lote");
  describe("item-joya", "registrar joya en un lote");
  describe("item-insumo", "registrar insumo en un lote");
  describe("lote", "crear lote nuevo");
  describe("venta", "registrar venta");
  describe("provider", "crear proveedor");
  describe("client", "crear cliente/embajador");
  lines.push(
    `- edit-existing (editar un ítem): draft con { itemHint, ${EDIT_PATCH_KEYS.join(
      ", ",
    )} }; NUNCA incluyas preponderancia ni fotos.`,
  );
  lines.push(
    `- batch-edit (editar varios ítems del mismo lote): draft con { edits: [{ itemHint, patch: {…campos editables} }] }; NUNCA preponderancia.`,
  );
  lines.push("- advisory (responder una pregunta): draft vacío.");

  lines.push("");
  lines.push(
    "VOCABULARIOS CONTROLADOS (usa SOLO estos valores en estos campos):",
  );
  lines.push(`- calidad: ${CALIDADES.join(" | ")}`);
  lines.push(`- color: ${COLORS.join(" | ")}`);
  lines.push(`- corte: ${CORTES.join(" | ")}`);
  lines.push(`- tipoEsmeralda: ${TIPOS_ESMERALDA.join(" | ")}`);
  lines.push(`- tipoJoya: ${TIPOS_JOYA.join(" | ")}`);
  lines.push(`- minerales: ${MINERALES.join(" | ")}`);
  lines.push(`- complementos: ${COMPLEMENTOS.join(" | ")}`);
  lines.push(`- formaPago (lote): ${FORMA_PAGO.join(" | ")}`);
  lines.push(`- formaPago (venta): ${FORMA_PAGO_VENTA.join(" | ")}`);
  lines.push(`- metodoContado (lote): ${METODO_CONTADO.join(" | ")}`);
  lines.push(`- metodoContado (venta): ${METODO_RECEPCION.join(" | ")}`);
  lines.push(`- provider.tipo: ${PROVIDER_TIPOS.join(" | ")}`);
  lines.push(`- client.tipo / compradorTipo: ${CLIENT_TIPOS.join(" | ")}`);

  return lines.join("\n");
}
