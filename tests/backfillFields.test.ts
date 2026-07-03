// tests/backfillFields.test.ts
import { describe, it, expect } from "vitest";
import { deriveFieldWrites } from "../scripts/lib/backfill-fields";
import type { ExtractionRow } from "../scripts/lib/types";

function row(
  overrides: Partial<ExtractionRow["signals"]> = {},
  channel: ExtractionRow["channel"] = "whatsapp",
): ExtractionRow {
  return {
    contactId: "c-1",
    conversationId: "cv-1",
    conversationIds: ["cv-1"],
    channel,
    signals: {
      tipo_interes: { value: "anillo", confidence: 0.9 },
      presupuesto_cop: { value: 5_000_000, confidence: 0.9 },
      ocasion: { value: "regalo", confidence: 0.9 },
      ciudad: { value: "Bogotá", confidence: 0.9 },
      conocimiento: { value: "novato", confidence: 0.9 },
      urgencia: { value: "media", confidence: 0.9 },
      products_shown: { value: false },
      sentiment: { value: "interesado", confidence: 0.9 },
      objeciones: [],
      outcome: "respondido-sin-cierre",
      ...overrides,
    },
  };
}

describe("deriveFieldWrites", () => {
  it("maps signals to GHL field keys with field_value", () => {
    const { writes } = deriveFieldWrites(row(), {});
    expect(writes).toEqual(
      expect.arrayContaining([
        { key: "tipo_interes", field_value: "anillo" },
        { key: "presupuesto_declarado", field_value: 5_000_000 },
        { key: "ciudad", field_value: "Bogotá" },
        { key: "canal_origen", field_value: "whatsapp" },
        { key: "conocimiento_esmeraldas", field_value: "novato" },
      ]),
    );
  });

  it("only-if-empty: skips a field whose current value is non-empty", () => {
    const { writes, skipped } = deriveFieldWrites(row(), {
      tipo_interes: "topito",
    });
    expect(writes.find((w) => w.key === "tipo_interes")).toBeUndefined();
    expect(skipped).toContain("tipo_interes");
  });

  it("skips signals below MIN_CONFIDENCE", () => {
    const { writes } = deriveFieldWrites(
      row({ tipo_interes: { value: "anillo", confidence: 0.5 } }),
      {},
    );
    expect(writes.find((w) => w.key === "tipo_interes")).toBeUndefined();
  });

  it("never writes budget 0/null (unknown budget)", () => {
    const { writes } = deriveFieldWrites(
      row({ presupuesto_cop: { value: null, confidence: 0.9 } }),
      {},
    );
    expect(
      writes.find((w) => w.key === "presupuesto_declarado"),
    ).toBeUndefined();
  });

  it("never writes budget 0 even at high confidence (guards the `> 0` clause, not just the null check)", () => {
    const { writes } = deriveFieldWrites(
      row({ presupuesto_cop: { value: 0, confidence: 0.9 } }),
      {},
    );
    expect(
      writes.find((w) => w.key === "presupuesto_declarado"),
    ).toBeUndefined();
  });

  it("never writes a negative budget", () => {
    const { writes } = deriveFieldWrites(
      row({ presupuesto_cop: { value: -50_000, confidence: 0.9 } }),
      {},
    );
    expect(
      writes.find((w) => w.key === "presupuesto_declarado"),
    ).toBeUndefined();
  });

  it("rejects an invalid dropdown value", () => {
    const { writes } = deriveFieldWrites(
      row({ tipo_interes: { value: "collar" as any, confidence: 0.9 } }),
      {},
    );
    expect(writes.find((w) => w.key === "tipo_interes")).toBeUndefined();
  });

  it("never emits a forbidden field key", () => {
    const { writes } = deriveFieldWrites(row(), {});
    const keys = writes.map((w) => w.key);
    for (const forbidden of [
      "lead_score",
      "total_comprado_cop",
      "order_id",
      "producto_seleccionado_sku",
      "embajador_asignado",
      "supabase_contact_id",
      "ultima_compra_fecha",
    ]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});
