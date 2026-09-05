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
// Labels from Google Form FOTOSÍNTESIS (Sección 6 · CALIDAD). Order matches
// the form dropdown (finest → commercial). Legacy sheet strings map via
// `normalizeCalidad()` / `CALIDAD_LEGACY_ALIAS`.

export const CALIDADES = [
  'NO OIL',
  'INSIGNIFICANT',
  'MINOR',
  'F1',
  'MODERATE',
  'F2',
  'FINA SUBLIME',
  'FINA ESENCIAL',
  'FINA',
  'FINA COMERCIAL',
  'COMERCIAL SÚPER FINA',
  'COMERCIAL FINA',
  'COMERCIAL SUPERIOR',
  'COMERCIAL ESTÁNDAR',
  'COMERCIAL',
  'Morralla Pulida',
  'Morralla Superior',
  'Morralla Fina',
  'Morralla Comercial',
] as const;

export type GemaCalidad = (typeof CALIDADES)[number];

/** Default for new drafts — anchored on the form's F1 tier. */
export const DEFAULT_CALIDAD: GemaCalidad = 'F1';

/** Map legacy Inventario / Extrafina labels → canonical form labels. */
export const CALIDAD_LEGACY_ALIAS: Record<string, GemaCalidad> = {
  'Extrafina No Oil': 'NO OIL',
  'Extrafina Insignificant': 'INSIGNIFICANT',
  'Extrafina Minor': 'MINOR',
  'Extrafina F1': 'F1',
  'Extrafina Moderate': 'MODERATE',
  'Extrafina F2': 'F2',
  Extrafina: 'FINA',
  'Fina Sublime': 'FINA SUBLIME',
  'Fina Esencial': 'FINA ESENCIAL',
  'Comercial Superfina': 'COMERCIAL SÚPER FINA',
  'Comercial Fina': 'COMERCIAL FINA',
  'Comercial Superior': 'COMERCIAL SUPERIOR',
  'Comercial Estándar': 'COMERCIAL ESTÁNDAR',
  'Comercial Standar': 'COMERCIAL ESTÁNDAR',
};

/**
 * Normalize a stored calidad string to a canonical form label. Recognized
 * values (canonical, legacy alias, or case-insensitive match) are mapped to
 * their canonical label; an unrecognized **non-empty** value is preserved
 * verbatim so operator write-ins ("Otra opción") round-trip and save instead
 * of being silently coerced to the default. Mirrors `normalizeCalidadForSheet`
 * in `convex/_lib/fotosintesisVocab.ts`, which already preserves unknowns.
 */
export function normalizeCalidad(
  raw: string | undefined | null,
): GemaCalidad | '' {
  const s = (raw ?? '').trim();
  // VACÍO SE QUEDA VACÍO. Hasta el 2026-09-04 esto devolvía DEFAULT_CALIDAD
  // ('F1') y era el gemelo app-side del bug que ya se había cerrado en
  // `normalizeCalidadForSheet`. No era teórico: se hidrataba el drawer con una
  // fila de calidad vacía, 'F1' entraba al borrador, quedaba dentro de la línea
  // base de «cambios sin guardar» y se empujaba al SOT al guardar CUALQUIER
  // otro campo. `productEdits` registró 14 ediciones `calidad: null → F1` así,
  // sobre joyería, mientras se editaba otra cosa.
  //
  // Un default que rellena un campo vacío es un dato inventado con forma de
  // dato — y como `calidad` alimenta CALIDAD_FACTORS, ese invento terminaba
  // sugiriendo el precio público. DEFAULT_CALIDAD sobrevive sólo como semilla
  // visible del alta (EMPTY_GEMA_DRAFT), donde la persona la ve y la cambia.
  if (!s) return '';
  if ((CALIDADES as readonly string[]).includes(s)) return s as GemaCalidad;
  const aliased = CALIDAD_LEGACY_ALIAS[s];
  if (aliased) return aliased;
  const upper = s.toUpperCase();
  const match = CALIDADES.find((c) => c.toUpperCase() === upper);
  // Preserve custom write-ins (cast: the field stores free text downstream).
  return match ?? (s as GemaCalidad);
}

