import { describe, it, expect } from "vitest";
import { redactPII, renderTranscript } from "../scripts/lib/transcript";

describe("transcript", () => {
  it("redacts emails and phone numbers", () => {
    const out = redactPII("escríbeme a ana@correo.com o al +57 300 123 4567");
    expect(out).toContain("[EMAIL]");
    expect(out).toContain("[TEL]");
    expect(out).not.toContain("ana@correo.com");
    expect(out).not.toContain("4567");
  });
  it("keeps a dotted COP price (dots are thousand-separators, not a phone)", () => {
    const out = redactPII("mi presupuesto es 4.500.000 y hasta $5.000.000");
    expect(out).toContain("4.500.000");
    expect(out).toContain("5.000.000");
    expect(out).not.toContain("[TEL]");
  });
  it("still redacts space/dash phones and 10 contiguous digits, dotted price intact", () => {
    const out = redactPII(
      "escríbeme al +57 300 123 4567 o al 3001234567, presupuesto 4.500.000",
    );
    expect(out).not.toContain("4567");
    expect(out).not.toContain("3001234567");
    expect(out).toContain("[TEL]");
    expect(out).toContain("4.500.000");
  });
  it("renders role-tagged, redacted, last-N turns", () => {
    const msgs = Array.from({ length: 50 }, (_, i) => ({
      direction: i % 2 ? ("outbound" as const) : ("inbound" as const),
      body: `m${i}`,
    }));
    const out = renderTranscript(msgs, { maxTurns: 10 });
    expect(out.split("\n")).toHaveLength(10);
    expect(out).toContain("Cliente:");
    expect(out).toContain("Tierra Madre:");
    expect(out).not.toContain("m0"); // trimmed to last 10
  });
});
