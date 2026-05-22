import { describe, expect, it } from "vitest";

import { slugifyBuyerName } from "../src/utils/slugify";

describe("slugifyBuyerName", () => {
  it("lowercases ASCII names and collapses spaces to a single hyphen", () => {
    expect(slugifyBuyerName("Ana Maria Perez")).toBe("ana-maria-perez");
  });

  it("strips accents and diacritics", () => {
    expect(slugifyBuyerName("Ana Pérez")).toBe("ana-perez");
    expect(slugifyBuyerName("Niño Ñañez")).toBe("nino-nanez");
    expect(slugifyBuyerName("Êléonore D'Souza")).toBe("eleonore-d-souza");
  });

  it("collapses punctuation and consecutive separators", () => {
    expect(slugifyBuyerName("María-José   Gómez!")).toBe("maria-jose-gomez");
    expect(slugifyBuyerName("  ana  --  perez  ")).toBe("ana-perez");
  });

  it("preserves digits inside names", () => {
    expect(slugifyBuyerName("Cliente 42")).toBe("cliente-42");
  });

  it("returns 'cliente' as a fallback for empty or symbol-only input", () => {
    expect(slugifyBuyerName("")).toBe("cliente");
    expect(slugifyBuyerName("   ")).toBe("cliente");
    expect(slugifyBuyerName("!!!---")).toBe("cliente");
    expect(slugifyBuyerName(null)).toBe("cliente");
    expect(slugifyBuyerName(undefined)).toBe("cliente");
  });

  it("never produces leading or trailing hyphens", () => {
    expect(slugifyBuyerName("-Ana-")).not.toMatch(/^-|-$/);
    expect(slugifyBuyerName("¡Hola, mundo!")).toBe("hola-mundo");
  });
});
