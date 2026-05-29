import {
  normalizeCalidad,
  normalizeColor,
  parseMedidas,
  serializeMedidas,
} from "../../../../data/vocabularies";
import type { GemaDraft } from "../components/GemaFields";
import type { BrutoDraft } from "../components/BrutoFields";
import type { InsumoDraft } from "../components/InsumoFields";
import type { JoyaDraft, PesoUnidad } from "../components/JoyaFields";

type TipoItem = "gema" | "bruto" | "joya" | "insumo" | "lote";

/**
 * Item types the EditItemDrawer can render a dedicated sub-form for.
 *
 * `bruto` is intentionally absent: `c8875ec` retired the standalone "Bruto"
 * capture option and folded the rough-stone family (Piedra / Ganga / Macla /
 * Canutillo) into the Gema field set, so stones capture and edit the full gem
 * data. Legacy `tipo: "bruto"` rows now resolve to `gema` (see inferItemTipo).
 */
export type EditableTipo = "gema" | "joya" | "insumo";

interface SharedCreateFields {
  loteId: string;
  tipo: TipoItem;
  nombre: string;
  preponderancia: number;
  observacion?: string;
  mostrarEnCatalogo: boolean;
  precioPublicoCOP?: number;
  fotoUrl?: string;
  certificadoUrl?: string;
}

/**
 * @deprecated Legacy. Since c8875ec the rough-stone family captures as `gema`
 * (no capture path produces `tipo: "bruto"`), so this builder is no longer
 * reached by the wizard. Retained only as reference / for potential legacy-data
 * repair — do not wire it back into capture.
 */
export function buildBrutoPayload(
  loteId: string,
  bruto: BrutoDraft,
  observacion: string,
  mostrarEnCatalogo: boolean,
): SharedCreateFields & {
  peso?: string;
  procedencia?: string;
  cantidadEstimada?: number;
  rendimientoEsperado?: number;
} {
  return {
    loteId,
    tipo: "bruto",
    nombre: bruto.nombre.trim(),
    preponderancia: bruto.preponderancia as number,
    peso: bruto.pesoTotal || undefined,
    procedencia: bruto.procedencia || undefined,
    cantidadEstimada:
      typeof bruto.cantidadEstimada === "number"
        ? bruto.cantidadEstimada
        : undefined,
    rendimientoEsperado:
      typeof bruto.rendimientoEsperado === "number"
        ? bruto.rendimientoEsperado
        : undefined,
    precioPublicoCOP:
      typeof bruto.precioPublicoCOP === "number"
        ? bruto.precioPublicoCOP
        : undefined,
    observacion: observacion.trim() || undefined,
    mostrarEnCatalogo,
  };
}

export function buildInsumoPayload(
  loteId: string,
  insumo: InsumoDraft,
  observacion: string,
  mostrarEnCatalogo: boolean,
): SharedCreateFields & {
  categoria?: string;
  cantidad?: number;
} {
  return {
    loteId,
    tipo: "insumo",
    nombre: insumo.nombre.trim(),
    preponderancia: insumo.preponderancia as number,
    categoria: insumo.categoria || undefined,
    cantidad: typeof insumo.cantidad === "number" ? insumo.cantidad : undefined,
    precioPublicoCOP:
      typeof insumo.precioPublicoCOP === "number"
        ? insumo.precioPublicoCOP
        : undefined,
    observacion: observacion.trim() || undefined,
    mostrarEnCatalogo,
  };
}

export function buildGemaPayload(
  loteId: string,
  gema: GemaDraft,
  observacion: string,
  mostrarEnCatalogo: boolean,
  extras?: { fotoUrl?: string; certificadoUrl?: string },
): SharedCreateFields & Record<string, unknown> {
  const medidas = serializeMedidas({
    ancho: gema.medidasAncho,
    alto: gema.medidasAlto,
    cono: gema.medidasCono,
  });

  return {
    loteId,
    tipo: "gema",
    nombre: gema.nombre.trim(),
    preponderancia: gema.preponderancia as number,
    color: gema.color ? normalizeColor(gema.color) : undefined,
    calidad: normalizeCalidad(gema.calidad),
    peso: gema.peso || undefined,
    procedencia: gema.procedencia || undefined,
    cantidad: typeof gema.cantidad === "number" ? gema.cantidad : undefined,
    talla: gema.corte || undefined,
    categoria: gema.tipoEsmeralda || undefined,
    tipoEsmeralda: gema.tipoEsmeralda || undefined,
    medidas: medidas || undefined,
    nivelRareza:
      typeof gema.nivelRareza === "number" ? gema.nivelRareza : undefined,
    calificacion:
      typeof gema.calificacion === "number" ? gema.calificacion : undefined,
    precioPublicoCOP:
      typeof gema.precioPublicoCOP === "number"
        ? gema.precioPublicoCOP
        : undefined,
    observacion: observacion.trim() || undefined,
    mostrarEnCatalogo,
    fotoUrl: extras?.fotoUrl,
    certificadoUrl: extras?.certificadoUrl,
  };
}

