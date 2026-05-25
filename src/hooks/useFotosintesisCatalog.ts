/**
 * useFotosintesisCatalog Hook
 *
 * Bridges Fotosíntesis-captured products into the customer-facing Treasure
 * Browser. Fotosíntesis items live in a separate Google Sheet that the
 * legacy catalog reader (`/api/get-treasure-sheets`) never touches, and the
 * `mostrarEnCatalogo` publish flag is Convex-only. So instead of reading the
 * Fotosíntesis sheet, we read Convex directly — it's the authoritative,
 * reactive source that knows which items are published vs. held in reserve.
 *
 * Returns a `TreasureItem[]` (empty while loading or when Convex is not
 * configured) ready to merge with the Google Sheets catalog in `useTreasure`.
 */

import { useMemo } from "react";
import { useConvexQuery, convexApi } from "../lib/convex-safe";
import type {
  TreasureItem,
  EmeraldColor,
  EmeraldQuality,
  TreasureStatus,
} from "../types";

/** Categorías that imply jewelry even when peso is a numeric carat value. */
const JEWELRY_CATEGORIES = new Set([
  "anillo en plata",
  "aretes",
  "topitos",
  "pulsera",
  "dije",
  "anillo en oro",
]);

/** Shape of a published productInventory row coming back from Convex. */
interface PublishedRow {
  itemId: string;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  cantidad?: number;
  talla?: string;
  medidas?: string;
  medidasValores?: string;
  categoria?: string;
  precioCOP?: number;
  precioConscienteCOP?: number;
  ubicacion?: string;
  asesor?: string;
  estado?: string;
  qr?: string;
  coleccion?: string;
  caja?: string;
  asesorActual?: string;
  estadoAsesor?: string;
  fotoUrl?: string;
  certificadoUrl?: string;
}

/**
 * Derive jewelry / peso fields the same way `get-treasure-sheets` does so a
 * Fotosíntesis item renders identically to a legacy one (metal pill, carat
 * filters, etc.).
 */
function derivePeso(
  peso?: string,
  categoria?: string,
): {
  pesoValue: string | number;
  isJewelry: boolean;
  metalType?: "Plata" | "Oro 18k";
} {
  const raw = (peso ?? "").trim();
  const lower = raw.toLowerCase();
  if (lower.includes("plata")) {
    return { pesoValue: raw, isJewelry: true, metalType: "Plata" };
  }
  if (lower.includes("oro")) {
    return { pesoValue: raw, isJewelry: true, metalType: "Oro 18k" };
  }
  const num = parseFloat(raw.replace(",", "."));
  const pesoValue: string | number = Number.isFinite(num) ? num : raw;
  const isJewelry = categoria
    ? JEWELRY_CATEGORIES.has(categoria.toLowerCase().trim())
    : false;
  return { pesoValue, isJewelry };
}

/** Map one published Convex row into the catalog's TreasureItem shape. */
function mapRowToTreasureItem(row: PublishedRow): TreasureItem {
  const { pesoValue, isJewelry, metalType } = derivePeso(
    row.peso,
    row.categoria,
  );
  // Catalog price: explicit público price if set during capture, else the
  // "consciente" (retail) tier, else 0 so the item still renders.
  const precioCOP = row.precioCOP ?? row.precioConscienteCOP ?? 0;

  return {
    item: parseInt(row.itemId, 10),
    fechaIngreso: "",
    nombre: row.nombre ?? "",
    peso: pesoValue,
    color: (row.color ?? "") as EmeraldColor,
    calidad: (row.calidad ?? "") as EmeraldQuality,
    cantidad: typeof row.cantidad === "number" ? row.cantidad : 1,
    talla: row.talla ?? "",
    medidas: row.medidas ?? "",
    medidasValores: row.medidasValores ?? "",
    categoria: (row.categoria ?? "").trim(),
    precioCOP,
    precioInternacional: 0,
    ubicacion: row.ubicacion ?? "",
    asesor: row.asesor ?? "",
    estado: (row.estado || "DISPONIBLE").toUpperCase() as TreasureStatus,
    qr: row.qr ?? "",
    coleccion: row.coleccion ?? "",
    caja: row.caja ?? "",
    asesorActual: row.asesorActual ?? "",
    estadoAsesor: (row.estadoAsesor ?? "").toUpperCase() as TreasureStatus | "",
    isJewelry,
    ...(metalType ? { metalType } : {}),
    // Drive image captured in the wizard; useTreasure converts it to a proxy URL.
    imagen: row.fotoUrl || undefined,
    certificateUrl: row.certificadoUrl || undefined,
  };
}

/**
 * Published Fotosíntesis items, mapped to TreasureItem and ready to merge
 * into the Treasure Browser. Empty array while loading / Convex unconfigured.
 */
export function useFotosintesisCatalog(): TreasureItem[] {
  const rows = useConvexQuery(convexApi.products.publishedCatalog, {}) as
    | PublishedRow[]
    | undefined;

  return useMemo(() => {
    if (!rows) return [];
    return rows
      .map(mapRowToTreasureItem)
      .filter((item) => Number.isFinite(item.item) && item.item > 0);
  }, [rows]);
}

export default useFotosintesisCatalog;
