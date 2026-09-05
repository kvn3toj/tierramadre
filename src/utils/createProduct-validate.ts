/**
 * createProduct-validate — pure validation for the "+ Nueva piedra" flow.
 *
 * The atelier admin's create drawer collects the same fields as the edit
 * drawer, but the fundamental difference is `itemId`: it must be present,
 * trimmed, and unique against the existing mirror. This module isolates
 * that decision so the UI handler can dispatch on a typed result without
 * duplicating logic in the Convex mutation, the test stub, and the
 * drawer-side defensive checks.
 *
 * Returns a discriminated union: callers branch on `result.ok`, surface
 * `result.error` as a notification on failure, and forward
 * `result.value` (already trimmed and normalized) to the mutation on
 * success.
 */

export interface NewProductInput {
  itemId: string;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  cantidad?: number;
  talla?: string;
  tallaAnillo?: string;
  medidas?: string;
  categoria?: string;
  precioFinalCOP?: number;
  ubicacion?: string;
  coleccion?: string;
  caja?: string;
}

export interface ValidatedProduct {
  itemId: string;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  cantidad?: number;
  talla?: string;
  tallaAnillo?: string;
  medidas?: string;
  categoria?: string;
  precioFinalCOP?: number;
  ubicacion?: string;
  coleccion?: string;
  caja?: string;
}

export type ValidationResult =
  | { ok: true; value: ValidatedProduct }
  | { ok: false; error: string };

function trimOrUndef(v: string | undefined): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length === 0 ? undefined : t;
}

export function validateNewProduct(
  input: NewProductInput,
  existingIds: Set<string>,
): ValidationResult {
  const itemId = trimOrUndef(input.itemId);
  if (!itemId)
    return { ok: false, error: "El número de la piedra es obligatorio" };
  if (existingIds.has(itemId))
    return { ok: false, error: `Ya existe una piedra con el número ${itemId}` };
  const value: ValidatedProduct = {
    itemId,
    nombre: trimOrUndef(input.nombre),
    peso: trimOrUndef(input.peso),
    color: trimOrUndef(input.color),
    calidad: trimOrUndef(input.calidad),
    cantidad:
      typeof input.cantidad === "number" && Number.isFinite(input.cantidad)
        ? input.cantidad
        : undefined,
    talla: trimOrUndef(input.talla),
    tallaAnillo: trimOrUndef(input.tallaAnillo),
    medidas: trimOrUndef(input.medidas),
    categoria: trimOrUndef(input.categoria),
    precioFinalCOP:
      typeof input.precioFinalCOP === "number" &&
      Number.isFinite(input.precioFinalCOP) &&
      input.precioFinalCOP > 0
        ? input.precioFinalCOP
        : undefined,
    ubicacion: trimOrUndef(input.ubicacion),
    coleccion: trimOrUndef(input.coleccion),
    caja: trimOrUndef(input.caja),
  };
  return { ok: true, value };
}
