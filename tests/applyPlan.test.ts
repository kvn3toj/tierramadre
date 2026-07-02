// tests/applyPlan.test.ts
import { describe, it, expect } from "vitest";
import { planContactWrites } from "../scripts/lib/apply-plan";
import { buildSettableStageMap } from "../scripts/lib/backfill-stage";
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
const settable = buildSettableStageMap(FULL);
const row: ExtractionRow = {
  contactId: "c-1",
  conversationId: "cv",
  conversationIds: ["cv"],
  channel: "whatsapp",
  signals: {
    tipo_interes: { value: "anillo", confidence: 0.9 },
    presupuesto_cop: { value: 4_000_000, confidence: 0.9 },
    ocasion: { value: "regalo", confidence: 0.9 },
    ciudad: { value: "Cali", confidence: 0.9 },
    conocimiento: { value: "novato", confidence: 0.9 },
    urgencia: { value: "media", confidence: 0.9 },
    products_shown: { value: false },
    sentiment: { value: "interesado", confidence: 0.9 },
    objeciones: [],
    outcome: "respondido-sin-cierre",
  },
};

describe("planContactWrites", () => {
  it("composes field writes, tags, and a forward-only stage move for an existing opp", () => {
    const plan = planContactWrites(row, {
      currentFieldsByKey: {},
      currentTags: [],
      currentStageId: "s1",
      settable,
    });
    expect(plan.fieldWrites.map((w) => w.key)).toEqual(
      expect.arrayContaining([
        "tipo_interes",
        "presupuesto_declarado",
        "canal_origen",
      ]),
    );
    expect(plan.tags).toEqual(
      expect.arrayContaining([
        "interes-anillo",
        "ocasion-regalo",
        "canal-whatsapp",
      ]),
    );
    expect(plan.stage).toEqual({ stageId: "s2" }); // qualified, forward from Nuevo Lead
  });
  it("drops tags the contact already has", () => {
    const plan = planContactWrites(row, {
      currentFieldsByKey: {},
      currentTags: ["interes-anillo"],
      currentStageId: "s1",
      settable,
    });
    expect(plan.tags).not.toContain("interes-anillo");
  });
  it("no opportunity → no stage move", () => {
    const plan = planContactWrites(row, {
      currentFieldsByKey: {},
      currentTags: [],
      currentStageId: null,
      settable,
    });
    expect(plan.stage).toBeNull();
  });
});
