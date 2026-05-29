/**
 * Sheet→Convex pull policy — the single place the writable-field ALLOWLIST,
 * per-field coercion, estado normalizers, and the pure row-decision logic live.
 *
 * Pure module (no Convex IO) so it is unit-testable like _lib/lotMath.ts.
 * `convex/fotoSync.ts` imports `planRowPatch` and applies the result; the test
 * (tests/sheetPullMaps.test.ts) asserts every allowlist key is a real column on
 * both the push side (convex/_lib/columnMaps.ts) and the Vercel reader, so a
 * positional drift can't silently mis-route an incoming cell.
 *
 * Field policy (user choice): ALL WRITABLE columns sync back. The guardrails:
 *   - Derived columns (costoBaseCOP, preponderancia, subLotes.unidades /
 *     totalCostoCOP) are NOT in the allowlist — a sheet edit must never
 *     overwrite a figure Convex computes.
 *   - Denormalized FK-name columns (lots.providerNombre, sales.clientNombre)
 *     are NOT pulled — relationship changes go through the app so the FK id
 *     (providerId/clientId) is never silently re-pointed.
 *   - Natural-key column A (itemId/loteId/saleId/nombre/...) is never patched.
 *   - Cross-table side effects fire ONLY when their field is in the delta:
 *       sales.estado → "cancelada"  ⇒ AUTO  (action runs sales.cancel)
 *       lots.costoTotalCOP changed   ⇒ AUTO  (action runs lots.update re-fan)
 *       loteId / sales.itemIds / lots.unidadesDeclaradas / subLote membership
 *                                    ⇒ FLAG  (mirror is updated; reconcile in app)
 */

export type FotoSyncTable =
  | "inventory"
  | "providers"
  | "lots"
  | "clients"
  | "sales"
  | "subLotes";

export const FOTO_SYNC_TABLES: FotoSyncTable[] = [
  "inventory",
  "providers",
  "lots",
  "clients",
  "sales",
  "subLotes",
];

type Coerce =
  | "str"
  | "num"
  | "csv"
  | "bool"
  | "estadoInv"
  | "estadoLot"
  | "estadoSale"
  | "estadoSub";

export interface FieldSpec {
  /** Schema field key, when it differs from the sheet column key. */
  as?: string;
  coerce: Coerce;
  /** AUTO cross-table reconciliation, run by the action via a reused mutation. */
  sideEffect?: "cancelSale" | "refanLot";
  /** FLAG fields: the document column is still patched; reconcile in the app. */
  flag?: string;
}

/** column-key (as it appears in the column maps) → spec. Anything absent is excluded. */
type TableSpec = Record<string, FieldSpec>;

const INVENTORY: TableSpec = {
  nombre: { coerce: "str" },
  peso: { coerce: "str" }, // string in schema ("Plata" / "Oro 18k" / carats)
  color: { coerce: "str" },
  calidad: { coerce: "str" },
  cantidad: { coerce: "num" },
  talla: { coerce: "str" },
  medidas: { coerce: "str" },
  medidasValores: { coerce: "str" },
  categoria: { coerce: "str" },
  precioCOP: { coerce: "num" },
  precioEmbajadorCOP: { coerce: "num" },
  precioConscienteCOP: { coerce: "num" },
  ubicacion: { coerce: "str" },
  asesor: { coerce: "str" },
  estado: { coerce: "estadoInv" },
  qr: { coerce: "str" },
  coleccion: { coerce: "str" },
  caja: { coerce: "str" },
  asesorActual: { coerce: "str" },
  estadoAsesor: { coerce: "str" },
  mostrarEnCatalogo: { coerce: "bool" },
  procedencia: { coerce: "str" },
  observacion: { coerce: "str" },
  rendimientoEsperado: { coerce: "num" },
  cantidadEstimada: { coerce: "num" },
  nivelRareza: { coerce: "num" },
  calificacion: { coerce: "num" },
  tipoEsmeralda: { coerce: "str" },
  subtipoForm: { coerce: "str" },
  tipoJoya: { coerce: "str" },
  tecnicaJoya: { coerce: "str" },
  minerales: { coerce: "csv" },
  complementos: { coerce: "csv" },
  fotoUrl: { coerce: "str" },
  certificadoUrl: { coerce: "str" },
  formulaGema: { coerce: "str" },
  formulaJoya: { coerce: "str" },
  rangoDescuento: { coerce: "str" },
  // FLAG: lot membership lives in the Convex-only lotItems join. We mirror the
  // new loteId but reconciliation (move + cost re-fan) happens in the app.
  loteId: {
    coerce: "str",
    flag: "loteId — reasignar lote en la app (membresía + costo)",
  },
  // EXCLUDED (derived): costoBaseCOP, preponderancia.
};

const PROVIDERS: TableSpec = {
  nit: { coerce: "str" },
  cedula: { coerce: "str" },
  direccion: { coerce: "str" },
  telefono: { coerce: "str" },
  email: { coerce: "str" },
  tipo: { coerce: "str" },
  notas: { coerce: "str" },
  // EXCLUDED: nombreORazonSocial (natural key — rename in the app).
};

