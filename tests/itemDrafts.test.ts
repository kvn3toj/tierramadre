import { describe, it, expect } from "vitest";
import {
  inferItemTipo,
  parseJoyaPeso,
  joyaDraftFromProduct,
  joyaPatchFromDraft,
  brutoDraftFromProduct,
  brutoPatchFromDraft,
  insumoDraftFromProduct,
  insumoPatchFromDraft,
} from "../src/pages/admin/Fotosintesis/utils/buildLotItemPayload";

describe("inferItemTipo", () => {
  it("trusts an explicit stored tipo", () => {
    expect(inferItemTipo({ tipo: "gema" })).toBe("gema");
    expect(inferItemTipo({ tipo: "joya" })).toBe("joya");
    expect(inferItemTipo({ tipo: "bruto" })).toBe("bruto");
    expect(inferItemTipo({ tipo: "insumo" })).toBe("insumo");
  });

  it("edits a lote de joyas as a joya", () => {
    expect(inferItemTipo({ tipo: "lote" })).toBe("joya");
  });

  it("classifies legacy rows by their populated fields", () => {
    expect(inferItemTipo({ tipoJoya: "Anillo" })).toBe("joya");
    expect(inferItemTipo({ tecnicaJoya: "Engaste" })).toBe("joya");
    expect(inferItemTipo({ minerales: ["Oro"] })).toBe("joya");
    expect(inferItemTipo({ complementos: ["Cadena"] })).toBe("joya");
    expect(inferItemTipo({ cantidadEstimada: 80 })).toBe("bruto");
    expect(inferItemTipo({ rendimientoEsperado: 65 })).toBe("bruto");
  });

  it("defaults a bare row to gema", () => {
    expect(inferItemTipo({})).toBe("gema");
    expect(inferItemTipo({ nombre: "Esmeralda", minerales: [] } as never)).toBe(
      "gema",
    );
  });

  it("prefers joya when both joya and bruto signals exist", () => {
    expect(inferItemTipo({ tipoJoya: "Anillo", cantidadEstimada: 5 })).toBe(
      "joya",
    );
  });
});

describe("parseJoyaPeso", () => {
  it("splits value and unit", () => {
    expect(parseJoyaPeso("5 gr")).toEqual({ value: 5, unit: "gr" });
    expect(parseJoyaPeso("2.5 ct")).toEqual({ value: 2.5, unit: "ct" });
    expect(parseJoyaPeso("2,5 quilates")).toEqual({ value: 2.5, unit: "ct" });
  });

  it("defaults a bare number to grams", () => {
    expect(parseJoyaPeso("12")).toEqual({ value: 12, unit: "gr" });
  });

  it("handles empty / non-numeric weights", () => {
    expect(parseJoyaPeso("")).toEqual({ value: "", unit: "gr" });
    expect(parseJoyaPeso(undefined)).toEqual({ value: "", unit: "gr" });
    expect(parseJoyaPeso("Plata")).toEqual({ value: "", unit: "gr" });
  });
});

describe("joya round-trip", () => {
  it("hydrates a draft from a product row", () => {
    const draft = joyaDraftFromProduct({
      nombre: "Anillo Aurora",
      observacion: "Pieza única",
      cantidad: 1,
      peso: "5 gr",
      tipoJoya: "Anillo",
      tecnicaJoya: "Engaste",
      minerales: ["Oro 18k"],
      complementos: ["Estuche"],
      precioCOP: 1_200_000,
    });
    expect(draft).toMatchObject({
      nombre: "Anillo Aurora",
      descripcion: "Pieza única",
      pesoValor: 5,
      pesoUnidad: "gr",
      tipoJoya: "Anillo",
      tecnica: "Engaste",
      minerales: ["Oro 18k"],
      complementos: ["Estuche"],
      precioPublicoCOP: 1_200_000,
    });
  });

  it("serializes a patch that preserves joya-only fields", () => {
    const draft = joyaDraftFromProduct({
      nombre: "Anillo Aurora",
      peso: "5 gr",
      tipoJoya: "Anillo",
      tecnicaJoya: "Engaste",
      minerales: ["Oro 18k"],
      complementos: ["Estuche"],
    });
    const patch = joyaPatchFromDraft({ ...draft, preponderancia: 40 }, true);
    expect(patch).toMatchObject({
      nombre: "Anillo Aurora",
      peso: "5 gr",
      tipoJoya: "Anillo",
      tecnicaJoya: "Engaste",
      minerales: ["Oro 18k"],
      complementos: ["Estuche"],
      mostrarEnCatalogo: true,
      preponderancia: 40,
    });
  });

  it("clears a weight that was emptied", () => {
    const patch = joyaPatchFromDraft(
      joyaDraftFromProduct({ nombre: "X", peso: "" }) as never,
      false,
    );
    expect(patch.peso).toBe("");
  });
});

describe("bruto round-trip", () => {
  it("hydrates a draft from a product row", () => {
    const draft = brutoDraftFromProduct({
      nombre: "Bruto Muzo",
      peso: "12 kg",
      procedencia: "Muzo",
      cantidadEstimada: 80,
      rendimientoEsperado: 65,
      precioCOP: 5_000_000,
    });
    expect(draft).toMatchObject({
      nombre: "Bruto Muzo",
      pesoTotal: "12 kg",
      procedencia: "Muzo",
      cantidadEstimada: 80,
      rendimientoEsperado: 65,
      precioPublicoCOP: 5_000_000,
    });
  });

  it("serializes a patch that preserves bruto-only fields", () => {
    const draft = brutoDraftFromProduct({
      nombre: "Bruto Muzo",
      peso: "12 kg",
      procedencia: "Muzo",
      cantidadEstimada: 80,
      rendimientoEsperado: 65,
    });
    const patch = brutoPatchFromDraft(
      { ...draft, preponderancia: 50 },
      "rough parcel",
      false,
    );
    expect(patch).toMatchObject({
      nombre: "Bruto Muzo",
      peso: "12 kg",
      procedencia: "Muzo",
      cantidadEstimada: 80,
      rendimientoEsperado: 65,
      observacion: "rough parcel",
      preponderancia: 50,
    });
  });
});

describe("insumo round-trip", () => {
  it("hydrates a draft from a product row", () => {
    const draft = insumoDraftFromProduct({
      nombre: "Lupa triplete 10x",
      categoria: "Óptica",
      cantidad: 3,
      precioCOP: 180_000,
    });
    expect(draft).toMatchObject({
      nombre: "Lupa triplete 10x",
      categoria: "Óptica",
      cantidad: 3,
      precioPublicoCOP: 180_000,
    });
  });

  it("serializes a patch that preserves the category", () => {
    const draft = insumoDraftFromProduct({
      nombre: "Limpiador ultrasónico",
      categoria: "Limpieza",
      cantidad: 1,
    });
    const patch = insumoPatchFromDraft(
      { ...draft, preponderancia: 100 },
      "uso interno",
      false,
    );
    expect(patch).toMatchObject({
      nombre: "Limpiador ultrasónico",
      categoria: "Limpieza",
      cantidad: 1,
      observacion: "uso interno",
      mostrarEnCatalogo: false,
      preponderancia: 100,
    });
  });
});
