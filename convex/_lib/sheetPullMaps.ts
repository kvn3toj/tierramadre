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
 *   - Derived columns (preponderancia, subLotes.unidades / totalCostoCOP) are
 *     NOT in the allowlist — a sheet edit must never overwrite a figure Convex
 *     computes.
 *   - EXCEPTION (2026-07-23): inventory.precioFinalCOP moved OUT of "derived"
 *     and INTO the allowlist. The price is a business decision, not a formula;
 *     cost × 2.6 is only the seed for a new item. Pulling it stamps
 *     `precioFinalManual: true` so the lote re-fan won't reprice the row.
 *   - EXCEPTION (2026-07-24): inventory.costoBaseCOP (column L) is now
 *     SHEET-OWNED too. The item cost is typed by a human into the sheet and
 *     pulled here; the preponderancia-based derivation is fully deactivated, so
 *     nothing in Convex recomputes or overwrites it. preponderancia stays
 *     excluded (kept for the BR-2 sum validation but inert w.r.t. cost).
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
  | 'inventory'
  | 'providers'
  | 'lots'
  | 'clients'
  | 'sales'
  | 'subLotes';

export const FOTO_SYNC_TABLES: FotoSyncTable[] = [
  'inventory',
  'providers',
  'lots',
  'clients',
  'sales',
  'subLotes',
];

type Coerce =
  | 'str'
  | 'num'
  | 'csv'
  | 'bool'
  | 'estadoInv'
  | 'estadoLot'
  | 'estadoSale'
  | 'estadoSub';

export interface FieldSpec {
  /** Schema field key, when it differs from the sheet column key. */
  as?: string;
  coerce: Coerce;
  /** AUTO cross-table reconciliation, run by the action via a reused mutation. */
  sideEffect?: 'cancelSale' | 'refanLot';
  /** FLAG fields: the document column is still patched; reconcile in the app. */
  flag?: string;
}

/** column-key (as it appears in the column maps) → spec. Anything absent is excluded. */
type TableSpec = Record<string, FieldSpec>;

