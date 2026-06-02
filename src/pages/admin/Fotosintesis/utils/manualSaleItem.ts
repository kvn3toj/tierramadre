/**
 * Manual (non-inventory) line items for the venta (Kardex) form.
 *
 * Ported from the cuentas/recibos manual-entry pattern: lets the operator add
 * something that isn't in `productInventory` (an accessory, a service, a piece
 * not yet captured) to a sale. Manual items carry inline name/price and never
 * reference a productInventory itemId, so they are kept out of the sale's
 * `itemIds` (which the server validates against inventory) and stored on the
 * sale's own `manualItems` array instead.
 *
 * Pure + React-free so `tests/manualSaleItem` can pin the contract.
 */

export interface ManualSaleItem {
  /** Local-only id (React key + removal). Never sent as an inventory itemId. */
  id: string;
  nombre: string;
  descripcion?: string;
  /** Free-text weight/material note, e.g. "2,5 ct" or "Plata". */
  peso?: string;
  precioCop: number;
}

/** In-progress draft bound to the inline add-form inputs. */
export interface ManualSaleItemDraft {
  nombre?: string;
  descripcion?: string;
  peso?: string;
  precioCop?: number | "";
}

/** A draft can be added once it has a non-empty name and a positive price. */
export function isManualDraftComplete(draft: ManualSaleItemDraft): boolean {
  const hasName =
    typeof draft.nombre === "string" && draft.nombre.trim() !== "";
  const price = draft.precioCop;
  const hasPrice =
    typeof price === "number" && Number.isFinite(price) && price > 0;
  return hasName && hasPrice;
}

/**
 * Build a {@link ManualSaleItem} from a draft + a caller-supplied id (so the
 * helper stays pure — the component passes `crypto.randomUUID()`). Returns null
 * when the draft is incomplete. Trims text fields and drops empty optionals.
 */
export function buildManualSaleItem(
  draft: ManualSaleItemDraft,
  id: string,
): ManualSaleItem | null {
  if (!isManualDraftComplete(draft)) return null;
  const item: ManualSaleItem = {
    id,
    nombre: (draft.nombre ?? "").trim(),
    precioCop: draft.precioCop as number,
  };
  const descripcion = draft.descripcion?.trim();
  if (descripcion) item.descripcion = descripcion;
  const peso = draft.peso?.trim();
  if (peso) item.peso = peso;
  return item;
}

/** Σ of the manual items' prices. NaN-safe (missing/NaN counts as 0). */
export function sumManual(list: ManualSaleItem[]): number {
  return list.reduce(
    (acc, m) =>
      acc +
      (typeof m.precioCop === "number" && !Number.isNaN(m.precioCop)
        ? m.precioCop
        : 0),
    0,
  );
}

/** Remove the manual item matching `id` (no-op if absent). */
export function removeManual(
  list: ManualSaleItem[],
  id: string,
): ManualSaleItem[] {
  return list.filter((m) => m.id !== id);
}

/**
 * Map the UI shape (`precioCop`) onto the Convex `sales.manualItems` shape
 * (`precioCOP`, matching the COP-field casing convention). Drops the local id.
 */
export function toConvexManualItems(
  list: ManualSaleItem[],
): {
  nombre: string;
  descripcion?: string;
  peso?: string;
  precioCOP: number;
}[] {
  return list.map((m) => ({
    nombre: m.nombre,
    ...(m.descripcion ? { descripcion: m.descripcion } : {}),
    ...(m.peso ? { peso: m.peso } : {}),
    precioCOP: m.precioCop,
  }));
}