// ─── Estado de productInventory ──────────────────────────────────────
//
// 10 values: the original 4 from the Convex schema + 5 inherited from
// the legacy sheet's ESTADO dropdown (Retornado, ESMEREOGENESIS, ESMERO,
// DISPONIBLE ADOPTADA, LOTE X CT) + CONSIGNACION (2026-07-09, app-only —
// an item on consignment with an EXTERNAL comercializador, distinct from
// ASESOR which stays an internal asesor). Preserves the legacy mixed-case so
// existing rows pull cleanly into Convex without a migration pass.

export const PRODUCT_ESTADOS = [
  'DISPONIBLE',
  'VENDIDA',
  'ASESOR',
  'CONSIGNACION',
  'Retornado',
  'ESMEREOGENESIS',
  'ESMERO',
  'DISPONIBLE ADOPTADA',
  'LOTE X CT',
  'RETIRADA',
  '',
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
  'NO OIL': 1.15,
  INSIGNIFICANT: 1.2,
  MINOR: 1.1,
  F1: 1.0,
  MODERATE: 0.9,
  F2: 0.85,
  'FINA SUBLIME': 0.65,
  'FINA ESENCIAL': 0.55,
  FINA: 0.8,
  'FINA COMERCIAL': 0.45,
  'COMERCIAL SÚPER FINA': 0.4,
  'COMERCIAL FINA': 0.3,
  'COMERCIAL SUPERIOR': 0.22,
  'COMERCIAL ESTÁNDAR': 0.15,
  COMERCIAL: 0.12,
  'Morralla Pulida': 0.1,
  'Morralla Superior': 0.07,
  'Morralla Fina': 0.05,
  'Morralla Comercial': 0.03,
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
// Mirrors the `Listas!color` column of the SOT v3, which is what feeds the
// sheet's setDataValidation. Free-text in the UI today, and a candidate for
// tightening `GemaFields` later (see dropdown coverage 🟡 gap #3).
//
// Todos van en Title Case: la hoja tenía `Verde claro` / `Verde profundo` en
// minúscula y se normalizaron, así que comparar por casing vuelve a ser fiable.

export const COLORS = [
  'Verde Chivor',
  'Verde Azul',
  'Verde Azuloso',
  'Verde Muzo',
  'Verde Vívido',
  'Verde Intenso',
  'Verde Selva',
  'Verde Natural',
  'Verde Limón',
  'Verde Viche',
  'Verde Menta',
  'Verde Diamantado',
  'Verde Brillante',
  'Verde',
  'Verde Aguamarina',
  'Verde Claro',
  'Verde Cristal',
  'Verde Profundo',
  'Verde Turquesa',
] as const;

export type GemaColor = (typeof COLORS)[number];

/** Legacy color strings → canonical form labels. */
export const COLOR_LEGACY_ALIAS: Record<string, GemaColor> = {
  'Verde Azulado': 'Verde Azul',
};

export function normalizeColor(raw: string | undefined | null): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  if ((COLORS as readonly string[]).includes(s)) return s;
  return COLOR_LEGACY_ALIAS[s] ?? s;
}

// ─── Tipo de esmeralda (form Sección 6) ──────────────────────────────

export const TIPOS_ESMERALDA = [
  'Muralla',
  'Piedra Natural',
  'Canutillo',
  'Cola',
  'Raíz',
  'Gema Facetada',
] as const;

export type TipoEsmeralda = (typeof TIPOS_ESMERALDA)[number];

// ─── Corte (form Sección 6 · aligned subset) ─────────────────────────

