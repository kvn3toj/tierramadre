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

// ─── Grouped lote / sublote catalog cards ───────────────────────────

interface GroupItem {
  itemId: string;
  nombre: string;
  fotoUrl?: string;
  precioCOP: number;
  color?: string;
  calidad?: string;
  peso?: string;
  categoria?: string;
  talla?: string;
  medidas?: string;
}

interface PublishedGroup {
  groupKind: "lote" | "sublote";
  groupId: string;
  parentLoteId: string;
  nombre: string;
  fotoUrl?: string;
  totalPriceCOP: number;
  items: GroupItem[];
}

/**
 * Stable, deterministic numeric key for a group card. The grid/favorites/
 * comparison machinery keys on the numeric `item`, but groups route by their
 * string `groupId`, so this only needs to be stable per groupId and unlikely
 * to collide with real item numbers (which are in the hundreds). We hash into
 * a high range; callers add a used-id guard for the rare collision.
 */
function hashGroupId(groupId: string): number {
  let h = 0;
  for (let i = 0; i < groupId.length; i++) {
    h = (h * 31 + groupId.charCodeAt(i)) | 0;
  }
  return 8_000_000 + (Math.abs(h) % 1_000_000);
}

function mapGroupToTreasureItem(
  group: PublishedGroup,
  item: number,
): TreasureItem {
  const first = group.items[0];
  const { pesoValue, isJewelry, metalType } = derivePeso(
    typeof first?.peso === "string" ? first.peso : "",
    first?.categoria,
  );
  return {
    item,
    fechaIngreso: "",
    nombre: group.nombre,
    peso: pesoValue,
    color: (first?.color ?? "") as EmeraldColor,
    calidad: (first?.calidad ?? "") as EmeraldQuality,
    cantidad: group.items.length,
    talla: first?.talla ?? "",
    medidas: first?.medidas ?? "",
    medidasValores: "",
    categoria: (first?.categoria ?? "").trim(),
    precioCOP: group.totalPriceCOP,
    precioInternacional: 0,
    ubicacion: "",
    asesor: "",
    estado: "DISPONIBLE" as TreasureStatus,
    qr: "",
    coleccion: "",
    caja: "",
    asesorActual: "",
    estadoAsesor: "",
    isJewelry,
    ...(metalType ? { metalType } : {}),
    imagen: group.fotoUrl || first?.fotoUrl || undefined,
    isLote: true,
    groupKind: group.groupKind,
    groupId: group.groupId,
    loteItems: group.items.map((it) => ({
      item: parseInt(it.itemId, 10),
      nombre: it.nombre,
      imagen: it.fotoUrl || undefined,
      precioCOP: it.precioCOP,
    })),
  };
}

/**
 * Published catalog GROUP cards (lotes + sublotes shown as one bundle), plus
 * the set of member item numbers that must be excluded from the individual
 * `useFotosintesisCatalog` list so they don't double-show.
 */
export function useFotosintesisGroups(): {
  groupCards: TreasureItem[];
  excludedItemIds: Set<number>;
} {
  const groups = useConvexQuery(convexApi.products.publishedGroups, {}) as
    | PublishedGroup[]
    | undefined;

  return useMemo(() => {
    if (!groups) return { groupCards: [], excludedItemIds: new Set<number>() };
    const excludedItemIds = new Set<number>();
    const usedKeys = new Set<number>();
    const groupCards: TreasureItem[] = [];

    for (const group of groups) {
      const memberIds = group.items
        .map((it) => parseInt(it.itemId, 10))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (memberIds.length === 0) continue;
      memberIds.forEach((n) => excludedItemIds.add(n));

      // Assign a stable, collision-free numeric key.
      let key = hashGroupId(group.groupId);
      while (usedKeys.has(key)) key += 1;
      usedKeys.add(key);

      groupCards.push(mapGroupToTreasureItem(group, key));
    }
    return { groupCards, excludedItemIds };
  }, [groups]);
}

export default useFotosintesisCatalog;
