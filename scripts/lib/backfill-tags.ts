// scripts/lib/backfill-tags.ts
import { type ExtractionRow, MIN_CONFIDENCE } from "./types.js";

// Every active/trigger or scoring-mutating tag. NEVER applied in a backfill.
export const DENY_TAGS: ReadonlySet<string> = new Set([
  "cliente-pago-confirmado",
  "pide-humano",
  "buscar-catalogo",
  "quiere-comprar",
  "qualification_complete",
  "lead-frio",
  "carrito-enviado",
]);

// Frozen literal maps — the ONLY source of emitted tags. No string interpolation.
const INTERES_TAG: Record<string, string> = {
  topito: "interes-topito",
  anillo: "interes-anillo",
  dije: "interes-dije",
  gema_suelta: "interes-gema-suelta",
  set: "interes-set",
  // candonga, otro → intentionally absent (no such tag exists)
};
const OCASION_TAG: Record<string, string> = {
  regalo: "ocasion-regalo",
  cumpleanos: "ocasion-cumpleanos",
  aniversario: "ocasion-aniversario",
  matrimonio: "ocasion-matrimonio",
  diario: "ocasion-diario",
  inversion: "ocasion-inversion",
  "evento-especial": "ocasion-evento-especial",
};
const CANAL_TAG: Record<string, string> = {
  whatsapp: "canal-whatsapp",
  instagram: "canal-instagram",
  tiktok: "canal-tiktok",
  web: "canal-web",
  evento: "canal-evento",
};

const norm = (t: string) => t.toLowerCase().trim();
const conf = (c: number) => c >= MIN_CONFIDENCE;

export function deriveTags(row: ExtractionRow): string[] {
  const s = row.signals;
  const candidates: string[] = [];

  if (s.tipo_interes.value && conf(s.tipo_interes.confidence)) {
    const t = INTERES_TAG[s.tipo_interes.value];
    if (t) candidates.push(t);
  }
  if (s.ocasion.value && conf(s.ocasion.confidence)) {
    const t = OCASION_TAG[s.ocasion.value];
    if (t) candidates.push(t);
  }
  if (row.channel !== "unknown") {
    const t = CANAL_TAG[row.channel];
    if (t) candidates.push(t);
  }
  if (s.urgencia.value === "alta" && conf(s.urgencia.confidence))
    candidates.push("urgencia");
  if (s.products_shown.value === true) candidates.push("productos-mostrados");
  // sentiment / outcome / objeciones deliberately produce NO tag.

  // Belt-and-suspenders: normalize + reject anything on the denylist (should be impossible).
  return candidates.map(norm).filter((t) => !DENY_TAGS.has(t));
}