export const CORTES = [
  'Redonda',
  'Brillante',
  'Cuadrada',
  'Baguette',
  'Lágrima',
  'Óvalo',
  'Superman',
  'Trapecio',
  'Rectangular',
  'Marquise',
  'Trillion',
  'Cushion',
  'Corazón',
  'Antiguo',
  'Ancestral',
  'Pera',
  'Princesa',
] as const;

export type Corte = (typeof CORTES)[number];

// ─── Talla / corte ───────────────────────────────────────────────────
//
// Union of the legacy `Talla` dropdown (27 values) + the GENESIS proposal
// (col11 — 19 cuts: Brillante, Superman, Trapecio, Trillion, etc.). De-dup
// across the two sources; ring sizes (0/5-9) kept ahead of cuts so Maritza
// finds them first when sizing a finished ring.

export const TALLAS = [
  '0',
  '5',
  '6',
  '7',
  '8',
  '9',
  'Baguette',
  'Brillante',
  'Cabujón',
  'Canutillo',
  'Chispero',
  'Chisperito',
  'Corazón',
  'Cuadrada',
  'Cushion',
  'En Bruto-Natural',
  'Esmeralda',
  'Gola',
  'Iris',
  'Lágrima',
  'Lágrima/Pera',
  'Marquise',
  'Morralla-Lapidada',
  'Óvalo',
  'Pera',
  'Princesa',
  'Rectangular',
  'Redonda',
  'Redonda calibrada',
  'Superman',
  'Trapecio',
  'Trillion',
  'Variado',
  'Varias',
  'Ancestral',
  'Antiguo',
] as const;

export type Talla = (typeof TALLAS)[number];

// ─── Formato de medida ───────────────────────────────────────────────
//
// 2 values from `INVENTARIO Tierra.Madre!Medidas` — describes the shape
// of the value in `medidasValores`, not the value itself.

export const MEDIDAS_FORMATO = ['Largo x Ancho', 'Diámetro'] as const;
export type MedidaFormato = (typeof MEDIDAS_FORMATO)[number];

// ─── Categoría de producto ──────────────────────────────────────────
//
// 10 values from `INVENTARIO Tierra.Madre!Categoría`. UI currently only
// exposes `gema`; the legacy sub-types (Anillo en Plata / Aretes / etc.)
// belong to JoyaFields (Slice 2). Order matches Maritza's mental model:
// loose gems first, then finished joyas, then catch-alls.

export const CATEGORIAS = [
  'Gema',
  'Anillo en Plata',
  'Anillo en Oro',
  'Aretes',
  'Topitos',
  'Pulsera',
  'Dije',
  'Lote de Gemas',
  'Joyas',
  'Piedras',
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
  'BOVEDA',
  'OFI.BOGOTA',
  'OFI.CALI',
  'ASESOR',
  'EMBAJADOR',
  'CLIENTE',
  'EN PRODUCCION',
  'EN CERTIFICACION',
  'RETORNADO',
] as const;

export type Ubicacion = (typeof UBICACIONES)[number];

// ─── Colección de catálogo ───────────────────────────────────────────
//
// The 17 real collections present in the inventory, cleaned 2026-07-21 from
// the SOT (Inventario col S). Names are stripped of the redundant "COLECCIÓN"
// prefix (the field IS the collection) and grammar/accents fixed. These drive
// the public catalog grouping; Fotosíntesis admin uses them as a
// free-text-with-suggestions dropdown when capturing items for the website.
//
// Legacy sheet strings ("COLECCIÓN Fenix", "COLECCION Secretos del Bosque",
// "Coleccion Circulos de PODER", …) map here via `normalizeColeccion()`.

export const COLECCIONES = [
  'Centro del Universo',
  'Círculos de Poder',
  'Comerciales 29-Ene',
  'Dinastías',
  'Encanto de la Montaña',
  'Fénix',
  'Finas 29-Ene',
  'Madres',
  'Mariposas de la Montaña',
  'Marketing',
  'Princesas',
  'Reinas',
  'Secretos del Bosque',
  'Sueños de Mina',
  'Terrícolas',
  '#4000',
  '11:11',
] as const;