const INVENTORY: TableSpec = {
  nombre: { coerce: 'str' },
  peso: { coerce: 'str' }, // string in schema ("Plata" / "Oro 18k" / carats)
  color: { coerce: 'str' },
  calidad: { coerce: 'str' },
  cantidad: { coerce: 'num' },
  talla: { coerce: 'str' },
  medidas: { coerce: 'str' },
  medidasValores: { coerce: 'str' },
  categoria: { coerce: 'str' },
  // precioCOP (legacy "Precio COP" / column L) was retired from the SOT mirror
  // on 2026-05-29 — no sheet column means nothing to pull. The Convex field is
  // kept app-only; see api/_lib/fotosintesis-inventory-columns.js.
  //
  // PRICE REFACTOR (2026-07-21): the tier fields (precioEmbajadorCOP col M /
  // precioConscienteCOP col N) collapsed into one price, precioFinalCOP (col M),
  // originally DERIVED (costoBaseCOP × 2.6) and therefore excluded from here.
  //
  // PRICE OWNERSHIP CHANGE (2026-07-23): precioFinalCOP is now SHEET-OWNED. The
  // business keeps an official price list that is NOT a fixed multiple of cost
  // (the sheet's own "Caja: precio venta" column AU spans 0.74×–11.76× cost, and
  // src/data/vocabularies.ts TM_MARKUP_DEFAULT = 3.0 is a second, documented
  // company multiplier). Column M is therefore writable: a human sets the price
  // in the sheet and it syncs back here. costoBaseCOP × 2.6 survives only as the
  // SEED for a brand-new item (convex/_lib/pricing.ts#computePrecioFinal).
  //
  // The pull stamps `precioFinalManual: true` alongside the value (see
  // planRowPatch) so the lote re-fan in lotItems.ts knows not to reprice the row
  // back to cost × 2.6.
  precioFinalCOP: { coerce: 'num' },
  // COST OWNERSHIP CHANGE (2026-07-24): costoBaseCOP (column L) is SHEET-OWNED.
  // A human types the item cost into the sheet and it syncs back here. The old
  // preponderancia-based derivation (lot.costoTotalCOP × preponderancia%) is
  // fully deactivated, so nothing in Convex re-derives or overwrites this value.
  // It is still the tax and commission base — but that base is now maintained by
  // hand in the sheet, not computed from the lote.
  costoBaseCOP: { coerce: 'num' },
  ubicacion: { coerce: 'str' },
  asesor: { coerce: 'str' },
  estado: { coerce: 'estadoInv' },
  qr: { coerce: 'str' },
  coleccion: { coerce: 'str' },
  caja: { coerce: 'str' },
  asesorActual: { coerce: 'str' },
  estadoAsesor: { coerce: 'str' },
  // EXCLUIDA (2026-07-30): mostrarEnCatalogo es de CONVEX, no de la hoja.
  //
  // Estuvo en el allowlist y por eso el pull la pisaba con la columna Y en cada
  // sync. Como la publicación se administra desde la app y la hoja sólo se
  // entera vía push, las dos caras se separaron: Convex tenía 416 piezas
  // publicadas y la hoja decía 131. El siguiente sync habría ocultado 285
  // piezas de la vitrina de cara al cliente.
  //
  // El problema de fondo es que un pull masivo lee ESTADO, no intención: no
  // puede distinguir "alguien puso FALSE a propósito" de "nunca se escribió".
  // Con 304 FALSE y 78 vacías, ese desempate no existe.
  //
  // Sigue siendo columna Y del espejo y el push la escribe (no lleva
  // `preserve`), así que la dirección queda en un solo sentido: Convex → hoja.
  // Si algún día se quiere publicar DESDE el SOT, no es cuestión de devolverla
  // acá: hace falta un canal de eventos (Apps Script onEdit → /sync/foto) que
  // mande la celda tocada, no otro sincronizador de estado que vuelva a pelear
  // por el mismo booleano.
  procedencia: { coerce: 'str' },
  observacion: { coerce: 'str' },
  rendimientoEsperado: { coerce: 'num' },
  cantidadEstimada: { coerce: 'num' },
  nivelRareza: { coerce: 'num' },
  calificacion: { coerce: 'num' },
  tipoEsmeralda: { coerce: 'str' },
  subtipoForm: { coerce: 'str' },
  tipoJoya: { coerce: 'str' },
  tecnicaJoya: { coerce: 'str' },
  minerales: { coerce: 'csv' },
  complementos: { coerce: 'csv' },
  fotoUrl: { coerce: 'str' },
  certificadoUrl: { coerce: 'str' },
  formulaGema: { coerce: 'str' },
  formulaJoya: { coerce: 'str' },
  rangoDescuento: { coerce: 'str' },
  // FLAG: lot membership lives in the Convex-only lotItems join. We mirror the
  // new loteId but reconciliation (move + cost re-fan) happens in the app.
  loteId: {
    coerce: 'str',
    flag: 'loteId — reasignar lote en la app (membresía + costo)',
  },
  // EXCLUDED (derived): preponderancia (kept for the BR-2 sum validation but
  // inert w.r.t. cost — costoBaseCOP is now sheet-owned, see above).
  // ── Bloque hoja-primero (AQ–BE), incorporado el 2026-07-30 ──
  // Columnas que ya existían en el SOT y Convex no veía: el rango de lectura se
  // derivaba del largo de FOTO_INVENTARIO_COLUMNS, que paraba en AP. Son 100%
  // sheet-owned (`preserve: true` en el espejo posicional), así que entran acá
  // sólo para BAJAR. La app no las escribe nunca.
  pesoGr: { coerce: 'num' },
  costoLoteCOP: { coerce: 'num' },
  precioObjetivoCOP: { coerce: 'num' },
  cajaPrecioVentaCOP: { coerce: 'num' },
  cajaValorPagadoCOP: { coerce: 'num' },
  cajaSaldoCOP: { coerce: 'num' },
  cajaComprador: { coerce: 'str' },
  cajaEstadoContable: { coerce: 'str' },
  subLote: { coerce: 'str' },
  productoUrl: { coerce: 'str' },
  carpetaFotosUrl: { coerce: 'str' },
  animaNotas: { coerce: 'str' },
  fuentes: { coerce: 'str' },
  notasConflictos: { coerce: 'str' },
  // EXCLUIDA: _sinUso2 (AS) — hueco posicional sin encabezado, no es un campo.
};

const PROVIDERS: TableSpec = {
  nit: { coerce: 'str' },
  cedula: { coerce: 'str' },
  direccion: { coerce: 'str' },
  telefono: { coerce: 'str' },
  email: { coerce: 'str' },
  tipo: { coerce: 'str' },
  notas: { coerce: 'str' },
  // EXCLUDED: nombreORazonSocial (natural key — rename in the app).
};

