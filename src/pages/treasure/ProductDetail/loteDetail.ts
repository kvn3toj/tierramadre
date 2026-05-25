/**
 * loteDetail — per-piece detail resolution for lote/sublote product pages.
 *
 * A lote is shown as ONE product page, but its gallery cycles through the
 * bundle hero plus a photo of each member gem. When the photo in view belongs
 * to a single piece, the descriptive sections (title, metadata, specifications)
 * must describe THAT piece — not the bundle aggregate — so what the user reads
 * matches what they see. These pure helpers compute that swap so the page can
 * stay declarative and the logic stays unit-testable.
 */

import type { TreasureItem } from "../../../types";

/** One member gem of a lote, as carried on `TreasureItem.loteItems`. */
export type LotePiece = NonNullable<TreasureItem["loteItems"]>[number];

/**
 * The lote piece whose photo sits at gallery slot `galleryIndex`, or `null`
 * when that slot is the bundle hero (or the product is not a lote).
 *
 * `itemKeys[i]` is the item number at slot i, or `null` for the hero — built
 * alongside the gallery media so indices stay aligned even when some pieces
 * lack a photo.
 */
export function activeLotePiece(
  product: TreasureItem | undefined,
  itemKeys: (number | null)[] | undefined,
  galleryIndex: number,
): LotePiece | null {
  if (!product?.isLote || !itemKeys) return null;
  const key = itemKeys[galleryIndex];
  if (key == null) return null;
  return product.loteItems?.find((li) => li.item === key) ?? null;
}

/**
 * Overlay a single piece's own specs onto the bundle so the descriptive
 * sections render that piece. Falls back to the bundle value for any field the
 * piece omits. Returns the bundle unchanged when no piece is active (hero view).
 *
 * Pricing breakdown, QR, favorites and cart actions intentionally keep using
 * the bundle elsewhere — a lote is bought as one — so this only feeds the
 * title / metadata / specification surfaces.
 */
export function resolveLoteDetail(
  product: TreasureItem,
  piece: LotePiece | null,
): TreasureItem {
  if (!piece) return product;
  return {
    ...product,
    item: piece.item,
    nombre: piece.nombre,
    precioCOP: piece.precioCOP,
    cantidad: 1, // one piece in view → hides the "Lote xN" badge
    isLote: false,
    groupKind: undefined,
    loteItems: undefined,
    imagen: piece.imagen ?? product.imagen,
    color: piece.color ?? product.color,
    calidad: piece.calidad ?? product.calidad,
    peso: piece.peso ?? product.peso,
    categoria: piece.categoria || product.categoria,
    talla: piece.talla ?? product.talla,
    // Pieces carry only the `medidas` string; clear `medidasValores` so the
    // specs list reads the piece's measurement, not the bundle's.
    medidas: piece.medidas ?? product.medidas,
    medidasValores: "",
    isJewelry: piece.isJewelry ?? product.isJewelry,
    metalType: piece.metalType ?? product.metalType,
  };
}
