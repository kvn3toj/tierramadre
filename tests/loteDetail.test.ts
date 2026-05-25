import { describe, it, expect } from "vitest";
import {
  activeLotePiece,
  resolveLoteDetail,
} from "../src/pages/treasure/ProductDetail/loteDetail";
import {
  mapGroupToTreasureItem,
  type PublishedGroup,
} from "../src/hooks/useFotosintesisCatalog";
import type { TreasureItem } from "../src/types";

/**
 * These tests pin the behavior behind the goal: on a lote product page,
 * changing the gallery picture must update ALL the descriptive detail below
 * (title, metadata, specifications) to the piece whose photo is in view.
 */

const group: PublishedGroup = {
  groupKind: "lote",
  groupId: "grp-1",
  parentLoteId: "lote-1",
  nombre: "L: Trío Esmeraldas",
  fotoUrl: "https://drive/hero.jpg",
  totalPriceCOP: 9_000_000,
  items: [
    {
      itemId: "101",
      nombre: "Esmeralda Corte Pera",
      fotoUrl: "https://drive/101.jpg",
      precioCOP: 4_000_000,
      color: "Verde Intenso",
      calidad: "AAA",
      peso: "1.25",
      categoria: "Gema",
      talla: "Pera",
      medidas: "8 x 6",
    },
    {
      itemId: "102",
      nombre: "Anillo en Oro",
      fotoUrl: "https://drive/102.jpg",
      precioCOP: 5_000_000,
      color: "Verde Claro",
      calidad: "AA",
      peso: "Oro 18k",
      categoria: "Anillo en Oro",
      talla: "7",
      medidas: "",
    },
  ],
};

describe("mapGroupToTreasureItem — plumbs per-piece specs", () => {
  const lote = mapGroupToTreasureItem(group, 8_000_001);

  it("keeps the bundle as a lote with the total price and piece count", () => {
    expect(lote.isLote).toBe(true);
    expect(lote.precioCOP).toBe(9_000_000);
    expect(lote.cantidad).toBe(2);
    expect(lote.loteItems).toHaveLength(2);
  });

  it("carries color/calidad/peso/talla/medidas onto each loteItem (not just name/price)", () => {
    const [first, second] = lote.loteItems!;
    expect(first).toMatchObject({
      item: 101,
      nombre: "Esmeralda Corte Pera",
      precioCOP: 4_000_000,
      color: "Verde Intenso",
      calidad: "AAA",
      peso: 1.25, // numeric carats derived from "1.25"
      talla: "Pera",
      medidas: "8 x 6",
      isJewelry: false,
    });
    expect(second).toMatchObject({
      item: 102,
      peso: "Oro 18k",
      isJewelry: true,
      metalType: "Oro 18k",
    });
  });
});

describe("activeLotePiece — maps gallery slot → piece", () => {
  const lote = mapGroupToTreasureItem(group, 8_000_001);
  // Slot 0 = bundle hero (null); slots 1..n = each photographed piece.
  const itemKeys: (number | null)[] = [null, 101, 102];

  it("returns null for the hero slot", () => {
    expect(activeLotePiece(lote, itemKeys, 0)).toBeNull();
  });

  it("returns the matching piece for an item slot", () => {
    expect(activeLotePiece(lote, itemKeys, 1)?.item).toBe(101);
    expect(activeLotePiece(lote, itemKeys, 2)?.item).toBe(102);
  });

  it("returns null for a non-lote product", () => {
    const single = { ...lote, isLote: false };
    expect(activeLotePiece(single, itemKeys, 1)).toBeNull();
  });
});

describe("resolveLoteDetail — swaps the descriptive detail per piece", () => {
  const lote = mapGroupToTreasureItem(group, 8_000_001);

  it("returns the bundle unchanged at the hero (no active piece)", () => {
    const detail = resolveLoteDetail(lote, null);
    expect(detail).toBe(lote);
    expect(detail.isLote).toBe(true);
    expect(detail.cantidad).toBe(2);
  });

  it("reflects the gem piece's own specs when its photo is in view", () => {
    const piece = activeLotePiece(lote, [null, 101, 102], 1)!;
    const detail = resolveLoteDetail(lote, piece);

    expect(detail.item).toBe(101);
    expect(detail.nombre).toBe("Esmeralda Corte Pera");
    expect(detail.color).toBe("Verde Intenso");
    expect(detail.calidad).toBe("AAA");
    expect(detail.peso).toBe(1.25);
    expect(detail.talla).toBe("Pera");
    expect(detail.medidas).toBe("8 x 6");
    expect(detail.medidasValores).toBe("");
    expect(detail.precioCOP).toBe(4_000_000);
    // One piece in view → no longer a lote, count collapses to 1 (hides "Lote xN")
    expect(detail.isLote).toBe(false);
    expect(detail.cantidad).toBe(1);
  });

  it("reflects jewelry fields for a jewelry piece", () => {
    const piece = activeLotePiece(lote, [null, 101, 102], 2)!;
    const detail = resolveLoteDetail(lote, piece);

    expect(detail.nombre).toBe("Anillo en Oro");
    expect(detail.isJewelry).toBe(true);
    expect(detail.metalType).toBe("Oro 18k");
    expect(detail.talla).toBe("7");
  });

  it("falls back to the bundle value for any field the piece omits", () => {
    const lean = {
      item: 200,
      nombre: "Pieza sin specs",
      precioCOP: 1_000_000,
    } as NonNullable<TreasureItem["loteItems"]>[number];
    const detail = resolveLoteDetail(lote, lean);

    // Missing color/calidad fall back to the bundle's (derived from first item).
    expect(detail.color).toBe(lote.color);
    expect(detail.calidad).toBe(lote.calidad);
    expect(detail.nombre).toBe("Pieza sin specs");
  });
});