export function buildJoyaPayload(
  loteId: string,
  joya: JoyaDraft,
  observacion: string,
  mostrarEnCatalogo: boolean,
  extras?: { fotoUrl?: string; certificadoUrl?: string },
): SharedCreateFields & Record<string, unknown> {
  const obsParts = [joya.descripcion.trim(), observacion.trim()].filter(
    Boolean,
  );
  return {
    loteId,
    tipo: "joya",
    nombre: joya.nombre.trim(),
    preponderancia: joya.preponderancia as number,
    cantidad: typeof joya.cantidad === "number" ? joya.cantidad : undefined,
    peso:
      typeof joya.pesoValor === "number"
        ? `${joya.pesoValor} ${joya.pesoUnidad}`
        : undefined,
    tipoJoya: joya.tipoJoya || undefined,
    tecnicaJoya: joya.tecnica || undefined,
    minerales: joya.minerales.length > 0 ? joya.minerales : undefined,
    complementos: joya.complementos.length > 0 ? joya.complementos : undefined,
    precioPublicoCOP:
      typeof joya.precioPublicoCOP === "number"
        ? joya.precioPublicoCOP
        : undefined,
    observacion: obsParts.length > 0 ? obsParts.join(" · ") : undefined,
    mostrarEnCatalogo,
    fotoUrl: extras?.fotoUrl,
    certificadoUrl: extras?.certificadoUrl,
  };
}

export function buildLotePayload(
  loteId: string,
  joya: JoyaDraft,
  observacion: string,
  mostrarEnCatalogo: boolean,
  extras?: { fotoUrl?: string; certificadoUrl?: string },
): SharedCreateFields & Record<string, unknown> {
  return {
    ...buildJoyaPayload(loteId, joya, observacion, mostrarEnCatalogo, extras),
    tipo: "lote",
    subtipoForm: "LOTE DE JOYAS",
  };
}

export function gemaDraftFromProduct(row: {
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  procedencia?: string;
  precioCOP?: number;
  cantidad?: number;
  talla?: string;
  medidas?: string;
  categoria?: string;
  tipoEsmeralda?: string;
  nivelRareza?: number;
  calificacion?: number;
}): GemaDraft {
  const parsed = parseMedidas(row.medidas);

  return {
    nombre: row.nombre ?? "",
    peso: row.peso ?? "",
    color: row.color ? normalizeColor(row.color) : "",
    calidad: normalizeCalidad(row.calidad),
    procedencia: row.procedencia ?? "",
    preponderancia: "",
    precioPublicoCOP: row.precioCOP ?? "",
    // Preserve "unset" rather than fabricating a 1. A legacy bruto (rough
    // stone) carries no `cantidad`, and since stones now edit as gemas
    // (inferItemTipo) this hydrate must not inject a piece-count the operator
    // never entered — gemaPatchFromDraft omits a blank cantidad on save (F13).
    cantidad: row.cantidad ?? "",
    tipoEsmeralda: (row.tipoEsmeralda ??
      row.categoria ??
      "") as GemaDraft["tipoEsmeralda"],
    corte: (row.talla ?? "") as GemaDraft["corte"],
    medidasAncho: parsed.ancho,
    medidasAlto: parsed.alto,
    medidasCono: parsed.cono,
    nivelRareza: row.nivelRareza ?? "",
    calificacion: row.calificacion ?? "",
  };
}