export type Coleccion = (typeof COLECCIONES)[number];

/**
 * Legacy / prefixed colección strings → canonical clean labels. Strips the
 * redundant "COLECCIÓN"/"COLECCION"/"Coleccion"/"CColeccion" and "TOPITOS"
 * prefixes and fixes typos/accents. Unrecognized values round-trip verbatim.
 */
const COLECCION_ALIAS: Record<string, Coleccion> = {
  FENIX: 'Fénix',
  'SECRETOS DEL BOSQUE': 'Secretos del Bosque',
  MADRES: 'Madres',
  PRINCESAS: 'Princesas',
  REINAS: 'Reinas',
  'MARIPOSAS DE LA MONTANA': 'Mariposas de la Montaña',
  'MARIPOSAS DE LA MOTANA': 'Mariposas de la Montaña',
  'SUENOS DE MINA': 'Sueños de Mina',
  'CENTRO DEL UNIVERSO': 'Centro del Universo',
  TERRICOLAS: 'Terrícolas',
  'ENCANTO DE LA MONTANA': 'Encanto de la Montaña',
  'CIRCULOS DE PODER': 'Círculos de Poder',
  DINASTIAS: 'Dinastías',
  MARKETING: 'Marketing',
  '29-ENE-COMERCIALES': 'Comerciales 29-Ene',
  '29-ENE-FINAS': 'Finas 29-Ene',
  '#4000': '#4000',
  '11:11': '11:11',
};

function foldColeccionKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .trim();
}

export function normalizeColeccion(raw: string | undefined | null): string {
  const s0 = (raw ?? '').trim();
  if (!s0) return '';
  const stripped = s0
    .replace(/^C?\s*Colecci[oó]n\s+/i, '')
    .replace(/^TOPITOS\s+/i, '')
    .trim();
  if ((COLECCIONES as readonly string[]).includes(stripped)) return stripped;
  return COLECCION_ALIAS[foldColeccionKey(stripped)] ?? stripped;
}

// ─── Estado contable (CAJA) ──────────────────────────────────────────
//
// 4 values from `INVENTARIO Tierra.Madre!CAJA`. Tracks the contable life
// of the sale, not the inventory state. View-only from Fotosíntesis
// today; SOT dropdown ensures Maritza picks one of these when she edits
// the sheet directly.

export const CAJAS = [
  'Legalizada',
  'Pte Legalizar',
  'Pte Fecha x Legalizar',
  'Esmereogenesis',
] as const;

export type Caja = (typeof CAJAS)[number];

// ─── Proveedor · Tipo ────────────────────────────────────────────────
export const PROVIDER_TIPOS = ['gemas', 'joyas', 'insumos', 'otros'] as const;
export type ProviderTipo = (typeof PROVIDER_TIPOS)[number];

// ─── Cliente · Tipo ──────────────────────────────────────────────────
export const CLIENT_TIPOS = ['embajador', 'final'] as const;
export type ClientTipo = (typeof CLIENT_TIPOS)[number];

// ─── Lote · Forma de pago ────────────────────────────────────────────
//
// Mirrors `lots.formaPago` v.union in convex/schema.ts. Same list reused
// for `sales.formaPago` — convention chosen to keep providers' payment
// terms aligned with the way the sale is finalized downstream.

export const FORMA_PAGO = [
  'contado',
  'credito',
  'esmereogenesis',
  'bajo_pedido',
  'consignacion',
] as const;

export type FormaPago = (typeof FORMA_PAGO)[number];

// ─── Método de pago contado ──────────────────────────────────────────
export const METODO_CONTADO = ['efectivo', 'transferencia'] as const;
export type MetodoContado = (typeof METODO_CONTADO)[number];

// ─── Lote · Estado ───────────────────────────────────────────────────
export const LOT_ESTADOS = ['abierto', 'cerrado', 'publicado'] as const;
export type LotEstado = (typeof LOT_ESTADOS)[number];

