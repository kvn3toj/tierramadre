/**
 * Pure budget coercion for the GHL bot's `search-products` tool. Kept free of
 * any IO so it is unit-testable (see tests/parseBudget.test.ts) and importable
 * without dragging the serverless handler's deps into a test.
 *
 * WF-04's webhook renders `"presupuesto":{{contact.presupuesto_declarado}}`
 * from a GHL merge tag, so the value can reach the API as a real number, a
 * numeric string ("3000000", "3.000.000"), Colombian phrasing ("3 millones",
 * "3,5M"), or empty (the field was never captured). The old handler used
 * `typeof raw === "number" ? raw : undefined`, silently dropping EVERY string
 * form → the Convex query then ran with no ceiling and surfaced the most
 * expensive stones in the vault (the 930M/828M/611M incident, 2026-07-05).
 */

/**
 * Coerce a raw budget into a positive COP number, or `undefined` when there is
 * no usable signal. Returns `undefined` (never 0) so callers can keep a real
 * "no budget declared" distinct from a genuine zero.
 */
export function parsePresupuestoCOP(raw: unknown): number | undefined {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? raw : undefined;
  }
  if (typeof raw !== "string") return undefined;
  const s = raw.trim().toLowerCase();
  if (!s) return undefined;

  // Leading numeric token, tolerating "." / "," ("3", "3,5", "3.000.000").
  const numMatch = s.match(/[\d][\d.,]*/);
  if (!numMatch) return undefined;
  const token = numMatch[0];

  // Phrased in millions? "3 millones", "3,5 mill", "3M", "3 m".
  const saysMillions =
    /mill[oó]n(?:es)?/.test(s) || /\bmill\b/.test(s) || /\d\s*m\b/.test(s);

  if (saysMillions) {
    // Here "," is a decimal separator ("3,5" → 3.5); strip "." thousands dots.
    const normalized = token.includes(",")
      ? token.replace(/\./g, "").replace(",", ".")
      : token;
    const n = parseFloat(normalized);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 1_000_000) : undefined;
  }

  // Plain amount: strip separators ("3.000.000" / "$3,000,000 COP" → 3000000).
  const digits = token.replace(/\D/g, "");
  if (!digits) return undefined;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
