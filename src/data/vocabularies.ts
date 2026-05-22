/**
 * Canonical vocabularies for Fotosíntesis — single source of truth for
 * the dropdown options Maritza already uses in the legacy production
 * sheet (`1mghR6...!INVENTARIO Tierra.Madre`) plus the GENESIS sub-grades
 * she proposed.
 *
 * **Keep in sync with:**
 * - `convex/schema.ts` — when tightening `v.string()` validators to `v.union`s.
 * - Future `scripts/seed-sot-dropdowns.mjs` — when seeding the SOT with
 *   `setDataValidation` rules.
 *
 * If you add or remove a value here, search the codebase for the literal
 * string before shipping — there may be hard-coded references in tests,
 * fixtures, or migrations.
 */

// ─── Calidad de gema ─────────────────────────────────────────────────
//
// 11 values from the legacy production sheet + 6 Extrafina sub-grades
// from GENESIS (Maritza's proposal). The seeded SOT row "Extrafina F1"
// requires the sub-grades to validate, so we include them now.
//
// Order matters — it's the order Maritza sees in the dropdown. Sorted
// from most-valuable (Extrafina sub-grades) to least (Morralla).

export const CALIDADES = [
  "Extrafina Insignificant",
  "Extrafina No Oil",
  "Extrafina Minor",
  "Extrafina F1",
  "Extrafina Moderate",
  "Extrafina F2",
  "Extrafina",
  "Fina Sublime",
  "Fina Esencial",
  "Comercial Superfina",
  "Comercial Fina",
  "Comercial Superior",
  "Comercial Estándar",
  "Morralla Pulida",
  "Morralla Superior",
  "Morralla Fina",
  "Morralla Comercial",
] as const;

export type GemaCalidad = (typeof CALIDADES)[number];

/** Default value for new gem drafts — middle of the Extrafina tier. */
export const DEFAULT_CALIDAD: GemaCalidad = "Extrafina";

// ─── Estado de productInventory ──────────────────────────────────────
//
// 9 values: the original 4 from the Convex schema + 5 inherited from
// the legacy sheet's ESTADO dropdown (Retornado, ESMEREOGENESIS, ESMERO,
// DISPONIBLE ADOPTADA, LOTE X CT). Preserves the legacy mixed-case so
// existing rows pull cleanly into Convex without a migration pass.

export const PRODUCT_ESTADOS = [
  "DISPONIBLE",
  "VENDIDA",
  "ASESOR",
  "Retornado",
  "ESMEREOGENESIS",
  "ESMERO",
  "DISPONIBLE ADOPTADA",
  "LOTE X CT",
  "",
] as const;

export type ProductEstado = (typeof PRODUCT_ESTADOS)[number];

// ─── Suggested public price ──────────────────────────────────────────
//
// Coefficient table mapping each calidad to a multiplier applied on top
// of the gem's costoBaseCOP (lotCostoTotalCOP × preponderancia%). Times
// TM_MARKUP_DEFAULT, this yields the suggested precioPublicoCOP.
//
// Anchored on "Extrafina F1" = 1.00 (the seeded SOT default). The
// Extrafina sub-grades fan out around the anchor; tiers below decay
// progressively into Morralla.
//
// TODO(Maritza): confirm canonical values — these are seeded defaults,
// not blessed numbers. Server-side validation/coefficient sourcing from
// Convex is a follow-up.

/** Markup applied on top of costoBase × calidad-factor (wholesale → retail). */
export const TM_MARKUP_DEFAULT = 3.0; // TODO(Maritza): confirm canonical values

/** Calidad → multiplier. Every value in CALIDADES must have an entry. */
export const CALIDAD_FACTORS: Record<GemaCalidad, number> = {
  "Extrafina Insignificant": 1.2,
  "Extrafina No Oil": 1.15,
  "Extrafina Minor": 1.1,
  "Extrafina F1": 1.0,
  "Extrafina Moderate": 0.9,
  "Extrafina F2": 0.85,
  Extrafina: 0.8,
  "Fina Sublime": 0.65,
  "Fina Esencial": 0.55,
  "Comercial Superfina": 0.4,
  "Comercial Fina": 0.3,
  "Comercial Superior": 0.22,
  "Comercial Estándar": 0.15,
  "Morralla Pulida": 0.1,
  "Morralla Superior": 0.07,
  "Morralla Fina": 0.05,
  "Morralla Comercial": 0.03,
};

/** Suggested retail price (COP, rounded to nearest 1000) from costoBase + calidad. */
export function suggestedPrecioPublicoCOP(
  costoBaseCOP: number,
  calidad: GemaCalidad,
  markup: number = TM_MARKUP_DEFAULT,
): number {
  const factor = CALIDAD_FACTORS[calidad] ?? 1;
  const raw = costoBaseCOP * factor * markup;
  return Math.round(raw / 1000) * 1000;
}
