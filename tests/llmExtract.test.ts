import { describe, it, expect, vi } from "vitest";
import { extractJsonObject, extractSignals } from "../scripts/lib/llm-extract";

const okJson = (obj: unknown) => ({
  ok: true,
  status: 200,
  headers: { get: () => null },
  json: async () => ({
    choices: [{ message: { content: JSON.stringify(obj) } }],
  }),
  text: async () => "",
});

describe("llm-extract", () => {
  it("extractJsonObject strips ```json fences", () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("calls Groq first with response_format json_object and returns parsed signals", async () => {
    const f = vi.fn(async () =>
      okJson({ tipo_interes: { value: "anillo", confidence: 0.9 } }),
    );
    const out = await extractSignals("Cliente: quiero un anillo", {
      groqKey: "gk",
      fetchImpl: f,
    });
    expect(out.tipo_interes.value).toBe("anillo");
    const [url, init] = f.mock.calls[0];
    expect(url).toContain("api.groq.com");
    expect(JSON.parse(init.body).response_format).toEqual({
      type: "json_object",
    });
  });
  it("falls back to the gateway on a Groq 429", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => null },
        json: async () => ({}),
        text: async () => "",
      })
      .mockResolvedValueOnce(
        okJson({ tipo_interes: { value: "dije", confidence: 0.8 } }),
      );
    const out = await extractSignals("…", {
      groqKey: "gk",
      gatewayKey: "ak",
      fetchImpl: f,
    });
    expect(out.tipo_interes.value).toBe("dije");
    expect(f.mock.calls[1][0]).toContain("ai-gateway.vercel.sh");
  });
  it("throws when all providers fail", async () => {
    const f = vi.fn(async () => ({
      ok: false,
      status: 500,
      headers: { get: () => null },
      json: async () => ({}),
      text: async () => "",
    }));
    await expect(
      extractSignals("…", { groqKey: "gk", gatewayKey: "ak", fetchImpl: f }),
    ).rejects.toThrow();
  });
});