export function gemaPatchFromDraft(
  draft: GemaDraft,
  observacion: string,
  mostrarEnCatalogo: boolean,
): Record<string, unknown> {
  const medidas = serializeMedidas({
    ancho: draft.medidasAncho,
    alto: draft.medidasAlto,
    cono: draft.medidasCono,
  });
  return {
    nombre: draft.nombre,
    peso: draft.peso,
    color: draft.color ? normalizeColor(draft.color) : "",
    calidad: normalizeCalidad(draft.calidad),
    procedencia: draft.procedencia,
    observacion,
    talla: draft.corte || undefined,
    medidas: medidas || undefined,
    cantidad: typeof draft.cantidad === "number" ? draft.cantidad : undefined,
    categoria: draft.tipoEsmeralda || undefined,
    tipoEsmeralda: draft.tipoEsmeralda || undefined,
    nivelRareza:
      typeof draft.nivelRareza === "number" ? draft.nivelRareza : undefined,
    calificacion:
      typeof draft.calificacion === "number" ? draft.calificacion : undefined,
    // F13 — blank → undefined (omitted: a no-op edit never clears precioCOP);
    // a numeric value (including a literal 0) passes through unchanged. Matches
    // the create builders + the embajador/consciente tier fields.
    precioPublicoCOP:
      typeof draft.precioPublicoCOP === "number"
        ? draft.precioPublicoCOP
        : undefined,
    mostrarEnCatalogo,
    preponderancia: draft.preponderancia as number,
  };
}

/**
 * Item `tipo` is not stored as a durable column on productInventory — it is
 * only written to the creation audit row. New items (post this change) carry
 * `tipo` directly; legacy items are classified by which type-specific fields
 * the wizard populated. The drawer uses this to render the matching sub-form
 * instead of always assuming a gema.
 *
 * Rough stones collapse onto the gema field set. `c8875ec` retired the
 * standalone "Bruto" capture option and folded the whole rough-stone family
 * (Piedra / Ganga / Macla / Canutillo) into the Gema field kind, so they
 * capture/require the full gem data (color, calidad, corte, medidas, rareza…).
 * To keep editing consistent with capture, a stored `tipo: "bruto"` — and the
 * legacy bruto-only signal fields (cantidadEstimada / rendimientoEsperado) —
 * now resolve to "gema" so the drawer renders GemaFields. The parcel-only
 * fields are never cleared: the gema patch simply doesn't touch them.
 */
export function inferItemTipo(row: {
  tipo?: string;
  tipoJoya?: string;
  tecnicaJoya?: string;
  minerales?: string[];
  complementos?: string[];
  cantidadEstimada?: number;
  rendimientoEsperado?: number;
}): EditableTipo {
  if (row.tipo === "gema" || row.tipo === "joya" || row.tipo === "insumo") {
    return row.tipo;
  }
  // A "lote" (lote de joyas) reuses the joya payload shape, so it edits as one.
  if (row.tipo === "lote") return "joya";

  if (
    row.tipoJoya ||
    row.tecnicaJoya ||
    (row.minerales && row.minerales.length > 0) ||
    (row.complementos && row.complementos.length > 0)
  ) {
    return "joya";
  }
  // Everything else — bare rows and legacy brutos (stored `tipo: "bruto"` or a
  // rough-stone signal field) — edits as a gema, matching the capture field set.
  return "gema";
}

/**
 * Split a stored jewelry weight ("5 gr", "2,5 ct", "12") back into a numeric
 * value + unit so the JoyaFields weight input round-trips. Falls back to grams
 * (the wizard default) when the unit is absent, and to an empty value for
 * non-numeric strings ("Plata", "fragmento").
 */
export function parseJoyaPeso(peso: string | undefined | null): {
  value: number | "";
  unit: PesoUnidad;
} {
  if (!peso) return { value: "", unit: "gr" };
  const raw = peso.trim().toLowerCase();
  const match = raw.match(/-?\d+(?:[.,]\d+)?/);
  const unit: PesoUnidad =
    raw.includes("ct") || raw.includes("quilate") ? "ct" : "gr";
  if (!match) return { value: "", unit };
  const n = Number(match[0].replace(",", "."));
  return { value: Number.isFinite(n) ? n : "", unit };
}

