/**
 * Estado-aware copy for the EditItemDrawer. The drawer was estado-blind: its
 * subtitle keyed only on `editable` (always true from its single caller), so the
 * "Lote cerrado — foto y certificado sí se pueden actualizar" branch was both
 * dead AND false (after the P0 work, every field is editable in every estado).
 * Nothing told the operator the item was live in the public catalog, so they
 * couldn't tell a private fix from an instant public change. (ISO-audit C9.)
 *
 * Pure so it is unit-testable (tests/itemEstadoCopy.test.ts). `tone` maps to the
 * banner's accent in the drawer (emerald = live/public, neutral = closed).
 */
export type LotEstado = "abierto" | "cerrado" | "publicado" | "cancelado";

export interface ItemEstadoCopy {
  subtitle: string;
  banner: string | null;
  tone: "emerald" | "neutral";
}

export function itemEstadoCopy(estado: LotEstado): ItemEstadoCopy {
  const subtitle =
    "Los cambios se guardan en Convex y se sincronizan a la planilla.";

  if (estado === "publicado") {
    return {
      subtitle,
      banner:
        "Lote publicado · este ítem está en el catálogo — los cambios se reflejan al instante",
      tone: "emerald",
    };
  }

  if (estado === "cerrado") {
    return {
      subtitle,
      banner:
        "Lote cerrado · podés corregir cualquier dato de este ítem; el encabezado contable del lote queda fijo.",
      tone: "neutral",
    };
  }

  return { subtitle, banner: null, tone: "neutral" };
}
