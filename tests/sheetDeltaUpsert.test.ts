import { describe, it, expect } from "vitest";
import { planRowPatch } from "../convex/_lib/sheetPullMaps";

/** Minimal existing-doc factory (only the fields planRowPatch reads). */
function doc(over: Record<string, unknown> = {}) {
  return {
    syncStatus: "synced" as const,
    ...over,
  };
}

describe("planRowPatch — conflict policy", () => {
  it("protects rows with a pending Convex edit (no content patch)", () => {
    const plan = planRowPatch(
      "providers",
      doc({ syncStatus: "pending", telefono: "111" }),
      { telefono: "999" },
    );
    expect(plan.action).toBe("protected");
    expect(plan.patch).toEqual({});
  });

  it("protects rows in error state too", () => {
    const plan = planRowPatch("providers", doc({ syncStatus: "error" }), {
      telefono: "999",
    });
    expect(plan.action).toBe("protected");
  });
});

describe("planRowPatch — diff-skip", () => {
  it("skips when the value is unchanged", () => {
    const plan = planRowPatch("providers", doc({ telefono: "300" }), {
      telefono: "300",
    });
    expect(plan.action).toBe("skip");
    expect(plan.patch).toEqual({});
  });

  it("patches only the changed writable field", () => {
    const plan = planRowPatch(
      "inventory",
      doc({ nombre: "Viejo", color: "Verde" }),
      { nombre: "Nuevo", color: "Verde" },
    );
    expect(plan.action).toBe("patch");
    expect(plan.patch).toEqual({ nombre: "Nuevo" });
  });

  it("ignores excluded/derived columns even if present", () => {
    const plan = planRowPatch("inventory", doc({ nombre: "A" }), {
      costoBaseCOP: "999999",
      preponderancia: "50",
    });
    expect(plan.action).toBe("skip");
    expect(plan.patch).toEqual({});
  });

  it("does not clear a number when the cell is blanked", () => {
    const plan = planRowPatch("inventory", doc({ precioCOP: 1000 }), {
      precioCOP: "",
    });
    expect(plan.action).toBe("skip");
  });
});

describe("planRowPatch — FLAG fields (patched + flagged)", () => {
  it("inventory loteId change patches the mirror and raises a flag", () => {
    const plan = planRowPatch("inventory", doc({ loteId: "B-001" }), {
      loteId: "B-002",
    });
    expect(plan.action).toBe("patch");
    expect(plan.patch).toEqual({ loteId: "B-002" });
    expect(plan.flags.length).toBe(1);
  });

  it("sales itemIdsJoined maps to itemIds[] and flags", () => {
    const plan = planRowPatch("sales", doc({ itemIds: ["1"] }), {
      itemIdsJoined: "1, 2 ,3",
    });
    expect(plan.patch).toEqual({ itemIds: ["1", "2", "3"] });
    expect(plan.flags.length).toBe(1);
  });
});

describe("planRowPatch — AUTO side effects", () => {
  it("sales estado→cancelada becomes a cancelSale side effect, not an estado patch", () => {
    const plan = planRowPatch("sales", doc({ estado: "confirmada" }), {
      estado: "Cancelada",
    });
    expect(plan.patch).not.toHaveProperty("estado");
    expect(plan.sideEffects).toEqual([{ type: "cancelSale" }]);
    expect(plan.action).toBe("patch");
  });

  it("other sale estado transitions patch directly (no side effect)", () => {
    const plan = planRowPatch("sales", doc({ estado: "reservada" }), {
      estado: "confirmada",
    });
    expect(plan.patch).toEqual({ estado: "confirmada" });
    expect(plan.sideEffects).toEqual([]);
  });

  it("lots costoTotalCOP change becomes a refanLot side effect, never a direct patch", () => {
    const plan = planRowPatch("lots", doc({ costoTotalCOP: 1000 }), {
      costoTotalCOP: "2000",
    });
    expect(plan.patch).not.toHaveProperty("costoTotalCOP");
    expect(plan.sideEffects).toEqual([{ type: "refanLot", value: 2000 }]);
  });

  it("lots costoTotalCOP unchanged → no side effect", () => {
    const plan = planRowPatch("lots", doc({ costoTotalCOP: 1000 }), {
      costoTotalCOP: "1000",
    });
    expect(plan.sideEffects).toEqual([]);
    expect(plan.action).toBe("skip");
  });
});
