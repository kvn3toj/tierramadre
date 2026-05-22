/**
 * URL-safe slug generator for human names (Spanish-friendly).
 *
 * Slice 3 · used to derive the `compradorSlug` segment of Drive PDF filenames
 * like `ventas/2026/05/V-0042-ana-perez.pdf`. Keeps the output predictable so
 * the operator can recognize a sale by its filename without opening it.
 *
 * Rules:
 *  - Unicode-normalize and strip combining marks (NFKD + diacritics regex)
 *    → "Ana Pérez" → "ana perez", "Niño" → "nino"
 *  - Lowercase
 *  - Replace any non-alphanumeric run with a single "-"
 *  - Trim leading/trailing "-"
 *  - If the result is empty (e.g., emoji-only input, all-punctuation),
 *    fall back to `"cliente"` so we never produce an empty path segment
 */
export function slugifyBuyerName(input: string | null | undefined): string {
  if (!input) return "cliente";
  const normalized = input
    .normalize("NFKD")
    // Strip combining marks (accents, diacritics)
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // Anything that's not a basic latin letter, digit, or space → space
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    // Collapse internal whitespace → single hyphen
    .replace(/\s+/g, "-");
  return normalized.length > 0 ? normalized : "cliente";
}

export default slugifyBuyerName;
