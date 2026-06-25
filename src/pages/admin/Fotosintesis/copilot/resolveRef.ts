/**
 * Name → entity resolution for the Fotosynthia commit layer.
 *
 * The model never names a Convex Id — it passes a plain name/natural-key hint,
 * and the client resolves it against live data here. The contract is
 * REFUSE-ON-AMBIGUITY (C6): an exact match wins; otherwise a single substring
 * match wins; two-or-more matches refuse and force the operator to disambiguate.
 * Items reuse the dedicated `resolveItemHint` (lot-scoped candidate list); this
 * module covers providers / clients / sales, which the copilot resolves against
 * their full directory list.
 */

/** lowercase + strip diacritics + collapse whitespace, so "María" matches "maria". */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type RefMatch<T> =
  | { status: "resolved"; item: T }
  | { status: "ambiguous"; matches: T[] }
  | { status: "not-found" };

/**
 * Resolve a hint to exactly one item, or explain why it can't. Exact
 * (normalized) match short-circuits; otherwise a lone substring match resolves;
 * multiple substring matches are ambiguous (never auto-picked).
 */
export function resolveOne<T>(
  items: readonly T[] | undefined,
  name: (item: T) => string | undefined,
  hint: string | undefined,
): RefMatch<T> {
  const h = hint ? normalizeName(hint) : "";
  if (!items || items.length === 0 || !h) return { status: "not-found" };

  const exact = items.find((it) => normalizeName(name(it) ?? "") === h);
  if (exact) return { status: "resolved", item: exact };

  const partial = items.filter((it) => {
    const n = name(it);
    return n ? normalizeName(n).includes(h) : false;
  });
  if (partial.length === 1) return { status: "resolved", item: partial[0] };
  if (partial.length > 1) return { status: "ambiguous", matches: partial };
  return { status: "not-found" };
}

/** A cause-specific, recoverable message for a directory hint that didn't route. */
export function refMissMessage(
  entity: string,
  hint: string | undefined,
  result: RefMatch<unknown>,
): string {
  const name = hint?.trim() ? `“${hint.trim()}”` : `ese ${entity}`;
  if (result.status === "ambiguous") {
    return `Varios coinciden con ${name}. Sé más específica o abrí el ${entity} directamente.`;
  }
  return `No encontré ningún ${entity} que coincida con ${name}. Revisá el nombre.`;
}
