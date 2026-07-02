// tests/backfillStage.test.ts
import { describe, it, expect } from "vitest";
import {
  buildSettableStageMap,
  deriveTargetStageName,
  chooseStageWrite,
  SETTABLE_STAGE_NAMES,
} from "../scripts/lib/backfill-stage";
import type { ExtractionRow } from "../scripts/lib/types";

const FULL = [
  { id: "s1", name: "Nuevo Lead" },
  { id: "s2", name: "Calificado por IA" },
  { id: "s3", name: "Producto Recomendado" },
  { id: "s4", name: "Carrito Enviado" },
  { id: "s5", name: "Negociación / Agente" },
  { id: "s6", name: "Venta Cerrada" },
  { id: "s7", name: "Perdido / Nurturing" },
];
const row = (o: Partial<ExtractionRow["signals"]> = {}): ExtractionRow => ({
  contactId: "c",
  conversationId: "cv",
  conversationIds: ["cv"],
  channel: "whatsapp",
  signals: {
    tipo_interes: { value: null, confidence: 0 },
    presupuesto_cop: { value: null, confidence: 0 },
    ocasion: { value: null, confidence: 0 },
    ciudad: { value: null, confidence: 0 },
    conocimiento: { value: null, confidence: 0 },
    urgencia: { value: null, confidence: 0 },
    products_shown: { value: false },
    sentiment: { value: "indeciso", confidence: 0.9 },
    objeciones: [],
    outcome: "respondido-sin-cierre",
    ...o,
  },
});

describe("stage derivation", () => {
  it("buildSettableStageMap drops Carrito Enviado + Venta Cerrada, keeps exactly 5", () => {
    const m = buildSettableStageMap(FULL);
    expect([...m.keys()].sort()).toEqual([...SETTABLE_STAGE_NAMES].sort());
    expect(m.has("Carrito Enviado")).toBe(false);
    expect(m.has("Venta Cerrada")).toBe(false);
  });
  it("throws if a settable stage is missing from the live pipeline", () => {
    expect(() =>
      buildSettableStageMap(FULL.filter((s) => s.name !== "Calificado por IA")),
    ).toThrow();
  });
  it("qualified (interest+budget) → Calificado por IA", () => {
    expect(
      deriveTargetStageName(
        row({
          tipo_interes: { value: "anillo", confidence: 0.9 },
          presupuesto_cop: { value: 3_000_000, confidence: 0.9 },
        }),
      ),
    ).toBe("Calificado por IA");
  });
  it("products_shown → Producto Recomendado", () => {
    expect(
      deriveTargetStageName(row({ products_shown: { value: true } })),
    ).toBe("Producto Recomendado");
  });
  it("outcome pidio-humano → Negociación / Agente; fantasma → Perdido / Nurturing", () => {
    expect(deriveTargetStageName(row({ outcome: "pidio-humano" }))).toBe(
      "Negociación / Agente",
    );
    expect(deriveTargetStageName(row({ outcome: "fantasma" }))).toBe(
      "Perdido / Nurturing",
    );
  });
  it("chooseStageWrite is forward-only (no regress, no no-op)", () => {
    const m = buildSettableStageMap(FULL);
    // current already at Producto Recomendado (s3), evidence only qualifies (order 2) → null
    expect(
      chooseStageWrite(
        row({
          tipo_interes: { value: "anillo", confidence: 0.9 },
          presupuesto_cop: { value: 1, confidence: 0.9 },
        }),
        "s3",
        m,
      ),
    ).toBeNull();
    // current Nuevo Lead (s1), evidence products_shown (order 3) → advance to s3
    expect(
      chooseStageWrite(row({ products_shown: { value: true } }), "s1", m),
    ).toEqual({ stageId: "s3" });
  });
  it("chooseStageWrite treats an out-of-set current stage as order 0, still only advancing into the settable set", () => {
    const m = buildSettableStageMap(FULL);
    // current stage s4 = Carrito Enviado — dropped from the settable map (unknown/forbidden
    // current stage). Must fall back to order 0 so evidence can still advance into the
    // settable set, landing on Producto Recomendado (s3) rather than being blocked or throwing.
    expect(
      chooseStageWrite(row({ products_shown: { value: true } }), "s4", m),
    ).toEqual({ stageId: "s3" });
  });
});
