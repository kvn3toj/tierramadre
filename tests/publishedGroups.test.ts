import { describe, it, expect } from "vitest";
import {
  assembleBundleGroups,
  type ResolvedBundleItem,
} from "../convex/_lib/publishedGroups";

/** Build a resolved item; visible (mostrarEnCatalogo true) unless overridden. */
function item(
  itemId: string,
  overrides: Partial<ResolvedBundleItem> = {},
): ResolvedBundleItem {
  return {
    itemId,
    nombre: `Item ${itemId}`,
    precioCOP: 100,
    mostrarEnCatalogo: true,
    ...overrides,
  };
}

/** Resolver backed by a fixed map; unknown ids resolve to null (missing). */
function resolverFrom(items: ResolvedBundleItem[]) {
  const map = new Map(items.map((i) => [i.itemId, i]));
  return (id: string) => map.get(id) ?? null;
}

describe("assembleBundleGroups — per-item visibility", () => {
  it("excludes a hidden member from a shown lote bundle (the bug)", () => {
    const groups = assembleBundleGroups({
      shownSublotes: [],
      shownLots: [
        {
          loteId: "B-001",
          nombre: "Lote Boyacá",
          memberItemIds: ["10", "11", "12"],
        },
      ],
      resolveItem: resolverFrom([
        item("10"),
        item("11", { mostrarEnCatalogo: false }), // operator hid this one
        item("12"),
      ]),
    });

    expect(groups).toHaveLength(1);
    const members = groups[0].items.map((i) => i.itemId);
    expect(members).toEqual(["10", "12"]);
    expect(members).not.toContain("11");
  });

  it("excludes a hidden member from a shown sublote bundle", () => {
    const groups = assembleBundleGroups({
      shownSublotes: [
        {
          subLoteId: "B-001-S1",
          parentLoteId: "B-001",
          nombre: "Bundle",
          itemIds: ["20", "21"],
        },
      ],
      shownLots: [],
      resolveItem: resolverFrom([
        item("20", { mostrarEnCatalogo: false }),
        item("21"),
      ]),
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i) => i.itemId)).toEqual(["21"]);
  });

  it("drops a bundle entirely when every member is hidden", () => {
    const groups = assembleBundleGroups({
      shownSublotes: [],
      shownLots: [
        {
          loteId: "B-002",
          nombre: "Todo oculto",
          memberItemIds: ["30", "31"],
        },
      ],
      resolveItem: resolverFrom([
        item("30", { mostrarEnCatalogo: false }),
        item("31", { mostrarEnCatalogo: false }),
      ]),
    });

    expect(groups).toHaveLength(0);
  });

  it("keeps all members when none are hidden, summing prices", () => {
    const groups = assembleBundleGroups({
      shownSublotes: [],
      shownLots: [
        {
          loteId: "B-003",
          nombre: "Visible",
          memberItemIds: ["40", "41"],
        },
      ],
      resolveItem: resolverFrom([
        item("40", { precioCOP: 100 }),
        item("41", { precioCOP: 250 }),
      ]),
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[0].totalPriceCOP).toBe(350);
  });
});

describe("assembleBundleGroups — claims + ordering (preserved behavior)", () => {
  it("a shown sublote claims its visible items away from the parent lote", () => {
    const groups = assembleBundleGroups({
      shownSublotes: [
        {
          subLoteId: "B-001-S1",
          parentLoteId: "B-001",
          nombre: "Sub",
          itemIds: ["11"],
        },
      ],
      shownLots: [
        {
          loteId: "B-001",
          nombre: "Parent",
          memberItemIds: ["10", "11", "12"],
        },
      ],
      resolveItem: resolverFrom([item("10"), item("11"), item("12")]),
    });

    const lote = groups.find((g) => g.groupKind === "lote");
    const sub = groups.find((g) => g.groupKind === "sublote");
    expect(sub?.items.map((i) => i.itemId)).toEqual(["11"]);
    // Parent lote no longer lists the claimed item.
    expect(lote?.items.map((i) => i.itemId)).toEqual(["10", "12"]);
  });

  it("drops a parent lote fully claimed by sublotes", () => {
    const groups = assembleBundleGroups({
      shownSublotes: [
        {
          subLoteId: "B-001-S1",
          parentLoteId: "B-001",
          nombre: "Sub",
          itemIds: ["10", "11"],
        },
      ],
      shownLots: [
        { loteId: "B-001", nombre: "Parent", memberItemIds: ["10", "11"] },
      ],
      resolveItem: resolverFrom([item("10"), item("11")]),
    });

    expect(groups.filter((g) => g.groupKind === "lote")).toHaveLength(0);
    expect(groups.filter((g) => g.groupKind === "sublote")).toHaveLength(1);
  });

  it("de-duplicates repeated itemIds within a sublote", () => {
    const groups = assembleBundleGroups({
      shownSublotes: [
        {
          subLoteId: "B-001-S1",
          parentLoteId: "B-001",
          nombre: "Sub",
          itemIds: ["50", "50", "51"],
        },
      ],
      shownLots: [],
      resolveItem: resolverFrom([item("50"), item("51")]),
    });

    expect(groups[0].items.map((i) => i.itemId)).toEqual(["50", "51"]);
  });

  it("skips missing items (resolver returns null)", () => {
    const groups = assembleBundleGroups({
      shownSublotes: [],
      shownLots: [
        { loteId: "B-004", nombre: "Con hueco", memberItemIds: ["60", "404"] },
      ],
      resolveItem: resolverFrom([item("60")]),
    });

    expect(groups[0].items.map((i) => i.itemId)).toEqual(["60"]);
  });
});
