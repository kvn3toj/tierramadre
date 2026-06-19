/**
 * Guided-edit itemHint resolution (bug #3 polish).
 *
 * Fotosynthia extracts an `itemHint` ("la esmeralda de Chivor" -> "Chivor"); the
 * client resolves it against the snapshot's candidate items — the 300 most-recent
 * inventory items that carry a loteId (see ITEM_SCAN_CAP in convex/fotosintesisAi.ts).
 *
 * This resolver is accent/case-insensitive, refuses to guess when a hint is
 * ambiguous, and classifies WHY a hint failed so the panel can show a recoverable
 * message instead of a silent dead-end — in particular distinguishing "the item
 * fell off the recent-items cap" from "no such item".
 */

export interface HintCandidate {
  itemId: string;
  nombre?: string;
  loteId?: string;
}

export type HintResolution =
  | { status: "resolved"; item: HintCandidate }
  | { status: "ambiguous"; matches: HintCandidate[] }
  | { status: "not-found"; catalogComplete: boolean }
  | { status: "no-data" };

/** lowercase + strip diacritics + trim, so "Gachalá" matches "gachala". */
function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Resolve a hint to a single candidate, or explain why it can't.
 *
 * @param cap the candidate cap (ITEM_SCAN_CAP). When `candidates.length < cap`
 * the snapshot holds the complete set of lot-items, so a miss is a true
 * not-found; at the cap the item may simply be older than the window.
 */
export function resolveItemHint(
  hint: string | undefined,
  candidates: HintCandidate[] | undefined,
  cap: number,
): HintResolution {
  if (candidates === undefined) return { status: "no-data" };

  const catalogComplete = candidates.length < cap;
  const h = hint ? normalize(hint) : "";
  if (!h) return { status: "not-found", catalogComplete };

  const exact = candidates.find((c) => normalize(String(c.itemId)) === h);
  if (exact) return { status: "resolved", item: exact };

  const matches = candidates.filter(
    (c) => c.nombre && normalize(c.nombre).includes(h),
  );
  if (matches.length === 1) return { status: "resolved", item: matches[0] };
  if (matches.length > 1) return { status: "ambiguous", matches };

  return { status: "not-found", catalogComplete };
}

/** A recoverable, cause-specific message for a hint that could not be routed. */
export function hintMissMessage(
  hint: string | undefined,
  resolution: HintResolution,
): string {
  const name = hint?.trim() ? `“${hint.trim()}”` : "ese ítem";
  switch (resolution.status) {
    case "resolved":
      // Not normally shown (resolved hints route), kept for totality.
      return "Abrí el lote del ítem para editarlo.";
    case "no-data":
      return "No puedo consultar el inventario ahora mismo. Abrí el lote del ítem para editarlo.";
    case "ambiguous": {
      const names = resolution.matches
        .map((m) => m.nombre)
        .filter((n): n is string => !!n)
        .slice(0, 3)
        .join(", ");
      return `Varios ítems coinciden con ${name}${
        names ? ` (${names})` : ""
      }. Abrí el lote del ítem específico para editarlo.`;
    }
    case "not-found":
      return resolution.catalogComplete
        ? `No encontré ningún ítem que coincida con ${name}. Revisá el nombre o abrílo desde su lote.`
        : `No ubiqué ${name} entre los ítems recientes; puede estar en un lote más antiguo. Abrílo desde su lote para editarlo.`;
  }
}
