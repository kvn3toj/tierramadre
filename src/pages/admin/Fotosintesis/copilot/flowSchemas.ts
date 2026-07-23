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
} from '../../../../data/vocabularies.js';
import type { AccessLevel } from '../../../../types/auth.js';
import {
  buildPath,
  canAccess,
  firstMissingParam,
  getRouteById,
  navRoutesForLevel,
} from '../../../../config/adminNavMap.js';

// ─── Flow taxonomy ───────────────────────────────────────────────────

export type GuidedFlow =
  | 'item-gema'
  | 'item-joya'
  | 'item-insumo'
  | 'lote'
  | 'venta'
  | 'provider'
  | 'client'
  | 'edit-existing'
  | 'batch-edit'
  | 'advisory';

export const GUIDED_FLOWS: readonly GuidedFlow[] = [
  'item-gema',
  'item-joya',
  'item-insumo',
  'lote',
  'venta',
  'provider',
  'client',
  'edit-existing',
  'batch-edit',
  'advisory',
] as const;

export function isGuidedFlow(value: unknown): value is GuidedFlow {
  return (
    typeof value === 'string' &&
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

/**
 * A server-validated navigation the model proposed this turn. Orthogonal to the
 * capture flow: the model may answer in `say` AND offer to navigate at once.
 * Always server-authored (`path` is built from the registry, never the model's
 * raw guess); absent when the model proposed nothing navigable for this role.
 */
export interface NavigateAction {
  /** Always a real `ADMIN_NAV_MAP` id (validated server-side). */
  routeId: string;
  /** Resolved path. Still a `:param` template when `needsParam` is set. */
  path: string;
  /** Param hints (model-provided) + any server-resolved values. */
  params?: Record<string, string>;
  /** Human label for the confirm chip / a11y announce. */
  label: string;
  /** Short "por qué", surfaced near the say bubble. */
  reason?: string;
  /** Set when a required dynamic param is still unresolved → client must resolve. */
  needsParam?: { name: string; label: string };
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
  /** Present iff the model proposed a navigation the server validated for this role. */
  navigate?: NavigateAction;
  /**
   * Present iff the model proposed an EXECUTABLE action this turn AND the server
   * hardened it into a committable shape. The client renders a CommitReviewCard
   * and, on the operator's single "Confirmar y guardar", dispatches it through
   * the static kind→mutation registry. The model never names a Convex ref/Id.
   */
  action?: GuidedAction;
  model?: string;
}

/** Map a capture flow to the operator-facing subtipo radio value. */
export function flowToSubtipo(
  flow: GuidedFlow,
): 'gema' | 'joya' | 'insumo' | null {
  switch (flow) {
    case 'item-gema':
      return 'gema';
    case 'item-joya':
      return 'joya';
    case 'item-insumo':
      return 'insumo';
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
  'nombre',
  'peso',
  'color',
  'calidad',
  'procedencia',
  'preponderancia',
  'precioPublicoCOP',
  'cantidad',
  'tipoEsmeralda',
  'corte',
  'medidasAncho',
  'medidasAlto',
  'medidasCono',
  'nivelRareza',
  'calificacion',
  // Routing-only hint (NOT a form field): the target lot when Maritza names
  // it explicitly. The Copilot panel strips it before seeding the form.
  'loteId',
] as const;

const JOYA_KEYS = [
  'nombre',
  'descripcion',
  'cantidad',
  'pesoValor',
  'pesoUnidad',
  'tipoJoya',
  'tecnica',
  'minerales',
  'complementos',
  'preponderancia',
  'precioPublicoCOP',
  'loteId',
] as const;

const INSUMO_KEYS = [
  'nombre',
  'categoria',
  'cantidad',
  'preponderancia',
  'precioPublicoCOP',
  'loteId',
] as const;

const LOTE_KEYS = [
  'sede',
  'providerId',
  'providerName',
  'fechaRecepcion',
  'costoTotalCOP',
  'unidadesDeclaradas',
  'formaPago',
  'metodoContado',
  'renombreLote',
  'tratamiento',
  'mina',
  'pesoTotalQuilates',
  'notas',
  'creditoFechaVenc',
  'creditoCuotas',
  // UI-only on purpose: collected + shown in CapturaLotePage but NOT forwarded
  // to lots.create (no column yet — see CapturaLotePage "tasaInteres UI-only"
  // note). Kept here so the copilot still captures it for the operator.
  'creditoTasa',
] as const;

const VENTA_KEYS = [
  'itemId',
  'clientId',
  'clienteFinalData',
  'sede',
  'compradorTipo',
  'formaPago',
  'metodoContado',
  'precioAcordado',
  'descuentoCOP',
  'adicionales',
  'creditoFechaVenc',
  'creditoCuotas',
  'creditoTasa',
  'esmereoPlazo',
  'esmereoCuotas',
  'esmereoFechaVenc',
  'esmereoNotas',
] as const;

const PROVIDER_KEYS = [
  'nombreORazonSocial',
  'tipo',
  'tipoDocumento',
  'documento',
  'telefono',
  'email',
  'direccion',
  'notas',
] as const;

const CLIENT_KEYS = [
  'nombre',
  'tipo',
  'tipoDocumento',
  'documento',
  'direccion',
  'telefono',
  'email',
  'asesorId',
] as const;

/**
 * Fields an item edit may touch. Union of the gema/joya/insumo patch shapes
 * plus the catalog tiers. preponderancia and photo/cert are intentionally
 * excluded — preponderancia is lot-derived and photos can't ride over JSON.
 */
export const EDIT_PATCH_KEYS = [
  'nombre',
  'peso',
  'color',
  'calidad',
  'procedencia',
  'observacion',
  'corte',
  'medidasAncho',
  'medidasAlto',
  'medidasCono',
  'cantidad',
  'tipoEsmeralda',
  'nivelRareza',
  'calificacion',
  'precioPublicoCOP',
  'mostrarEnCatalogo',
  'tipoJoya',
  'tecnica',
  'minerales',
  'complementos',
  'descripcion',
  'categoria',
  'pesoValor',
  'pesoUnidad',
] as const;

export const FLOW_ALLOWED_KEYS: Record<GuidedFlow, readonly string[]> = {
  'item-gema': GEMA_KEYS,
  'item-joya': JOYA_KEYS,
  'item-insumo': INSUMO_KEYS,
  lote: LOTE_KEYS,
  venta: VENTA_KEYS,
  provider: PROVIDER_KEYS,
  client: CLIENT_KEYS,
  // edit-existing carries the patch keys plus a target hint; handled below.
  'edit-existing': [...EDIT_PATCH_KEYS, 'itemHint', 'targetItemId'],
  // batch-edit carries only `edits`; each edit.patch is whitelisted to EDIT_PATCH_KEYS.
  'batch-edit': ['edits'],
  advisory: [],
};

// ─── Required keys per flow (mirror each form's guard) ───────────────
//
// A nested array is an OR-group: satisfied if ANY member is present/defaulted
// (e.g. a lote needs providerId OR providerName).

type RequiredSpec = (string | string[])[];

const FLOW_REQUIRED_KEYS: Record<GuidedFlow, RequiredSpec> = {
  'item-gema': ['nombre', 'peso', 'preponderancia'],
  'item-joya': ['nombre', 'tipoJoya', 'preponderancia'],
  'item-insumo': ['nombre', 'categoria', 'cantidad', 'preponderancia'],
  lote: [
    'sede',
    ['providerId', 'providerName'],
    'costoTotalCOP',
    'unidadesDeclaradas',
    'formaPago',
  ],
  venta: [
    'sede',
    'itemId',
    ['clientId', 'clienteFinalData'],
    'precioAcordado',
    'formaPago',
  ],
  provider: ['nombreORazonSocial', 'tipo', 'documento'],
  client: ['nombre', 'tipo', 'documento', 'direccion'],
  'edit-existing': [], // handled specially: needs a target + ≥1 change
  'batch-edit': [], // handled specially: needs ≥1 edit
  advisory: [],
};

// ─── Defaults the model must NOT ask for ─────────────────────────────
//
// These mirror the EMPTY_*_DRAFT seeds + form defaults. A required key that
// has a default is treated as already satisfied (the form supplies it), so
// the interview never re-asks an inferable value.

const FLOW_DEFAULTS: Record<GuidedFlow, Record<string, unknown>> = {
  'item-gema': { calidad: DEFAULT_CALIDAD, procedencia: 'Boyacá', cantidad: 1 },
  'item-joya': { cantidad: 1, pesoUnidad: 'gr' },
  'item-insumo': {},
  lote: { formaPago: 'contado', metodoContado: 'transferencia' },
  venta: {
    compradorTipo: 'embajador',
    formaPago: 'contado',
    metodoContado: 'efectivo',
  },
  provider: { tipo: 'gemas' },
  client: { tipo: 'final' },
  'edit-existing': {},
  'batch-edit': {},
  advisory: {},
};

export function flowDefaults(flow: GuidedFlow): Record<string, unknown> {
  return FLOW_DEFAULTS[flow] ?? {};
}

// ─── Value helpers ───────────────────────────────────────────────────

function hasValue(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
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
  if (!draft || typeof draft !== 'object') return {};
  if (flow === 'batch-edit') {
    const edits = Array.isArray(draft.edits) ? (draft.edits as unknown[]) : [];
    return {
      edits: edits
        .map((e) => sanitizeEdit(e))
        .filter((e): e is BatchEditPatch => e !== null),
    };
  }
  if (flow === 'edit-existing') {
    const out = pick(draft, [...EDIT_PATCH_KEYS]);
    if (typeof draft.itemHint === 'string') out.itemHint = draft.itemHint;
    if (typeof draft.targetItemId === 'string')
      out.targetItemId = draft.targetItemId;
    return out;
  }
  return pick(draft, FLOW_ALLOWED_KEYS[flow]);
}

function sanitizeEdit(raw: unknown): BatchEditPatch | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  const patch =
    e.patch && typeof e.patch === 'object'
      ? pick(e.patch as GuidedDraft, [...EDIT_PATCH_KEYS])
      : {};
  if (Object.keys(patch).length === 0) return null;
  const out: BatchEditPatch = { patch };
  if (typeof e.itemHint === 'string') out.itemHint = e.itemHint;
  if (typeof e.targetItemId === 'string') out.targetItemId = e.targetItemId;
  if (!out.itemHint && !out.targetItemId) return null;
  return out;
}

// ─── Vocabulary coercion ─────────────────────────────────────────────

// Fields the forms hold as `number | ""` — the model sometimes emits them as
// numeric strings ("100"), which would fail the form's `typeof === "number"`
// guards (e.g. canSave). Coerce a numeric string to a real number. `peso` is
// deliberately absent: it is free text ("3.2 ct" / "Plata").
const NUMERIC_FIELDS = new Set<string>([
  'preponderancia',
  'precioPublicoCOP',
  'cantidad',
  'nivelRareza',
  'calificacion',
  'pesoValor',
  'costoTotalCOP',
  'unidadesDeclaradas',
  'pesoTotalQuilates',
  'creditoCuotas',
  'creditoTasa',
  'precioAcordado',
  'descuentoCOP',
  'esmereoPlazo',
  'esmereoCuotas',
]);

function coerceNumericStrings(draft: GuidedDraft): void {
  for (const key of NUMERIC_FIELDS) {
    const v = draft[key];
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    const n = Number(trimmed);
    if (Number.isFinite(n)) draft[key] = n;
  }
}

function coerceEnum(value: unknown, allowed: readonly string[]): string | null {
  if (typeof value !== 'string') return null;
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
  'item-gema': { corte: CORTES, tipoEsmeralda: TIPOS_ESMERALDA },
  'item-joya': { tipoJoya: TIPOS_JOYA },
  'item-insumo': {},
  lote: { formaPago: FORMA_PAGO, metodoContado: METODO_CONTADO },
  venta: {
    formaPago: FORMA_PAGO_VENTA,
    metodoContado: METODO_RECEPCION,
    compradorTipo: CLIENT_TIPOS,
  },
  provider: { tipo: PROVIDER_TIPOS },
  client: { tipo: CLIENT_TIPOS },
  'edit-existing': {
    corte: CORTES,
    tipoEsmeralda: TIPOS_ESMERALDA,
    tipoJoya: TIPOS_JOYA,
  },
  'batch-edit': {},
  advisory: {},
};

// Array enum fields (multi-select), by flow.
const FLOW_ARRAY_ENUM_FIELDS: Partial<
  Record<GuidedFlow, Record<string, readonly string[]>>
> = {
  'item-joya': { minerales: MINERALES, complementos: COMPLEMENTOS },
  'edit-existing': { minerales: MINERALES, complementos: COMPLEMENTOS },
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
  if (typeof out.calidad === 'string' && out.calidad.trim()) {
    const norm = normalizeCalidad(out.calidad);
    if (norm !== out.calidad) {
      out.calidad = norm;
      flag('calidad');
    }
  }
  if (typeof out.color === 'string' && out.color.trim()) {
    const norm = normalizeColor(out.color);
    if (norm !== out.color) {
      out.color = norm;
      flag('color');
    }
  }

  // sede — ID-safe token.
  if (typeof out.sede === 'string' && out.sede.trim()) {
    const norm = sanitizeSedeCode(out.sede);
    if (norm !== out.sede) {
      out.sede = norm;
      flag('sede');
    }
  }

  // pesoUnidad — strict gr|ct, default gr.
  if (
    'pesoUnidad' in out &&
    out.pesoUnidad !== 'gr' &&
    out.pesoUnidad !== 'ct'
  ) {
    out.pesoUnidad = 'gr';
    flag('pesoUnidad');
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
  if (flow === 'batch-edit') {
    const edits = Array.isArray(draft.edits)
      ? (draft.edits as BatchEditPatch[])
      : [];
    const coercedKeys: string[] = [];
    const nextEdits = edits.map((e, i) => {
      const { draft: patch, coercedKeys: ck } = coerceDraftFields(
        'edit-existing',
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
  if (flow === 'advisory') return [];

  if (flow === 'batch-edit') {
    const edits = Array.isArray(draft.edits) ? draft.edits : [];
    return edits.length > 0 ? [] : ['edits'];
  }

  if (flow === 'edit-existing') {
    const hasTarget = hasValue(draft.itemHint) || hasValue(draft.targetItemId);
    const hasChange = [...EDIT_PATCH_KEYS].some((k) => k in draft);
    const missing: string[] = [];
    if (!hasTarget) missing.push('itemHint');
    if (!hasChange) missing.push('changes');
    return missing;
  }

  const defaults = FLOW_DEFAULTS[flow] ?? {};
  const satisfied = (key: string): boolean =>
    hasValue(draft[key]) || hasValue(defaults[key]);

  const missing: string[] = [];
  for (const spec of FLOW_REQUIRED_KEYS[flow]) {
    if (Array.isArray(spec)) {
      if (!spec.some((k) => satisfied(k))) missing.push(spec.join('|'));
    } else if (!satisfied(spec)) {
      missing.push(spec);
    }
  }
  return missing;
}

// ─── Prompt schema text ──────────────────────────────────────────────

function fmtRequired(spec: RequiredSpec): string {
  return spec
    .map((s) => (Array.isArray(s) ? `(${s.join(' o ')})` : s))
    .join(', ');
}

/**
 * Build the compact schema description embedded in the guided system prompt.
 * Generated from the tables above so the prompt contract can never drift from
 * the whitelist / required logic.
 */
export function buildFlowSchemaText(): string {
  const lines: string[] = [];
  lines.push('FLUJOS Y CAMPOS (devuelve JSON con la forma indicada):');

  const describe = (flow: GuidedFlow, label: string) => {
    const required = fmtRequired(FLOW_REQUIRED_KEYS[flow]);
    const defaults = Object.entries(FLOW_DEFAULTS[flow])
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(', ');
    const allowed = FLOW_ALLOWED_KEYS[flow].join(', ');
    lines.push(
      `- ${flow} (${label}): obligatorios → ${required || '—'}; ` +
        `defaults (NO los preguntes) → ${defaults || '—'}; ` +
        `campos permitidos → ${allowed}`,
    );
  };

  describe('item-gema', 'registrar gema/piedra en un lote');
  describe('item-joya', 'registrar joya en un lote');
  describe('item-insumo', 'registrar insumo en un lote');
  describe('lote', 'crear lote nuevo');
  describe('venta', 'registrar venta');
  describe('provider', 'crear proveedor');
  describe('client', 'crear cliente/embajador');
  lines.push(
    `- edit-existing (editar un ítem): draft con { itemHint, ${EDIT_PATCH_KEYS.join(
      ', ',
    )} }; NUNCA incluyas preponderancia ni fotos.`,
  );
  lines.push(
    `- batch-edit (editar varios ítems del mismo lote): draft con { edits: [{ itemHint, patch: {…campos editables} }] }; NUNCA preponderancia.`,
  );
  lines.push('- advisory (responder una pregunta): draft vacío.');

  lines.push('');
  lines.push(
    'VOCABULARIOS CONTROLADOS (usa SOLO estos valores en estos campos):',
  );
  lines.push(`- calidad: ${CALIDADES.join(' | ')}`);
  lines.push(`- color: ${COLORS.join(' | ')}`);
  lines.push(`- corte: ${CORTES.join(' | ')}`);
  lines.push(`- tipoEsmeralda: ${TIPOS_ESMERALDA.join(' | ')}`);
  lines.push(`- tipoJoya: ${TIPOS_JOYA.join(' | ')}`);
  lines.push(`- minerales: ${MINERALES.join(' | ')}`);
  lines.push(`- complementos: ${COMPLEMENTOS.join(' | ')}`);
  lines.push(`- formaPago (lote): ${FORMA_PAGO.join(' | ')}`);
  lines.push(`- formaPago (venta): ${FORMA_PAGO_VENTA.join(' | ')}`);
  lines.push(`- metodoContado (lote): ${METODO_CONTADO.join(' | ')}`);
  lines.push(`- metodoContado (venta): ${METODO_RECEPCION.join(' | ')}`);
  lines.push(`- provider.tipo: ${PROVIDER_TIPOS.join(' | ')}`);
  lines.push(`- client.tipo / compradorTipo: ${CLIENT_TIPOS.join(' | ')}`);

  return lines.join('\n');
}

// ─── Navigation (route map) ──────────────────────────────────────────

/**
 * Resolvers whose param value the SERVER may fill directly from the model's hint
 * (the hint IS the route segment). Name→ID resolvers (itemId/lotItemId/saleId)
 * are client-only, so the server leaves them for client resolution via
 * `resolveItemHint` against the live candidate list.
 */
const DIRECT_FILL_RESOLVERS = new Set(['loteId', 'guestName', 'none']);
const MAX_PARAM_LEN = 80;

/**
 * Catalog of navigable routes for a role, embedded in the guided system prompt so
 * the model can only emit `routeId`s the user can actually reach. Labels +
 * keywords + param names only — never paths, never file locations.
 */
export function buildNavCatalogText(level: AccessLevel): string {
  const lines: string[] = [];
  lines.push(
    'CATÁLOGO DE PANTALLAS (id · pantalla · palabras clave · parámetro):',
  );
  for (const e of navRoutesForLevel(level)) {
    const param = e.params?.length
      ? ` · parámetro: ${e.params.map((p) => `${p.name} (${p.label})`).join(', ')}`
      : '';
    lines.push(`- ${e.id} · ${e.label} · ${e.keywords.join(', ')}${param}`);
  }
  return lines.join('\n');
}

function sanitizeParams(
  raw: unknown,
  allowed: readonly string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of allowed) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim().slice(0, MAX_PARAM_LEN);
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = String(value);
    }
  }
  return out;
}

/**
 * Validate + harden a model-proposed navigation. Mirrors the drop-on-invalid
 * posture of `whitelistDraft`:
 *   - unknown `routeId` → null (hallucinated route dropped)
 *   - role cannot access → null (never navigate a user where their role can't go)
 *   - static route → fully resolved path
 *   - dynamic route → fills server-safe params; otherwise returns the param hints
 *     + `needsParam` so the CLIENT resolves name→ID before navigating.
 *
 * @param resolvedParams authoritative params the server already knows (e.g. the
 *   current lote from context). Takes precedence over model hints.
 */
export function resolveNavigate(
  raw: unknown,
  level: AccessLevel,
  resolvedParams: Record<string, string> = {},
): NavigateAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const routeId = (raw as Record<string, unknown>).routeId;
  if (typeof routeId !== 'string') return null;

  const entry = getRouteById(routeId);
  if (!entry) return null;
  if (!canAccess(entry, level)) return null;

  const reasonRaw = (raw as Record<string, unknown>).reason;
  const reason =
    typeof reasonRaw === 'string' && reasonRaw.trim()
      ? reasonRaw.trim().slice(0, 240)
      : undefined;

  if (!entry.dynamic || !entry.params?.length) {
    return { routeId: entry.id, path: entry.path, label: entry.label, reason };
  }

  const allowed = entry.params.map((p) => p.name);
  const hints = sanitizeParams(
    (raw as Record<string, unknown>).params,
    allowed,
  );

  // Server may fill only direct-fill resolvers from hints; authoritative
  // resolvedParams always win.
  const serverParams: Record<string, string> = {};
  for (const spec of entry.params) {
    if (resolvedParams[spec.name]) {
      serverParams[spec.name] = resolvedParams[spec.name];
    } else if (DIRECT_FILL_RESOLVERS.has(spec.resolver) && hints[spec.name]) {
      serverParams[spec.name] = hints[spec.name];
    }
  }

  // params carried to the client = hints ∪ server-resolved (client uses hints to
  // resolve name→ID resolvers it owns).
  const carried = { ...hints, ...serverParams };

  const built = buildPath(entry, serverParams);
  if (built) {
    return {
      routeId: entry.id,
      path: built,
      params: carried,
      label: entry.label,
      reason,
    };
  }

  const missing = firstMissingParam(entry, serverParams);
  return {
    routeId: entry.id,
    path: entry.path,
    params: carried,
    label: entry.label,
    reason,
    needsParam: missing
      ? { name: missing.name, label: missing.label }
      : undefined,
  };
}

// ─── Executable actions (Fotosynthia v2.1 · propose → COMMIT) ─────────
//
// The model may, in addition to `say`, propose ONE executable `action`
// ({ kind, args }). It NEVER names a Convex ref, table or Id — it passes plain
// names ("la esmeralda de Chivor", "Pedro") in the hint fields, and the SERVER
// hardens the proposal: whitelists keys (reusing the flow machinery above),
// strips any smuggled Id, flags which refs the CLIENT must resolve, recomputes
// missing/ready, and authors the human-readable summary. The actual commit only
// happens when the operator clicks "Confirmar y guardar" (see CommitReviewCard +
// executeAction.ts). This module stays React/MUI-free so it bundles into the
// Vercel serverless function unchanged.

/** Entity classes the client resolves a name hint to (a Convex Id or natural key). */
export type RefKind =
  | 'provider'
  | 'client'
  | 'lot'
  | 'sublote'
  | 'sale'
  | 'item';

/** Every committable operation. Single mutation per kind (see actionRegistry.ts client-side). */
export type ActionKind =
  // items (Convex lot items)
  | 'item.createGema'
  | 'item.createJoya'
  | 'item.createInsumo'
  | 'item.editFields'
  | 'item.editPreponderancia'
  | 'item.setMedia'
  | 'item.remove'
  // lots
  | 'lot.create'
  | 'lot.update'
  | 'lot.close'
  | 'lot.cancel'
  | 'lot.publish'
  | 'lot.reopen'
  | 'lot.setDisplay'
  // sales
  | 'sale.create'
  | 'sale.cancel'
  | 'sale.updatePrice'
  | 'sale.setCertificadoUrl'
  | 'sale.setCarnetUrl'
  // sublotes
  | 'sublote.create'
  | 'sublote.addItems'
  | 'sublote.removeItems'
  | 'sublote.updateMeta'
  | 'sublote.setEstado'
  | 'sublote.setDisplay'
  // directory
  | 'provider.create'
  | 'provider.update'
  | 'client.create'
  | 'client.update';

export const ACTION_KINDS: readonly ActionKind[] = [
  'item.createGema',
  'item.createJoya',
  'item.createInsumo',
  'item.editFields',
  'item.editPreponderancia',
  'item.setMedia',
  'item.remove',
  'lot.create',
  'lot.update',
  'lot.close',
  'lot.cancel',
  'lot.publish',
  'lot.reopen',
  'lot.setDisplay',
  'sale.create',
  'sale.cancel',
  'sale.updatePrice',
  'sale.setCertificadoUrl',
  'sale.setCarnetUrl',
  'sublote.create',
  'sublote.addItems',
  'sublote.removeItems',
  'sublote.updateMeta',
  'sublote.setEstado',
  'sublote.setDisplay',
  'provider.create',
  'provider.update',
  'client.create',
  'client.update',
] as const;

export function isActionKind(value: unknown): value is ActionKind {
  return (
    typeof value === 'string' &&
    (ACTION_KINDS as readonly string[]).includes(value)
  );
}

/** A *Id arg the client must fill by resolving the model's name hint. */
export interface ActionUnresolvedRef {
  /** The arg key the client fills with the resolved value (e.g. "providerId", "id", "targetItemId"). */
  field: string;
  refKind: RefKind;
  /** The name the model supplied (the client matches it against live data, refuse-on-ambiguity). */
  hint: string;
}

/** The structured, server-hardened action the client may commit on one approval. */
export interface GuidedAction {
  kind: ActionKind;
  args: GuidedDraft;
  /** Server-authored, human-readable summary of exactly what will be written. NEVER LLM prose. */
  summary: string;
  confirmLabel: string;
  /** "direct" → commit via the kind→mutation registry; "handoff" → open the form (complex flows). */
  mode: 'direct' | 'handoff';
  /** Irreversible / financial → the card demands a typed 2-step gesture before committing. */
  destructive: boolean;
  twoStep: boolean;
  /** Underlying mutation pushes to Sheets? false ⇒ the queue shows "N/A catálogo", never forever-pending. */
  syncsToSheet: boolean;
  /** Refs the client must resolve (name → Convex Id) before dispatch. */
  needsRefs: ActionUnresolvedRef[];
  /** Recomputed server-side; non-empty ⇒ keep interviewing, do NOT show the commit button. */
  missing: string[];
  ready: boolean;
}

interface ActionRefSpec {
  /** The arg key holding the resolved id/natural-key the mutation consumes. */
  field: string;
  refKind: RefKind;
  /** The arg key the model fills with a plain name/natural-key hint. */
  hintField: string;
}

interface ActionSpec {
  label: string;
  group: RefKind | 'item';
  mode: 'direct' | 'handoff';
  /** Reuse a capture flow's whitelist + vocabulary coercion + (for creates) required logic. */
  coerceFlow?: GuidedFlow;
  /** Explicit arg allow-list for kinds without a coerceFlow. */
  argKeys?: readonly string[];
  /** Keys stripped AFTER whitelist — the C10 fan-out guard (e.g. costoTotalCOP on lot.update). */
  dropKeys?: readonly string[];
  /** Data args (minus refs) get wrapped into `{ patch }` by the client. */
  wrapPatch?: boolean;
  refs: readonly ActionRefSpec[];
  /** Extra required arg keys beyond the coerceFlow's own required set. */
  required?: readonly (string | string[])[];
  /** Edit kinds: at least one data key must be present. */
  requiresChange?: boolean;
  destructive?: boolean;
  twoStep?: boolean;
  syncsToSheet: boolean;
  minLevel: AccessLevel;
}

// Keys a lot UPDATE may touch — deliberately EXCLUDES costoTotalCOP (C10: it
// re-fans costoBaseCOP across every member item, too blunt for an AI patch) and
// the provider link (re-pointing a lot's provider is out of the copilot's scope).
const LOT_UPDATE_KEYS = [
  'fechaRecepcion',
  'renombreLote',
  'tratamiento',
  'mina',
  'pesoTotalQuilates',
  'unidadesDeclaradas',
  'formaPago',
  'metodoContado',
  'fechaVencimiento',
  'numeroCuotas',
  'numeroFactura',
  'urlFactura',
  'notas',
] as const;

const ACTION_REGISTRY: Record<ActionKind, ActionSpec> = {
  // ── items ──────────────────────────────────────────────────────────
  'item.createGema': {
    label: 'Crear gema',
    group: 'item',
    mode: 'direct',
    coerceFlow: 'item-gema',
    refs: [],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'item.createJoya': {
    label: 'Crear joya',
    group: 'item',
    mode: 'direct',
    coerceFlow: 'item-joya',
    refs: [],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'item.createInsumo': {
    label: 'Crear insumo',
    group: 'item',
    mode: 'direct',
    coerceFlow: 'item-insumo',
    refs: [],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'item.editFields': {
    // C3: coerceFlow edit-existing → EDIT_PATCH_KEYS, which EXCLUDES preponderancia
    // + costoBaseCOP. Preponderancia edits only flow through item.editPreponderancia.
    label: 'Editar ítem',
    group: 'item',
    mode: 'direct',
    coerceFlow: 'edit-existing',
    wrapPatch: true,
    refs: [{ field: 'targetItemId', refKind: 'item', hintField: 'itemHint' }],
    requiresChange: true,
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'item.editPreponderancia': {
    label: 'Ajustar preponderancia',
    group: 'item',
    mode: 'direct',
    argKeys: ['preponderancia'],
    refs: [{ field: 'targetItemId', refKind: 'item', hintField: 'itemHint' }],
    required: ['preponderancia'],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'item.setMedia': {
    label: 'Adjuntar foto/certificado',
    group: 'item',
    mode: 'direct',
    argKeys: ['fotoUrl', 'certificadoUrl'],
    refs: [{ field: 'targetItemId', refKind: 'item', hintField: 'itemHint' }],
    requiresChange: true,
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'item.remove': {
    label: 'Quitar ítem del lote',
    group: 'item',
    mode: 'direct',
    argKeys: [],
    refs: [{ field: 'targetItemId', refKind: 'item', hintField: 'itemHint' }],
    destructive: true,
    twoStep: true,
    syncsToSheet: false, // orphaning is intentionally not pushed to Sheets
    minLevel: 'admin',
  },
  // ── lots ───────────────────────────────────────────────────────────
  'lot.create': {
    label: 'Registrar compra (lote)',
    group: 'lot',
    mode: 'direct',
    coerceFlow: 'lote',
    refs: [
      { field: 'providerId', refKind: 'provider', hintField: 'providerName' },
    ],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'lot.update': {
    label: 'Editar lote',
    group: 'lot',
    mode: 'direct',
    argKeys: LOT_UPDATE_KEYS,
    dropKeys: ['costoTotalCOP', 'providerId', 'providerName'],
    wrapPatch: true,
    refs: [{ field: 'id', refKind: 'lot', hintField: 'loteId' }],
    requiresChange: true,
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'lot.close': {
    label: 'Cerrar lote',
    group: 'lot',
    mode: 'direct',
    argKeys: [],
    refs: [{ field: 'id', refKind: 'lot', hintField: 'loteId' }],
    twoStep: true,
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'lot.cancel': {
    label: 'Cancelar lote',
    group: 'lot',
    mode: 'direct',
    argKeys: ['reason'],
    refs: [{ field: 'id', refKind: 'lot', hintField: 'loteId' }],
    destructive: true,
    twoStep: true,
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'lot.publish': {
    label: 'Publicar lote al catálogo',
    group: 'lot',
    mode: 'direct',
    argKeys: [],
    refs: [{ field: 'id', refKind: 'lot', hintField: 'loteId' }],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'lot.reopen': {
    label: 'Reabrir lote',
    group: 'lot',
    mode: 'direct',
    argKeys: ['reason'],
    refs: [{ field: 'id', refKind: 'lot', hintField: 'loteId' }],
    destructive: true,
    twoStep: true,
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'lot.setDisplay': {
    label: 'Mostrar lote como tarjeta',
    group: 'lot',
    mode: 'direct',
    argKeys: ['fotoLoteUrl', 'mostrarComoLote'],
    refs: [{ field: 'id', refKind: 'lot', hintField: 'loteId' }],
    syncsToSheet: false, // Convex-only display fields
    minLevel: 'admin',
  },
  // ── sales ──────────────────────────────────────────────────────────
  'sale.create': {
    // Promoted to a DIRECT in-chat commit for the COMMON case (single inventory
    // item · known/new client · contado-or-simple forma de pago). The execute
    // layer REFUSES the complex cases (esmereogénesis trade-in, multiple items,
    // commission tiers) and hands those back to the venta form, so a money write
    // only commits in-chat when it can faithfully replicate VentaPage's mapping.
    // A money write is two-step (deliberate typed confirm) even when not destructive.
    label: 'Registrar venta',
    group: 'sale',
    mode: 'direct',
    coerceFlow: 'venta',
    refs: [{ field: 'clientId', refKind: 'client', hintField: 'clientId' }],
    twoStep: true,
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'sale.cancel': {
    label: 'Cancelar venta',
    group: 'sale',
    mode: 'direct',
    argKeys: ['reason'],
    refs: [{ field: 'id', refKind: 'sale', hintField: 'saleId' }],
    destructive: true,
    twoStep: true,
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'sale.updatePrice': {
    label: 'Actualizar precio de venta',
    group: 'sale',
    mode: 'direct',
    argKeys: ['precioAcordadoCOP', 'totalCOP', 'descuentoCOP'],
    refs: [{ field: 'id', refKind: 'sale', hintField: 'saleId' }],
    required: ['precioAcordadoCOP'],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'sale.setCertificadoUrl': {
    label: 'Adjuntar certificado a la venta',
    group: 'sale',
    mode: 'direct',
    argKeys: ['certificadoUrl'],
    refs: [{ field: 'id', refKind: 'sale', hintField: 'saleId' }],
    required: ['certificadoUrl'],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'sale.setCarnetUrl': {
    label: 'Adjuntar carnet a la venta',
    group: 'sale',
    mode: 'direct',
    argKeys: ['carnetUrl'],
    refs: [{ field: 'id', refKind: 'sale', hintField: 'saleId' }],
    required: ['carnetUrl'],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  // ── sublotes ───────────────────────────────────────────────────────
  'sublote.create': {
    label: 'Crear sublote',
    group: 'sublote',
    mode: 'direct',
    argKeys: ['nombre', 'notas', 'itemIds'],
    refs: [
      { field: 'parentLoteId', refKind: 'lot', hintField: 'parentLoteId' },
    ],
    required: ['nombre'],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'sublote.addItems': {
    label: 'Agregar ítems al sublote',
    group: 'sublote',
    mode: 'direct',
    argKeys: ['itemIds'],
    refs: [{ field: 'subLoteId', refKind: 'sublote', hintField: 'subLoteId' }],
    required: ['itemIds'],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'sublote.removeItems': {
    label: 'Quitar ítems del sublote',
    group: 'sublote',
    mode: 'direct',
    argKeys: ['itemIds'],
    refs: [{ field: 'subLoteId', refKind: 'sublote', hintField: 'subLoteId' }],
    required: ['itemIds'],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'sublote.updateMeta': {
    label: 'Editar sublote',
    group: 'sublote',
    mode: 'direct',
    argKeys: ['nombre', 'notas'],
    refs: [{ field: 'subLoteId', refKind: 'sublote', hintField: 'subLoteId' }],
    requiresChange: true,
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'sublote.setEstado': {
    label: 'Archivar/reactivar sublote',
    group: 'sublote',
    mode: 'direct',
    argKeys: ['estado'],
    refs: [{ field: 'subLoteId', refKind: 'sublote', hintField: 'subLoteId' }],
    required: ['estado'],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'sublote.setDisplay': {
    label: 'Mostrar sublote como tarjeta',
    group: 'sublote',
    mode: 'direct',
    argKeys: ['fotoUrl', 'mostrarComoLote'],
    refs: [{ field: 'subLoteId', refKind: 'sublote', hintField: 'subLoteId' }],
    syncsToSheet: false, // Convex-only display fields
    minLevel: 'admin',
  },
  // ── directory ──────────────────────────────────────────────────────
  'provider.create': {
    label: 'Crear proveedor',
    group: 'provider',
    mode: 'direct',
    coerceFlow: 'provider',
    refs: [],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'provider.update': {
    label: 'Editar proveedor',
    group: 'provider',
    mode: 'direct',
    coerceFlow: 'provider',
    wrapPatch: true,
    refs: [{ field: 'id', refKind: 'provider', hintField: 'providerName' }],
    requiresChange: true,
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'client.create': {
    label: 'Crear cliente/embajador',
    group: 'client',
    mode: 'direct',
    coerceFlow: 'client',
    refs: [],
    syncsToSheet: true,
    minLevel: 'admin',
  },
  'client.update': {
    label: 'Editar cliente',
    group: 'client',
    mode: 'direct',
    coerceFlow: 'client',
    wrapPatch: true,
    refs: [{ field: 'id', refKind: 'client', hintField: 'clientName' }],
    requiresChange: true,
    syncsToSheet: true,
    minLevel: 'admin',
  },
};

/** Public read-only view of an action's static metadata (consumed client-side). */
export function getActionSpec(kind: ActionKind): {
  label: string;
  group: string;
  mode: 'direct' | 'handoff';
  destructive: boolean;
  twoStep: boolean;
  syncsToSheet: boolean;
  wrapPatch: boolean;
  refs: readonly ActionRefSpec[];
} {
  const s = ACTION_REGISTRY[kind];
  return {
    label: s.label,
    group: s.group,
    mode: s.mode,
    destructive: !!s.destructive,
    twoStep: !!s.twoStep,
    syncsToSheet: s.syncsToSheet,
    wrapPatch: !!s.wrapPatch,
    refs: s.refs,
  };
}

const LEVEL_RANK: Record<AccessLevel, number> = {
  guest: 0,
  invitado_especial: 0, // limited (browse + share only); no copilot action powers
  asesor: 1,
  provider: 1,
  embajador: 2,
  admin: 3,
};

export function actionAllowedForLevel(
  kind: ActionKind,
  level: AccessLevel,
): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[ACTION_REGISTRY[kind].minLevel];
}

/**
 * Heuristic for "this looks like a real Convex Id" (so the model can't smuggle a
 * fabricated Id past the ref-resolution step). Convex Ids are long, lowercase
 * base32-ish tokens with no spaces; a name hint has spaces or is short.
 */
export function looksLikeConvexId(value: unknown): boolean {
  return (
    typeof value === 'string' && value.length >= 16 && /^[a-z0-9]+$/.test(value)
  );
}

const CREATE_KINDS = new Set<ActionKind>([
  'item.createGema',
  'item.createJoya',
  'item.createInsumo',
  'lot.create',
  'sale.create',
  'provider.create',
  'client.create',
]);

function dataChangeKeys(spec: ActionSpec, data: GuidedDraft): string[] {
  const refKeys = new Set<string>();
  for (const r of spec.refs) {
    refKeys.add(r.field);
    refKeys.add(r.hintField);
  }
  return Object.keys(data).filter((k) => !refKeys.has(k));
}

/**
 * Recompute the still-missing required inputs for an action. The model's own
 * `missing`/`ready` is never trusted. Mirrors `computeMissing` for create flows
 * and adds ref-hint + change requirements.
 */
export function computeActionMissing(
  kind: ActionKind,
  data: GuidedDraft,
  needsRefs: ActionUnresolvedRef[],
): string[] {
  const spec = ACTION_REGISTRY[kind];
  const missing: string[] = [];

  // Every ref must have either a resolved-looking Id or a name hint to resolve.
  for (const ref of spec.refs) {
    const idVal = data[ref.field];
    const hasId = typeof idVal === 'string' && looksLikeConvexId(idVal);
    const hasHint = needsRefs.some((r) => r.field === ref.field);
    if (!hasId && !hasHint) missing.push(ref.hintField);
  }

  // Create flows reuse the flow's own required logic.
  if (spec.coerceFlow && CREATE_KINDS.has(kind)) {
    for (const m of computeMissing(spec.coerceFlow, data)) missing.push(m);
  }

  // Edit kinds need at least one data field.
  if (spec.requiresChange && dataChangeKeys(spec, data).length === 0) {
    missing.push('changes');
  }

  // Extra explicit required keys (defaults from the coerceFlow count as present).
  const defaults = spec.coerceFlow
    ? (FLOW_DEFAULTS[spec.coerceFlow] ?? {})
    : {};
  for (const req of spec.required ?? []) {
    if (Array.isArray(req)) {
      if (!req.some((k) => hasValue(data[k]) || hasValue(defaults[k]))) {
        missing.push(req.join('|'));
      }
    } else if (!(hasValue(data[req]) || hasValue(defaults[req]))) {
      missing.push(req);
    }
  }

  return [...new Set(missing)];
}

function summarizeChanges(data: GuidedDraft, exclude: Set<string>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (exclude.has(k)) continue;
    if (!hasValue(v)) continue;
    const val = Array.isArray(v) ? v.join(', ') : String(v);
    parts.push(`${k}: ${val.length > 40 ? `${val.slice(0, 40)}…` : val}`);
  }
  return parts.join(' · ');
}

/** Server-authored, human-readable description of exactly what the action writes. */
export function buildActionSummary(
  kind: ActionKind,
  data: GuidedDraft,
): string {
  const spec = ACTION_REGISTRY[kind];
  const refKeys = new Set<string>(spec.refs.map((r) => r.hintField));
  const name = (k: string) => (hasValue(data[k]) ? String(data[k]) : '');
  switch (kind) {
    case 'item.createGema':
    case 'item.createJoya':
    case 'item.createInsumo': {
      const bits = [
        name('nombre') && `«${name('nombre')}»`,
        name('peso'),
        name('preponderancia') && `prepon. ${name('preponderancia')}%`,
        name('loteId') && `lote ${name('loteId')}`,
      ].filter(Boolean);
      return `${spec.label}: ${bits.join(' · ')}`;
    }
    case 'item.editFields': {
      const patch = (data.patch as GuidedDraft) ?? data;
      return `Editar ${name('itemHint') || 'ítem'} → ${summarizeChanges(patch, new Set(['itemHint', 'targetItemId']))}`;
    }
    case 'item.editPreponderancia':
      return `Ajustar preponderancia de ${name('itemHint') || 'ítem'} a ${name('preponderancia')}%`;
    case 'item.setMedia':
      return `Adjuntar ${[name('fotoUrl') && 'foto', name('certificadoUrl') && 'certificado'].filter(Boolean).join(' + ')} a ${name('itemHint') || 'ítem'}`;
    case 'item.remove':
      return `Quitar ${name('itemHint') || 'ítem'} de su lote (lo libera al inventario)`;
    case 'lot.create':
      return `${spec.label}: ${name('sede') ? `bóveda ${name('sede')}` : ''} · ${name('providerName') || 'proveedor'} · ${name('costoTotalCOP') ? `$${name('costoTotalCOP')}` : ''} · ${name('unidadesDeclaradas') || '?'} uds`;
    case 'lot.update':
      return `Editar lote ${name('loteId')} → ${summarizeChanges((data.patch as GuidedDraft) ?? data, refKeys)}`;
    case 'lot.close':
      return `Cerrar lote ${name('loteId')} (valida preponderancia 100% + conteo de unidades)`;
    case 'lot.cancel':
      return `Cancelar lote ${name('loteId')}${name('reason') ? ` — ${name('reason')}` : ''}`;
    case 'lot.publish':
      return `Publicar lote ${name('loteId')} al catálogo`;
    case 'lot.reopen':
      return `Reabrir lote ${name('loteId')}${name('reason') ? ` — ${name('reason')}` : ''}`;
    case 'lot.setDisplay':
      return `Lote ${name('loteId')}: ${data.mostrarComoLote ? 'mostrar' : 'ocultar'} como tarjeta de catálogo`;
    case 'sale.create': {
      // clientId carries either a resolved client id or a NAME hint (its own
      // ref hintField); clienteFinalData names a brand-new buyer to be created.
      const buyer =
        name('clientId') ||
        (data.clienteFinalData &&
        typeof data.clienteFinalData === 'object' &&
        typeof (data.clienteFinalData as Record<string, unknown>).nombre ===
          'string'
          ? String((data.clienteFinalData as Record<string, unknown>).nombre)
          : '') ||
        'cliente';
      const precio = name('precioAcordado');
      return `Vender ${name('itemId') || 'ítem'} a ${buyer}${precio ? ` por $${precio}` : ''}`;
    }
    case 'sale.cancel':
      return `Cancelar venta ${name('saleId')} (restaura los ítems a disponible)`;
    case 'sale.updatePrice':
      return `Venta ${name('saleId')}: precio → $${name('precioAcordadoCOP')}`;
    case 'sale.setCertificadoUrl':
      return `Adjuntar certificado a la venta ${name('saleId')}`;
    case 'sale.setCarnetUrl':
      return `Adjuntar carnet a la venta ${name('saleId')}`;
    case 'sublote.create':
      return `Crear sublote «${name('nombre')}» en ${name('parentLoteId')}`;
    case 'sublote.addItems':
      return `Agregar ${Array.isArray(data.itemIds) ? (data.itemIds as unknown[]).length : 0} ítem(s) al sublote ${name('subLoteId')}`;
    case 'sublote.removeItems':
      return `Quitar ${Array.isArray(data.itemIds) ? (data.itemIds as unknown[]).length : 0} ítem(s) del sublote ${name('subLoteId')}`;
    case 'sublote.updateMeta':
      return `Editar sublote ${name('subLoteId')} → ${summarizeChanges(data, refKeys)}`;
    case 'sublote.setEstado':
      return `Sublote ${name('subLoteId')} → ${name('estado')}`;
    case 'sublote.setDisplay':
      return `Sublote ${name('subLoteId')}: ${data.mostrarComoLote ? 'mostrar' : 'ocultar'} como tarjeta`;
    case 'provider.create':
      return `${spec.label}: ${name('nombreORazonSocial')}`;
    case 'provider.update':
      return `Editar proveedor ${name('providerName')} → ${summarizeChanges((data.patch as GuidedDraft) ?? data, refKeys)}`;
    case 'client.create':
      return `${spec.label}: ${name('nombre')} (${name('tipo') || 'final'})`;
    case 'client.update':
      return `Editar cliente ${name('clientName')} → ${summarizeChanges((data.patch as GuidedDraft) ?? data, refKeys)}`;
    default:
      return spec.label;
  }
}

/**
 * Harden a model-proposed action into a committable, server-validated shape.
 * Returns null when the proposal is absent, the kind is unknown, or the caller's
 * role is below the action's floor (defense-in-depth — the binding gate is the
 * client rail mount + the Convex mutation). Mirrors `whitelistDraft`'s posture:
 * unknown keys and smuggled Ids are dropped, never trusted.
 */
export function hardenAction(
  raw: unknown,
  level: AccessLevel,
): GuidedAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const kind = (raw as Record<string, unknown>).kind;
  if (!isActionKind(kind)) return null;
  if (!actionAllowedForLevel(kind, level)) return null;

  const spec = ACTION_REGISTRY[kind];
  const rawArgsValue = (raw as Record<string, unknown>).args;
  const rawArgs: GuidedDraft =
    rawArgsValue && typeof rawArgsValue === 'object'
      ? (rawArgsValue as GuidedDraft)
      : {};

  // 1. Whitelist + coerce the data args.
  let data: GuidedDraft;
  if (spec.coerceFlow) {
    const wl = whitelistDraft(spec.coerceFlow, rawArgs);
    // Keep ref hint fields the flow whitelist might not include (e.g. providerName).
    for (const r of spec.refs) {
      if (typeof rawArgs[r.hintField] === 'string') {
        wl[r.hintField] = rawArgs[r.hintField];
      }
    }
    data = coerceVocabulary(spec.coerceFlow, wl).draft;
  } else {
    const allow = [
      ...(spec.argKeys ?? []),
      ...spec.refs.map((r) => r.hintField),
      ...spec.refs.map((r) => r.field),
    ];
    data = pick(rawArgs, allow);
    coerceNumericStrings(data);
  }

  // 2. Drop guarded keys (C10 fan-out guard).
  for (const k of spec.dropKeys ?? []) delete data[k];

  // 3. Resolve ref posture: keep a real-looking Id, else strip + capture the hint.
  const needsRefs: ActionUnresolvedRef[] = [];
  for (const ref of spec.refs) {
    const idVal = data[ref.field];
    if (typeof idVal === 'string' && looksLikeConvexId(idVal)) continue; // trust real Id
    if (ref.field in data) delete data[ref.field]; // strip fabricated Id
    const hintRaw = rawArgs[ref.hintField];
    const hint =
      typeof hintRaw === 'string'
        ? hintRaw.trim()
        : typeof hintRaw === 'number'
          ? String(hintRaw)
          : '';
    if (hint) {
      data[ref.hintField] = hint;
      needsRefs.push({ field: ref.field, refKind: ref.refKind, hint });
    }
  }

  // 4. Normalize itemIds to a string[] of trimmed natural keys when present.
  if (Array.isArray(data.itemIds)) {
    data.itemIds = (data.itemIds as unknown[])
      .map((x) =>
        typeof x === 'string'
          ? x.trim()
          : typeof x === 'number'
            ? String(x)
            : '',
      )
      .filter(Boolean);
  }

  const missing = computeActionMissing(kind, data, needsRefs);

  return {
    kind,
    args: data,
    summary: buildActionSummary(kind, data),
    confirmLabel: spec.destructive
      ? `Sí, ${spec.label.toLowerCase()}`
      : 'Confirmar y guardar',
    mode: spec.mode,
    destructive: !!spec.destructive,
    twoStep: !!spec.twoStep,
    syncsToSheet: spec.syncsToSheet,
    needsRefs,
    missing,
    ready: missing.length === 0,
  };
}

/**
 * Compact catalog of committable actions embedded in the guided system prompt so
 * the model emits only real `kind`s and passes NAMES (not Ids) in hint fields.
 */
export function buildActionCatalogText(level: AccessLevel): string {
  const lines: string[] = [];
  lines.push(
    'ACCIONES EJECUTABLES (opcional; ADEMÁS de \'say\'. Si Maritza pide CREAR/EDITAR/CERRAR/PUBLICAR/CANCELAR algo y ya tenés los datos, agrega "action": {"kind":"<kind>","args":{…}}). REGLAS:',
  );
  lines.push(
    "- Usa SOLO un kind de esta lista. En 'args' usa los MISMOS campos de los flujos de captura. Para referenciar proveedor/cliente/lote/sublote/venta/ítem pasa el NOMBRE o código en el campo *hint indicado — NUNCA inventes Ids.",
  );
  lines.push(
    "- No pongas 'action' si aún faltan datos obligatorios: seguí preguntando en 'say'. El servidor recalcula lo que falta.",
  );
  for (const kind of ACTION_KINDS) {
    if (!actionAllowedForLevel(kind, level)) continue;
    const spec = ACTION_REGISTRY[kind];
    const hints = spec.refs.map((r) => `${r.hintField} (${r.refKind})`);
    const argHint = spec.coerceFlow
      ? `campos de ${spec.coerceFlow}`
      : (spec.argKeys ?? []).join(', ') || '—';
    lines.push(
      `- ${kind} · ${spec.label} · args: ${argHint}${hints.length ? ` · referencia por: ${hints.join(', ')}` : ''}${spec.destructive ? ' · (destructiva)' : ''}`,
    );
  }
  return lines.join('\n');
}
