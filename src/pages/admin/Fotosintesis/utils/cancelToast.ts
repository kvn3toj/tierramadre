import type { AlertColor } from "@mui/material";

/**
 * Honest toast copy for a cancelled sale. `sales.cancel` only restores items
 * still VENDIDA and returns how many it actually restored vs skipped, so the
 * toast must reflect that instead of always claiming "stock restaurado" — the
 * old copy lied whenever every item had already moved on. (ISO-audit C8.)
 *
 * Pure so it is unit-testable (tests/cancelToast.test.ts); the page just renders
 * the returned message+severity via notify().
 */
export function cancelToast({
  restored,
  skipped,
}: {
  restored: number;
  skipped: number;
}): { message: string; severity: Extract<AlertColor, "success" | "warning"> } {
  if (restored === 0) {
    return {
      message: "Venta cancelada · sin ítems para restaurar a inventario",
      severity: "warning",
    };
  }
  const restoredLabel =
    restored === 1 ? "1 ítem restaurado" : `${restored} ítems restaurados`;
  if (skipped > 0) {
    return {
      message: `Venta cancelada · ${restoredLabel}, ${skipped} sin cambios`,
      severity: "warning",
    };
  }
  return {
    message: `Venta cancelada · ${restoredLabel} a inventario`,
    severity: "success",
  };
}
