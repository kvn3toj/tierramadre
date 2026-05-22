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

// ─── Color de gema ───────────────────────────────────────────────────
//
// 9 values from the legacy `INVENTARIO Tierra.Madre!Color` dropdown.
// Free-text in the UI today; this list anchors the SOT setDataValidation
// and is a candidate for tightening `GemaFields` later (see dropdown
// coverage 🟡 gap #3).

export const COLORS = [
  "Verde Azulado",
  "Verde Limón",
  "Verde Menta",
  "Verde Muzo",
  "Verde Natural",
  "Verde Vívido",
  "Verde Chivor",
  "Verde Azuloso",
  "Verde Intenso",
] as const;

export type GemaColor = (typeof COLORS)[number];

// ─── Talla / corte ───────────────────────────────────────────────────
//
// Union of the legacy `Talla` dropdown (27 values) + the GENESIS proposal
// (col11 — 19 cuts: Brillante, Superman, Trapecio, Trillion, etc.). De-dup
// across the two sources; ring sizes (0/5-9) kept ahead of cuts so Maritza
// finds them first when sizing a finished ring.

export const TALLAS = [
  "0",
  "5",
  "6",
  "7",
  "8",
  "9",
  "Baguette",
  "Brillante",
  "Cabuchon",
  "Canutillo",
  "Chispero",
  "Chisperito",
  "Corazón",
  "Cuadrada",
  "Cushion",
  "En Bruto-Natural",
  "Esmeralda",
  "Gola",
  "Iris",
  "Lágrima",
  "Marquis",
  "Marquise",
  "Morralla-Lapidada",
  "Ovalo",
  "Pera",
  "Princesa",
  "Rectangular",
  "Redonda",
  "Redonda calibrada",
  "Superman",
  "Trapecio",
  "Trillion",
  "Variado",
  "Varias",
  "Ancestral",
  "Antiguo",
] as const;

export type Talla = (typeof TALLAS)[number];

// ─── Formato de medida ───────────────────────────────────────────────
//
// 2 values from `INVENTARIO Tierra.Madre!Medidas` — describes the shape
// of the value in `medidasValores`, not the value itself.

export const MEDIDAS_FORMATO = ["Largo x Ancho", "Diámetro"] as const;
export type MedidaFormato = (typeof MEDIDAS_FORMATO)[number];

// ─── Categoría de producto ──────────────────────────────────────────
//
// 10 values from `INVENTARIO Tierra.Madre!Categoría`. UI currently only
// exposes `gema`; the legacy sub-types (Anillo en Plata / Aretes / etc.)
// belong to JoyaFields (Slice 2). Order matches Maritza's mental model:
// loose gems first, then finished joyas, then catch-alls.

export const CATEGORIAS = [
  "Gema",
  "Anillo en Plata",
  "Anillo en Oro",
  "Aretes",
  "Topitos",
  "Pulsera",
  "Dije",
  "Lote de Gemas",
  "Joyas",
  "Piedras",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

// ─── Ubicación operativa ─────────────────────────────────────────────
//
// 9 values from `INVENTARIO Tierra.Madre!UBICACIÓN` — where the item
// physically lives. Maritza updates this as the gem moves through the
// pipeline (BOVEDA → ASESOR → CLIENTE, or → EN CERTIFICACION → BOVEDA).
// Fotosíntesis currently doesn't expose this; the SOT dropdown
// constrains Maritza when she edits the sheet directly.

export const UBICACIONES = [
  "BOVEDA",
  "OFI.BOGOTA",
  "OFI.CALI",
  "ASESOR",
  "EMBAJADOR",
  "CLIENTE",
  "EN PRODUCCION",
  "EN CERTIFICACION",
  "RETORNADO",
] as const;

export type Ubicacion = (typeof UBICACIONES)[number];

// ─── Colección de catálogo ───────────────────────────────────────────
//
// 17 values from the legacy `INVENTARIO Tierra.Madre!Colección` dropdown.
// These drive the public catalog grouping; Fotosíntesis admin only needs
// them as a free-text-with-suggestions dropdown when capturing items
// destined for the website.
//
// TODO(Maritza): re-confirm canonical names — these were dumped from the
// sheet on 2026-05-21 and may include WIP / deprecated collections.

export const COLECCIONES = [
  "COLECCION #4000",
  "11:11",
  "Fenix",
  "Secretos del Bosque",
  "Princesas",
  "Reinas",
  "Génesis",
  "Esencia",
  "Origen",
  "Raíces",
  "Verde Eterno",
  "Lluvia de Oportunidades",
  "Encantada",
  "Sagrada",
  "Ancestral",
  "Madre Selva",
  "Tierra",
] as const;

export type Coleccion = (typeof COLECCIONES)[number];

// ─── Estado contable (CAJA) ──────────────────────────────────────────
//
// 4 values from `INVENTARIO Tierra.Madre!CAJA`. Tracks the contable life
// of the sale, not the inventory state. View-only from Fotosíntesis
// today; SOT dropdown ensures Maritza picks one of these when she edits
// the sheet directly.

export const CAJAS = [
  "Legalizada",
  "Pte Legalizar",
  "Pte Fecha x Legalizar",
  "Esmereogenesis",
] as const;

export type Caja = (typeof CAJAS)[number];

// ─── Proveedor · Tipo ────────────────────────────────────────────────
export const PROVIDER_TIPOS = ["gemas", "joyas", "insumos", "otros"] as const;
export type ProviderTipo = (typeof PROVIDER_TIPOS)[number];

// ─── Cliente · Tipo ──────────────────────────────────────────────────
export const CLIENT_TIPOS = ["embajador", "final"] as const;
export type ClientTipo = (typeof CLIENT_TIPOS)[number];

// ─── Lote · Forma de pago ────────────────────────────────────────────
//
// Mirrors `lots.formaPago` v.union in convex/schema.ts. Same list reused
// for `sales.formaPago` — convention chosen to keep providers' payment
// terms aligned with the way the sale is finalized downstream.

export const FORMA_PAGO = [
  "contado",
  "credito",
  "esmereogenesis",
  "bajo_pedido",
  "consignacion",
] as const;

export type FormaPago = (typeof FORMA_PAGO)[number];

// ─── Método de pago contado ──────────────────────────────────────────
export const METODO_CONTADO = ["efectivo", "transferencia"] as const;
export type MetodoContado = (typeof METODO_CONTADO)[number];

// ─── Lote · Estado ───────────────────────────────────────────────────
export const LOT_ESTADOS = ["abierto", "cerrado", "publicado"] as const;
export type LotEstado = (typeof LOT_ESTADOS)[number];

// ─── Venta · Estado ──────────────────────────────────────────────────
export const SALE_ESTADOS = ["reservada", "confirmada", "cancelada"] as const;
export type SaleEstado = (typeof SALE_ESTADOS)[number];
