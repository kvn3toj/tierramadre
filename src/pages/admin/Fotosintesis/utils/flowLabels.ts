/**
 * Human-readable labels for guided flows and their draft fields.
 *
 * Extracted from `CopilotPanel.tsx` so the rail, the workbench breadcrumb, the
 * workbench stepper, and the conversation pane all read from one place.
 */
import type { GuidedFlow } from "../copilot/flowSchemas";

export const FLOW_LABELS: Record<GuidedFlow, string> = {
  "item-gema": "Gema nueva",
  "item-joya": "Joya nueva",
  "item-insumo": "Insumo nuevo",
  lote: "Lote nuevo",
  venta: "Venta",
  provider: "Proveedor nuevo",
  client: "Cliente nuevo",
  "edit-existing": "Editar ítem",
  "batch-edit": "Edición múltiple",
  advisory: "Consulta",
};

export const FIELD_LABELS: Record<string, string> = {
  nombre: "Nombre",
  peso: "Peso",
  color: "Color",
  calidad: "Calidad",
  procedencia: "Procedencia",
  preponderancia: "Preponderancia",
  precioPublicoCOP: "Precio público",
  cantidad: "Cantidad",
  tipoEsmeralda: "Tipo esmeralda",
  corte: "Corte",
  tipoJoya: "Tipo joya",
  tecnica: "Técnica",
  minerales: "Minerales",
  complementos: "Complementos",
  descripcion: "Descripción",
  categoria: "Categoría",
  sede: "Bóveda",
  providerName: "Proveedor",
  providerId: "Proveedor",
  costoTotalCOP: "Costo total",
  unidadesDeclaradas: "Unidades",
  formaPago: "Forma de pago",
  metodoContado: "Método",
  renombreLote: "Renombre",
  mina: "Mina",
  pesoTotalQuilates: "Peso (ct)",
  itemId: "Ítem",
  clientId: "Cliente",
  clienteFinalData: "Cliente final",
  compradorTipo: "Comprador",
  precioAcordado: "Precio acordado",
  nombreORazonSocial: "Razón social",
  tipo: "Tipo",
  documento: "Documento",
  direccion: "Dirección",
  telefono: "Teléfono",
  email: "Email",
};

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

export function flowLabel(flow: GuidedFlow): string {
  return FLOW_LABELS[flow] ?? flow;
}

/** Render any draft value (scalar, array, nested object) for a review surface. */
export function formatDraftValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") {
    return (
      Object.entries(v as Record<string, unknown>)
        .filter(([, val]) => val !== undefined && val !== "")
        .map(([k, val]) => `${fieldLabel(k)}: ${String(val)}`)
        .join(" · ") || "—"
    );
  }
  if (typeof v === "number") return v.toLocaleString("es-CO");
  return String(v);
}
