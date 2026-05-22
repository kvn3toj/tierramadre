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
