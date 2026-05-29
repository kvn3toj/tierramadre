import { describe, it, expect } from "vitest";
import { cancelToast } from "../src/pages/admin/Fotosintesis/utils/cancelToast";

describe("cancelToast", () => {
  it("celebrates a clean restore (singular)", () => {
    expect(cancelToast({ restored: 1, skipped: 0 })).toEqual({
      message: "Venta cancelada · 1 ítem restaurado a inventario",
      severity: "success",
    });
  });

  it("celebrates a clean restore (plural)", () => {
    expect(cancelToast({ restored: 3, skipped: 0 })).toEqual({
      message: "Venta cancelada · 3 ítems restaurados a inventario",
      severity: "success",
    });
  });

  it("warns on a partial restore, naming both counts", () => {
    expect(cancelToast({ restored: 1, skipped: 2 })).toEqual({
      message: "Venta cancelada · 1 ítem restaurado, 2 sin cambios",
      severity: "warning",
    });
  });

  it("warns honestly when nothing was restored (does not claim stock restored)", () => {
    const r = cancelToast({ restored: 0, skipped: 3 });
    expect(r.severity).toBe("warning");
    expect(r.message).toBe(
      "Venta cancelada · sin ítems para restaurar a inventario",
    );
    expect(r.message).not.toContain("restaurado a");
  });
});