const LOTS: TableSpec = {
  fechaRecepcion: { coerce: 'str' },
  pesoTotalQuilates: { coerce: 'num' },
  // AUTO: route costoTotalCOP through lots.update (patches the lote row; never
  // patched here directly). Item costoBaseCOP is sheet-owned since 2026-07-24,
  // so this no longer re-fans any member item's cost.
  costoTotalCOP: { coerce: 'num', sideEffect: 'refanLot' },
  // FLAG: capacity ceiling — no safe auto-fix.
  unidadesDeclaradas: {
    coerce: 'num',
    flag: 'unidadesDeclaradas — revisar capacidad del lote',
  },
  formaPago: { coerce: 'str' },
  metodoContado: { coerce: 'str' },
  fechaVencimiento: { coerce: 'str' },
  numeroCuotas: { coerce: 'num' },
  numeroFactura: { coerce: 'str' },
  urlFactura: { coerce: 'str' },
  notas: { coerce: 'str' },
  estado: { coerce: 'estadoLot' },
  renombreLote: { coerce: 'str' },
  tratamiento: { coerce: 'str' },
  mina: { coerce: 'str' },
  sede: { coerce: 'str' },
  operadorNombre: { coerce: 'str' },
  operadorRol: { coerce: 'str' },
  // Catalog grouping: sell the whole lote as one card. Editable from the sheet.
  mostrarComoLote: { coerce: 'bool' },
  // EXCLUDED: loteId (key), providerNombre (denormalized FK).
};

const CLIENTS: TableSpec = {
  nit: { coerce: 'str' },
  cedula: { coerce: 'str' },
  direccion: { coerce: 'str' },
  telefono: { coerce: 'str' },
  email: { coerce: 'str' },
  tipo: { coerce: 'str' },
  asesorId: { coerce: 'str' },
  // EXCLUDED: nombre (natural key — rename in the app).
};

const SALES: TableSpec = {
  fechaVenta: { coerce: 'str' },
  // FLAG: changing the line items must flip product availability — reconcile in app.
  itemIdsJoined: {
    as: 'itemIds',
    coerce: 'csv',
    flag: 'itemIds — ajustar líneas de la venta en la app (BR-6)',
  },
  precioAcordadoCOP: { coerce: 'num' },
  descuentoCOP: { coerce: 'num' },
  formaPago: { coerce: 'str' },
  metodoContado: { coerce: 'str' },
  fechaVencimiento: { coerce: 'str' },
  numeroCuotas: { coerce: 'num' },
  carnetUrl: { coerce: 'str' },
  certificadoUrl: { coerce: 'str' },
  // AUTO when → "cancelada": action runs sales.cancel (reopen items + audit).
  // Other transitions (reservada↔confirmada) patch the mirror directly.
  estado: { coerce: 'estadoSale', sideEffect: 'cancelSale' },
  // EXCLUDED: saleId (key), clientNombre (denormalized FK), and the DERIVED
  // money columns totalCOP / comisionCOP — these are push-only figures Convex
  // computes (per this file's policy header); a sheet edit must never overwrite
  // them, and totalCOP feeds the GHL commissions ledger (ghl.markOrderPaid).
};

const SUBLOTES: TableSpec = {
  // FLAG: re-parenting / membership changes — reconcile in the app.
  parentLoteId: {
    coerce: 'str',
    flag: 'parentLoteId — re-vincular sublote en la app',
  },
  sede: { coerce: 'str' },
  nombre: { coerce: 'str' },
  itemIdsJoined: {
    as: 'itemIds',
    coerce: 'csv',
    flag: 'itemIds — ajustar miembros del sublote en la app',
  },
  estado: { coerce: 'estadoSub' },
  notas: { coerce: 'str' },
  // Catalog grouping: show the sublote as one card. Editable from the sheet.
  mostrarComoLote: { coerce: 'bool' },
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
  'DISPONIBLE',
  'VENDIDA',
  'ASESOR',
  'CONSIGNACION',
  'Retornado',
  'ESMEREOGENESIS',
  'ESMERO',
  'DISPONIBLE ADOPTADA',
  'LOTE X CT',
] as const;

/** Mirror of products.ts#normalizeEstado (kept here to avoid cross-importing a non-exported helper). */
export function normalizeInvEstado(v: unknown): string | null {
  const raw = String(v ?? '').trim();
  if (raw === '') return 'DISPONIBLE'; // legacy default
  const upper = raw.toUpperCase();
  if (upper === 'RETORNADO') return 'Retornado';
  const hit = INV_ESTADOS.find((e) => e.toUpperCase() === upper);
  // Unknown ⇒ null so the field is skipped (an odd cell never breaks the row).
  return hit ?? null;
}

function normalizeFrom(allowed: readonly string[]) {
  return (v: unknown): string | null => {
    const lower = String(v ?? '')
      .trim()
      .toLowerCase();
    return allowed.find((a) => a === lower) ?? null;
  };
}
export const normalizeLotEstado = normalizeFrom([
  'abierto',
  'cerrado',
  'publicado',
  'cancelado',
]);
export const normalizeSaleEstado = normalizeFrom([
  'reservada',
  'confirmada',
  'cancelada',
]);
export const normalizeSubLoteEstado = normalizeFrom(['activa', 'archivada']);

// ─── coercion ───────────────────────────────────────────────────────────────

