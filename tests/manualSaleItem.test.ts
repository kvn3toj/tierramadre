import { describe, it, expect } from "vitest";
import {
  isManualDraftComplete,
  buildManualSaleItem,
  sumManual,
  removeManual,
  toConvexManualItems,
  type ManualSaleItem,
} from "../src/pages/admin/Fotosintesis/utils/manualSaleItem";

describe("manualSaleItem — isManualDraftComplete", () => {
  it("requires a non-empty name and a positive price", () => {
    expect(
      isManualDraftComplete({ nombre: "Estuche", precioCop: 50_000 }),
    ).toBe(true);
    expect(isManualDraftComplete({ nombre: "  ", precioCop: 50_000 })).toBe(
      false,
    );
    expect(isManualDraftComplete({ nombre: "Estuche", precioCop: 0 })).toBe(
      false,
    );
    expect(isManualDraftComplete({ nombre: "Estuche", precioCop: "" })).toBe(
      false,
    );
    expect(isManualDraftComplete({ nombre: "Estuche" })).toBe(false);
    expect(isManualDraftComplete({ precioCop: 50_000 })).toBe(false);
  });
});

describe("manualSaleItem — buildManualSaleItem", () => {
  it("builds a trimmed item with the supplied id", () => {
    const item = buildManualSaleItem(
      {
        nombre: "  Estuche de cuero ",
        descripcion: " forro ",
        peso: " 30 g ",
        precioCop: 50_000,
      },
      "id-1",
    );
    expect(item).toEqual({
      id: "id-1",
      nombre: "Estuche de cuero",
      descripcion: "forro",
      peso: "30 g",
      precioCop: 50_000,
    });
  });
  it("drops empty optionals", () => {
    const item = buildManualSaleItem(
      { nombre: "Estuche", descripcion: "   ", precioCop: 10 },
      "id-2",
    );
    expect(item).toEqual({ id: "id-2", nombre: "Estuche", precioCop: 10 });
  });
  it("returns null for an incomplete draft", () => {
    expect(buildManualSaleItem({ nombre: "", precioCop: 10 }, "x")).toBeNull();
    expect(buildManualSaleItem({ nombre: "ok", precioCop: 0 }, "x")).toBeNull();
  });
});

describe("manualSaleItem — sumManual", () => {
  const items: ManualSaleItem[] = [
    { id: "a", nombre: "A", precioCop: 100 },
    { id: "b", nombre: "B", precioCop: 250 },
    { id: "c", nombre: "C", precioCop: Number.NaN },
  ];
  it("sums prices, treating NaN as 0", () => {
    expect(sumManual(items)).toBe(350);
    expect(sumManual([])).toBe(0);
  });
});

describe("manualSaleItem — removeManual", () => {
  it("removes by id and is a no-op when absent", () => {
    const items: ManualSaleItem[] = [
      { id: "a", nombre: "A", precioCop: 100 },
      { id: "b", nombre: "B", precioCop: 200 },
    ];
    expect(removeManual(items, "a").map((m) => m.id)).toEqual(["b"]);
    expect(removeManual(items, "zzz")).toHaveLength(2);
  });
});

describe("manualSaleItem — toConvexManualItems", () => {
  it("maps precioCop → precioCOP and drops the local id + empty optionals", () => {
    const items: ManualSaleItem[] = [
      {
        id: "a",
        nombre: "Estuche",
        descripcion: "cuero",
        peso: "30 g",
        precioCop: 50_000,
      },
      { id: "b", nombre: "Servicio", precioCop: 20_000 },
    ];
    expect(toConvexManualItems(items)).toEqual([
      {
        nombre: "Estuche",
        descripcion: "cuero",
        peso: "30 g",
        precioCOP: 50_000,
      },
      { nombre: "Servicio", precioCOP: 20_000 },
    ]);
  });
});
