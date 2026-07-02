// scripts/lib/backfill-fields.ts
import { type ExtractionRow, MIN_CONFIDENCE } from "./types";

export const TIPO_INTERES_VALUES = [
  "topito",
  "candonga",
  "anillo",
  "dije",
  "gema_suelta",
  "set",
  "otro",
] as const;
export const OCASION_VALUES = [
  "regalo",
  "cumpleanos",
  "aniversario",
  "matrimonio",
  "diario",
  "inversion",
  "evento-especial",
] as const;
export const CONOCIMIENTO_VALUES = ["novato", "intermedio", "experto"] as const;
export const CANAL_VALUES = [
  "whatsapp",
  "instagram",
  "tiktok",
  "web",
  "evento",
] as const;

export interface FieldWrite {
  key: string;
  field_value: string | number;
}

function isEmpty(v: unknown): boolean {
  return (
    v === undefined || v === null || (typeof v === "string" && v.trim() === "")
  );
}
function passes<T>(sig: { value: T | null; confidence: number }): boolean {
  return sig.value != null && sig.confidence >= MIN_CONFIDENCE;
}

export function deriveFieldWrites(
  row: ExtractionRow,
  currentByKey: Record<string, unknown>,
): { writes: FieldWrite[]; skipped: string[] } {
  const writes: FieldWrite[] = [];
  const skipped: string[] = [];
  const s = row.signals;

  const put = (key: string, value: string | number, valid: boolean) => {
    if (!isEmpty(currentByKey[key])) {
      skipped.push(key);
      return;
    } // only-if-empty
    if (!valid) {
      skipped.push(key);
      return;
    }
    writes.push({ key, field_value: value });
  };

  if (passes(s.tipo_interes))
    put(
      "tipo_interes",
      s.tipo_interes.value!,
      (TIPO_INTERES_VALUES as readonly string[]).includes(
        s.tipo_interes.value!,
      ),
    );
  if (passes(s.presupuesto_cop) && s.presupuesto_cop.value! > 0)
    put("presupuesto_declarado", s.presupuesto_cop.value!, true);
  if (passes(s.ciudad))
    put("ciudad", s.ciudad.value!, s.ciudad.value!.trim().length > 0);
  if (row.channel !== "unknown")
    put(
      "canal_origen",
      row.channel,
      (CANAL_VALUES as readonly string[]).includes(row.channel),
    );
  if (passes(s.conocimiento))
    put(
      "conocimiento_esmeraldas",
      s.conocimiento.value!,
      (CONOCIMIENTO_VALUES as readonly string[]).includes(
        s.conocimiento.value!,
      ),
    );

  return { writes, skipped };
}