const LOTS: TableSpec = {
  fechaRecepcion: { coerce: "str" },
  pesoTotalQuilates: { coerce: "num" },
  // AUTO: re-fan item costoBaseCOP via lots.update (never patched directly).
  costoTotalCOP: { coerce: "num", sideEffect: "refanLot" },
  // FLAG: capacity ceiling — no safe auto-fix.
  unidadesDeclaradas: {
    coerce: "num",
    flag: "unidadesDeclaradas — revisar capacidad del lote",
  },
  formaPago: { coerce: "str" },
  metodoContado: { coerce: "str" },
  fechaVencimiento: { coerce: "str" },
  numeroCuotas: { coerce: "num" },
  numeroFactura: { coerce: "str" },
  urlFactura: { coerce: "str" },
  notas: { coerce: "str" },
  estado: { coerce: "estadoLot" },
  renombreLote: { coerce: "str" },
  tratamiento: { coerce: "str" },
  mina: { coerce: "str" },
  sede: { coerce: "str" },
  operadorNombre: { coerce: "str" },
  operadorRol: { coerce: "str" },
  // EXCLUDED: loteId (key), providerNombre (denormalized FK).
};

const CLIENTS: TableSpec = {
  nit: { coerce: "str" },
  cedula: { coerce: "str" },
  direccion: { coerce: "str" },
  telefono: { coerce: "str" },
  email: { coerce: "str" },
  tipo: { coerce: "str" },
  asesorId: { coerce: "str" },
  // EXCLUDED: nombre (natural key — rename in the app).
};

const SALES: TableSpec = {
  fechaVenta: { coerce: "str" },
  // FLAG: changing the line items must flip product availability — reconcile in app.
  itemIdsJoined: {
    as: "itemIds",
    coerce: "csv",
    flag: "itemIds — ajustar líneas de la venta en la app (BR-6)",
  },
  precioAcordadoCOP: { coerce: "num" },
  descuentoCOP: { coerce: "num" },
  totalCOP: { coerce: "num" },
  comisionCOP: { coerce: "num" },
  formaPago: { coerce: "str" },
  metodoContado: { coerce: "str" },
  fechaVencimiento: { coerce: "str" },
  numeroCuotas: { coerce: "num" },
  carnetUrl: { coerce: "str" },
  certificadoUrl: { coerce: "str" },
  // AUTO when → "cancelada": action runs sales.cancel (reopen items + audit).
  // Other transitions (reservada↔confirmada) patch the mirror directly.
  estado: { coerce: "estadoSale", sideEffect: "cancelSale" },
  // EXCLUDED: saleId (key), clientNombre (denormalized FK).
};

const SUBLOTES: TableSpec = {
  // FLAG: re-parenting / membership changes — reconcile in the app.
  parentLoteId: {
    coerce: "str",
    flag: "parentLoteId — re-vincular sublote en la app",
  },
  sede: { coerce: "str" },
  nombre: { coerce: "str" },
  itemIdsJoined: {
    as: "itemIds",
    coerce: "csv",
    flag: "itemIds — ajustar miembros del sublote en la app",
  },
  estado: { coerce: "estadoSub" },
  notas: { coerce: "str" },
  // EXCLUDED: subLoteId (key), unidades / totalCostoCOP (derived), createdAt.
};

export const WRITABLE: Record<FotoSyncTable, TableSpec> = {
  inventory: INVENTORY,
  providers: PROVIDERS,
  lots: LOTS,
  clients: CLIENTS,
  sales: SALES,
  subLotes: SUBLOTES,
};

// ─── estado normalizers ─────────────────────────────────────────────────────

const INV_ESTADOS = [
  "DISPONIBLE",
  "VENDIDA",
  "ASESOR",
  "Retornado",
  "ESMEREOGENESIS",
  "ESMERO",
  "DISPONIBLE ADOPTADA",
  "LOTE X CT",
] as const;

/** Mirror of products.ts#normalizeEstado (kept here to avoid cross-importing a non-exported helper). */
export function normalizeInvEstado(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (raw === "") return "DISPONIBLE"; // legacy default
  const upper = raw.toUpperCase();
  if (upper === "RETORNADO") return "Retornado";
  const hit = INV_ESTADOS.find((e) => e.toUpperCase() === upper);
  // Unknown ⇒ null so the field is skipped (an odd cell never breaks the row).
  return hit ?? null;
}

function normalizeFrom(allowed: readonly string[]) {
  return (v: unknown): string | null => {
    const lower = String(v ?? "")
      .trim()
      .toLowerCase();
    return allowed.find((a) => a === lower) ?? null;
  };
}
export const normalizeLotEstado = normalizeFrom([
  "abierto",
  "cerrado",
  "publicado",
  "cancelado",
]);
export const normalizeSaleEstado = normalizeFrom([
  "reservada",
  "confirmada",
  "cancelada",
]);
export const normalizeSubLoteEstado = normalizeFrom(["activa", "archivada"]);