// ─── Venta · Estado ──────────────────────────────────────────────────
export const SALE_ESTADOS = ['reservada', 'confirmada', 'cancelada'] as const;
export type SaleEstado = (typeof SALE_ESTADOS)[number];

// ─── Bóveda / sede (form Sección 1) ──────────────────────────────────

export const BOVEDAS = [
  { code: 'B' as const, label: 'Bogotá', formLabel: 'BOGOTÁ' },
  { code: 'C' as const, label: 'Cali', formLabel: 'CALI' },
  { code: 'S' as const, label: 'Bóveda Secreta', formLabel: 'SECRETA' },
  { code: 'M' as const, label: 'Marketing', formLabel: 'MARKETING' },
] as const;

// Known sede codes (B/C/S/M) keep their autocomplete, but a custom write-in
// bóveda code is allowed too (sanitized to an uppercase, dash-free token so it
// stays valid as a loteId/saleId prefix). The `& {}` keeps the literal hints.
export type Sede = (typeof BOVEDAS)[number]['code'] | (string & {});

/**
 * Sanitize an operator-written bóveda code into an ID-safe sede token: uppercase
 * letters/digits only (no dashes/spaces — they'd break `parseLoteId`, which
 * splits on the first "-"), capped at 4 chars. Keeps custom loteId/saleId
 * prefixes well-formed, e.g. "Medellín" → "MEDE".
 */
