/**
 * Parse a free-form weight value into carats so we can derive a price-per-carat.
 *
 * Peso is captured as a loose string for gems/rough ("2.5 ct", "12 kg", "Plata")
 * and as a number for lot weight, so this is deliberately forgiving:
 *  - bare number  → assumed carats ("2.5" → 2.5 ct)
 *  - "ct" / "quilate" → carats verbatim
 *  - "g" / "gr" / "gram" → grams, converted at 1 g = 5 ct
 *  - "kg" / "kilo" → kilograms, converted at 1 kg = 5000 ct
 *
 * Returns `null` when there's no positive numeric weight to work with (e.g.
 * "Plata", "fragmento", empty), so callers can simply skip the readout.
 */
export function parseCaratWeight(
  peso: string | number | "" | undefined | null,
): number | null {
  if (peso == null || peso === "") return null;
  if (typeof peso === "number") return peso > 0 ? peso : null;

  const raw = peso.trim().toLowerCase();
  const match = raw.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return null;

  const n = Number(match[0].replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;

  // Order matters: "kg" contains "g", so check it before the gram branch.
  if (raw.includes("kg") || raw.includes("kilo")) return n * 5000;
  if (raw.includes("ct") || raw.includes("quilate") || raw.includes("kt")) {
    return n;
  }
  if (raw.includes("g")) return n * 5;
  return n; // bare number → assume carats
}

/** Price (COP) per carat, rounded. Returns `null` when it can't be computed. */
export function pricePerCarat(
  priceCOP: number | "" | undefined | null,
  carats: number | null,
): number | null {
  const price = typeof priceCOP === "number" ? priceCOP : 0;
  if (price <= 0 || !carats || carats <= 0) return null;
  return Math.round(price / carats);
}
