import {
  normalizeCalidad,
  normalizeColor,
  parseMedidas,
  serializeMedidas,
} from "../../../../data/vocabularies";
import type { GemaDraft } from "../components/GemaFields";
import type { BrutoDraft } from "../components/BrutoFields";
import type { JoyaDraft } from "../components/JoyaFields";

type TipoItem = "gema" | "bruto" | "joya" | "insumo" | "lote";

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
    cantidad:
      typeof gema.cantidad === "number" ? gema.cantidad : undefined,
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
  const obsParts = [joya.descripcion.trim(), observacion.trim()].filter(Boolean);
  return {
    loteId,
    tipo: "joya",
    nombre: joya.nombre.trim(),
    preponderancia: joya.preponderancia as number,
    cantidad: typeof joya.cantidad === "number" ? joya.cantidad : undefined,
    peso:
      typeof joya.pesoGr === "number" ? String(joya.pesoGr) : undefined,
    tipoJoya: joya.tipoJoya || undefined,
    tecnicaJoya: joya.tecnica || undefined,
    minerales: joya.minerales.length > 0 ? joya.minerales : undefined,
    complementos:
      joya.complementos.length > 0 ? joya.complementos : undefined,
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
    tipoEsmeralda: (row.tipoEsmeralda ?? row.categoria ?? "") as GemaDraft["tipoEsmeralda"],
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
      typeof draft.precioPublicoCOP === "number"
        ? draft.precioPublicoCOP
        : 0,
    mostrarEnCatalogo,
    preponderancia: draft.preponderancia as number,
  };
}