export function sanitizeSedeCode(raw: string): string {
  return (raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
}

// ─── Tipo ítem form (Sección 5) ──────────────────────────────────────

export const TIPOS_ITEM_FORM = [
  'PIEDRA',
  'GEMA',
  'LOTE',
  'JOYA',
  'LOTE DE JOYAS',
  'GANGA',
  'MACLA',
  'CANUTILLO',
  'Otros',
] as const;

export type TipoItemForm = (typeof TIPOS_ITEM_FORM)[number];

export type TipoItemConvex = 'gema' | 'bruto' | 'joya' | 'insumo' | 'lote';

/** Map form tipo → Convex lotItems.tipo */
export function tipoConvexFromForm(formTipo: TipoItemForm): TipoItemConvex {
  switch (formTipo) {
    case 'GEMA':
      return 'gema';
    case 'JOYA':
      return 'joya';
    case 'LOTE':
    case 'LOTE DE JOYAS':
      return 'lote';
    case 'PIEDRA':
    case 'GANGA':
    case 'MACLA':
    case 'CANUTILLO':
    case 'Otros':
    default:
      return 'bruto';
  }
}

// ─── Joyas (form Sección 7) ──────────────────────────────────────────

export const TIPOS_JOYA = [
  'Topitos Peq',
  'Topitos Grandes',
  'Topitos Hombre',
  'Aretes',
  'Pulsera',
  'Dije',
  'Cadena',
  'Expansión',
  'Anillo Mujer',
  'Anillo Hombre',
  // Added 2026-07-04: GHL's tipo_interes dropdown has had "candonga" and
  // "set" as customer-facing options with no capture-form counterpart, so
  // the bot could never resolve a piece-type match for them (see
  // GHL/tipo-interes-mapping-analysis.md and convex/_lib/productSearch.ts).
  'Candonga',
  'Set',
  // Added 2026-07-07: neck pieces (choker/collar) had no capture-form
  // counterpart either — "Cadena" reads as a chain-only piece, not a
  // close-fitting collar/choker. Requested during the Fotosíntesis
  // batch-capture session for the Cali lote (26 chokers/aretes/anillos).
  'Choker',
  'Collar',
] as const;

export type TipoJoya = (typeof TIPOS_JOYA)[number];

export const MINERALES = [
  'Platino',
  'Oro',
  'Oro Rosado',
  'Oro Italiano',
  'Oro Blanco',
  'Oro Negro',
  'Plata 925',
  'Plata Rodinada',
  'Plata China',
  'Plata Baño de Oro',
  'Bronce',
  'Bronce Baño de Oro',
  'Tela',
  'Hilos',
] as const;

export type Mineral = (typeof MINERALES)[number];

export const COMPLEMENTOS = [
  'Diamante',
  'Rubí',
  'Zafiro',
  'Circones (Natural)',
  'Circonia',
  'Cuarzos',
] as const;

export type Complemento = (typeof COMPLEMENTOS)[number];

// ─── Predictive suggestions for free-text capture fields ─────────────
// These power native <datalist> autocomplete: they suggest as the operator
// types but never constrain the value — any free text still saves verbatim.

/** Colombian emerald sources, for the Procedencia field (gema + bruto). */
export const PROCEDENCIAS = [
  'Boyacá',
  'Muzo',
  'Chivor',
  'Coscuez',
  'Gachalá',
  'Peñas Blancas',
  'La Pita',
  'Quípama',
  'Maripí',
  'Otanche',
  'Pauna',
  'San Pablo de Borbur',
  'Yacopí',
] as const;
export type Procedencia = (typeof PROCEDENCIAS)[number];

/** Common goldsmithing techniques, for the Técnica field (joya). */
export const TECNICAS_JOYA = [
  'Engaste',
  'Microengaste',
  'Filigrana',
  'Fundición',
  'Cera perdida',
  'Repujado',
  'Calado',
  'Martillado',
  'Granulado',
  'Soldadura',
  'Electroformado',
] as const;
export type TecnicaJoya = (typeof TECNICAS_JOYA)[number];

// ─── Precio final (form Sección 9) ───────────────────────────────────

export const FORMULAS_GEMA = ['X1', 'X1,5', 'X2', 'X2,5', 'X3'] as const;
export type FormulaGema = (typeof FORMULAS_GEMA)[number];

export const FORMULAS_JOYA = [
  'X1',
  'X1,1',
  'X1,2',
  'X1,5',
  'X2',
  'X2,5',
  'X3',
] as const;
export type FormulaJoya = (typeof FORMULAS_JOYA)[number];

export const RANGOS_DESCUENTO = [
  '10%',
  '20%',
  '30%',
  '40%',
  '50%',
  '60%',
  '70%',
] as const;
export type RangoDescuento = (typeof RANGOS_DESCUENTO)[number];

/** Parse formula string like "X2,5" → numeric multiplier. */
export function parseFormulaMultiplier(formula: string): number {
  const m = formula.replace(/^X/i, '').replace(',', '.');
  const n = parseFloat(m);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// ─── Medidas A×H×C (form Sección 6) ──────────────────────────────────

export interface MedidasAHC {
  ancho: string;
  alto: string;
  cono: string;
}

export function serializeMedidas(m: MedidasAHC): string {
  const parts = [m.ancho, m.alto, m.cono].map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  return `${parts.join('×')} mm`;
}

export function parseMedidas(raw: string | undefined | null): MedidasAHC {
  const s = (raw ?? '').replace(/\s*mm\s*$/i, '').trim();
  if (!s) return { ancho: '', alto: '', cono: '' };
  const parts = s.split(/×|x|X|\*/).map((p) => p.trim());
  return {
    ancho: parts[0] ?? '',
    alto: parts[1] ?? '',
    cono: parts[2] ?? '',
  };
}

// ─── Venta · Forma de pago (form Sección 10 + operación) ─────────────

/** Sale-specific union — includes canje from the form. */
export const FORMA_PAGO_VENTA = [
  'contado',
  'credito',
  'esmereogenesis',
  'canje',
  'bajo_pedido',
  'consignacion',
] as const;

export type FormaPagoVenta = (typeof FORMA_PAGO_VENTA)[number];

export const METODO_RECEPCION = [
  'efectivo',
  'transferencia',
  'crypto',
] as const;

export type MetodoRecepcion = (typeof METODO_RECEPCION)[number];
