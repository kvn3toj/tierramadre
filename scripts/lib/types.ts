// scripts/lib/types.ts
//
// Shared extraction types for the GHL conversation-analysis backfill pipeline.
// Consumed by analyze-conversations.ts (producer) and apply-backfill.ts +
// scripts/lib/backfill-*.ts (consumers). Keep this shape stable — later tasks
// import it verbatim.

export interface Signal<T> {
  value: T | null;
  confidence: number;
  evidence?: string;
}
export interface ExtractionRow {
  contactId: string;
  contactName?: string;
  conversationId: string;
  conversationIds: string[];
  channel: "whatsapp" | "instagram" | "tiktok" | "web" | "evento" | "unknown";
  signals: {
    tipo_interes: Signal<
      "topito" | "candonga" | "anillo" | "dije" | "gema_suelta" | "set" | "otro"
    >;
    presupuesto_cop: Signal<number>;
    ocasion: Signal<
      | "regalo"
      | "cumpleanos"
      | "aniversario"
      | "matrimonio"
      | "diario"
      | "inversion"
      | "evento-especial"
    >;
    ciudad: Signal<string>;
    conocimiento: Signal<"novato" | "intermedio" | "experto">;
    urgencia: Signal<"alta" | "media" | "baja">;
    products_shown: { value: boolean; evidence?: string };
    sentiment: Signal<
      | "interesado"
      | "sensible-precio"
      | "frustrado"
      | "listo-comprar"
      | "indeciso"
    >;
    objeciones: string[];
    outcome:
      | "sin-respuesta-negocio"
      | "respondido-sin-cierre"
      | "pidio-humano"
      | "compro"
      | "fantasma";
  };
  tipo_interes_evidence?: {
    asked_for_plain?: string;
    maps_to_categoria_hint?: string;
  };
}
export const MIN_CONFIDENCE = 0.6;
