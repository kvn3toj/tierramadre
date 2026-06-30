/**
 * Pure assembly of the customer-facing bundle cards (lotes + sub-lotes shown
 * as a single grouped card). Kept free of Convex IO so it is unit-testable:
 * the `products.publishedGroups` query pre-fetches the rows, then delegates the
 * grouping decision here.
 *
 * VISIBILITY RULE — the reason this module exists. A member item only appears
 * in a bundle when its per-item `mostrarEnCatalogo` flag is `true`. This mirrors
 * the individual `publishedCatalog` path and lets the operator hide a single
 * piece from a bundle (the "Visible en el catálogo público" switch in the item
 * editor). Before this, grouped cards showed every member regardless of the
 * flag, so hiding an item had no effect on a bundled lote/sublote. A bundle
 * whose members are all hidden collapses (dropped from the result) — the
 * intuitive outcome of hiding everything.
 */

/** A bundle member as rendered on the card, plus its publish flag for filtering. */
export interface ResolvedBundleItem {
  itemId: string;
  nombre: string;
  fotoUrl?: string;
  precioCOP: number;
  color?: string;
  calidad?: string;
  peso?: string;
  categoria?: string;
  talla?: string;
  medidas?: string;
  // Per-piece Fotosíntesis characteristics (surfaced publicly 2026-06-30) so a
  // lote's per-image detail overlay reflects the exact gem.
  procedencia?: string;
  nivelRareza?: number;
  calificacion?: number;
  tipoEsmeralda?: string;
  tipoJoya?: string;
  tecnicaJoya?: string;
  minerales?: string[];
  complementos?: string[];
  observacion?: string;
  /** Convex-only publish flag. Only `true` members appear in a bundle. */
  mostrarEnCatalogo: boolean;
}

/** Member shape emitted on a group (the publish flag is stripped). */
export type BundleItem = Omit<ResolvedBundleItem, "mostrarEnCatalogo">;

export interface BundleGroup {
  groupKind: "lote" | "sublote";
  groupId: string;
  parentLoteId: string;
  nombre: string;
  fotoUrl?: string;
  totalPriceCOP: number;
  items: BundleItem[];
  // Lot-level provenance, denormalized onto the card by the query handler after
  // assembly (this pure module does not read the `lots` table).
  mina?: string;
  tratamiento?: string;
}

export interface ShownSublote {
  subLoteId: string;
  parentLoteId: string;
  nombre: string;
  fotoUrl?: string;
  /** Member itemIds (may contain duplicates; de-duplicated here). */
  itemIds: string[];
}

export interface ShownLot {
  loteId: string;
  /** Display name — caller resolves `renombreLote ?? loteId`. */
  nombre: string;
  /** Hero photo — caller passes `fotoLoteUrl`. */
  fotoUrl?: string;
  /** Member itemIds in display order (caller sorts by `ordenEnLote`). */
  memberItemIds: string[];
}

export interface AssembleBundleGroupsInput {
  /** Active sub-lotes that opted into bundle display, in their listing order. */
  shownSublotes: ShownSublote[];
  /** Published lots that opted into bundle display, in their listing order. */
  shownLots: ShownLot[];
  /** itemId → resolved member, or null when the row is missing. */
  resolveItem: (itemId: string) => ResolvedBundleItem | null;
}

/** A member is shown in a bundle only when it resolves AND is published. */
function visibleMember(resolved: ResolvedBundleItem | null): BundleItem | null {
  if (!resolved) return null;
  if (resolved.mostrarEnCatalogo !== true) return null;
  // Strip the publish flag from the emitted shape.
  const { mostrarEnCatalogo: _omit, ...item } = resolved;
  return item;
}

const sumPrice = (items: BundleItem[]): number =>
  items.reduce((s, it) => s + it.precioCOP, 0);

/**
 * Build the grouped bundle cards. Sub-lote groups are assembled first and CLAIM
 * their (visible) members so a shared item never shows in both the sub-lote card
 * and its parent lote card. The parent lote card then lists only the visible
 * members no shown sub-lote claimed, and is dropped if that leaves it empty.
 */
export function assembleBundleGroups(
  input: AssembleBundleGroupsInput,
): BundleGroup[] {
  const { shownSublotes, shownLots, resolveItem } = input;

  // ── Sub-lote groups first (they claim their visible items) ──────
  const subloteGroups: BundleGroup[] = [];
  const claimedItemIds = new Set<string>();

  for (const sub of shownSublotes) {
    const seen = new Set<string>();
    const items: BundleItem[] = [];
    for (const itemId of sub.itemIds) {
      if (seen.has(itemId)) continue;
      seen.add(itemId);
      const it = visibleMember(resolveItem(itemId));
      if (it) items.push(it);
    }
    if (items.length === 0) continue;
    for (const it of items) claimedItemIds.add(it.itemId);
    subloteGroups.push({
      groupKind: "sublote",
      groupId: sub.subLoteId,
      parentLoteId: sub.parentLoteId,
      nombre: sub.nombre,
      fotoUrl: sub.fotoUrl,
      totalPriceCOP: sumPrice(items),
      items,
    });
  }

  // ── Lote groups (excluding items claimed by a shown sub-lote) ───
  const loteGroups: BundleGroup[] = [];
  for (const lot of shownLots) {
    const items: BundleItem[] = [];
    for (const itemId of lot.memberItemIds) {
      if (claimedItemIds.has(itemId)) continue; // claimed by a sub-lote
      const it = visibleMember(resolveItem(itemId));
      if (it) items.push(it);
    }
    if (items.length === 0) continue; // fully split into sub-lotes or all hidden
    loteGroups.push({
      groupKind: "lote",
      groupId: lot.loteId,
      parentLoteId: lot.loteId,
      nombre: lot.nombre,
      fotoUrl: lot.fotoUrl,
      totalPriceCOP: sumPrice(items),
      items,
    });
  }

  return [...loteGroups, ...subloteGroups];
}