export function joyaDraftFromProduct(row: {
  nombre?: string;
  observacion?: string;
  cantidad?: number;
  peso?: string;
  tipoJoya?: string;
  tecnicaJoya?: string;
  minerales?: string[];
  complementos?: string[];
  precioCOP?: number;
}): JoyaDraft {
  const { value, unit } = parseJoyaPeso(row.peso);
  return {
    nombre: row.nombre ?? "",
    // At create the wizard folds descripcion + observación into `observacion`;
    // we surface the whole stored string here so it round-trips on save.
    descripcion: row.observacion ?? "",
    cantidad: row.cantidad ?? 1,
    pesoValor: value,
    pesoUnidad: unit,
    tipoJoya: (row.tipoJoya ?? "") as JoyaDraft["tipoJoya"],
    tecnica: row.tecnicaJoya ?? "",
    minerales: (row.minerales ?? []) as JoyaDraft["minerales"],
    complementos: (row.complementos ?? []) as JoyaDraft["complementos"],
    preponderancia: "",
    precioPublicoCOP: row.precioCOP ?? "",
  };
}

export function joyaPatchFromDraft(
  draft: JoyaDraft,
  mostrarEnCatalogo: boolean,
): Record<string, unknown> {
  return {
    nombre: draft.nombre,
    // Empty string clears the field server-side (compareString treats "" as
    // "unset"); a select cleared back to placeholder should clear too.
    peso:
      typeof draft.pesoValor === "number"
        ? `${draft.pesoValor} ${draft.pesoUnidad}`
        : "",
    cantidad: typeof draft.cantidad === "number" ? draft.cantidad : undefined,
    tipoJoya: draft.tipoJoya || "",
    tecnicaJoya: draft.tecnica || "",
    minerales: draft.minerales,
    complementos: draft.complementos,
    observacion: draft.descripcion,
    // F13 — blank → undefined (omitted: a no-op edit never clears precioCOP);
    // a numeric value (including a literal 0) passes through unchanged. Matches
    // the create builders + the embajador/consciente tier fields.
    precioPublicoCOP:
      typeof draft.precioPublicoCOP === "number"
        ? draft.precioPublicoCOP
        : undefined,
    mostrarEnCatalogo,
    preponderancia: draft.preponderancia as number,
  };
}

/**
 * @deprecated Legacy. Rough stones now hydrate + edit through the gema sub-form
 * (inferItemTipo collapses `bruto` → `gema`), so the EditItemDrawer no longer
 * calls this. Kept (with its test) as a reference converter for the bruto data
 * shape in case a legacy-data migration ever needs it.
 */
export function brutoDraftFromProduct(row: {
  nombre?: string;
  peso?: string;
  procedencia?: string;
  cantidadEstimada?: number;
  rendimientoEsperado?: number;
  precioCOP?: number;
}): BrutoDraft {
  return {
    nombre: row.nombre ?? "",
    pesoTotal: row.peso ?? "",
    procedencia: row.procedencia ?? "",
    cantidadEstimada: row.cantidadEstimada ?? "",
    rendimientoEsperado: row.rendimientoEsperado ?? "",
    preponderancia: "",
    precioPublicoCOP: row.precioCOP ?? "",
  };
}

/**
 * @deprecated Legacy. Rough stones now save through gemaPatchFromDraft (stones
 * edit as gemas — see inferItemTipo), so the EditItemDrawer no longer calls
 * this. Kept (with its test) as a reference for the bruto patch shape for a
 * possible future legacy-data migration.
 */
export function brutoPatchFromDraft(
  draft: BrutoDraft,
  observacion: string,
  mostrarEnCatalogo: boolean,
): Record<string, unknown> {
  return {
    nombre: draft.nombre,
    peso: draft.pesoTotal,
    procedencia: draft.procedencia,
    cantidadEstimada:
      typeof draft.cantidadEstimada === "number"
        ? draft.cantidadEstimada
        : undefined,
    rendimientoEsperado:
      typeof draft.rendimientoEsperado === "number"
        ? draft.rendimientoEsperado
        : undefined,
    observacion,
    // F13 — blank → undefined (omitted: a no-op edit never clears precioCOP);
    // a numeric value (including a literal 0) passes through unchanged. Matches
    // the create builders + the embajador/consciente tier fields.
    precioPublicoCOP:
      typeof draft.precioPublicoCOP === "number"
        ? draft.precioPublicoCOP
        : undefined,
    mostrarEnCatalogo,
    preponderancia: draft.preponderancia as number,
  };
}

