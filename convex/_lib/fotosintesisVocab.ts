/**
 * Convex-side mirrors of Fotosíntesis vocabulary normalizers (keep aligned
 * with `src/data/vocabularies.ts` — cannot import frontend modules here).
 */

const CALIDAD_LEGACY_ALIAS: Record<string, string> = {
  "Extrafina No Oil": "NO OIL",
  "Extrafina Insignificant": "INSIGNIFICANT",
  "Extrafina Minor": "MINOR",
  "Extrafina F1": "F1",
  "Extrafina Moderate": "MODERATE",
  "Extrafina F2": "F2",
  Extrafina: "FINA",
  "Fina Sublime": "FINA SUBLIME",
  "Fina Esencial": "FINA ESENCIAL",
  "Comercial Superfina": "COMERCIAL SÚPER FINA",
  "Comercial Fina": "COMERCIAL FINA",
  "Comercial Superior": "COMERCIAL SUPERIOR",
  "Comercial Estándar": "COMERCIAL ESTÁNDAR",
  "Comercial Standar": "COMERCIAL ESTÁNDAR",
};

const COLOR_LEGACY_ALIAS: Record<string, string> = {
  "Verde Azulado": "Verde Azul",
};

/**
 * Normalize calidad for Sheets push (canonical form labels).
 *
 * VACÍO SE QUEDA VACÍO (2026-08-03). Antes esto devolvía `"F1"` cuando el ítem
 * no traía calidad, y `calidad` está en el allowlist de pull: el dato inventado
 * volvía a Convex por la hoja y se volvía indistinguible de uno medido. La
 * migración de sublotes lo destapó — tres piedras que el dueño dejó
 * explícitamente en "pendiente de confirmar" llegaron a la hoja como F1.
 *
 * Un ítem sin calidad es un hecho: que se vea. `normalizeColorForSheet`, aquí
 * abajo, siempre lo hizo así.
 */
export function normalizeCalidadForSheet(raw: string | undefined | null): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  const aliased = CALIDAD_LEGACY_ALIAS[s];
  if (aliased) return aliased;
  return s;
}

/** Normalize color for Sheets push. */
export function normalizeColorForSheet(raw: string | undefined | null): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  return COLOR_LEGACY_ALIAS[s] ?? s;
}
