import { describe, it, expect } from "vitest";
import { itemEstadoCopy } from "../src/pages/admin/Fotosintesis/utils/itemEstadoCopy";

describe("itemEstadoCopy", () => {
  it("tells the operator a published item is live in the catalog", () => {
    const c = itemEstadoCopy("publicado");
    expect(c.banner).toBe(
      "Lote publicado · este ítem está en el catálogo — los cambios se reflejan al instante",
    );
    expect(c.tone).toBe("emerald");
  });

  it("explains a closed lot without falsely restricting editable fields", () => {
    const c = itemEstadoCopy("cerrado");
    expect(c.banner).not.toBeNull();
    // Must NOT reintroduce the old false 'only foto/certificado' claim.
    expect(c.banner).not.toMatch(/foto y certificado/i);
    expect(c.tone).toBe("neutral");
  });

  it("shows no estado banner for an open or cancelled lot", () => {
    expect(itemEstadoCopy("abierto").banner).toBeNull();
    expect(itemEstadoCopy("cancelado").banner).toBeNull();
  });

  it("gives one honest subtitle regardless of estado (no dead branch)", () => {
    const estados = ["abierto", "cerrado", "publicado", "cancelado"] as const;
    for (const e of estados) {
      expect(itemEstadoCopy(e).subtitle).toBe(
        "Los cambios se guardan en Convex y se sincronizan a la planilla.",
      );
    }
  });
});