export function insumoDraftFromProduct(row: {
  nombre?: string;
  categoria?: string;
  cantidad?: number;
  precioCOP?: number;
}): InsumoDraft {
  return {
    nombre: row.nombre ?? "",
    categoria: row.categoria ?? "",
    cantidad: row.cantidad ?? "",
    preponderancia: "",
    precioPublicoCOP: row.precioCOP ?? "",
  };
}

export function insumoPatchFromDraft(
  draft: InsumoDraft,
  observacion: string,
  mostrarEnCatalogo: boolean,
): Record<string, unknown> {
  return {
    nombre: draft.nombre,
    categoria: draft.categoria || undefined,
    cantidad: typeof draft.cantidad === "number" ? draft.cantidad : undefined,
    observacion,
    // F13 — blank → undefined (omitted: a no-op edit never clears precioCOP);
    // a numeric value (including a literal 0) passes through unchanged. Matches
    // the create builders + the embajador/consciente tier fields.
    precioPublicoCOP:
      typeof draft.precioPublicoCOP === "number"
        ? draft.precioPublicoCOP
        : undefined,
    mostrarEnCatalogo,
    preponderancia: draft.preponderancia as number,
  };
}

/** Per-item catalog pricing as held in LoteResumenPage's local panel state. */
export interface ItemPricingDraft {
  precioEmbajadorCOP: number | "";
  precioConscienteCOP: number | "";
}

/**
 * Build the `updateGemaFields` patch that persists a lot item's catalog tiers +
 * visibility from the LoteResumenPage pricing panel.
 *
 * Every save handler on that page (cerrar / publicar-cerrado / guardar-grouping)
 * routes through this so per-item price edits are never silently dropped — the
 * cerrado/publicado handlers used to skip the per-item flush entirely, which is
 * why edits to the public price (precioEmbajadorCOP, sheet col N) and the
 * publish/reserva toggle appeared "not to save" on a live lot.
 *
 * Tiers left blank ("") are OMITTED so a no-op edit never clears a stored price;
 * a numeric value (including 0) is sent verbatim. `mostrarEnCatalogo` always
 * travels so the publish/reserva toggle round-trips.
 */
export function buildItemPricingPatch(
  mostrarEnCatalogo: boolean,
  pricing: ItemPricingDraft | undefined,
): {
  mostrarEnCatalogo: boolean;
  precioEmbajadorCOP?: number;
  precioConscienteCOP?: number;
} {
  return {
    mostrarEnCatalogo,
    ...(typeof pricing?.precioEmbajadorCOP === "number"
      ? { precioEmbajadorCOP: pricing.precioEmbajadorCOP }
      : {}),
    ...(typeof pricing?.precioConscienteCOP === "number"
      ? { precioConscienteCOP: pricing.precioConscienteCOP }
      : {}),
  };
}

/**
 * Build the catalog-tier slice of an `updateGemaFields` patch from the
 * EditItemDrawer's "Precios del catálogo" block (Goal F2).
 *
 * Unlike {@link buildItemPricingPatch} — which always carries the
 * `mostrarEnCatalogo` publish flag because the LoteResumen panel owns it — the
 * drawer already sends `mostrarEnCatalogo` through the sub-form converter, so
 * this helper returns ONLY the two tier prices and the caller `Object.assign`s
 * it onto the existing patch.
 *
 * A blank "" tier is OMITTED so a no-op edit never clears a stored price; a
 * numeric value (including a literal 0 — a deliberate canje/free tier) is sent
 * verbatim. Convex's `compareNumber` path for precioEmbajadorCOP /
 * precioConscienteCOP has no 0→undefined guard, so 0 round-trips exactly.
 */
export function tierPricePatch(
  precioEmbajadorCOP: number | "",
  precioConscienteCOP: number | "",
): {
  precioEmbajadorCOP?: number;
  precioConscienteCOP?: number;
} {
  return {
    ...(typeof precioEmbajadorCOP === "number" ? { precioEmbajadorCOP } : {}),
    ...(typeof precioConscienteCOP === "number" ? { precioConscienteCOP } : {}),
  };
}
