// tests/normalize.test.ts
import { describe, it, expect } from "vitest";
import { coerceExtractionRow } from "../scripts/lib/normalize";

const meta = {
  contactId: "c-1",
  contactName: "Kevin",
  conversationId: "cv-1",
  conversationIds: ["cv-0", "cv-1"],
};

describe("coerceExtractionRow", () => {
  it("missing tipo_interes → { value:null, confidence:0 }", () => {
    const row = coerceExtractionRow({}, meta);
    expect(row.signals.tipo_interes).toEqual({ value: null, confidence: 0 });
  });

  it("coerces a string budget '5000000' to the number 5000000", () => {
    const row = coerceExtractionRow(
      { presupuesto_cop: { value: "5000000", confidence: 0.9 } },
      meta,
    );
    expect(row.signals.presupuesto_cop.value).toBe(5000000);
    expect(typeof row.signals.presupuesto_cop.value).toBe("number");
  });

  it("maps a non-numeric / NaN / non-positive budget to null", () => {
    expect(
      coerceExtractionRow(
        { presupuesto_cop: { value: "abc", confidence: 0.9 } },
        meta,
      ).signals.presupuesto_cop.value,
    ).toBeNull();
    expect(
      coerceExtractionRow(
        { presupuesto_cop: { value: Number.NaN, confidence: 0.9 } },
        meta,
      ).signals.presupuesto_cop.value,
    ).toBeNull();
    expect(
      coerceExtractionRow(
        { presupuesto_cop: { value: 0, confidence: 0.9 } },
        meta,
      ).signals.presupuesto_cop.value,
    ).toBeNull();
  });

  it("clamps confidence into [0,1]: 1.5 → 1, -0.2 → 0, non-number → 0", () => {
    expect(
      coerceExtractionRow(
        { tipo_interes: { value: "anillo", confidence: 1.5 } },
        meta,
      ).signals.tipo_interes.confidence,
    ).toBe(1);
    expect(
      coerceExtractionRow(
        { tipo_interes: { value: "anillo", confidence: -0.2 } },
        meta,
      ).signals.tipo_interes.confidence,
    ).toBe(0);
    expect(
      coerceExtractionRow(
        { tipo_interes: { value: "anillo", confidence: "high" } },
        meta,
      ).signals.tipo_interes.confidence,
    ).toBe(0);
  });

  it("defaults an invalid outcome to the NEUTRAL 'respondido-sin-cierre'", () => {
    const row = coerceExtractionRow({ outcome: "whatever" }, meta);
    expect(row.signals.outcome).toBe("respondido-sin-cierre");
    // Never a consequential, stage-moving default.
    expect(row.signals.outcome).not.toBe("fantasma");
    expect(row.signals.outcome).not.toBe("pidio-humano");
  });

  it("preserves a VALID outcome", () => {
    expect(
      coerceExtractionRow({ outcome: "compro" }, meta).signals.outcome,
    ).toBe("compro");
  });

  it("__channel 'WhatsApp' → 'whatsapp'; unknown channel → 'unknown'", () => {
    expect(coerceExtractionRow({ __channel: "WhatsApp" }, meta).channel).toBe(
      "whatsapp",
    );
    expect(
      coerceExtractionRow({ __channel: "carrier-pigeon" }, meta).channel,
    ).toBe("unknown");
    expect(coerceExtractionRow({}, meta).channel).toBe("unknown");
  });

  it("nulls an out-of-enum tipo_interes value but keeps the object shape", () => {
    const s = coerceExtractionRow(
      { tipo_interes: { value: "collar", confidence: 0.9 } },
      meta,
    ).signals.tipo_interes;
    expect(s.value).toBeNull();
    expect(s.confidence).toBe(0.9);
  });

  it("coerces a non-array objeciones to [] and filters non-strings", () => {
    expect(
      coerceExtractionRow({ objeciones: "muy caro" }, meta).signals.objeciones,
    ).toEqual([]);
    expect(
      coerceExtractionRow({ objeciones: ["caro", 5, null, "lejos"] }, meta)
        .signals.objeciones,
    ).toEqual(["caro", "lejos"]);
  });

  it("products_shown is strictly boolean-true only", () => {
    expect(
      coerceExtractionRow({ products_shown: { value: true } }, meta).signals
        .products_shown.value,
    ).toBe(true);
    expect(
      coerceExtractionRow({ products_shown: { value: "true" } }, meta).signals
        .products_shown.value,
    ).toBe(false);
    expect(coerceExtractionRow({}, meta).signals.products_shown.value).toBe(
      false,
    );
  });

  it("carries the meta fields through", () => {
    const row = coerceExtractionRow({}, meta);
    expect(row.contactId).toBe("c-1");
    expect(row.contactName).toBe("Kevin");
    expect(row.conversationId).toBe("cv-1");
    expect(row.conversationIds).toEqual(["cv-0", "cv-1"]);
  });

  it("extracts real (flat) extractSignals output — the wired production shape", () => {
    const raw = {
      tipo_interes: {
        value: "anillo",
        confidence: 0.8,
        evidence: "quiero un anillo",
      },
      presupuesto_cop: { value: 3_000_000, confidence: 0.7 },
      ocasion: { value: "matrimonio", confidence: 0.9 },
      outcome: "respondido-sin-cierre",
      __channel: "instagram",
      __tipo_evidence: { asked_for_plain: "anillo de compromiso" },
    };
    const row = coerceExtractionRow(raw, meta);
    expect(row.signals.tipo_interes.value).toBe("anillo");
    expect(row.signals.presupuesto_cop.value).toBe(3_000_000);
    expect(row.signals.ocasion.value).toBe("matrimonio");
    expect(row.channel).toBe("instagram");
    expect(row.tipo_interes_evidence?.asked_for_plain).toBe(
      "anillo de compromiso",
    );
  });

  it("also tolerates a { signals: {...} } wrapper (spec's raw.signals path)", () => {
    const row = coerceExtractionRow(
      {
        signals: { tipo_interes: { value: "dije", confidence: 0.8 } },
        __channel: "web",
      },
      meta,
    );
    expect(row.signals.tipo_interes.value).toBe("dije");
    expect(row.channel).toBe("web");
  });
});