const TRUE_WORDS = new Set([
  'true',
  '1',
  'si',
  'sí',
  'x',
  'yes',
  'verdadero',
  '✓',
]);
const FALSE_WORDS = new Set(['false', '0', 'no', '', 'falso']);

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
    case 'str':
      return { skip: false, value: String(raw).trim() };
    case 'num': {
      const t = String(raw).trim();
      if (t === '') return { skip: true }; // never clear a number from a blanked cell
      const n = Number(t.replace(/[$\s]/g, '').replace(/,/g, ''));
      return Number.isFinite(n) ? { skip: false, value: n } : { skip: true };
    }
    case 'bool': {
      const t = String(raw).trim().toLowerCase();
      if (TRUE_WORDS.has(t)) return { skip: false, value: true };
      if (FALSE_WORDS.has(t)) return { skip: false, value: false };
      return { skip: true };
    }
    case 'csv':
      return {
        skip: false,
        value: String(raw)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
    case 'estadoInv': {
      const e = normalizeInvEstado(raw);
      return e === null ? { skip: true } : { skip: false, value: e };
    }
    case 'estadoLot': {
      const e = normalizeLotEstado(raw);
      return e === null ? { skip: true } : { skip: false, value: e };
    }
    case 'estadoSale': {
      const e = normalizeSaleEstado(raw);
      return e === null ? { skip: true } : { skip: false, value: e };
    }
    case 'estadoSub': {
      const e = normalizeSubLoteEstado(raw);
      return e === null ? { skip: true } : { skip: false, value: e };
    }
  }
}

// ─── pure row-decision logic ─────────────────────────────────────────────────

export interface RowPlan {
  action: 'protected' | 'skip' | 'patch';
  /** schema-key → coerced value to apply via ctx.db.patch */
  patch: Record<string, string | number | boolean | string[]>;
  sideEffects: Array<{ type: 'cancelSale' | 'refanLot'; value?: number }>;
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
    syncStatus: 'synced' | 'pending' | 'error';
  },
  cells: Record<string, string>,
): RowPlan {
  // Conflict policy: never clobber an in-flight admin edit.
  if (existing.syncStatus === 'pending' || existing.syncStatus === 'error') {
    return { action: 'protected', patch: {}, sideEffects: [], flags: [] };
  }

  const spec = WRITABLE[table];
  const patch: RowPlan['patch'] = {};
  const sideEffects: RowPlan['sideEffects'] = [];
  const flags: string[] = [];

  for (const [colKey, raw] of Object.entries(cells)) {
    const fs = spec[colKey];
    if (!fs) continue; // not writable (excluded / derived / FK-name / key)
    const coerced = coerceCell(fs.coerce, raw);
    if (coerced.skip) continue;
    const schemaKey = fs.as ?? colKey;
    const value = coerced.value;

    if (fs.sideEffect === 'cancelSale') {
      // Only the transition INTO cancelada is special; other estados patch.
      if (value === 'cancelada' && existing.estado !== 'cancelada') {
        sideEffects.push({ type: 'cancelSale' });
        continue;
      }
      if (!sameValue(value, existing[schemaKey])) patch[schemaKey] = value;
      continue;
    }

    if (fs.sideEffect === 'refanLot') {
      // costoTotalCOP is owned by lots.update (patches the lote row); never patch
      // here. It no longer re-fans item cost (costoBaseCOP is sheet-owned since
      // 2026-07-24), but still routes through lots.update to keep the lote total
      // Convex-authoritative and audited.
      // This is the sibling of the sales money policy: lots.costoTotalCOP stays
      // Convex-authoritative via this side-effect, while sales.totalCOP /
      // comisionCOP stay authoritative via allowlist EXCLUSION (see SALES spec).
      // Change either money-column policy → keep both governing paths in sync.
      if (typeof value === 'number' && !sameValue(value, existing[schemaKey])) {
        sideEffects.push({ type: 'refanLot', value });
      }
      continue;
    }

    if (sameValue(value, existing[schemaKey])) continue; // diff-skip
    patch[schemaKey] = value;
    // The price is sheet-owned (2026-07-23). Stamp the override flag alongside
    // the value so the lote re-fan in lotItems.ts leaves this row's price alone
    // instead of resetting it to costoBaseCOP × 2.6. Only a real change reaches
    // here (diff-skip above), so an untouched row is never flagged manual.
    if (table === 'inventory' && schemaKey === 'precioFinalCOP') {
      patch.precioFinalManual = true;
    }
    if (fs.flag) flags.push(fs.flag);
  }

  const action =
    Object.keys(patch).length > 0 || sideEffects.length > 0 ? 'patch' : 'skip';
  return { action, patch, sideEffects, flags };
}
