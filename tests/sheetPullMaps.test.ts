import { describe, it, expect } from "vitest";
import {
  WRITABLE,
  FOTO_SYNC_TABLES,
  coerceCell,
  normalizeInvEstado,
  normalizeLotEstado,
  normalizeSaleEstado,
  normalizeSubLoteEstado,
  type FotoSyncTable,
} from "../convex/_lib/sheetPullMaps";
import { COLUMN_MAPS } from "../convex/_lib/columnMaps";
// .js source of truth for the Inventario tab layout (no types; runtime import).
import { FOTO_INVENTARIO_COLUMNS } from "../api/_lib/fotosintesis-inventory-columns.js";

const INVENTORY_KEYS: string[] = (
  FOTO_INVENTARIO_COLUMNS as Array<{ key: string }>
).map((c) => c.key);

describe("drift: every writable allowlist key is a real column", () => {
  it("inventory allowlist ⊆ FOTO_INVENTARIO_COLUMNS keys", () => {
    for (const key of Object.keys(WRITABLE.inventory)) {
      expect(INVENTORY_KEYS, `inventory.${key}`).toContain(key);
    }
  });

  it("the 5 non-inventory allowlists ⊆ their COLUMN_MAPS", () => {
    const five: FotoSyncTable[] = [
      "providers",
      "lots",
      "clients",
      "sales",
      "subLotes",
    ];
    for (const table of five) {
      const cols = COLUMN_MAPS[table] as readonly string[];
      for (const key of Object.keys(WRITABLE[table])) {
        expect(cols, `${table}.${key}`).toContain(key);
      }
    }
  });
});

describe("guardrails: dangerous columns are NOT writable", () => {
  it("derived + FK-name + natural-key columns are excluded", () => {
    expect(WRITABLE.inventory).not.toHaveProperty("costoBaseCOP");
    expect(WRITABLE.inventory).not.toHaveProperty("preponderancia");
    expect(WRITABLE.inventory).not.toHaveProperty("item"); // natural key (col A)
    expect(WRITABLE.lots).not.toHaveProperty("providerNombre"); // denormalized FK
    expect(WRITABLE.lots).not.toHaveProperty("loteId"); // natural key
    expect(WRITABLE.sales).not.toHaveProperty("clientNombre"); // denormalized FK
    expect(WRITABLE.sales).not.toHaveProperty("saleId");
    expect(WRITABLE.subLotes).not.toHaveProperty("unidades"); // derived
    expect(WRITABLE.subLotes).not.toHaveProperty("totalCostoCOP"); // derived
    expect(WRITABLE.providers).not.toHaveProperty("nombreORazonSocial");
    expect(WRITABLE.clients).not.toHaveProperty("nombre");
  });

  it("covers all 6 tables", () => {
    expect(Object.keys(WRITABLE).sort()).toEqual([...FOTO_SYNC_TABLES].sort());
  });
});

describe("coerceCell", () => {
  it("str trims", () => {
    expect(coerceCell("str", "  hola ")).toEqual({
      skip: false,
      value: "hola",
    });
  });

  it("num parses $ and thousands separators, skips blank/invalid", () => {
    expect(coerceCell("num", "$1,250,000")).toEqual({
      skip: false,
      value: 1250000,
    });
    expect(coerceCell("num", "42")).toEqual({ skip: false, value: 42 });
    expect(coerceCell("num", "")).toEqual({ skip: true }); // never clear a number
    expect(coerceCell("num", "abc")).toEqual({ skip: true });
  });

  it("bool recognizes truthy/falsey words, skips unknown", () => {
    expect(coerceCell("bool", "TRUE")).toEqual({ skip: false, value: true });
    expect(coerceCell("bool", "x")).toEqual({ skip: false, value: true });
    expect(coerceCell("bool", "0")).toEqual({ skip: false, value: false });
    expect(coerceCell("bool", "no")).toEqual({ skip: false, value: false });
    expect(coerceCell("bool", "quizás")).toEqual({ skip: true });
  });

  it("csv splits, trims, drops empties", () => {
    expect(coerceCell("csv", "a, b ,,c")).toEqual({
      skip: false,
      value: ["a", "b", "c"],
    });
    expect(coerceCell("csv", "")).toEqual({ skip: false, value: [] });
  });

  it("estado normalizers route through coerce", () => {
    expect(coerceCell("estadoSale", "Cancelada")).toEqual({
      skip: false,
      value: "cancelada",
    });
    expect(coerceCell("estadoSale", "??")).toEqual({ skip: true });
    expect(coerceCell("estadoInv", "vendida")).toEqual({
      skip: false,
      value: "VENDIDA",
    });
  });
});

describe("estado normalizers", () => {
  it("inventory: case-insensitive, legacy default + casing", () => {
    expect(normalizeInvEstado("disponible")).toBe("DISPONIBLE");
    expect(normalizeInvEstado("RETORNADO")).toBe("Retornado");
    expect(normalizeInvEstado("")).toBe("DISPONIBLE");
    expect(normalizeInvEstado("xyz")).toBeNull();
  });

  it("lot / sale / subLote: lowercase whitelist, unknown → null", () => {
    expect(normalizeLotEstado("Publicado")).toBe("publicado");
    expect(normalizeLotEstado("foo")).toBeNull();
    expect(normalizeSaleEstado("CONFIRMADA")).toBe("confirmada");
    expect(normalizeSubLoteEstado("Archivada")).toBe("archivada");
    expect(normalizeSubLoteEstado("borrador")).toBeNull();
  });
});