// ─── coercion ───────────────────────────────────────────────────────────────

const TRUE_WORDS = new Set([
  "true",
  "1",
  "si",
  "sí",
  "x",
  "yes",
  "verdadero",
  "✓",
]);
const FALSE_WORDS = new Set(["false", "0", "no", "", "falso"]);

/**
 * Coerce a raw sheet string into the typed value for `schemaKey`.
 * Returns `{ skip: true }` when the value can't/shouldn't be applied (invalid
 * number, unknown estado) so the caller leaves the existing value untouched.
 */
export function coerceCell(
  coerce: Coerce,
  raw: string,
):
  | { skip: true }
  | { skip: false; value: string | number | boolean | string[] } {
  switch (coerce) {
    case "str":
      return { skip: false, value: String(raw).trim() };
    case "num": {
      const t = String(raw).trim();
      if (t === "") return { skip: true }; // never clear a number from a blanked cell
      const n = Number(t.replace(/[$\s]/g, "").replace(/,/g, ""));
      return Number.isFinite(n) ? { skip: false, value: n } : { skip: true };
    }
    case "bool": {
      const t = String(raw).trim().toLowerCase();
      if (TRUE_WORDS.has(t)) return { skip: false, value: true };
      if (FALSE_WORDS.has(t)) return { skip: false, value: false };
      return { skip: true };
    }
    case "csv":
      return {
        skip: false,
        value: String(raw)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
    case "estadoInv": {
      const e = normalizeInvEstado(raw);
      return e === null ? { skip: true } : { skip: false, value: e };
    }
    case "estadoLot": {
      const e = normalizeLotEstado(raw);
      return e === null ? { skip: true } : { skip: false, value: e };
    }
    case "estadoSale": {
      const e = normalizeSaleEstado(raw);
      return e === null ? { skip: true } : { skip: false, value: e };
    }
    case "estadoSub": {
      const e = normalizeSubLoteEstado(raw);
      return e === null ? { skip: true } : { skip: false, value: e };
    }
  }
}

// ─── pure row-decision logic ─────────────────────────────────────────────────

export interface RowPlan {
  action: "protected" | "skip" | "patch";
  /** schema-key → coerced value to apply via ctx.db.patch */
  patch: Record<string, string | number | boolean | string[]>;
  sideEffects: Array<{ type: "cancelSale" | "refanLot"; value?: number }>;
  /** human-readable reasons surfaced back to the sheet (FLAG fields) */
  flags: string[];
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  }
  return a === b;
}

/**
 * Decide what to do with one dirty row. Pure — no Convex access.
 *
 * @param table   which SOT table
 * @param existing the current Convex doc fields (must include `syncStatus`;
 *                 `estado` is consulted for the cancel side-effect)
 * @param cells   changed cells from the sheet, keyed by COLUMN key (raw strings)
 */
export function planRowPatch(
  table: FotoSyncTable,
  existing: Record<string, unknown> & {
    syncStatus: "synced" | "pending" | "error";
  },
  cells: Record<string, string>,
): RowPlan {
  // Conflict policy: never clobber an in-flight admin edit.
  if (existing.syncStatus === "pending" || existing.syncStatus === "error") {
    return { action: "protected", patch: {}, sideEffects: [], flags: [] };
  }

  const spec = WRITABLE[table];
  const patch: RowPlan["patch"] = {};
  const sideEffects: RowPlan["sideEffects"] = [];
  const flags: string[] = [];

  for (const [colKey, raw] of Object.entries(cells)) {
    const fs = spec[colKey];
    if (!fs) continue; // not writable (excluded / derived / FK-name / key)
    const coerced = coerceCell(fs.coerce, raw);
    if (coerced.skip) continue;
    const schemaKey = fs.as ?? colKey;
    const value = coerced.value;

    if (fs.sideEffect === "cancelSale") {
      // Only the transition INTO cancelada is special; other estados patch.
      if (value === "cancelada" && existing.estado !== "cancelada") {
        sideEffects.push({ type: "cancelSale" });
        continue;
      }
      if (!sameValue(value, existing[schemaKey])) patch[schemaKey] = value;
      continue;
    }

    if (fs.sideEffect === "refanLot") {
      // costoTotalCOP is owned by lots.update (patch + re-fan); never patch here.
      if (typeof value === "number" && !sameValue(value, existing[schemaKey])) {
        sideEffects.push({ type: "refanLot", value });
      }
      continue;
    }

    if (sameValue(value, existing[schemaKey])) continue; // diff-skip
    patch[schemaKey] = value;
    if (fs.flag) flags.push(fs.flag);
  }

  const action =
    Object.keys(patch).length > 0 || sideEffects.length > 0 ? "patch" : "skip";
  return { action, patch, sideEffects, flags };
}
