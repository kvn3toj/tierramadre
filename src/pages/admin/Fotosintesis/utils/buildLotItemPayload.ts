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

/** Item types the EditItemDrawer can render a dedicated sub-form for. */
export type EditableTipo = "gema" | "joya" | "bruto" | "insumo";

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
    cantidad: row.cantidad ?? 1,
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
    precioPublicoCOP:
      typeof draft.precioPublicoCOP === "number" ? draft.precioPublicoCOP : 0,
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
  if (
    row.tipo === "gema" ||
    row.tipo === "joya" ||
    row.tipo === "bruto" ||
    row.tipo === "insumo"
  ) {
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
  if (row.cantidadEstimada != null || row.rendimientoEsperado != null) {
    return "bruto";
  }
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
    precioPublicoCOP:
      typeof draft.precioPublicoCOP === "number" ? draft.precioPublicoCOP : 0,
    mostrarEnCatalogo,
    preponderancia: draft.preponderancia as number,
  };
}

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
    precioPublicoCOP:
      typeof draft.precioPublicoCOP === "number" ? draft.precioPublicoCOP : 0,
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
    precioPublicoCOP:
      typeof draft.precioPublicoCOP === "number" ? draft.precioPublicoCOP : 0,
    mostrarEnCatalogo,
    preponderancia: draft.preponderancia as number,
  };
}
