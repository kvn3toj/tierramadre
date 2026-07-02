// tests/backfillTags.test.ts
import { describe, it, expect } from "vitest";
import { deriveTags, DENY_TAGS } from "../scripts/lib/backfill-tags";
import type { ExtractionRow } from "../scripts/lib/types";

const base = (
  o: Partial<ExtractionRow["signals"]> = {},
  channel: ExtractionRow["channel"] = "whatsapp",
): ExtractionRow => ({
  contactId: "c",
  conversationId: "cv",
  conversationIds: ["cv"],
  channel,
  signals: {
    tipo_interes: { value: "anillo", confidence: 0.9 },
    presupuesto_cop: { value: null, confidence: 0.9 },
    ocasion: { value: "regalo", confidence: 0.9 },
    ciudad: { value: null, confidence: 0 },
    conocimiento: { value: null, confidence: 0 },
    urgencia: { value: "media", confidence: 0.9 },
    products_shown: { value: false },
    sentiment: { value: "listo-comprar", confidence: 0.99 },
    objeciones: ["precio"],
    outcome: "compro",
    ...o,
  },
});

describe("deriveTags", () => {
  it("emits interes-*, ocasion-*, canal-* from the frozen map", () => {
    expect(deriveTags(base())).toEqual(
      expect.arrayContaining([
        "interes-anillo",
        "ocasion-regalo",
        "canal-whatsapp",
      ]),
    );
  });
  it("candonga and otro emit NO interes tag", () => {
    expect(
      deriveTags(
        base({ tipo_interes: { value: "candonga", confidence: 0.9 } }),
      ),
    ).not.toContain("interes-candonga");
    expect(
      deriveTags(
        base({ tipo_interes: { value: "otro", confidence: 0.9 } }),
      ).some((t) => t.startsWith("interes-")),
    ).toBe(false);
  });
  it("gema_suelta maps to the hyphenated tag", () => {
    expect(
      deriveTags(
        base({ tipo_interes: { value: "gema_suelta", confidence: 0.9 } }),
      ),
    ).toContain("interes-gema-suelta");
  });
  it("urgencia=alta emits the bare tag; media/baja emit nothing", () => {
    expect(
      deriveTags(base({ urgencia: { value: "alta", confidence: 0.9 } })),
    ).toContain("urgencia");
    expect(
      deriveTags(base({ urgencia: { value: "baja", confidence: 0.9 } })),
    ).not.toContain("urgencia");
  });
  it("products_shown=true emits productos-mostrados; false does not", () => {
    expect(deriveTags(base({ products_shown: { value: true } }))).toContain(
      "productos-mostrados",
    );
    expect(
      deriveTags(base({ products_shown: { value: false } })),
    ).not.toContain("productos-mostrados");
  });
  it("SAFETY: report-only signals never become tags even at max confidence", () => {
    const tags = deriveTags(
      base({
        sentiment: { value: "listo-comprar", confidence: 1 },
        outcome: "compro",
        objeciones: ["precio", "envio"],
      }),
    );
    for (const t of [
      "quiere-comprar",
      "pide-humano",
      "cliente-pago-confirmado",
      "listo-comprar",
      "compro",
      "precio",
      "envio",
    ]) {
      expect(tags).not.toContain(t);
    }
  });
  it("SAFETY: no emitted tag is in DENY_TAGS", () => {
    for (const t of deriveTags(base())) expect(DENY_TAGS.has(t)).toBe(false);
  });
  it("skips tags below MIN_CONFIDENCE", () => {
    expect(
      deriveTags(base({ tipo_interes: { value: "anillo", confidence: 0.4 } })),
    ).not.toContain("interes-anillo");
  });
});
